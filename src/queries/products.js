import {
  fetchProductByHandle,
  transformProductData,
} from "./supabase-helpers.js";

export async function getProductByHandle(handle) {
  const product = await fetchProductByHandle(handle);
  if (!product) return { product: null };
  return { product: transformProductData(product) };
}
