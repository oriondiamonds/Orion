// src/utils/price.js

// Set DEBUG_PRICING=true in .env.local to enable verbose price calculation logs
const DEBUG = process.env.DEBUG_PRICING === "true";
const log = (...args) => DEBUG && console.log(...args);

// Cache for pricing config
let cachedConfig = null;
let lastConfigFetch = 0;
const CONFIG_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cache for gold price
let cachedGoldPrice = null;
let lastGoldFetch = 0;
const GOLD_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Fetch pricing configuration from internal API
async function getPricingConfig() {
  const now = Date.now();

  // Return cached config if still valid
  if (cachedConfig && now - lastConfigFetch < CONFIG_CACHE_DURATION) {
    log("📦 [PRICING CONFIG] Using CACHED config");
    log(
      "⏱️  Cache age:",
      Math.round((now - lastConfigFetch) / 1000),
      "seconds",
    );
    log(
      "💾 Cached Config Details:",
      JSON.stringify(cachedConfig, null, 2),
    );
    return cachedConfig;
  }

  log("🔄 [PRICING CONFIG] Fetching FRESH config from API...");

  try {
    // Use internal API route
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const apiUrl = `${baseUrl}/api/pricing-config`;
    log("🌐 API URL:", apiUrl);

    const response = await fetch(apiUrl, {
      cache: "no-store",
    });

    log(
      "📡 API Response Status:",
      response.status,
      response.statusText,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch pricing config: ${response.status}`);
    }

    cachedConfig = await response.json();
    lastConfigFetch = now;

    log("✅ [PRICING CONFIG] Fresh config loaded successfully");
    log(
      "📊 Diamond Margins from API:",
      JSON.stringify(cachedConfig.diamondMargins, null, 2),
    );
    log(
      "📊 Making Charges from API:",
      JSON.stringify(cachedConfig.makingCharges, null, 2),
    );
    log("📊 GST Rate from API:", cachedConfig.gstRate);

    return cachedConfig;
  } catch (error) {
    console.error("❌ [PRICING CONFIG] Error fetching pricing config:", error);
    console.warn("⚠️  [PRICING CONFIG] Using FALLBACK default config");

    // Return default config as fallback
    const fallbackConfig = {
      diamondMargins: {
        lessThan1ct: { multiplier: 2.2, flatAddition: 900 },
        greaterThan1ct: { multiplier: 2.7, flatAddition: 0 },
        greaterThan2ct: { multiplier: 2.8, flatAddition: 0 },
        greaterThan3ct: { multiplier: 2.9, flatAddition: 0 },
        greaterThan4ct: { multiplier: 3.0, flatAddition: 0 },
        greaterThan5ct: { multiplier: 3.2, flatAddition: 0 },
        baseFees: { fee1: 150, fee2: 700 },
      },
      makingCharges: {
        lessThan2g: { ratePerGram: 950 },
        greaterThan2g: { ratePerGram: 700 },
        multiplier: 1.75,
      },
      gstRate: 0.03,
    };

    log(
      "📊 Fallback Diamond Margins:",
      JSON.stringify(fallbackConfig.diamondMargins, null, 2),
    );
    log(
      "📊 Fallback Making Charges:",
      JSON.stringify(fallbackConfig.makingCharges, null, 2),
    );

    return fallbackConfig;
  }
}

// Fetch gold price from internal API
async function getGoldPrice() {
  const now = Date.now();

  // Return cached price if still valid
  if (cachedGoldPrice && now - lastGoldFetch < GOLD_CACHE_DURATION) {
    log(
      "💰 [GOLD PRICE] Using CACHED price:",
      cachedGoldPrice,
      "₹/gram",
    );
    log(
      "⏱️  Cache age:",
      Math.round((now - lastGoldFetch) / 1000),
      "seconds",
    );
    return cachedGoldPrice;
  }

  log("🔄 [GOLD PRICE] Fetching FRESH gold price from API...");

  try {
    // Use internal API route
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const apiUrl = `${baseUrl}/api/gold-price`;
    log("🌐 Gold Price API URL:", apiUrl);

    const response = await fetch(apiUrl, {
      cache: "no-store",
    });

    log(
      "📡 Gold Price API Response Status:",
      response.status,
      response.statusText,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch gold price: ${response.status}`);
    }

    const data = await response.json();
    log("📦 Raw API response:", data);

    if (!data.success || !data.price) {
      throw new Error("Invalid gold price response");
    }

    cachedGoldPrice = parseFloat(data.price);
    lastGoldFetch = now;

    log(
      "✅ [GOLD PRICE] Fresh price loaded:",
      cachedGoldPrice,
      "₹/gram",
    );
    return cachedGoldPrice;
  } catch (error) {
    console.error("❌ [GOLD PRICE] Error fetching gold price:", error);
    console.warn("⚠️  [GOLD PRICE] Using FALLBACK price: 6500 ₹/gram");

    // Fallback to a reasonable default
    return 6500; // Default 24K gold price per gram
  }
}

// Utility: find rate from range-based diamond price chart
function findRate(weight, ranges) {
  for (const [min, max, rate] of ranges) {
    if (weight >= min && weight <= max) {
      log(
        `  💎 Weight ${weight}ct found in range [${min}-${max}] → Rate: ₹${rate}`,
      );
      return rate;
    }
  }
  log(`  ❌ Weight ${weight}ct NOT FOUND in any range → Rate: 0`);
  return 0;
}

/**
 * Pick the correct diamond margin tier based on per-stone weight (ct).
 *
 * Tiers (all stored in config.diamondMargins):
 *   < 1ct          → lessThan1ct
 *   ≥ 1ct, < 2ct   → greaterThan1ct
 *   ≥ 2ct, < 3ct   → greaterThan2ct
 *   ≥ 3ct, < 4ct   → greaterThan3ct
 *   ≥ 4ct, < 5ct   → greaterThan4ct
 *   ≥ 5ct           → greaterThan5ct
 *
 * Falls back to greaterThan1ct if a new-tier key is missing (legacy DB row).
 */
function getDiamondTier(weight, diamondMargins) {
  let tierKey = "";
  let tier = null;

  if (weight < 1) {
    tierKey = "lessThan1ct";
    tier = diamondMargins.lessThan1ct;
  } else if (weight < 2) {
    tierKey = "greaterThan1ct";
    tier = diamondMargins.greaterThan1ct;
  } else if (weight < 3) {
    tierKey = "greaterThan2ct";
    tier = diamondMargins.greaterThan2ct || diamondMargins.greaterThan1ct;
  } else if (weight < 4) {
    tierKey = "greaterThan3ct";
    tier = diamondMargins.greaterThan3ct || diamondMargins.greaterThan1ct;
  } else if (weight < 5) {
    tierKey = "greaterThan4ct";
    tier = diamondMargins.greaterThan4ct || diamondMargins.greaterThan1ct;
  } else {
    tierKey = "greaterThan5ct";
    tier = diamondMargins.greaterThan5ct || diamondMargins.greaterThan1ct;
  }

  log(`  🎯 Tier Selection for ${weight}ct: ${tierKey}`);
  log(
    `     Multiplier: ${tier.multiplier}, Flat Addition: ${tier.flatAddition || 0}`,
  );

  return tier;
}

// === MAIN PRICE FUNCTION ===
export async function calculateFinalPrice({
  diamonds = [],
  goldWeight = 0,
  goldKarat = "18K",
}) {
  log("\n" + "=".repeat(80));
  log("🚀 [PRICE CALCULATION] Starting calculation...");
  log("=".repeat(80));

  // Fetch current pricing configuration
  const config = await getPricingConfig();

  log("\n📋 [INPUT DATA]");
  log("Diamonds:", JSON.stringify(diamonds, null, 2));
  log("Gold Weight:", goldWeight, "g");
  log("Gold Karat:", goldKarat);

  let totalDiamondPrice = 0;

  log("\n💎 [DIAMOND PRICING BREAKDOWN]");

  for (const d of diamonds) {
    const shape = (d.shape || "").toLowerCase();
    const weight = parseFloat(d.weight) || 0;
    const count = parseInt(d.count) || 0;

    log(
      `\n  📍 Diamond: Shape=${shape}, Weight=${weight}ct, Count=${count}`,
    );

    if (weight <= 0 || count <= 0) {
      log(`     ⏭️  Skipped (invalid weight or count)`);
      continue;
    }

    const roundShapes = ["round", "rnd", "r"];
    let rate = 0;

    // === Per-stone base rate lookup ===
    log(`  🔍 Looking up base rate for ${shape} shape...`);

    if (roundShapes.includes(shape)) {
      if (weight < 1) {
        rate = findRate(weight, [
          [0.001, 0.005, 13500],
          [0.006, 0.009, 11600],
          [0.01, 0.02, 6900],
          [0.025, 0.035, 4600],
          [0.04, 0.07, 4600],
          [0.08, 0.09, 4600],
          [0.1, 0.12, 5100],
          [0.13, 0.17, 5100],
          [0.18, 0.22, 6200],
          [0.23, 0.29, 7000],
          [0.3, 0.39, 6750],
          [0.4, 0.49, 6750],
          [0.5, 0.69, 7100],
          [0.7, 0.89, 7100],
          [0.9, 0.99, 7300],
        ]);
      } else {
        rate = findRate(weight, [
          [1.0, 1.99, 11000],
          [2.0, 2.99, 12500],
          [3.0, 3.99, 13750],
          [4.0, 4.99, 14550],
          [5.0, 5.99, 15500],
        ]);
      }
    } else {
      if (weight < 1) {
        rate = findRate(weight, [[0.001, 0.99, 7800]]);
      } else {
        rate = findRate(weight, [
          [1.0, 1.99, 11500],
          [2.0, 2.99, 13500],
          [3.0, 3.99, 14550],
          [4.0, 4.99, 15550],
          [5.0, 5.99, 16500],
        ]);
      }
    }

    // === Base price ===
    const base = weight * count * rate;
    log(
      `     Base Calculation: ${weight} × ${count} × ${rate} = ₹${base}`,
    );

    // === Select margin tier by per-stone weight ===
    const tier = getDiamondTier(weight, config.diamondMargins);
    const adjusted = base * tier.multiplier + (tier.flatAddition || 0);

    log(
      `     ✏️  After Margin: (${base} × ${tier.multiplier}) + ${tier.flatAddition || 0} = ₹${adjusted}`,
    );

    totalDiamondPrice += adjusted;
  }

  // Add base fees from config
  const fee1 = config.diamondMargins.baseFees.fee1;
  const fee2 = config.diamondMargins.baseFees.fee2;

  log(
    `\n  💸 Base Fees: Fee1=${fee1} + Fee2=${fee2} = ₹${fee1 + fee2}`,
  );

  totalDiamondPrice += fee1 + fee2;

  log(`  📊 Total Diamond Price (with fees): ₹${totalDiamondPrice}`);

  // === Get gold price from internal API ===
  log("\n⭐ [GOLD PRICING]");

  const gold24Price = await getGoldPrice();
  log(`  24K Gold Price: ₹${gold24Price}/gram`);

  const goldRates = {
    "10K": gold24Price * (10 / 24),
    "14K": gold24Price * (14 / 24),
    "18K": gold24Price * (18 / 24),
  };

  log(`  Karat Conversion Rates:`);
  log(`    10K: ₹${goldRates["10K"].toFixed(2)}/gram`);
  log(`    14K: ₹${goldRates["14K"].toFixed(2)}/gram`);
  log(`    18K: ₹${goldRates["18K"].toFixed(2)}/gram`);

  const selectedGoldRate = goldRates[goldKarat] || goldRates["18K"] || 0;
  log(
    `  Selected Rate (${goldKarat}): ₹${selectedGoldRate.toFixed(2)}/gram`,
  );

  const goldPrice = selectedGoldRate * goldWeight;
  log(
    `  Gold Price Calculation: ${selectedGoldRate.toFixed(2)} × ${goldWeight} = ₹${goldPrice.toFixed(2)}`,
  );

  // === Making charges (using config) ===
  log("\n🔨 [MAKING CHARGES]");

  const ratePerGram =
    goldWeight >= 2
      ? config.makingCharges.greaterThan2g.ratePerGram
      : config.makingCharges.lessThan2g.ratePerGram;

  log(`  Gold Weight: ${goldWeight}g`);
  log(
    `  Rate Per Gram (${goldWeight >= 2 ? ">= 2g" : "< 2g"}): ₹${ratePerGram}/gram`,
  );
  log(`  Multiplier: ${config.makingCharges.multiplier}`);

  let makingCharge = goldWeight * ratePerGram;
  log(
    `  Before Multiplier: ${goldWeight} × ${ratePerGram} = ₹${makingCharge}`,
  );

  makingCharge *= config.makingCharges.multiplier;
  log(
    `  After Multiplier: ${makingCharge / config.makingCharges.multiplier} × ${config.makingCharges.multiplier} = ₹${makingCharge}`,
  );

  // === Subtotal, GST, and Total ===
  log("\n💰 [FINAL CALCULATION]");

  const subtotal = Math.round(totalDiamondPrice + goldPrice + makingCharge);
  log(
    `  Subtotal: ₹${Math.round(totalDiamondPrice)} + ₹${Math.round(goldPrice)} + ₹${Math.round(makingCharge)} = ₹${subtotal}`,
  );

  const gst = Math.round(subtotal * config.gstRate);
  log(
    `  GST (${(config.gstRate * 100).toFixed(1)}%): ₹${subtotal} × ${config.gstRate} = ₹${gst}`,
  );

  const grandTotal = Math.round(subtotal + gst);
  log(`  Grand Total: ₹${subtotal} + ₹${gst} = ₹${grandTotal}`);

  log("\n" + "=".repeat(80));
  log("📤 [FINAL OUTPUT]");
  log("=".repeat(80));

  const result = {
    diamondPrice: Math.round(totalDiamondPrice),
    goldPrice: Math.round(goldPrice),
    makingCharge: Math.round(makingCharge),
    subtotal: Math.round(subtotal),
    gst: Math.round(gst),
    totalPrice: Math.round(grandTotal),
  };

  log(JSON.stringify(result, null, 2));
  log("=".repeat(80) + "\n");

  return result;
}

// Clear the config cache (useful for admin updates)
export function clearPricingCache() {
  log("🗑️  [CACHE] Clearing pricing config cache");
  cachedConfig = null;
  lastConfigFetch = 0;
}

// Clear the gold price cache
export function clearGoldPriceCache() {
  log("🗑️  [CACHE] Clearing gold price cache");
  cachedGoldPrice = null;
  lastGoldFetch = 0;
}

// Clear all caches
export function clearAllCaches() {
  log("🗑️  [CACHE] Clearing ALL caches");
  clearPricingCache();
  clearGoldPriceCache();
}
