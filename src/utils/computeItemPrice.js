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
  if (pricing?.diamond_price && pricing[`weight_${karatNum}k`]) {
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

  // Mode 3: Fallback — parse HTML description and use calculateFinalPrice()
  if (descriptionHtml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(descriptionHtml, "text/html");
    const liElements = doc.querySelectorAll(".product-description ul li");
    const specMap = {};
    liElements.forEach((li) => {
      const key = li.querySelector("strong")?.textContent.replace(":", "").trim();
      const value = li.textContent
        .replace(li.querySelector("strong")?.textContent || "", "")
        .trim();
      if (key && value) specMap[key] = value;
    });

    const shapes = specMap["Diamond Shape"]?.split(",").map((v) => v.trim()) || [];
    const weights = specMap["Diamond Weight"]?.split(",").map((v) => v.trim()) || [];
    const counts = specMap["Total Diamonds"]?.split(",").map((v) => v.trim()) || [];
    const diamonds = shapes.map((shape, i) => ({
      shape,
      weight: parseFloat(weights[i]) || 0,
      count: parseInt(counts[i]) || 0,
    }));

    const goldWeightKey = Object.keys(specMap).find((k) =>
      k.toLowerCase().includes(selectedKarat.toLowerCase())
    );
    const goldWeight = parseFloat(specMap[goldWeightKey]) || 0;

    const result = await calculateFinalPrice({ diamonds, goldWeight, goldKarat: selectedKarat });
    if (result) return result;
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
