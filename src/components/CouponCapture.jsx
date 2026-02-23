"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { parseUtmFromCookieString } from "../utils/utm.js";

/**
 * Captures coupon codes and stores them in localStorage for cart auto-apply.
 *
 * Source 1 — URL params (direct links):
 *   ?coupon=CODE, ?coupon_code=CODE, ?utm_coupon=CODE
 *
 * Source 2 — orion_utm cookie (set by /api/click server redirect):
 *   When BuyHatke strips UTM params, /api/click sets the cookie before redirecting.
 *   The destination URL has no params, so we read the coupon from the cookie instead.
 */
export default function CouponCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // --- Source 1: URL params ---
    const couponFromUrl =
      searchParams.get("coupon") ||
      searchParams.get("coupon_code") ||
      searchParams.get("utm_coupon");

    if (couponFromUrl) {
      const normalizedCoupon = couponFromUrl.trim().toUpperCase();
      localStorage.setItem("referral_coupon", normalizedCoupon);
      localStorage.setItem("referral_coupon_time", Date.now().toString());
      return; // URL param takes priority — no need to check cookie
    }

    // --- Source 2: orion_utm cookie (set by /api/click redirect) ---
    // Only bridge to localStorage if no referral coupon is already stored
    const existingCoupon = localStorage.getItem("referral_coupon");
    if (existingCoupon) return;

    const utmData = parseUtmFromCookieString(document.cookie);
    if (utmData?.coupon_code) {
      localStorage.setItem("referral_coupon", utmData.coupon_code);
      localStorage.setItem("referral_coupon_time", Date.now().toString());
    }
  }, [searchParams]);

  return null;
}
