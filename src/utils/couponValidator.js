import { supabaseAdmin } from "./supabase-admin.js";

export async function validateCoupon(code, cartItems, customerEmail) {
  if (!code || !cartItems) {
    return { valid: false, error: "Missing required fields" };
  }

  const normalizedCode = code.toUpperCase().trim();
  const normalizedEmail = customerEmail ? customerEmail.toLowerCase().trim() : null;

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

  // 4. Check per-customer limit (only when email is known)
  if (normalizedEmail && coupon.per_customer_limit !== null) {
    const { count, error: custCountError } = await supabaseAdmin
      .from("coupon_usages")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", coupon.id)
      .eq("customer_email", normalizedEmail);

    if (!custCountError && count >= coupon.per_customer_limit) {
      return { valid: false, error: "You have already used this coupon" };
    }
  }

  // 5. Filter eligible items based on coupon targeting
  const eligibleItems = cartItems.filter((item) => {
    // Default: all items are eligible
    if (!coupon.applies_to || coupon.applies_to === "all") {
      return true;
    }

    // Specific products targeting
    if (coupon.applies_to === "specific_products") {
      const productIds = coupon.applicable_product_ids || [];
      // Match by productId (gid://shopify/Product/xxx) or id field
      const itemProductId = item.productId || item.id || "";
      return productIds.some((pid) => itemProductId.includes(pid) || itemProductId === pid);
    }

    // Specific collections targeting
    if (coupon.applies_to === "specific_collections") {
      const collections = coupon.applicable_collections || [];
      // Match by collection handle or name
      const itemCollections = item.collections || [];
      return collections.some((targetCollection) =>
        itemCollections.some(
          (itemCol) =>
            itemCol.handle === targetCollection ||
            itemCol.title === targetCollection ||
            itemCol === targetCollection
        )
      );
    }

    return false;
  });

  // If no items match the targeting, coupon is invalid for this cart
  if (eligibleItems.length === 0) {
    let targetingMessage = "This coupon does not apply to any items in your cart";
    if (coupon.applies_to === "specific_products") {
      targetingMessage = "This coupon only applies to specific products not in your cart";
    } else if (coupon.applies_to === "specific_collections") {
      targetingMessage = "This coupon only applies to specific collections not in your cart";
    }
    return { valid: false, error: targetingMessage };
  }

  // 6. Calculate diamond-only subtotal for eligible items
  const diamondSubtotal = eligibleItems.reduce((total, item) => {
    const quantity = item.quantity || 1;

    // Prefer priceBreakdown.diamondPrice if available
    if (item.priceBreakdown && item.priceBreakdown.diamondPrice) {
      return total + parseFloat(item.priceBreakdown.diamondPrice) * quantity;
    }

    // Fallback: if no breakdown, assume 0 diamond price (shouldn't happen in production)
    console.warn(
      `Item ${item.variantId || "unknown"} missing priceBreakdown.diamondPrice, excluding from discount`
    );
    return total;
  }, 0);

  // Also calculate full cart subtotal for min order validation
  const cartSubtotal = cartItems.reduce((total, item) => {
    const price = parseFloat(item.calculatedPrice || item.price) || 0;
    return total + price * (item.quantity || 1);
  }, 0);

  // 7. Check minimum order amount (uses full cart subtotal, not diamond-only)
  if (
    coupon.min_order_amount &&
    cartSubtotal < parseFloat(coupon.min_order_amount)
  ) {
    return {
      valid: false,
      error: `Minimum order amount is ₹${parseFloat(coupon.min_order_amount).toLocaleString("en-IN")}`,
    };
  }

  // 8. Calculate discount (on diamond-only subtotal of eligible items)
  let discountAmount = 0;

  if (coupon.discount_type === "percentage") {
    discountAmount =
      diamondSubtotal * (parseFloat(coupon.discount_value) / 100);
    // Apply max discount cap
    if (coupon.max_discount_amount !== null) {
      discountAmount = Math.min(
        discountAmount,
        parseFloat(coupon.max_discount_amount)
      );
    }
  } else {
    // flat discount, capped at diamond subtotal
    discountAmount = Math.min(
      parseFloat(coupon.discount_value),
      diamondSubtotal
    );
  }

  discountAmount = Math.round(discountAmount * 100) / 100;

  // Build message (specify "on diamonds" and targeting if applicable)
  let message = "";
  if (coupon.discount_type === "percentage") {
    message = `${parseFloat(coupon.discount_value)}% off`;
    if (coupon.max_discount_amount) {
      message += ` (up to ₹${parseFloat(coupon.max_discount_amount).toLocaleString("en-IN")})`;
    }
  } else {
    message = `₹${parseFloat(coupon.discount_value).toLocaleString("en-IN")} off`;
  }

  // Add targeting context
  if (coupon.applies_to === "specific_products") {
    message += ` on selected products`;
  } else if (coupon.applies_to === "specific_collections") {
    message += ` on selected collections`;
  } else {
    message += ` on diamonds`;
  }

  // Show count if partial cart
  if (eligibleItems.length < cartItems.length) {
    message += ` (${eligibleItems.length}/${cartItems.length} items)`;
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
