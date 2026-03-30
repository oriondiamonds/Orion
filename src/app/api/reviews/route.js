import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../utils/supabase-admin.js";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get("handle");

  if (!handle) {
    return NextResponse.json({ error: "handle is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("reviews")
    .select("id, name, location, product_title, rating, text, image_url, created_at")
    .eq("product_handle", handle)
    .order("rating", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[reviews] GET error:", error.message);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }

  return NextResponse.json({ reviews: data || [] });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, location, product_handle, product_title, rating, text, image_url } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!text?.trim()) return NextResponse.json({ error: "Review text is required" }, { status: 400 });
  if (!rating || rating < 1 || rating > 5) return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("reviews")
    .insert({
      name: name.trim(),
      location: location?.trim() || null,
      product_handle: product_handle || null,
      product_title: product_title?.trim() || null,
      rating: Number(rating),
      text: text.trim(),
      image_url: image_url || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[reviews] POST error:", error.message);
    return NextResponse.json({ error: "Failed to save review" }, { status: 500 });
  }

  return NextResponse.json({ review: data }, { status: 201 });
}
