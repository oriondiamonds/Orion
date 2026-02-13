import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../utils/supabase-admin.js";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, order_number, items, subtotal, currency, status, razorpay_payment_id, created_at"
      )
      .eq("customer_email", email.toLowerCase().trim())
      .neq("status", "failed")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      orders: (orders || []).map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        items: o.items,
        subtotal: o.subtotal,
        currency: o.currency,
        status: o.status,
        paymentId: o.razorpay_payment_id,
        createdAt: o.created_at,
      })),
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
