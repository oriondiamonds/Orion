/**
 * Compute the live price breakdown for a product item.
 * Mirrors the 3-mode logic in PriceBreakup.jsx so every add-to-cart path
 * produces the same price the product description page shows.
 *
 * @param {object} pricing   — product.pricing from getProductByHandle (may be null)
 * @param {string} descriptionHtml — product HTML description (may be null)
 * @param {string} selectedKarat  — e.g. "14K", "18K", "10K"
 * @returns {object|null} { diamondPrice, goldPrice, makingCharge, subtotal, gst, totalPrice }
 */

import { calculateFinalPrice } from "./price.js";

async function fetchGoldPrice() {
  try {
    const res = await fetch("/api/gold-price");
    const data = await res.json();
    if (data.success && data.price) return data.price;
  } catch {}
  return 8500; // fallback
}

export async function computeItemPrice(pricing, descriptionHtml, selectedKarat) {
  const karatNum = parseInt(selectedKarat);

  // Mode 2: Live pricing from synced weight data (always preferred)
  if (false) { // Mode 2 removed — diamond price now calculated dynamically via Mode 3
    const weightK = Number(pricing[`weight_${karatNum}k`]);
    const diamondPrice = Math.round(Number(pricing.diamond_price));
    const gold24Price = await fetchGoldPrice();

    const karatRate = gold24Price * (karatNum / 24);
    const rawGoldPrice = karatRate * weightK;
    const makingChargeMultiplied = weightK * 950 * 1.75; // flat ₹950/g × 1.75

    const goldPrice = Math.round(rawGoldPrice);
    const makingCharge = Math.round(makingChargeMultiplied);
    const subtotal = Math.round(diamondPrice + rawGoldPrice + makingChargeMultiplied);
    const gst = Math.round(subtotal * 0.03);
    const totalPrice = subtotal + gst;

    return { diamondPrice, goldPrice, makingCharge, subtotal, gst, totalPrice };
  }

  // Mode 3: Build diamonds from DB structured columns (preferred) or HTML fallback
  {
    const karatNum = parseInt(selectedKarat);
    const goldWeight = Number(pricing?.[`weight_${karatNum}k`]) || 0;

    let diamonds = [];

    // Prefer structured DB columns — avoids HTML parsing errors
    // diamond_weight and total_diamonds must be comma-separated strings matching shape count
    if (pricing?.diamond_shapes && pricing?.diamond_weight && pricing?.total_diamonds) {
      const shapes  = String(pricing.diamond_shapes).split(",").map((v) => v.trim()).filter(Boolean);
      const weights = String(pricing.diamond_weight).split(",").map((v) => v.trim());
      const counts  = String(pricing.total_diamonds).split(",").map((v) => v.trim());
      // Only use DB path if per-group data is present (counts match number of shape groups)
      if (weights.length === shapes.length && counts.length === shapes.length) {
        diamonds = shapes.map((shape, i) => ({
          shape,
          weight: parseFloat(weights[i]) || 0,
          count:  parseInt(counts[i])    || 0,
        })).filter((d) => d.weight > 0 && d.count > 0);
      }
    }

    // Fall back to HTML parsing if DB columns missing or have aggregate-only values
    if (!diamonds.length && descriptionHtml) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(descriptionHtml, "text/html");
      const liElements = doc.querySelectorAll(".product-description ul li");
      const specMap = {};
      liElements.forEach((li) => {
        const key = li.querySelector("strong")?.textContent.replace(":", "").trim();
        const value = li.textContent.replace(li.querySelector("strong")?.textContent || "", "").trim();
        if (key && value) specMap[key] = value;
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

    if (diamonds.length > 0 || goldWeight > 0) {
      const result = await calculateFinalPrice({ diamonds, goldWeight, goldKarat: selectedKarat });
      if (result) return result;
    }
  }

  // Mode 1: Fixed pricing — last resort when no live data is available
  if (pricing?.pricing_mode === "fixed") {
    const totalPrice = Math.round(Number(pricing[`price_${karatNum}k`]) || 0);
    const diamondPrice = Math.round(Number(pricing.diamond_price) || 0);
    const goldPrice = Math.round(Number(pricing.gold_price_14k) || 0);
    const makingCharge = Math.round(Number(pricing.making_charges) || 0);
    const gst = Math.round(Number(pricing.gst) || 0);
    return { diamondPrice, goldPrice, makingCharge, subtotal: totalPrice - gst, gst, totalPrice };
  }

  return null;
}
