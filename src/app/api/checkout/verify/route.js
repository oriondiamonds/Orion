// Verifies Razorpay payment signature and updates order status
import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "../../../../utils/supabase-admin.js";

export async function POST(request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      customerEmail,
    } = await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, error: "Missing payment verification data" },
        { status: 400 },
      );
    }

    // Verify signature: HMAC-SHA256(order_id + "|" + payment_id, key_secret)
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      // Mark order as failed
      await supabaseAdmin
        .from("orders")
        .update({ status: "failed" })
        .eq("razorpay_order_id", razorpay_order_id);

      return NextResponse.json(
        { success: false, error: "Payment verification failed" },
        { status: 400 },
      );
    }

    // Signature valid — update order to paid
    const { data: order, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        status: "paid",
        razorpay_payment_id,
        razorpay_signature,
      })
      .eq("razorpay_order_id", razorpay_order_id)
      .select("order_number, id, coupon_code, discount_amount, customer_email")
      .single();

    if (updateError) {
      console.error("Failed to update order:", updateError);
      throw updateError;
    }

    // Record coupon usage if coupon was applied
    if (order.coupon_code) {
      try {
        const { data: coupon } = await supabaseAdmin
          .from("coupons")
          .select("id")
          .eq("code", order.coupon_code)
          .single();

        if (coupon) {
          await supabaseAdmin.from("coupon_usages").insert({
            coupon_id: coupon.id,
            customer_email: order.customer_email,
            order_id: order.id,
            discount_applied: order.discount_amount || 0,
          });
        }
      } catch (couponErr) {
        console.error("Failed to record coupon usage:", couponErr);
        // Don't fail the payment verification for this
      }
    }

    // Clear server cart
    if (customerEmail) {
      await supabaseAdmin
        .from("carts")
        .delete()
        .eq("email", customerEmail.toLowerCase().trim());
    }

    return NextResponse.json({
      success: true,
      orderNumber: order.order_number,
      couponCode: order.coupon_code || null,
      discountAmount: order.discount_amount || 0,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Verification failed" },
      { status: 500 },
    );
  }
}
