import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../utils/supabase-admin.js";
import Papa from "papaparse";

const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || "changeme123").trim();

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/1Eb0AMDHBkZmjTqR8FNJZeul2krlD_DFKHuJvIVGqELQ/gviz/tq?tqx=out:csv&sheet=Extracted%20Prices";

function verifyPassword(password) {
  return password && String(password).trim() === ADMIN_PASSWORD;
}

// POST — Fetch Google Sheet CSV and upsert into product_prices
export async function POST(request) {
  try {
    const body = await request.json();

    if (!verifyPassword(body.password)) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Fetch the Google Sheet CSV
    const res = await fetch(CSV_URL);
    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Google Sheet" },
        { status: 502 }
      );
    }

    const csv = await res.text();
    const parsed = Papa.parse(csv, { header: true });

    // Filter valid rows
    const rows = parsed.data.filter(
      (row) => row.Handle && row.Handle.trim() !== ""
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No valid rows found in sheet" },
        { status: 400 }
      );
    }

    // Upsert each row into product_prices with full breakdown
    const upsertData = rows.map((row) => ({
      handle: row.Handle.trim(),
      price_10k: Number(row["10K Price"] || 0),
      price_14k: Number(row["14K Price"] || 0),
      price_18k: Number(row["18K Price"] || 0),
      weight_10k: Number(row["10K Weight (g)"] || 0),
      weight_14k: Number(row["14K Weight (g)"] || 0),
      weight_18k: Number(row["18K Weight (g)"] || 0),
      diamond_shapes: (row["Diamond Shapes"] || "").trim(),
      total_diamonds: (row["Total Diamonds"] || "").trim(),
      diamond_weight: (row["Diamond Weight (each)"] || "").trim(),
      total_diamond_weight: (row["Total Diamond Weight"] || "").trim(),
      diamond_price: Number(row["Diamond Price"] || 0),
      gold_price_14k: Number(row["14k Gold Price"] || 0),
      making_charges: Number(row["Making charges"] || 0),
      gst: Number(row["GST"] || 0),
      source: "sheet",
      synced_at: new Date().toISOString(),
    }));

    const { error } = await supabaseAdmin.from("product_prices").upsert(
      upsertData,
      { onConflict: "handle" }
    );

    if (error) throw error;

    return NextResponse.json({
      success: true,
      synced: upsertData.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Sync pricing error:", error);
    return NextResponse.json(
      { error: error.message || "Sync failed" },
      { status: 500 }
    );
  }
}
