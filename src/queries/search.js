import {
  fetchSearchProducts,
  transformProductData,
} from "./supabase-helpers.js";

export async function searchProducts(query, first = 50) {
  const products = await fetchSearchProducts(query, first);
  return {
    products: {
      edges: products.map((p) => ({
        node: transformProductData(p),
      })),
    },
  };
}
