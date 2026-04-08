// src/app/api/gold-price/route.js
import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { supabaseAdmin } from "../../../utils/supabase-admin.js";

// In-memory cache — survives within a single serverless instance lifetime
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let priceCache = {
  price: null,
  lastFetchTime: null,
};

function isCacheValid() {
  return priceCache.price && priceCache.lastFetchTime &&
    Date.now() - priceCache.lastFetchTime < CACHE_TTL_MS;
}

// Read last known good price from Supabase (survives cold starts)
async function getPersistedPrice() {
  try {
    const { data } = await supabaseAdmin
      .from("pricing_config")
      .select("gold_price_per_gram, gold_price_updated_at")
      .limit(1)
      .single();
    if (data?.gold_price_per_gram) return Number(data.gold_price_per_gram);
  } catch {}
  return null;
}

// Persist last known good price to Supabase
async function persistPrice(price) {
  try {
    const { data: rows } = await supabaseAdmin
      .from("pricing_config")
      .select("id")
      .limit(1);
    if (rows?.length) {
      await supabaseAdmin
        .from("pricing_config")
        .update({ gold_price_per_gram: price, gold_price_updated_at: new Date().toISOString() })
        .eq("id", rows[0].id);
    }
  } catch {}
}

// Fetch from Navkar Gold API
async function fetchFromNavkar() {
  const url =
    "https://bcast.navkargold.com:7768/VOTSBroadcastStreaming/Services/xml/GetLiveRateByTemplateID/navkar";

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    signal: AbortSignal.timeout(8000), // 8 second timeout
  });

  if (!response.ok) throw new Error(`Navkar API HTTP ${response.status}`);

  const html = await response.text();
  const $ = cheerio.load(html);
  const text = $("body").text();

  console.log("📊 Navkar raw (first 300):", text.substring(0, 300));

  // ID 7594 = GOLD 999 IMP — format: 7594 GOLD 999 IMP (TODAY) 156500 156500 156758 153147
  // First large number after name = CURRENT price (per 10g)
  const gold999Match = text.match(/7594[\s\t]+GOLD[^\d]+?(\d{5,6})[\s\t]/);
  if (gold999Match) {
    const price10gm = parseInt(gold999Match[1]);
    const pricePerGram = price10gm / 10;
    console.log(`✅ GOLD 999 IMP: ₹${price10gm}/10g → ₹${pricePerGram}/g`);
    return pricePerGram;
  }

  // Fallback: line-by-line scan, pick FIRST number in valid range (current price, not LOW)
  const lines = text.split(/[\n\r]+/).filter((l) => l.trim());
  for (const line of lines) {
    if (line.includes("GOLD 999 IMP") || line.includes("7594")) {
      const parts = line.split(/[\s\t]+/).filter(Boolean);
      for (const part of parts) {
        const price = parseInt(part);
        if (price > 140000 && price < 200000) {
          const pricePerGram = price / 10;
          console.log(`✅ Fallback scan: ₹${price}/10g → ₹${pricePerGram}/g`);
          return pricePerGram;
        }
      }
    }
  }

  throw new Error("Could not parse GOLD 999 IMP price from Navkar response");
}

// Try to get a fresh price — never throws
async function refreshPrice() {
  try {
    const price = await fetchFromNavkar();
    priceCache = { price, lastFetchTime: Date.now() };
    await persistPrice(price);
    console.log(`✅ Gold price updated: ₹${price}/g`);
    return price;
  } catch (err) {
    console.error("❌ Navkar fetch failed:", err.message);
    return null;
  }
}

export async function GET() {
  // 1. In-memory cache still valid
  if (isCacheValid()) {
    return NextResponse.json(
      { success: true, price: priceCache.price, source: "cache" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // 2. Try fetching fresh price
  const fresh = await refreshPrice();
  if (fresh) {
    return NextResponse.json(
      { success: true, price: fresh, source: "live" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // 3. Fresh fetch failed — use last known price from Supabase
  const persisted = await getPersistedPrice();
  if (persisted) {
    console.warn(`⚠️  Using persisted price: ₹${persisted}/g`);
    priceCache = { price: persisted, lastFetchTime: Date.now() - CACHE_TTL_MS + 5 * 60 * 1000 }; // retry in 5 min
    return NextResponse.json(
      { success: true, price: persisted, source: "persisted" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // 4. Nothing available — return a hardcoded safe fallback (never 500)
  const FALLBACK = 9000; // ₹9,000/g — update periodically
  console.warn(`⚠️  All sources failed — using hardcoded fallback: ₹${FALLBACK}/g`);
  return NextResponse.json(
    { success: true, price: FALLBACK, source: "fallback" },
    { headers: { "Cache-Control": "no-store" } },
  );
}

// Force refresh
export async function POST() {
  const fresh = await refreshPrice();
  const price = fresh || (await getPersistedPrice()) || 9000;
  return NextResponse.json(
    { success: true, price, source: fresh ? "live" : "fallback" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
