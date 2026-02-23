import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../utils/supabase-admin.js";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const orderNumber = searchParams.get("orderNumber");

    // Fetch a single order by order number (used by order-confirmation page)
    if (orderNumber) {
      const { data: order, error } = await supabaseAdmin
        .from("orders")
        .select(
          "id, order_number, items, subtotal, discount_amount, coupon_code, currency, status, status_history, shipping_address, razorpay_payment_id, customer_email, created_at"
        )
        .eq("order_number", orderNumber.trim())
        .single();

      if (error || !order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        order: {
          id: order.id,
          orderNumber: order.order_number,
          items: order.items,
          subtotal: order.subtotal,
          discountAmount: order.discount_amount,
          couponCode: order.coupon_code,
          currency: order.currency,
          status: order.status,
          statusHistory: order.status_history || [],
          shippingAddress: order.shipping_address,
          paymentId: order.razorpay_payment_id,
          customerEmail: order.customer_email,
          createdAt: order.created_at,
        },
      });
    }

    // Fetch all orders for a customer by email
    if (!email) {
      return NextResponse.json({ error: "Email or orderNumber required" }, { status: 400 });
    }

    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, order_number, items, subtotal, discount_amount, coupon_code, currency, status, status_history, shipping_address, razorpay_payment_id, created_at"
      )
      .eq("customer_email", email.toLowerCase().trim())
      .neq("status", "failed")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(
      {
        success: true,
        orders: (orders || []).map((o) => ({
          id: o.id,
          orderNumber: o.order_number,
          items: o.items,
          subtotal: o.subtotal,
          discountAmount: o.discount_amount,
          couponCode: o.coupon_code,
          currency: o.currency,
          status: o.status,
          statusHistory: o.status_history || [],
          shippingAddress: o.shipping_address,
          paymentId: o.razorpay_payment_id,
          createdAt: o.created_at,
        })),
      },
      { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" } }
    );
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
