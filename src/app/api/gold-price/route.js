// src/app/api/gold-price/route.js
import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { supabaseAdmin } from "../../../utils/supabase-admin.js";

const CACHE_TTL_MS       = 60 * 60 * 1000; // 1 hour
const HARDCODED_FALLBACK = 9000;            // last-resort only — never persisted

let priceCache = { price: null, lastFetchTime: null };

function isCacheValid() {
  return priceCache.price &&
    priceCache.lastFetchTime &&
    Date.now() - priceCache.lastFetchTime < CACHE_TTL_MS;
}

// ── Source 1: Navkar Gold (try multiple URL variants) ─────────────────────────
async function fetchFromNavkar() {
  // Try standard HTTPS port first (Vercel allows 443), then HTTP on 7768
  const candidates = [
    "https://bcast.navkargold.com/VOTSBroadcastStreaming/Services/xml/GetLiveRateByTemplateID/navkar",
    "http://bcast.navkargold.com:7768/VOTSBroadcastStreaming/Services/xml/GetLiveRateByTemplateID/navkar",
    "https://bcast.navkargold.com:7768/VOTSBroadcastStreaming/Services/xml/GetLiveRateByTemplateID/navkar",
  ];

  for (const url of candidates) {
    try {
      console.log(`🔍 Trying: ${url}`);
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) { console.warn(`   → HTTP ${res.status}`); continue; }

      const html  = await res.text();
      const $     = cheerio.load(html);
      const text  = $("body").text();

      // ID 7594 = GOLD 999 IMP — columns: ID | NAME | CURRENT | BUY | HIGH | LOW
      const match = text.match(/7594[\s\t]+GOLD[^\d]+?(\d{5,6})[\s\t]/);
      if (match) {
        const price = parseInt(match[1]) / 10;
        console.log(`✅ Navkar GOLD 999 IMP: ₹${price}/g (via ${url})`);
        return price;
      }

      // Line-by-line fallback — pick FIRST number in valid range
      for (const line of text.split(/[\n\r]+/)) {
        if (line.includes("GOLD 999 IMP") || line.includes("7594")) {
          for (const part of line.split(/[\s\t]+/)) {
            const n = parseInt(part);
            if (n > 140000 && n < 200000) {
              const price = n / 10;
              console.log(`✅ Navkar fallback scan: ₹${price}/g`);
              return price;
            }
          }
        }
      }
      console.warn(`   → Parsed but GOLD 999 IMP not found`);
    } catch (err) {
      console.warn(`   → ${err.message}`);
    }
  }
  return null;
}

// ── Supabase persistence — only for REAL fetched prices ───────────────────────
async function getPersistedPrice() {
  try {
    const { data } = await supabaseAdmin
      .from("pricing_config")
      .select("gold_price_per_gram")
      .limit(1)
      .single();
    const p = Number(data?.gold_price_per_gram);
    return p > 0 ? p : null;
  } catch {
    return null;
  }
}

async function persistRealPrice(price) {
  try {
    const { data: rows } = await supabaseAdmin
      .from("pricing_config")
      .select("id")
      .limit(1);
    if (rows?.length) {
      await supabaseAdmin
        .from("pricing_config")
        .update({
          gold_price_per_gram: price,
          gold_price_updated_at: new Date().toISOString(),
        })
        .eq("id", rows[0].id);
      console.log(`💾 Persisted real gold price: ₹${price}/g`);
    }
  } catch (err) {
    console.error("❌ Failed to persist gold price:", err.message);
  }
}

// ── GET ────────────────────────────────────────────────────────────────────────
export async function GET() {
  // 1. In-memory cache still valid
  if (isCacheValid()) {
    return NextResponse.json(
      { success: true, price: priceCache.price, source: "cache" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // 2. Try Navkar (preferred — exact Indian market price)
  const navkar = await fetchFromNavkar();
  if (navkar) {
    priceCache = { price: navkar, lastFetchTime: Date.now() };
    await persistRealPrice(navkar);
    return NextResponse.json(
      { success: true, price: navkar, source: "navkar" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // 3. All live sources failed — use last real price from Supabase
  const persisted = await getPersistedPrice();
  if (persisted) {
    console.warn(`⚠️  All live sources down — using last real price: ₹${persisted}/g`);
    priceCache = { price: persisted, lastFetchTime: Date.now() - CACHE_TTL_MS + 5 * 60 * 1000 };
    return NextResponse.json(
      { success: true, price: persisted, source: "persisted" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // 4. No real price ever fetched — hardcoded safety net (never persisted)
  console.warn(`⚠️  No real price available — using hardcoded fallback ₹${HARDCODED_FALLBACK}/g`);
  return NextResponse.json(
    { success: true, price: HARDCODED_FALLBACK, source: "fallback" },
    { headers: { "Cache-Control": "no-store" } },
  );
}

// ── POST (force refresh) ───────────────────────────────────────────────────────
export async function POST() {
  const price = await fetchFromNavkar();
  if (price) {
    priceCache = { price, lastFetchTime: Date.now() };
    await persistRealPrice(price);
    return NextResponse.json(
      { success: true, price, source: "live" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  const persisted = await getPersistedPrice();
  const fallback  = persisted || HARDCODED_FALLBACK;
  return NextResponse.json(
    { success: true, price: fallback, source: persisted ? "persisted" : "fallback" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
