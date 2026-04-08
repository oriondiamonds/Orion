import { useEffect, useState } from "react";
import { calculateFinalPrice } from "../utils/price";
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

      // No description available and no DB diamond data — cannot calculate
      if (!descriptionHtml && !pricing?.diamond_shapes) {
        console.log("\n❌ No diamond data available — cannot calculate");
        setLoading(false);
        return;
      }

      console.log("\n🔄 [MODE: DYNAMIC CALCULATION]");
      console.log("  This mode USES your dynamic pricing config ✅");

      // Gold weight from DB
      const goldWeight = Number(pricing?.[`weight_${karatNum}k`]) || 0;
      console.log(`\n  ⭐ Gold Weight (${selectedKarat}): ${goldWeight}g`);

      let diamonds = [];

      // Prefer structured DB columns — more reliable than HTML parsing
      // diamond_weight and total_diamonds must be comma-separated strings matching shape count
      if (pricing?.diamond_shapes && pricing?.diamond_weight && pricing?.total_diamonds) {
        const shapes  = String(pricing.diamond_shapes).split(",").map((v) => v.trim()).filter(Boolean);
        const weights = String(pricing.diamond_weight).split(",").map((v) => v.trim());
        const counts  = String(pricing.total_diamonds).split(",").map((v) => v.trim());
        // Only use DB path if per-group data is present (counts match number of shape groups)
        if (weights.length === shapes.length && counts.length === shapes.length) {
          console.log("  💎 Reading diamond data from DB columns");
          diamonds = shapes.map((shape, i) => ({
            shape,
            weight: parseFloat(weights[i]) || 0,
            count:  parseInt(counts[i])    || 0,
          })).filter((d) => d.weight > 0 && d.count > 0);
        } else {
          console.log("  ⚠️ DB columns have aggregate values (not per-group) — falling back to HTML");
        }
      }

      // Fall back to HTML parsing if DB columns missing or have aggregate-only values
      if (!diamonds.length && descriptionHtml) {
        console.log("  💎 DB columns missing/invalid — falling back to HTML parsing");
        const parser = new DOMParser();
        const doc = parser.parseFromString(descriptionHtml, "text/html");
        const liElements = doc.querySelectorAll(".product-description ul li");
        const specMap = {};
        liElements.forEach((li) => {
          const key = li.querySelector("strong")?.textContent.replace(":", "").trim();
          const value = li.textContent.replace(li.querySelector("strong")?.textContent || "", "").trim();
          if (key && value) { specMap[key] = value; console.log(`    ✓ ${key}: ${value}`); }
        });
        const shapes  = specMap["Diamond Shape"]?.split(",").map((v) => v.trim()) || [];
        const weights = specMap["Diamond Weight"]?.split(",").map((v) => v.trim()) || [];
        const countRaw = specMap["Diamond Count"] || specMap["Total Diamonds"] || "";
        const counts   = countRaw.split(",").map((v) => v.trim());
        diamonds = shapes.map((shape, i) => ({
          shape,
          weight: parseFloat(weights[i]) || 0,
          count:  parseInt(counts[i])    || 0,
        })).filter((d) => d.weight > 0 && d.count > 0);
      }

      console.log(`\n  💎 Diamond Data:`, JSON.stringify(diamonds));

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
