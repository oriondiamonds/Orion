// src/app/api/pricing-config/route.js
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../utils/supabase-admin.js";

const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || "changeme123").trim();

console.log("🔑 Admin password configured:", ADMIN_PASSWORD);

// Default configuration (used as fallback if table is empty)
const DEFAULT_CONFIG = {
  diamondMargins: {
    lessThan1ct: {
      multiplier: 2.2,
      flatAddition: 900,
      description: "For diamonds < 1ct: multiply by 2.2 and add ₹900",
    },
    greaterThan1ct: {
      multiplier: 2.7,
      flatAddition: 0,
      description: "For diamonds ≥ 1ct: multiply by 2.7",
    },
    baseFees: {
      fee1: 150,
      fee2: 700,
      description: "Flat fees added to all diamond prices",
    },
  },
  makingCharges: {
    lessThan2g: {
      ratePerGram: 950,
      description: "For gold weight < 2g",
    },
    greaterThan2g: {
      ratePerGram: 700,
      description: "For gold weight ≥ 2g",
    },
    multiplier: 1.75,
    description: "Final making charge is multiplied by 1.75",
  },
  gstRate: 0.03,
};

// Transform Supabase row (snake_case) to API response (camelCase)
function toResponseShape(row) {
  return {
    diamondMargins: row.diamond_margins,
    makingCharges: row.making_charges,
    gstRate: Number(row.gst_rate),
    lastUpdated: row.last_updated,
    updatedBy: row.updated_by,
  };
}

// GET - Fetch current configuration (public)
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("pricing_config")
      .select("*")
      .limit(1)
      .single();

    if (error && error.code === "PGRST116") {
      // No config row exists — return defaults
      return NextResponse.json({
        ...DEFAULT_CONFIG,
        lastUpdated: new Date().toISOString(),
        updatedBy: "system",
      });
    }

    if (error) throw error;

    return NextResponse.json(toResponseShape(data));
  } catch (error) {
    console.error("Error loading config:", error);
    return NextResponse.json(
      { error: "Failed to load configuration" },
      { status: 500 }
    );
  }
}

// POST - Update configuration (protected)
export async function POST(request) {
  try {
    const body = await request.json();
    const { password, config: newConfig, updatedBy } = body;

    console.log("=== PRICING-CONFIG POST ===");
    console.log("Password received:", password ? "***" : "EMPTY");
    console.log("Match:", String(password || "").trim() === ADMIN_PASSWORD);

    // Verify password
    if (!password || String(password).trim() !== ADMIN_PASSWORD) {
      console.log("❌ Password mismatch!");
      return NextResponse.json(
        { error: "Invalid admin password" },
        { status: 401 }
      );
    }

    if (!newConfig || !newConfig.diamondMargins || !newConfig.makingCharges) {
      return NextResponse.json(
        { error: "Invalid configuration structure" },
        { status: 400 }
      );
    }

    // Get the singleton row ID
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("pricing_config")
      .select("id")
      .limit(1)
      .single();

    if (fetchError) throw fetchError;

    // Update the singleton row
    const { data, error: updateError } = await supabaseAdmin
      .from("pricing_config")
      .update({
        diamond_margins: newConfig.diamondMargins,
        making_charges: newConfig.makingCharges,
        gst_rate: newConfig.gstRate ?? DEFAULT_CONFIG.gstRate,
        last_updated: new Date().toISOString(),
        updated_by: updatedBy || "admin",
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    console.log("✅ Config saved to Supabase");

    return NextResponse.json({
      success: true,
      config: toResponseShape(data),
    });
  } catch (error) {
    console.error("Error saving config:", error);
    return NextResponse.json(
      { error: "Failed to save configuration" },
      { status: 500 }
    );
  }
}
