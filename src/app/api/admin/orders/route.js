// src/app/api/admin/orders/route.js — Admin API for order management
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../utils/supabase-admin.js";

const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || "changeme123").trim();

const STATUS_ORDER = [
  "pending",
  "order_placed",
  "acknowledged",
  "manufacturing",
  "shipping",
  "delivered",
];

function verifyPassword(password) {
  return password && String(password).trim() === ADMIN_PASSWORD;
}

// POST — List orders with optional filters
export async function POST(request) {
  try {
    const { password, statusFilter, search, page = 1, limit = 25 } =
      await request.json();

    if (!verifyPassword(password)) {
      return NextResponse.json(
        { error: "Invalid admin password" },
        { status: 401 }
      );
    }

    let query = supabaseAdmin
      .from("orders")
      .select(
        "id, order_number, customer_email, items, subtotal, discount_amount, coupon_code, currency, status, status_history, shipping_address, razorpay_order_id, razorpay_payment_id, created_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    if (search) {
      query = query.or(
        `order_number.ilike.%${search}%,customer_email.ilike.%${search}%`
      );
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: orders, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, orders: orders || [], total: count || 0 });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

// PUT — Update order status (forward-only)
export async function PUT(request) {
  try {
    const { password, orderId, newStatus, note } = await request.json();

    if (!verifyPassword(password)) {
      return NextResponse.json(
        { error: "Invalid admin password" },
        { status: 401 }
      );
    }

    if (!orderId || !newStatus) {
      return NextResponse.json(
        { error: "Order ID and new status are required" },
        { status: 400 }
      );
    }

    if (!STATUS_ORDER.includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid status: ${newStatus}` },
        { status: 400 }
      );
    }

    // Fetch current order
    const { data: order, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("id, status, status_history")
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Enforce forward-only progression
    const currentIdx = STATUS_ORDER.indexOf(order.status);
    const newIdx = STATUS_ORDER.indexOf(newStatus);

    if (newIdx <= currentIdx) {
      return NextResponse.json(
        { error: "Status can only move forward" },
        { status: 400 }
      );
    }

    // Build updated history
    const historyEntry = {
      status: newStatus,
      timestamp: new Date().toISOString(),
      note: note || "",
    };
    const updatedHistory = [...(order.status_history || []), historyEntry];

    // Update order
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        status: newStatus,
        status_history: updatedHistory,
      })
      .eq("id", orderId)
      .select("id, order_number, status, status_history")
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json(
      { error: "Failed to update order status" },
      { status: 500 }
    );
  }
}
