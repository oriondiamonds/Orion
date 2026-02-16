"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Captures coupon codes from URL parameters and stores them for auto-apply in cart.
 * Supports: ?coupon=CODE, ?coupon_code=CODE, ?utm_coupon=CODE
 *
 * Example marketing links:
 * - https://oriondiamonds.com/?coupon=SUMMER20
 * - https://oriondiamonds.com/products/ring?coupon_code=AGENCY10
 * - https://oriondiamonds.com/?utm_coupon=WELCOME15&utm_source=facebook
 */
export default function CouponCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for coupon in URL params (multiple possible param names)
    const couponFromUrl =
      searchParams.get("coupon") ||
      searchParams.get("coupon_code") ||
      searchParams.get("utm_coupon");

    if (couponFromUrl) {
      const normalizedCoupon = couponFromUrl.trim().toUpperCase();

      // Store in localStorage for cart to pick up
      localStorage.setItem("referral_coupon", normalizedCoupon);

      // Store timestamp for expiry (24 hours)
      localStorage.setItem("referral_coupon_time", Date.now().toString());

      console.log("📎 Captured referral coupon:", normalizedCoupon);
    }
  }, [searchParams]);

  return null;
}
