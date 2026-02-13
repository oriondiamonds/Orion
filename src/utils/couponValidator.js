// src/utils/couponValidator.js
import { supabaseAdmin } from "./supabase-admin.js";

export async function validateCoupon(code, cartItems, customerEmail) {
  if (!code || !cartItems || !customerEmail) {
    return { valid: false, error: "Missing required fields" };
  }

  const normalizedCode = code.toUpperCase().trim();
  const normalizedEmail = customerEmail.toLowerCase().trim();

  // 1. Look up coupon
  const { data: coupon, error: couponError } = await supabaseAdmin
    .from("coupons")
    .select("*")
    .eq("code", normalizedCode)
    .eq("is_active", true)
    .single();

  if (couponError || !coupon) {
    return { valid: false, error: "Invalid coupon code" };
  }

  // 2. Check date range
  const now = new Date();

  if (coupon.starts_at && new Date(coupon.starts_at) > now) {
    return { valid: false, error: "This coupon is not yet active" };
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < now) {
    return { valid: false, error: "This coupon has expired" };
  }

  // 3. Check total usage limit
  if (coupon.usage_limit !== null) {
    const { count, error: countError } = await supabaseAdmin
      .from("coupon_usages")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", coupon.id);

    if (!countError && count >= coupon.usage_limit) {
      return { valid: false, error: "This coupon has reached its usage limit" };
    }
  }

  // 4. Check per-customer limit
  if (coupon.per_customer_limit !== null) {
    const { count, error: custCountError } = await supabaseAdmin
      .from("coupon_usages")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", coupon.id)
      .eq("customer_email", normalizedEmail);

    if (!custCountError && count >= coupon.per_customer_limit) {
      return { valid: false, error: "You have already used this coupon" };
    }
  }

  // 5. Calculate cart subtotal
  const subtotal = cartItems.reduce((total, item) => {
    const price = parseFloat(item.calculatedPrice || item.price) || 0;
    return total + price * (item.quantity || 1);
  }, 0);

  // 6. Check minimum order amount
  if (coupon.min_order_amount && subtotal < parseFloat(coupon.min_order_amount)) {
    return {
      valid: false,
      error: `Minimum order amount is ₹${parseFloat(coupon.min_order_amount).toLocaleString("en-IN")}`,
    };
  }

  // 7. Calculate discount
  let discountAmount = 0;

  if (coupon.discount_type === "percentage") {
    discountAmount = subtotal * (parseFloat(coupon.discount_value) / 100);
    // Apply max discount cap
    if (coupon.max_discount_amount !== null) {
      discountAmount = Math.min(discountAmount, parseFloat(coupon.max_discount_amount));
    }
  } else {
    // flat discount
    discountAmount = Math.min(parseFloat(coupon.discount_value), subtotal);
  }

  discountAmount = Math.round(discountAmount * 100) / 100;

  // Build message
  let message = "";
  if (coupon.discount_type === "percentage") {
    message = `${parseFloat(coupon.discount_value)}% off`;
    if (coupon.max_discount_amount) {
      message += ` (up to ₹${parseFloat(coupon.max_discount_amount).toLocaleString("en-IN")})`;
    }
  } else {
    message = `₹${parseFloat(coupon.discount_value).toLocaleString("en-IN")} off`;
  }
  message += ` — you save ₹${discountAmount.toLocaleString("en-IN")}!`;

  return {
    valid: true,
    couponCode: normalizedCode,
    discountType: coupon.discount_type,
    discountValue: parseFloat(coupon.discount_value),
    discountAmount,
    message,
  };
}
