import {
  fetchProductByHandle,
  transformProductData,
  transformCuratedProduct,
} from "./supabase-helpers.js";
import { supabase } from "../utils/supabase.js";

export async function getProductByHandle(handle) {
  const product = await fetchProductByHandle(handle);
  if (!product) return { product: null };
  return { product: transformProductData(product) };
}

async function fetchCuratedProducts(column, limit = 8) {
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id,
      handle,
      title,
      featured_image_url,
      featured_image_alt,
      is_bestseller,
      is_featured,
      updated_at,
      variants:product_variants(price_amount, price_currency_code)
    `
    )
    .eq(column, true)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error(`Error fetching curated products for ${column}:`, error.message);
    return [];
  }

  return (data || []).map(transformCuratedProduct);
}

export async function getBestSellers(limit = 8) {
  return fetchCuratedProducts("is_bestseller", limit);
}

export async function getFeaturedProducts(limit = 8) {
  return fetchCuratedProducts("is_featured", limit);
}
