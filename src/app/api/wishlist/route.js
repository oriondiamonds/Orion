import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../utils/supabase-admin.js";

/**
 * GET /api/wishlist?email=customer@email.com
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("wishlists")
      .select("items")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (error && error.code === "PGRST116") {
      return NextResponse.json({ success: true, items: [] });
    }

    if (error) throw error;

    return NextResponse.json({
      success: true,
      items: data?.items || [],
    });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    return NextResponse.json(
      { error: "Failed to fetch wishlist", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wishlist
 * Save/replace entire wishlist (upsert)
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

    const validItems = items.filter(
      (item) => item && item.id && item.handle && item.title
    );

    const { error } = await supabaseAdmin
      .from("wishlists")
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
      message: "Wishlist saved successfully",
    });
  } catch (error) {
    console.error("Error saving wishlist:", error);
    return NextResponse.json(
      { error: "Failed to save wishlist", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/wishlist?email=...&variantId=... (optional variantId)
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
      const { data: wishlist, error: fetchError } = await supabaseAdmin
        .from("wishlists")
        .select("items")
        .eq("email", normalizedEmail)
        .single();

      if (fetchError && fetchError.code === "PGRST116") {
        return NextResponse.json({ success: true, message: "Wishlist not found" });
      }
      if (fetchError) throw fetchError;

      const updatedItems = (wishlist.items || []).filter(
        (item) => item.variantId !== variantId
      );

      const { error: updateError } = await supabaseAdmin
        .from("wishlists")
        .update({ items: updatedItems })
        .eq("email", normalizedEmail);

      if (updateError) throw updateError;

      return NextResponse.json({
        success: true,
        itemCount: updatedItems.length,
        message: "Item removed from wishlist",
      });
    } else {
      const { error: deleteError } = await supabaseAdmin
        .from("wishlists")
        .delete()
        .eq("email", normalizedEmail);

      if (deleteError) throw deleteError;

      return NextResponse.json({ success: true, message: "Wishlist cleared" });
    }
  } catch (error) {
    console.error("Error deleting wishlist:", error);
    return NextResponse.json(
      { error: "Failed to delete wishlist", details: error.message },
      { status: 500 }
    );
  }
}
