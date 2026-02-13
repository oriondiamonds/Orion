import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../utils/supabase-admin.js";

const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || "changeme123").trim();

function verifyPassword(password) {
  return password && String(password).trim() === ADMIN_PASSWORD;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// GET — List products OR fetch single product detail
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const detailId = searchParams.get("detail");

    // If detail ID is provided, return full product data for editing
    if (detailId) {
      const { data: product, error } = await supabaseAdmin
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
        .eq("id", detailId)
        .single();

      if (error) throw error;

      // Sort images by position, options by position
      if (product.images)
        product.images.sort((a, b) => a.position - b.position);
      if (product.options)
        product.options.sort((a, b) => a.position - b.position);

      // Fetch pricing data
      const { data: pricing } = await supabaseAdmin
        .from("product_prices")
        .select("*")
        .eq("handle", product.handle)
        .maybeSingle();

      product.pricing = pricing || null;

      return NextResponse.json({ success: true, product });
    }

    // Default: list all products (lightweight)
    const [productsRes, pricingRes, collectionsRes, cpRes] = await Promise.all([
      supabaseAdmin
        .from("products")
        .select(
          `
          id,
          handle,
          title,
          featured_image_url,
          created_at,
          variants:product_variants(id),
          options:product_options(id)
        `
        )
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("product_prices").select("handle"),
      supabaseAdmin
        .from("collections")
        .select("id, handle, title")
        .order("title"),
      supabaseAdmin
        .from("collection_products")
        .select("collection_id, product_id"),
    ]);

    if (productsRes.error) throw productsRes.error;

    const products = productsRes.data || [];
    const pricingSet = new Set(
      (pricingRes.data || []).map((r) => r.handle)
    );
    const collections = collectionsRes.data || [];

    // Build product_id → collection titles map
    const collectionMap = {};
    for (const c of collections) {
      collectionMap[c.id] = c.title;
    }
    const productCollections = {};
    for (const cp of cpRes.data || []) {
      if (!productCollections[cp.product_id])
        productCollections[cp.product_id] = [];
      const title = collectionMap[cp.collection_id];
      if (title) productCollections[cp.product_id].push(title);
    }

    const result = products.map((p) => ({
      id: p.id,
      handle: p.handle,
      title: p.title,
      featured_image_url: p.featured_image_url,
      created_at: p.created_at,
      variant_count: (p.variants || []).length,
      option_count: (p.options || []).length,
      has_pricing: pricingSet.has(p.handle),
      collections: productCollections[p.id] || [],
    }));

    return NextResponse.json({
      success: true,
      products: result,
      collections,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// POST — Create a new product
export async function POST(request) {
  try {
    const { password, product } = await request.json();

    if (!verifyPassword(password)) {
      return NextResponse.json(
        { error: "Invalid admin password" },
        { status: 401 }
      );
    }

    if (!product?.title) {
      return NextResponse.json(
        { error: "Product title is required" },
        { status: 400 }
      );
    }

    const handle = product.handle || slugify(product.title);

    // Check handle uniqueness
    const { data: existing } = await supabaseAdmin
      .from("products")
      .select("id")
      .eq("handle", handle)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `A product with handle "${handle}" already exists` },
        { status: 409 }
      );
    }

    // 1. Insert product
    const { data: newProduct, error: productError } = await supabaseAdmin
      .from("products")
      .insert({
        handle,
        title: product.title,
        description: product.description || null,
        description_html: product.description_html || null,
        featured_image_url: product.featured_image_url || null,
        featured_image_alt: product.featured_image_alt || product.title,
      })
      .select()
      .single();

    if (productError) throw productError;

    const productId = newProduct.id;

    // 2. Insert images
    if (product.images?.length > 0) {
      const imageRows = product.images.map((img, i) => ({
        product_id: productId,
        url: img.url,
        alt_text: img.alt_text || product.title,
        position: i,
      }));

      const { error: imgError } = await supabaseAdmin
        .from("product_images")
        .insert(imageRows);

      if (imgError) console.error("Image insert error:", imgError.message);
    }

    // 3. Insert options
    if (product.options?.length > 0) {
      const optionRows = product.options.map((opt, i) => ({
        product_id: productId,
        name: opt.name,
        values: opt.values,
        position: i,
      }));

      const { error: optError } = await supabaseAdmin
        .from("product_options")
        .insert(optionRows);

      if (optError) console.error("Option insert error:", optError.message);
    }

    // 4. Insert variants + selected_options
    if (product.variants?.length > 0) {
      for (const variant of product.variants) {
        const { data: newVariant, error: varError } = await supabaseAdmin
          .from("product_variants")
          .insert({
            product_id: productId,
            title: variant.title,
            sku: variant.sku || null,
            available_for_sale: variant.available_for_sale ?? true,
            price_amount: variant.price_amount || 0,
            price_currency_code: "INR",
          })
          .select("id")
          .single();

        if (varError) {
          console.error("Variant insert error:", varError.message);
          continue;
        }

        if (variant.selected_options?.length > 0) {
          const soRows = variant.selected_options.map((so) => ({
            variant_id: newVariant.id,
            option_name: so.option_name,
            option_value: so.option_value,
          }));

          const { error: soError } = await supabaseAdmin
            .from("variant_selected_options")
            .insert(soRows);

          if (soError)
            console.error("Selected options insert error:", soError.message);
        }
      }
    }

    // 5. Upsert product_prices if pricing data provided
    if (product.pricing) {
      const pricingRow = {
        handle,
        price_10k: parseFloat(product.pricing.price_10k) || 0,
        price_14k: parseFloat(product.pricing.price_14k) || 0,
        price_18k: parseFloat(product.pricing.price_18k) || 0,
        weight_10k: parseFloat(product.pricing.weight_10k) || 0,
        weight_14k: parseFloat(product.pricing.weight_14k) || 0,
        weight_18k: parseFloat(product.pricing.weight_18k) || 0,
        diamond_shapes: product.pricing.diamond_shapes || "",
        total_diamonds: product.pricing.total_diamonds || "",
        diamond_weight: product.pricing.diamond_weight || "",
        total_diamond_weight: product.pricing.total_diamond_weight || "",
        diamond_price: parseFloat(product.pricing.diamond_price) || 0,
        gold_price_14k: parseFloat(product.pricing.gold_price_14k) || 0,
        making_charges: parseFloat(product.pricing.making_charges) || 0,
        gst: parseFloat(product.pricing.gst) || 0,
        source: "admin",
        synced_at: new Date().toISOString(),
      };

      const { error: pricingError } = await supabaseAdmin
        .from("product_prices")
        .upsert(pricingRow, { onConflict: "handle" });

      if (pricingError)
        console.error("Pricing upsert error:", pricingError.message);
    }

    return NextResponse.json({ success: true, product: newProduct });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}

// PUT — Update a product
export async function PUT(request) {
  try {
    const { password, id, product } = await request.json();

    if (!verifyPassword(password)) {
      return NextResponse.json(
        { error: "Invalid admin password" },
        { status: 401 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Update main product fields
    const updates = {};
    if (product.title !== undefined) updates.title = product.title;
    if (product.handle !== undefined) updates.handle = product.handle;
    if (product.description !== undefined)
      updates.description = product.description;
    if (product.description_html !== undefined)
      updates.description_html = product.description_html;
    if (product.featured_image_url !== undefined)
      updates.featured_image_url = product.featured_image_url;
    if (product.featured_image_alt !== undefined)
      updates.featured_image_alt = product.featured_image_alt;

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      const { error: updateError } = await supabaseAdmin
        .from("products")
        .update(updates)
        .eq("id", id);

      if (updateError) throw updateError;
    }

    // Replace images if provided
    if (product.images !== undefined) {
      await supabaseAdmin
        .from("product_images")
        .delete()
        .eq("product_id", id);

      if (product.images.length > 0) {
        const imageRows = product.images.map((img, i) => ({
          product_id: id,
          url: img.url,
          alt_text: img.alt_text || product.title || "",
          position: i,
        }));

        await supabaseAdmin.from("product_images").insert(imageRows);
      }
    }

    // Replace options if provided
    if (product.options !== undefined) {
      await supabaseAdmin
        .from("product_options")
        .delete()
        .eq("product_id", id);

      if (product.options.length > 0) {
        const optionRows = product.options.map((opt, i) => ({
          product_id: id,
          name: opt.name,
          values: opt.values,
          position: i,
        }));

        await supabaseAdmin.from("product_options").insert(optionRows);
      }
    }

    // Replace variants if provided
    if (product.variants !== undefined) {
      // Delete old variants (cascade deletes variant_selected_options)
      await supabaseAdmin
        .from("product_variants")
        .delete()
        .eq("product_id", id);

      for (const variant of product.variants) {
        const { data: newVariant, error: varError } = await supabaseAdmin
          .from("product_variants")
          .insert({
            product_id: id,
            title: variant.title,
            sku: variant.sku || null,
            available_for_sale: variant.available_for_sale ?? true,
            price_amount: variant.price_amount || 0,
            price_currency_code: "INR",
          })
          .select("id")
          .single();

        if (varError) {
          console.error("Variant insert error:", varError.message);
          continue;
        }

        if (variant.selected_options?.length > 0) {
          const soRows = variant.selected_options.map((so) => ({
            variant_id: newVariant.id,
            option_name: so.option_name,
            option_value: so.option_value,
          }));

          await supabaseAdmin
            .from("variant_selected_options")
            .insert(soRows);
        }
      }
    }

    // Upsert product_prices if pricing data provided
    if (product.pricing !== undefined) {
      // Get handle for pricing table key
      const { data: currentProduct } = await supabaseAdmin
        .from("products")
        .select("handle")
        .eq("id", id)
        .single();

      if (currentProduct) {
        const pricing = product.pricing;
        if (pricing && Object.values(pricing).some((v) => v)) {
          const pricingRow = {
            handle: currentProduct.handle,
            price_10k: parseFloat(pricing.price_10k) || 0,
            price_14k: parseFloat(pricing.price_14k) || 0,
            price_18k: parseFloat(pricing.price_18k) || 0,
            weight_10k: parseFloat(pricing.weight_10k) || 0,
            weight_14k: parseFloat(pricing.weight_14k) || 0,
            weight_18k: parseFloat(pricing.weight_18k) || 0,
            diamond_shapes: pricing.diamond_shapes || "",
            total_diamonds: pricing.total_diamonds || "",
            diamond_weight: pricing.diamond_weight || "",
            total_diamond_weight: pricing.total_diamond_weight || "",
            diamond_price: parseFloat(pricing.diamond_price) || 0,
            gold_price_14k: parseFloat(pricing.gold_price_14k) || 0,
            making_charges: parseFloat(pricing.making_charges) || 0,
            gst: parseFloat(pricing.gst) || 0,
            source: "admin",
            synced_at: new Date().toISOString(),
          };

          await supabaseAdmin
            .from("product_prices")
            .upsert(pricingRow, { onConflict: "handle" });
        }
      }
    }

    // Fetch updated product
    const { data: updated } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    return NextResponse.json({ success: true, product: updated });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

// DELETE — Delete a product
export async function DELETE(request) {
  try {
    const { password, id } = await request.json();

    if (!verifyPassword(password)) {
      return NextResponse.json(
        { error: "Invalid admin password" },
        { status: 401 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Get handle before deleting (for pricing + storage cleanup)
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("handle")
      .eq("id", id)
      .single();

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Delete from products (CASCADE handles images, options, variants, collection_products)
    const { error } = await supabaseAdmin
      .from("products")
      .delete()
      .eq("id", id);

    if (error) throw error;

    // Clean up product_prices
    await supabaseAdmin
      .from("product_prices")
      .delete()
      .eq("handle", product.handle);

    // Clean up storage images
    try {
      const folder = `products/${product.handle}`;
      const { data: files } = await supabaseAdmin.storage
        .from("product-images")
        .list(folder);

      if (files?.length > 0) {
        const paths = files.map((f) => `${folder}/${f.name}`);
        await supabaseAdmin.storage.from("product-images").remove(paths);
      }
    } catch (storageErr) {
      console.warn("Storage cleanup error:", storageErr.message);
    }

    return NextResponse.json({
      success: true,
      message: "Product deleted",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
