// Creates a Razorpay order and a pending order in Supabase
import { NextResponse } from "next/server";
import razorpay from "../../../utils/razorpay.js";
import { supabaseAdmin } from "../../../utils/supabase-admin.js";
import { validateCoupon } from "../../../utils/couponValidator.js";

export async function POST(request) {
  try {
    const { cartItems, customerEmail, couponCode, shippingAddress } = await request.json();

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json(
        { success: false, error: "Cart is empty" },
        { status: 400 },
      );
    }

    if (!customerEmail) {
      return NextResponse.json(
        { success: false, error: "Customer email is required" },
        { status: 400 },
      );
    }

    if (
      !shippingAddress ||
      !shippingAddress.firstName ||
      !shippingAddress.lastName ||
      !shippingAddress.phone ||
      !shippingAddress.address1 ||
      !shippingAddress.city ||
      !shippingAddress.state ||
      !shippingAddress.zip
    ) {
      return NextResponse.json(
        { success: false, error: "Complete shipping address is required" },
        { status: 400 },
      );
    }

    // Calculate total from cart items (use calculatedPrice if available, fallback to price)
    const subtotal = cartItems.reduce((total, item) => {
      const price = parseFloat(item.calculatedPrice || item.price) || 0;
      return total + price * (item.quantity || 1);
    }, 0);

    // Validate and apply coupon if provided
    let discountAmount = 0;
    let discountType = null;
    let validatedCouponCode = null;

    if (couponCode) {
      const couponResult = await validateCoupon(couponCode, cartItems, customerEmail);

      if (!couponResult.valid) {
        return NextResponse.json(
          { success: false, error: couponResult.error },
          { status: 400 },
        );
      }

      discountAmount = couponResult.discountAmount;
      discountType = couponResult.discountType;
      validatedCouponCode = couponResult.couponCode;
    }

    const finalAmount = subtotal - discountAmount;

    // ============================================
    // Capture Attribution (for marketing tracking)
    // ============================================
    let attributedSource = null;
    let attributedCampaign = null;
    let attributedMedium = null;
    let attributedAgencyId = null;

    // Priority 1: Get attribution from coupon (if coupon used)
    if (validatedCouponCode) {
      try {
        const { data: couponDetails } = await supabaseAdmin
          .from('coupons')
          .select('utm_source, utm_campaign, utm_medium, agency_id')
          .eq('code', validatedCouponCode)
          .single();

        if (couponDetails) {
          attributedSource = couponDetails.utm_source;
          attributedCampaign = couponDetails.utm_campaign;
          attributedMedium = couponDetails.utm_medium;
          attributedAgencyId = couponDetails.agency_id;
        }
      } catch (couponAttrErr) {
        console.warn('Failed to fetch coupon attribution:', couponAttrErr);
        // Non-blocking: continue with order even if attribution fetch fails
      }
    }

    // Priority 2: Fallback to customer's signup UTM if no coupon attribution
    if (!attributedSource && customerEmail) {
      try {
        const { data: customer } = await supabaseAdmin
          .from('customers')
          .select('utm_source, utm_campaign, utm_medium')
          .eq('email', customerEmail.toLowerCase().trim())
          .single();

        if (customer) {
          attributedSource = customer.utm_source;
          attributedCampaign = customer.utm_campaign;
          attributedMedium = customer.utm_medium;
        }
      } catch (customerAttrErr) {
        console.warn('Failed to fetch customer attribution:', customerAttrErr);
        // Non-blocking: continue with order
      }
    }

    // Razorpay expects amount in paise (smallest currency unit)
    const amountInPaise = Math.round(finalAmount * 100);

    if (amountInPaise < 100) {
      return NextResponse.json(
        { success: false, error: "Order amount must be at least ₹1" },
        { status: 400 },
      );
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `order_${Date.now()}`,
    });

    // Insert pending order into Supabase
    const { error: insertError } = await supabaseAdmin.from("orders").insert({
      customer_email: customerEmail.toLowerCase().trim(),
      items: cartItems,
      subtotal,
      coupon_code: validatedCouponCode,
      discount_amount: discountAmount,
      discount_type: discountType,
      currency: "INR",
      status: "pending",
      razorpay_order_id: razorpayOrder.id,
      shipping_address: shippingAddress,
      // Attribution snapshot (immutable at order time)
      attributed_utm_source: attributedSource,
      attributed_utm_campaign: attributedCampaign,
      attributed_utm_medium: attributedMedium,
      attributed_agency_id: attributedAgencyId,
    });

    if (insertError) {
      console.error("Failed to create order record:", insertError);
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: "INR",
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create order" },
      { status: 500 },
    );
  }
}
