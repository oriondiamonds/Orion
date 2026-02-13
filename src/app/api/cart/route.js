// src/app/api/cart/route.js
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../utils/supabase-admin.js";

/**
 * GET /api/cart?email=customer@email.com
 * Fetch cart items for customer
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("carts")
      .select("items")
      .eq("email", email.toLowerCase().trim())
      .single();

    // No cart found is not an error — return empty
    if (error && error.code === "PGRST116") {
      return NextResponse.json({
        success: true,
        items: [],
        itemCount: 0,
      });
    }

    if (error) throw error;

    const items = data?.items || [];
    return NextResponse.json({
      success: true,
      items,
      itemCount: items.length,
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return NextResponse.json(
      { error: "Failed to fetch cart", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cart
 * Save/update entire cart for customer
 */
export async function POST(request) {
  try {
    const { email, items } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: "Items must be an array" },
        { status: 400 }
      );
    }

    // Validate items
    const validItems = items.filter((item) => {
      return (
        item &&
        item.variantId &&
        item.handle &&
        item.title &&
        item.quantity &&
        item.quantity > 0
      );
    });

    if (validItems.length !== items.length) {
      console.warn(
        `Filtered out ${items.length - validItems.length} invalid items`
      );
    }

    const { error } = await supabaseAdmin
      .from("carts")
      .upsert(
        {
          email: email.toLowerCase().trim(),
          items: validItems,
        },
        { onConflict: "email" }
      );

    if (error) throw error;

    return NextResponse.json({
      success: true,
      itemCount: validItems.length,
      message: "Cart saved successfully",
    });
  } catch (error) {
    console.error("Error saving cart:", error);
    return NextResponse.json(
      { error: "Failed to save cart", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/cart
 * Add or update a single item in cart
 */
export async function PUT(request) {
  try {
    const { email, item } = await request.json();

    if (!email || !item) {
      return NextResponse.json(
        { error: "Email and item required" },
        { status: 400 }
      );
    }

    // Validate item
    if (
      !item.variantId ||
      !item.handle ||
      !item.title ||
      !item.quantity ||
      item.quantity < 1
    ) {
      return NextResponse.json({ error: "Invalid item data" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Fetch existing cart
    const { data: cart, error: fetchError } = await supabaseAdmin
      .from("carts")
      .select("items")
      .eq("email", normalizedEmail)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

    if (!cart) {
      // Create new cart with this item
      const { error: insertError } = await supabaseAdmin
        .from("carts")
        .insert({ email: normalizedEmail, items: [item] });

      if (insertError) throw insertError;

      return NextResponse.json({
        success: true,
        itemCount: 1,
        message: "Item added to new cart",
      });
    }

    // Modify items array
    const items = cart.items || [];
    const existingIdx = items.findIndex((i) => i.variantId === item.variantId);

    if (existingIdx > -1) {
      items[existingIdx] = { ...items[existingIdx], ...item };
    } else {
      items.push(item);
    }

    const { error: updateError } = await supabaseAdmin
      .from("carts")
      .update({ items })
      .eq("email", normalizedEmail);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      itemCount: items.length,
      message: "Item added/updated successfully",
    });
  } catch (error) {
    console.error("Error updating cart item:", error);
    return NextResponse.json(
      { error: "Failed to update cart item", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cart?email=customer@email.com&variantId=xyz
 * Clear entire cart or remove a specific item
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const variantId = searchParams.get("variantId");

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (variantId) {
      // Remove specific item from cart
      const { data: cart, error: fetchError } = await supabaseAdmin
        .from("carts")
        .select("items")
        .eq("email", normalizedEmail)
        .single();

      if (fetchError && fetchError.code === "PGRST116") {
        return NextResponse.json({
          success: true,
          message: "Cart not found",
        });
      }
      if (fetchError) throw fetchError;

      const updatedItems = (cart.items || []).filter(
        (item) => item.variantId !== variantId
      );

      const { error: updateError } = await supabaseAdmin
        .from("carts")
        .update({ items: updatedItems })
        .eq("email", normalizedEmail);

      if (updateError) throw updateError;

      return NextResponse.json({
        success: true,
        itemCount: updatedItems.length,
        message: "Item removed from cart",
      });
    } else {
      // Clear entire cart
      const { error: deleteError } = await supabaseAdmin
        .from("carts")
        .delete()
        .eq("email", normalizedEmail);

      if (deleteError) throw deleteError;

      return NextResponse.json({
        success: true,
        message: "Cart cleared",
      });
    }
  } catch (error) {
    console.error("Error deleting cart:", error);
    return NextResponse.json(
      { error: "Failed to delete cart", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/cart
 * Update item quantity
 */
export async function PATCH(request) {
  try {
    const { email, variantId, quantity } = await request.json();

    if (!email || !variantId || !quantity) {
      return NextResponse.json(
        { error: "Email, variantId, and quantity required" },
        { status: 400 }
      );
    }

    if (quantity < 1) {
      return NextResponse.json(
        { error: "Quantity must be at least 1" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const { data: cart, error: fetchError } = await supabaseAdmin
      .from("carts")
      .select("items")
      .eq("email", normalizedEmail)
      .single();

    if (fetchError && fetchError.code === "PGRST116") {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }
    if (fetchError) throw fetchError;

    const items = cart.items || [];
    const itemIndex = items.findIndex((item) => item.variantId === variantId);

    if (itemIndex === -1) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    items[itemIndex].quantity = quantity;

    const { error: updateError } = await supabaseAdmin
      .from("carts")
      .update({ items })
      .eq("email", normalizedEmail);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: "Quantity updated",
    });
  } catch (error) {
    console.error("Error updating quantity:", error);
    return NextResponse.json(
      { error: "Failed to update quantity", details: error.message },
      { status: 500 }
    );
  }
}
