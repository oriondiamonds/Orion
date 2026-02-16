// API to list all products for admin coupon targeting
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../utils/supabase-admin.js";

export async function GET() {
  try {
    // Fetch all products with basic info
    const { data: products, error } = await supabaseAdmin
      .from("products")
      .select("id, title, handle")
      .eq("status", "active")
      .order("title");

    if (error) throw error;

    // Format for dropdown: id and name
    const formattedProducts = products.map(p => ({
      id: p.id.toString(),
      name: p.title,
      handle: p.handle
    }));

    return NextResponse.json({
      success: true,
      products: formattedProducts
    });
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
