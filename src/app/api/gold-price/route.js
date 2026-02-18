// src/app/api/gold-price/route.js
import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

// In-memory cache
let priceCache = {
  price: null,
  lastFetchDate: null,
};

function shouldFetchPrice() {
  const now = new Date();
  const istTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  );
  const currentDate = istTime.toISOString().split("T")[0];
  const currentHour = istTime.getHours();

  if (!priceCache.lastFetchDate) {
    return true;
  }

  if (currentDate > priceCache.lastFetchDate && currentHour >= 8) {
    return true;
  }

  return false;
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

    // Method 1: Look for GOLD 999 IMP (ID 7594)
    // Format: 7594	GOLD 999 IMP	156647
    // This is the 10-gram price, divide by 10 to get per-gram
    console.log("   Looking for GOLD 999 IMP...");
    const gold999Match = text.match(/7594\s+GOLD\s+999\s+IMP\s+(\d+)/);
    if (gold999Match) {
      const price10gm = parseInt(gold999Match[1]);
      goldPrice = price10gm / 10;
      console.log(
        `✅ Found GOLD 999 IMP (ID 7594): ₹${price10gm} for 10gm → ₹${goldPrice.toFixed(2)}/gram`,
      );
      return goldPrice;
    }

    // Method 2: Alternative - look for "GOLD 999 IMP" in text and extract number
    console.log("   Trying alternative parsing...");
    const lines = text.split(/[\n\r]+/).filter((line) => line.trim());
    console.log(`📊 Found ${lines.length} lines in response`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Look for GOLD 999 IMP line
      if (
        line.includes("GOLD 999 IMP") ||
        (line.includes("GOLD") && line.includes("999"))
      ) {
        console.log(`   Line ${i}: ${line}`);

        // Extract price from this line
        // Pattern: 7594	GOLD 999 IMP	156647
        const parts = line.split(/\s+|\t+/);
        console.log(`   Parts:`, parts);

        // Find the number at the end (should be 150000-160000 range)
        for (let j = parts.length - 1; j >= 0; j--) {
          const price = parseInt(parts[j]);
          // 10-gram gold price should be around 150000-160000
          if (price > 150000 && price < 160000) {
            goldPrice = price / 10;
            console.log(
              `✅ Found 10gm price: ₹${price} → ₹${goldPrice.toFixed(2)}/gram`,
            );
            break;
          }
        }

        if (goldPrice) break;
      }
    }

    // Method 3: Look for any 6-digit number in 150000-160000 range and convert
    if (!goldPrice) {
      console.log("   Trying pattern matching for 10gm price...");
      const numbers = text.match(/\b\d{6}\b/g);
      if (numbers) {
        for (const num of numbers) {
          const price = parseInt(num);
          if (price > 150000 && price < 160000) {
            goldPrice = price / 10;
            console.log(
              `✅ Found 10gm price by pattern: ₹${price} → ₹${goldPrice.toFixed(2)}/gram`,
            );
            break;
          }
        }
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

    return NextResponse.json({
      success: true,
      city: "Surat",
      price: Math.round(priceCache.price * 100) / 100,
      unit: "INR per gram",
      date: priceCache.lastFetchDate,
      lastUpdated: istTime.toISOString(),
      nextUpdate: "Tomorrow at 8:00 AM IST",
    });
  } catch (error) {
    console.error("❌ GET endpoint error:", error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
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

    return NextResponse.json({
      success: true,
      city: "Surat",
      price: Math.round(priceCache.price * 100) / 100,
      unit: "INR per gram",
      date: priceCache.lastFetchDate,
      lastUpdated: istTime.toISOString(),
      nextUpdate: "Tomorrow at 8:00 AM IST",
    });
  } catch (error) {
    console.error("❌ POST endpoint error:", error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}
