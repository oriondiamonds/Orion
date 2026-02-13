import { supabase } from "./supabase.js";

let pricingCache = null;
let lastFetch = 0;

export async function getSheetPricing() {
  const now = Date.now();

  // Cache for 1 hour
  if (pricingCache && now - lastFetch < 3600 * 1000) {
    return pricingCache;
  }

  const { data, error } = await supabase
    .from("product_prices")
    .select("handle, price_10k, price_14k, price_18k");

  if (error) {
    console.error("Error fetching product_prices:", error.message);
    return pricingCache || {};
  }

  const map = {};
  (data || []).forEach((row) => {
    map[row.handle] = {
      price10K: Number(row.price_10k || 0),
      price14K: Number(row.price_14k || 0),
      price18K: Number(row.price_18k || 0),
    };
  });

  pricingCache = map;
  lastFetch = now;

  return map;
}
