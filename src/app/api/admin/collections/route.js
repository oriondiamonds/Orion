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

// POST — Create a new collection
export async function POST(request) {
  try {
    const { password, title } = await request.json();

    if (!verifyPassword(password)) {
      return NextResponse.json(
        { error: "Invalid admin password" },
        { status: 401 }
      );
    }

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Collection title is required" },
        { status: 400 }
      );
    }

    const handle = slugify(title.trim());

    // Check handle uniqueness
    const { data: existing } = await supabaseAdmin
      .from("collections")
      .select("id")
      .eq("handle", handle)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `A collection with handle "${handle}" already exists` },
        { status: 409 }
      );
    }

    const { data: collection, error } = await supabaseAdmin
      .from("collections")
      .insert({ handle, title: title.trim() })
      .select("id, handle, title")
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, collection });
  } catch (error) {
    console.error("Error creating collection:", error);
    return NextResponse.json(
      { error: "Failed to create collection" },
      { status: 500 }
    );
  }
}
