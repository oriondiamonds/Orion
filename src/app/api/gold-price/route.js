// src/app/api/gold-price/route.js
import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

// In-memory cache
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let priceCache = {
  price: null,
  lastFetchDate: null,
  lastFetchTime: null,
};

function shouldFetchPrice() {
  if (!priceCache.price || !priceCache.lastFetchTime) return true;
  return Date.now() - priceCache.lastFetchTime > CACHE_TTL_MS;
}

// Fetch from Navkar Gold's real API endpoint
async function fetch24kPriceFromNavkarGold() {
  // This is the real API endpoint that serves price data
  const url =
    "https://bcast.navkargold.com:7768/VOTSBroadcastStreaming/Services/xml/GetLiveRateByTemplateID/navkar";

  try {
    console.log("🔍 Fetching from Navkar Gold API...");

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    console.log(`📄 Response size: ${(html.length / 1024).toFixed(2)} KB`);

    const $ = cheerio.load(html);

    // Parse the XML response
    // Format is: ID | NAME | CURRENT_PRICE | BUY_PRICE | HIGH | LOW
    // We're looking for:
    // 9052 GOLD. 4926.10 (per gram - current price)
    // 9054 GOLD COSTING 152863 (10 gram price)

    let goldPrice = null;

    console.log("🔎 Parsing price data from API...");

    const text = $("body").text();
    console.log("📊 Raw response:", text.substring(0, 300));

    // Look for GOLD 999 IMP (ID 7594)
    // Format: 7594  GOLD 999 IMP (TODAY)  156500  156500  156758  153147
    // Columns:  ID | NAME | CURRENT | BUY | HIGH | LOW
    // We want the CURRENT price (first number after the name)
    console.log("   Looking for GOLD 999 IMP (ID 7594)...");

    // Match ID 7594 followed by name (possibly containing TODAY etc), then the first large number = current price
    const gold999Match = text.match(/7594[\s\t]+GOLD[^\d]+?(\d{5,6})[\s\t]/);
    if (gold999Match) {
      const price10gm = parseInt(gold999Match[1]);
      goldPrice = price10gm / 10;
      console.log(
        `✅ Found GOLD 999 IMP (ID 7594): ₹${price10gm} for 10gm → ₹${goldPrice.toFixed(2)}/gram`,
      );
      return goldPrice;
    }

    // Fallback: scan lines for GOLD 999 IMP and pick the FIRST price column (not last)
    console.log("   Trying line-by-line fallback...");
    const lines = text.split(/[\n\r]+/).filter((line) => line.trim());
    for (const line of lines) {
      if (line.includes("GOLD 999 IMP") || line.includes("7594")) {
        console.log(`   Matched line: ${line}`);
        const parts = line.split(/[\s\t]+/).filter(Boolean);
        // First number in 140000–175000 range after the name = current price
        for (const part of parts) {
          const price = parseInt(part);
          if (price > 140000 && price < 175000) {
            goldPrice = price / 10;
            console.log(`✅ Fallback: ₹${price} for 10gm → ₹${goldPrice.toFixed(2)}/gram`);
            break;
          }
        }
        if (goldPrice) break;
      }
    }

    if (!goldPrice) {
      console.error(
        "❌ Could not extract GOLD 999 IMP price from API response",
      );
      throw new Error(
        "Could not parse GOLD 999 IMP price from Navkar Gold API",
      );
    }

    console.log(`✅ FINAL PRICE: ₹${goldPrice.toFixed(2)}/gram`);
    return goldPrice;
  } catch (error) {
    console.error("❌ Error fetching from API:", error.message);
    throw error;
  }
}

// Update cache - ONLY from Navkar Gold's real API
async function updatePriceCache() {
  try {
    console.log("\n" + "=".repeat(60));
    console.log("Fetching fresh gold price from Navkar Gold API...");
    console.log("=".repeat(60));

    const price = await fetch24kPriceFromNavkarGold();

    const now = new Date();
    const istTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
    );

    priceCache = {
      price: price,
      lastFetchDate: istTime.toISOString().split("T")[0],
      lastFetchTime: Date.now(),
    };

    console.log(`✅ CACHE UPDATED: ₹${price.toFixed(2)}/gram`);
    console.log("=".repeat(60) + "\n");

    return price;
  } catch (error) {
    console.error("❌ Failed to fetch price:", error.message);
    throw error;
  }
}

// GET endpoint
export async function GET() {
  try {
    if (shouldFetchPrice()) {
      await updatePriceCache();
    }

    if (!priceCache.price) {
      await updatePriceCache();
    }

    const istTime = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
    );

    return NextResponse.json(
      {
        success: true,
        city: "Surat",
        price: Math.round(priceCache.price * 100) / 100,
        unit: "INR per gram",
        date: priceCache.lastFetchDate,
        lastUpdated: istTime.toISOString(),
        nextUpdate: "Refreshes every hour automatically",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("❌ GET endpoint error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// Force refresh endpoint
export async function POST() {
  try {
    await updatePriceCache();

    const istTime = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
    );

    return NextResponse.json(
      {
        success: true,
        city: "Surat",
        price: Math.round(priceCache.price * 100) / 100,
        unit: "INR per gram",
        date: priceCache.lastFetchDate,
        lastUpdated: istTime.toISOString(),
        nextUpdate: "Refreshes every hour automatically",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("❌ POST endpoint error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
