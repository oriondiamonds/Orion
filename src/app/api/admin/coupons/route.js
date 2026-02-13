import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../utils/supabase-admin.js";

const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || "changeme123").trim();

function verifyPassword(password) {
  return password && String(password).trim() === ADMIN_PASSWORD;
}

// GET — List all coupons with usage counts
export async function GET() {
  try {
    const { data: coupons, error } = await supabaseAdmin
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Get usage counts for each coupon
    const couponIds = coupons.map((c) => c.id);

    let usageCounts = {};
    if (couponIds.length > 0) {
      const { data: usages, error: usageError } = await supabaseAdmin
        .from("coupon_usages")
        .select("coupon_id");

      if (!usageError && usages) {
        usages.forEach((u) => {
          usageCounts[u.coupon_id] = (usageCounts[u.coupon_id] || 0) + 1;
        });
      }
    }

    const couponsWithStats = coupons.map((coupon) => ({
      ...coupon,
      total_uses: usageCounts[coupon.id] || 0,
    }));

    return NextResponse.json({ success: true, coupons: couponsWithStats });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    return NextResponse.json(
      { error: "Failed to fetch coupons" },
      { status: 500 }
    );
  }
}

// POST — Create a new coupon
export async function POST(request) {
  try {
    const { password, coupon } = await request.json();

    if (!verifyPassword(password)) {
      return NextResponse.json(
        { error: "Invalid admin password" },
        { status: 401 }
      );
    }

    if (!coupon?.code || !coupon?.discount_type || !coupon?.discount_value) {
      return NextResponse.json(
        { error: "Code, discount type, and discount value are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("coupons")
      .insert({
        code: coupon.code,
        description: coupon.description || null,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        min_order_amount: coupon.min_order_amount || 0,
        max_discount_amount: coupon.max_discount_amount || null,
        usage_limit: coupon.usage_limit || null,
        per_customer_limit: coupon.per_customer_limit ?? 1,
        starts_at: coupon.starts_at || new Date().toISOString(),
        expires_at: coupon.expires_at || null,
        is_active: coupon.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A coupon with this code already exists" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true, coupon: data });
  } catch (error) {
    console.error("Error creating coupon:", error);
    return NextResponse.json(
      { error: "Failed to create coupon" },
      { status: 500 }
    );
  }
}

// PUT — Update a coupon
export async function PUT(request) {
  try {
    const { password, id, updates } = await request.json();

    if (!verifyPassword(password)) {
      return NextResponse.json(
        { error: "Invalid admin password" },
        { status: 401 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: "Coupon ID is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("coupons")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, coupon: data });
  } catch (error) {
    console.error("Error updating coupon:", error);
    return NextResponse.json(
      { error: "Failed to update coupon" },
      { status: 500 }
    );
  }
}

// DELETE — Delete a coupon
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
        { error: "Coupon ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("coupons")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Coupon deleted" });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    return NextResponse.json(
      { error: "Failed to delete coupon" },
      { status: 500 }
    );
  }
}
