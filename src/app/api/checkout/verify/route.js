// Verifies Razorpay payment signature and updates order status
import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "../../../../utils/supabase-admin.js";
import razorpay from "../../../../utils/razorpay.js";
import {
  sendTelegramNotification,
  formatOrderMessage,
} from "../../../../utils/telegram.js";

export async function POST(request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      customerEmail,
      source,
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

    // Fetch payment details from Razorpay to get payment method
    let paymentMethodDetails = "Razorpay";
    try {
      const payment = await razorpay.payments.fetch(razorpay_payment_id);

      // Format payment method based on type
      if (payment.method === "card") {
        const cardType = payment.card?.type || "card";
        const cardNetwork = payment.card?.network || "";
        paymentMethodDetails = `${cardType.charAt(0).toUpperCase() + cardType.slice(1)} Card${cardNetwork ? ` (${cardNetwork})` : ""}`;
      } else if (payment.method === "upi") {
        paymentMethodDetails = `UPI${payment.vpa ? ` (${payment.vpa})` : ""}`;
      } else if (payment.method === "wallet") {
        const walletName = payment.wallet || "";
        paymentMethodDetails = `Wallet${walletName ? ` (${walletName})` : ""}`;
      } else if (payment.method === "netbanking") {
        const bank = payment.bank || "";
        paymentMethodDetails = `Net Banking${bank ? ` (${bank})` : ""}`;
      } else if (payment.method === "emi") {
        paymentMethodDetails = "EMI";
      } else {
        paymentMethodDetails = payment.method || "Razorpay";
      }
    } catch (paymentFetchErr) {
      console.error("Failed to fetch payment details:", paymentFetchErr);
      // Don't fail the order, just use default method
    }

    // Signature valid — update order to order_placed
    const { data: order, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        status: "order_placed",
        razorpay_payment_id,
        razorpay_signature,
        payment_method: paymentMethodDetails,
        status_history: [
          {
            status: "order_placed",
            timestamp: new Date().toISOString(),
            note: "Payment verified",
          },
        ],
      })
      .eq("razorpay_order_id", razorpay_order_id)
      .select(
        "order_number, id, coupon_code, discount_amount, customer_email, items, subtotal, shipping_address, razorpay_order_id, razorpay_payment_id, payment_method"
      )
      .single();

    if (updateError) {
      console.error("Failed to update order:", updateError);
      throw updateError;
    }

    // Run coupon recording + cart clearing in parallel (both non-critical)
    const postPaymentTasks = [];

    if (order.coupon_code) {
      postPaymentTasks.push(
        supabaseAdmin
          .from("coupons")
          .select("id")
          .eq("code", order.coupon_code)
          .single()
          .then(({ data: coupon }) => {
            if (coupon) {
              return supabaseAdmin.from("coupon_usages").insert({
                coupon_id: coupon.id,
                customer_email: order.customer_email,
                order_id: order.id,
                discount_applied: order.discount_amount || 0,
              });
            }
          })
          .catch((err) => console.error("Failed to record coupon usage:", err))
      );
    }

    if (customerEmail && source !== "buynow") {
      postPaymentTasks.push(
        supabaseAdmin
          .from("carts")
          .delete()
          .eq("email", customerEmail.toLowerCase().trim())
          .catch((err) => console.error("Failed to clear server cart:", err))
      );
    }

    await Promise.all(postPaymentTasks);

    // Telegram notification — fire-and-forget, never blocks the response
    sendTelegramNotification(formatOrderMessage(order)).catch((err) =>
      console.error("Telegram notification error:", err)
    );

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
