// src/app/api/pricing-config/reset/route.js
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../utils/supabase-admin.js";
import { clearPricingCache } from "../../../../utils/price.js";

const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || "changeme123").trim();

// Default configuration
const DEFAULT_CONFIG = {
  diamondMargins: {
    lessThan1ct: {
      multiplier: 2.2,
      flatAddition: 0,
      description: "For diamonds < 1ct: multiply by 2.2",
    },
    greaterThan1ct: {
      multiplier: 2.7,
      flatAddition: 0,
      description: "For diamonds ≥ 1ct and < 2ct: multiply by 2.7",
    },
    greaterThan2ct: {
      multiplier: 2.8,
      flatAddition: 0,
      description: "For diamonds ≥ 2ct and < 3ct: multiply by 2.8",
    },
    greaterThan3ct: {
      multiplier: 2.9,
      flatAddition: 0,
      description: "For diamonds ≥ 3ct and < 4ct: multiply by 2.9",
    },
    greaterThan4ct: {
      multiplier: 3.0,
      flatAddition: 0,
      description: "For diamonds ≥ 4ct and < 5ct: multiply by 3.0",
    },
    greaterThan5ct: {
      multiplier: 3.2,
      flatAddition: 0,
      description: "For diamonds ≥ 5ct: multiply by 3.2",
    },
    baseFees: {
      igiCertBelow1ct: 900,
      baseFixed: 700,
      categoryFees: {
        ring: 250, earrings: 250, pendant: 250,
        necklace: 550, bracelet: 550,
      },
      categoryDefault: 250,
      description: "IGI cert (sub-1ct stones) + base fixed + category fee",
    },
  },
  makingCharges: {
    ratePerGram: 950,
    multiplier: 1.75,
    description: "Flat ₹950/g regardless of weight, multiplied by 1.75",
  },
  gstRate: 0.03,
};

// POST - Reset configuration to defaults (protected)
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { password, updatedBy } = body || {};

    console.log("=== RESET CONFIG ===");
    console.log("Password received:", password ? "***" : "EMPTY");

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 401 },
      );
    }

    const receivedPassword = String(password).trim();
    if (receivedPassword !== ADMIN_PASSWORD) {
      console.log("❌ Password mismatch!");
      return NextResponse.json(
        { error: "Invalid admin password" },
        { status: 401 },
      );
    }

    console.log("✅ Password verified, resetting to defaults");

    // Get the singleton row ID
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("pricing_config")
      .select("id")
      .limit(1)
      .single();

    if (fetchError) throw fetchError;

    const now = new Date().toISOString();
    const resetUpdatedBy = updatedBy || "admin (reset)";

    // Update to defaults
    const { error: updateError } = await supabaseAdmin
      .from("pricing_config")
      .update({
        diamond_margins: DEFAULT_CONFIG.diamondMargins,
        making_charges: DEFAULT_CONFIG.makingCharges,
        gst_rate: DEFAULT_CONFIG.gstRate,
        last_updated: now,
        updated_by: resetUpdatedBy,
      })
      .eq("id", existing.id);

    if (updateError) throw updateError;

    console.log("✅ Config reset to defaults");
    clearPricingCache();

    return NextResponse.json({
      success: true,
      message: "Configuration reset to defaults",
      config: {
        ...DEFAULT_CONFIG,
        lastUpdated: now,
        updatedBy: resetUpdatedBy,
      },
    });
  } catch (error) {
    console.error("Error resetting config:", error);
    return NextResponse.json(
      { error: "Failed to reset configuration" },
      { status: 500 },
    );
  }
}
