// src/app/api/click/route.js — Server-side click redirect + UTM recording
//
// Use this as the ad destination URL so tracking fires server-side before
// redirecting, regardless of how BuyHatke strips params in their redirect chain.
//
// Ad URL format:
// /api/click?utm_source=BuyHatke&utm_medium=instagram&utm_campaign=10PERCENT&coupon=BUYHATKE10&to=%2Fearrings
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../utils/supabase-admin.js";

const UTM_COOKIE_NAME = "orion_utm";
const UTM_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function GET(request) {
  const { searchParams, origin } = request.nextUrl;

  // --- 1. Read UTM params ---
  const utm_source = searchParams.get("utm_source") || null;
  const utm_medium = searchParams.get("utm_medium") || null;
  const utm_campaign = searchParams.get("utm_campaign") || null;
  const utm_content = searchParams.get("utm_content") || null;
  const utm_term = searchParams.get("utm_term") || null;
  const rawCoupon =
    searchParams.get("coupon") ||
    searchParams.get("coupon_code") ||
    searchParams.get("utm_coupon") ||
    null;
  const coupon_code = rawCoupon ? rawCoupon.trim().toUpperCase() : null;

  // --- 2. Validate destination — prevent open redirect attacks ---
  // Must be a relative path starting with "/" but not "//" or "/<scheme>:"
  const rawTo = searchParams.get("to") || "/";
  const isSafeRelative =
    rawTo.startsWith("/") &&
    !rawTo.startsWith("//") &&
    !/^\/[a-z][a-z0-9+\-.]*:/i.test(rawTo);
  const destination = isSafeRelative ? rawTo : "/";
  const destinationUrl = new URL(destination, origin).toString();

  // --- 3. Record visit server-side (guaranteed, no client JS needed) ---
  const hasTrackableData =
    utm_source || utm_medium || utm_campaign || utm_content || utm_term || coupon_code;

  if (hasTrackableData) {
    try {
      await supabaseAdmin.from("utm_visits").insert({
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        landing_url: destination,
        referrer_url: null,
        coupon_code,
      });
    } catch (err) {
      console.error("[/api/click] Failed to record visit:", err.message);
      // Non-critical — don't block the redirect
    }
  }

  // --- 4. Redirect to destination ---
  const response = NextResponse.redirect(destinationUrl, 302);

  // --- 5. Set orion_utm cookie so coupon auto-applies in cart on arrival ---
  if (hasTrackableData) {
    const utmData = {
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      coupon_code,
      landing_url: destination,
    };

    response.cookies.set(UTM_COOKIE_NAME, JSON.stringify(utmData), {
      path: "/",
      maxAge: UTM_COOKIE_MAX_AGE,
      httpOnly: false, // must be readable by client JS for coupon auto-apply
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    // No orion_utm_new flag — server already recorded, prevents double-counting
  }

  return response;
}
