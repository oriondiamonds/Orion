import { useEffect, useState } from "react";
import { calculateFinalPrice, clearAllCaches } from "../utils/price";
import { formatIndianCurrency, formatINR } from "../utils/formatIndianCurrency";

export default function PriceBreakup({
  descriptionHtml,
  selectedOptions,
  onPriceData,
  pricing,
}) {
  const [priceData, setPriceData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function computePrice() {
      if (!descriptionHtml && !pricing) {
        console.log(
          "⚠️  [EARLY EXIT] No descriptionHtml or pricing data available",
        );
        return;
      }

      setLoading(true);

      const selectedKarat = selectedOptions["Gold Karat"] || "18K";
      const karatNum = parseInt(selectedKarat);

      console.log(`\n🔧 [CONFIGURATION]`);
      console.log(`  Selected Karat: ${selectedKarat} (${karatNum}K)`);
      console.log(
        `  Pricing Mode: ${pricing?.pricing_mode || "none (will use fallback)"}`,
      );

      // Fixed pricing mode — use stored prices directly
      if (pricing?.pricing_mode === "fixed") {
        console.log("\n💾 [MODE: FIXED PRICING]");
        console.log("  Using pre-stored fixed prices from database");

        const totalPrice = Math.round(
          Number(pricing[`price_${karatNum}k`]) || 0,
        );
        const diamondPrice = Math.round(Number(pricing.diamond_price) || 0);
        const goldPrice = Math.round(Number(pricing.gold_price_14k) || 0);
        const makingCharge = Math.round(Number(pricing.making_charges) || 0);
        const gst = Math.round(Number(pricing.gst) || 0);

        console.log(`  Total Price (from DB): ₹${totalPrice}`);
        console.log(`  Diamond Price: ₹${diamondPrice}`);
        console.log(`  Gold Price: ₹${goldPrice}`);
        console.log(`  Making Charge: ₹${makingCharge}`);
        console.log(`  GST: ₹${gst}`);

        const result = {
          diamondPrice,
          goldPrice,
          makingCharge,
          subtotal: totalPrice - gst,
          gst,
          totalPrice,
        };

        console.log("\n✅ [FIXED PRICING RESULT]");
        console.log(JSON.stringify(result, null, 2));

        setPriceData(result);
        setLoading(false);
        return;
      }

      // Use synced product_prices data if available (live mode)
      // ⚠️  NOTE: This mode does NOT use your dynamic pricing config!
      if (pricing && pricing.diamond_price && pricing[`weight_${karatNum}k`]) {
        console.log("\n💻 [MODE: LIVE PRICING FROM SYNCED DATA]");
        console.log(
          "  ⚠️  WARNING: This mode uses SYNCED data, NOT dynamic config!",
        );
        console.log(
          "  Diamond multiplier changes in config will NOT affect prices",
        );
        console.log(
          "  To use updated config, delete synced fields or use fallback mode",
        );
        console.log("  Using synced product_prices data");

        try {
          const weightK = Number(pricing[`weight_${karatNum}k`]) || 0;
          const diamondPrice = Math.round(Number(pricing.diamond_price) || 0);

          console.log(`  Gold Weight (${karatNum}K): ${weightK}g`);
          console.log(`  Diamond Price (synced): ₹${diamondPrice}`);

          // Fetch live 24K gold rate from Groww
          let gold24Price = 8500; // fallback
          console.log(`\n  💰 Fetching live 24K gold price...`);

          try {
            const goldRes = await fetch("/api/gold-price");
            const goldData = await goldRes.json();

            console.log(`  API Response:`, goldData);

            if (goldData.success && goldData.price) {
              gold24Price = goldData.price;
              console.log(`  ✅ Live 24K Gold Price: ₹${gold24Price}/gram`);
            } else {
              console.log(
                `  ⚠️  API unsuccessful, using fallback: ₹${gold24Price}/gram`,
              );
            }
          } catch (e) {
            console.warn(`  ❌ Gold price fetch failed:`, e.message);
            console.log(`  ⚠️  Using fallback: ₹${gold24Price}/gram`);
          }

          const karatRate = gold24Price * (karatNum / 24);
          console.log(
            `  ${karatNum}K Rate: ₹${gold24Price} × (${karatNum}/24) = ₹${karatRate.toFixed(2)}/gram`,
          );

          const rawGoldPrice = karatRate * weightK;
          console.log(
            `  Gold Price Calculation: ₹${karatRate.toFixed(2)} × ${weightK}g = ₹${rawGoldPrice.toFixed(2)}`,
          );

          const makingChargeRate = weightK >= 2 ? weightK * 700 : weightK * 950;
          const makingChargeMultiplied = makingChargeRate * 1.75;

          console.log(`\n  🔨 Making Charges:`);
          console.log(
            `     Rate Per Gram (${weightK >= 2 ? ">= 2g" : "< 2g"}): ₹${weightK >= 2 ? 700 : 950}/gram`,
          );
          console.log(
            `     Before Multiplier: ${weightK} × ${weightK >= 2 ? 700 : 950} = ₹${makingChargeRate}`,
          );
          console.log(
            `     After Multiplier (×1.75): ₹${makingChargeRate} × 1.75 = ₹${makingChargeMultiplied}`,
          );

          const subtotal = Math.round(
            diamondPrice + rawGoldPrice + makingChargeMultiplied,
          );
          const goldPrice = Math.round(rawGoldPrice);
          const makingCharge = Math.round(makingChargeMultiplied);
          const gst = Math.round(subtotal * 0.03);
          const totalPrice = subtotal + gst;

          const result = {
            diamondPrice,
            goldPrice,
            makingCharge,
            subtotal,
            gst,
            totalPrice,
          };

          console.log("\n✅ [LIVE PRICING RESULT]");
          console.log(JSON.stringify(result, null, 2));

          setPriceData(result);
          setLoading(false);
          return;
        } catch (e) {
          console.warn("⚠️  [LIVE PRICING] Calculation failed:", e.message);
          console.log("  Falling back to HTML parsing and calculation...");
        }
      }

      // Fallback: parse HTML and calculate client-side
      if (!descriptionHtml) {
        console.log(
          "\n❌ [FALLBACK] No descriptionHtml available - cannot calculate",
        );
        setLoading(false);
        return;
      }

      console.log("\n🔄 [MODE: FALLBACK - HTML PARSING & DYNAMIC CALCULATION]");
      console.log("  Parsing descriptionHtml and using calculateFinalPrice()");
      console.log("  This mode USES your dynamic pricing config ✅");

      // Clear caches to ensure fresh config
      console.log("  🗑️  Clearing all caches for fresh config...");
      clearAllCaches();

      const parser = new DOMParser();
      const doc = parser.parseFromString(descriptionHtml, "text/html");
      const liElements = doc.querySelectorAll(".product-description ul li");

      console.log(`  Found ${liElements.length} specification items`);

      const specMap = {};
      liElements.forEach((li) => {
        const key = li
          .querySelector("strong")
          ?.textContent.replace(":", "")
          .trim();
        const value = li.textContent
          .replace(li.querySelector("strong")?.textContent || "", "")
          .trim();
        if (key && value) {
          specMap[key] = value;
          console.log(`    ✓ ${key}: ${value}`);
        }
      });

      // extract diamond data
      const shapes =
        specMap["Diamond Shape"]?.split(",").map((v) => v.trim()) || [];
      const weights =
        specMap["Diamond Weight"]?.split(",").map((v) => v.trim()) || [];
      const counts =
        specMap["Total Diamonds"]?.split(",").map((v) => v.trim()) || [];

      const diamonds = shapes.map((shape, i) => ({
        shape,
        weight: parseFloat(weights[i]) || 0,
        count: parseInt(counts[i]) || 0,
      }));

      console.log(`\n  💎 Extracted Diamond Data:`);
      console.log(JSON.stringify(diamonds, null, 4));

      // extract gold info
      const goldWeightKey = Object.keys(specMap).find((key) =>
        key.toLowerCase().includes(selectedKarat.toLowerCase()),
      );
      const goldWeight = parseFloat(specMap[goldWeightKey]) || 0;

      console.log(`\n  ⭐ Extracted Gold Data:`);
      console.log(`     Key Found: "${goldWeightKey}"`);
      console.log(`     Weight (${selectedKarat}): ${goldWeight}g`);

      // calculate
      console.log(
        `\n  📊 Calling calculateFinalPrice() with config multipliers...`,
      );
      const result = await calculateFinalPrice({
        diamonds,
        goldWeight,
        goldKarat: selectedKarat,
      });

      console.log("\n✅ [FALLBACK CALCULATION RESULT]");
      console.log(JSON.stringify(result, null, 2));

      setPriceData(result);
      setLoading(false);
    }

    computePrice();
  }, [descriptionHtml, selectedOptions, pricing]);

  useEffect(() => {
    if (priceData && onPriceData) {
      console.log("📤 [CALLBACK] Sending priceData to parent component");
      console.log(JSON.stringify(priceData, null, 2));
      onPriceData(priceData);
    }
  }, [priceData, onPriceData]);

  if (loading) return <p>Calculating price...</p>;
  if (!priceData) return <p>No price data available.</p>;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 text-gray-700 text-sm sm:text-base">
      <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
        <tbody>
          <tr className="border-b">
            <td className="py-2 px-3 font-semibold">Diamond Price</td>
            <td className="py-2 px-3 text-right">
              {formatINR(priceData.diamondPrice)}
            </td>
          </tr>
          <tr className="border-b">
            <td className="py-2 px-3 font-semibold">Gold Price</td>
            <td className="py-2 px-3 text-right">
              {formatINR(priceData.goldPrice)}
            </td>
          </tr>
          <tr className="border-b">
            <td className="py-2 px-3 font-semibold">Making Charges</td>
            <td className="py-2 px-3 text-right">
              {formatINR(priceData.makingCharge)}
            </td>
          </tr>
          <tr className="border-b">
            <td className="py-2 px-3 font-semibold">Subtotal</td>
            <td className="py-2 px-3 text-right">
              {formatINR(priceData.subtotal)}
            </td>
          </tr>
          <tr className="border-b">
            <td className="py-2 px-3 font-semibold">GST (3%)</td>
            <td className="py-2 px-3 text-right">{formatINR(priceData.gst)}</td>
          </tr>
          <tr className="bg-gray-50 font-semibold text-gray-900">
            <td className="py-2 px-3">Total Price</td>
            <td className="py-2 px-3 text-right">
              {formatINR(priceData.totalPrice)}
            </td>
          </tr>
        </tbody>
      </table>
      <h4 className="mt-4 text-gray-600 text-xs sm:text-sm">
        *Final weight may vary slightly. Any price difference will be
        communicated before dispatch.
      </h4>
    </div>
  );
}
