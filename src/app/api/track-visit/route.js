// src/app/api/track-visit/route.js — Record UTM visit/impression (no auth required)
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../utils/supabase-admin.js";

export async function POST(request) {
  try {
    const { utmData } = await request.json();

    if (!utmData) {
      return NextResponse.json({ success: true });
    }

    // Track if ANY trackable param exists
    const hasTrackableData = utmData.utm_source || utmData.utm_medium ||
      utmData.utm_campaign || utmData.utm_content || utmData.utm_term ||
      utmData.coupon_code || utmData.landing_url || utmData.referrer_url;

    if (!hasTrackableData) {
      return NextResponse.json({ success: true });
    }

    // Record in utm_visits table (shown as "visit" events in tracking dashboard)
    await supabaseAdmin.from("utm_visits").insert({
      utm_source: utmData.utm_source || null,
      utm_medium: utmData.utm_medium || null,
      utm_campaign: utmData.utm_campaign || null,
      utm_content: utmData.utm_content || null,
      utm_term: utmData.utm_term || null,
      landing_url: utmData.landing_url || null,
      referrer_url: utmData.referrer_url || null,
      coupon_code: utmData.coupon_code || null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Visit tracking error:", error);
    return NextResponse.json({ success: true });
  }
}
