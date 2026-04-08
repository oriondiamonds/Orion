// src/app/api/gold-price/route.js
import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { supabaseAdmin } from "../../../utils/supabase-admin.js";

const CACHE_TTL_MS  = 60 * 60 * 1000; // 1 hour
const HARDCODED_FALLBACK = 9000;       // last-resort only — never persisted

let priceCache = { price: null, lastFetchTime: null };

function isCacheValid() {
  return priceCache.price &&
    priceCache.lastFetchTime &&
    Date.now() - priceCache.lastFetchTime < CACHE_TTL_MS;
}

// ── Navkar Gold API ────────────────────────────────────────────────────────────
async function fetchFromNavkar() {
  const url =
    "https://bcast.navkargold.com:7768/VOTSBroadcastStreaming/Services/xml/GetLiveRateByTemplateID/navkar";

  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) throw new Error(`Navkar HTTP ${response.status}`);

  const html = await response.text();
  const $    = cheerio.load(html);
  const text = $("body").text();

  // ID 7594 = GOLD 999 IMP — columns: ID | NAME | CURRENT | BUY | HIGH | LOW
  const match = text.match(/7594[\s\t]+GOLD[^\d]+?(\d{5,6})[\s\t]/);
  if (match) {
    const price = parseInt(match[1]) / 10;
    console.log(`✅ Navkar GOLD 999 IMP: ₹${price}/g`);
    return price;
  }

  // Line-by-line fallback — pick FIRST number in valid range (current price, not LOW)
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

  throw new Error("Could not parse GOLD 999 IMP from Navkar response");
}

// Retry Navkar up to `attempts` times before giving up
async function fetchFromNavkarWithRetry(attempts = 3, delayMs = 2000) {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fetchFromNavkar();
    } catch (err) {
      console.warn(`⚠️  Navkar attempt ${i}/${attempts} failed: ${err.message}`);
      if (i < attempts) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return null; // all attempts exhausted
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

  // 2. Try Navkar (with retries) — persist only on success
  const live = await fetchFromNavkarWithRetry(3, 2000);
  if (live) {
    priceCache = { price: live, lastFetchTime: Date.now() };
    await persistRealPrice(live); // only real prices are persisted
    return NextResponse.json(
      { success: true, price: live, source: "live" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // 3. Navkar down — use the last real price we successfully fetched (from Supabase)
  const persisted = await getPersistedPrice();
  if (persisted) {
    console.warn(`⚠️  Navkar unreachable — using last real price: ₹${persisted}/g`);
    // cache briefly so we don't hammer Navkar on every request — retry in 5 min
    priceCache = { price: persisted, lastFetchTime: Date.now() - CACHE_TTL_MS + 5 * 60 * 1000 };
    return NextResponse.json(
      { success: true, price: persisted, source: "persisted" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // 4. No real price has ever been fetched — hardcoded safety net (never persisted)
  console.warn(`⚠️  No real price available — using hardcoded fallback: ₹${HARDCODED_FALLBACK}/g`);
  return NextResponse.json(
    { success: true, price: HARDCODED_FALLBACK, source: "fallback" },
    { headers: { "Cache-Control": "no-store" } },
  );
}

// ── POST (force refresh) ───────────────────────────────────────────────────────
export async function POST() {
  const live = await fetchFromNavkarWithRetry(3, 2000);
  if (live) {
    priceCache = { price: live, lastFetchTime: Date.now() };
    await persistRealPrice(live);
    return NextResponse.json(
      { success: true, price: live, source: "live" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const persisted = await getPersistedPrice();
  const price = persisted || HARDCODED_FALLBACK;
  return NextResponse.json(
    { success: true, price, source: persisted ? "persisted" : "fallback" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
