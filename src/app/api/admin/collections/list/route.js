// API to list all collections for admin coupon targeting
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../utils/supabase-admin.js";

export async function GET() {
  try {
    // Fetch all collections with basic info
    const { data: collections, error } = await supabaseAdmin
      .from("collections")
      .select("id, title, handle")
      .order("title");

    if (error) throw error;

    // Format for dropdown: handle and title (we use handle for targeting)
    const formattedCollections = collections.map(c => ({
      handle: c.handle,
      title: c.title,
      id: c.id
    }));

    return NextResponse.json({
      success: true,
      collections: formattedCollections
    });
  } catch (error) {
    console.error("Failed to fetch collections:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch collections" },
      { status: 500 }
    );
  }
}
