import { supabase } from "../utils/supabase.js";

// Transform a Supabase product row into the shape
// existing page code expects
export function transformProductData(product) {
  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    description: product.description,
    descriptionHtml: product.description_html,
    featuredImage: product.featured_image_url
      ? {
          url: product.featured_image_url,
          altText: product.featured_image_alt || product.title,
        }
      : null,
    images: {
      edges: (product.images || [])
        .sort((a, b) => a.position - b.position)
        .map((img) => ({
          node: {
            url: img.url,
            altText: img.alt_text || product.title,
          },
        })),
    },
    options: (product.options || [])
      .sort((a, b) => a.position - b.position)
      .map((opt) => ({
        id: opt.id,
        name: opt.name,
        values: opt.values,
      })),
    variants: {
      edges: (product.variants || []).map((variant) => ({
        node: {
          id: variant.id,
          title: variant.title,
          sku: variant.sku,
          availableForSale: variant.available_for_sale,
          price: {
            amount: String(variant.price_amount),
            currencyCode: variant.price_currency_code,
          },
          selectedOptions: (variant.selected_options || []).map((opt) => ({
            name: opt.option_name,
            value: opt.option_value,
          })),
          image: variant.image_url
            ? {
                url: variant.image_url,
                altText: variant.image_alt || product.title,
              }
            : null,
          weight: variant.weight,
          weightUnit: variant.weight_unit,
        },
      })),
    },
    pricing: product.pricing || null,
  };
}

// Transform a Supabase collection row into the expected shape
export function transformCollectionData(collection) {
  const productEdges = (collection.collection_products || [])
    .sort((a, b) => a.position - b.position)
    .map(({ product }) => ({
      node: transformProductData(product),
    }));

  return {
    collection: {
      title: collection.title,
      products: {
        edges: productEdges,
      },
    },
  };
}

// Fetch a product by handle with all related data
export async function fetchProductByHandle(handle) {
  const { data: product, error } = await supabase
    .from("products")
    .select(
      `
      *,
      images:product_images(*),
      options:product_options(*),
      variants:product_variants(
        *,
        selected_options:variant_selected_options(*)
      )
    `
    )
    .eq("handle", handle)
    .single();

  if (error) {
    console.error(`Error fetching product "${handle}":`, error.message);
    return null;
  }

  // Fetch synced pricing data from product_prices table
  const { data: pricing } = await supabase
    .from("product_prices")
    .select("*")
    .eq("handle", handle)
    .maybeSingle();

  if (product) product.pricing = pricing;

  return product;
}

// Fetch a collection by handle with all product data
export async function fetchCollectionByHandle(handle) {
  const { data: collection, error } = await supabase
    .from("collections")
    .select(
      `
      *,
      collection_products(
        position,
        product:products(
          *,
          images:product_images(*),
          options:product_options(*),
          variants:product_variants(
            *,
            selected_options:variant_selected_options(*)
          )
        )
      )
    `
    )
    .eq("handle", handle)
    .single();

  if (error) {
    console.error(`Error fetching collection "${handle}":`, error.message);
    return null;
  }

  return collection;
}

// Search products using full-text search
export async function fetchSearchProducts(query, limit = 50) {
  const { data: products, error } = await supabase
    .from("products")
    .select(
      `
      *,
      variants:product_variants(
        *,
        selected_options:variant_selected_options(*)
      )
    `
    )
    .textSearch("search_vector", query, {
      type: "websearch",
      config: "english",
    })
    .limit(limit);

  if (error) {
    console.error("Error searching products:", error.message);
    return [];
  }

  return products || [];
}
