// src/app/api/auth/track-utm/route.js — Record UTM data on credentials login
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../utils/supabase-admin.js";

export async function POST(request) {
  try {
    const { email, eventType, authProvider, utmData } = await request.json();

    if (!email || !utmData) {
      return NextResponse.json({ success: true });
    }

    if (!utmData.utm_source && !utmData.utm_campaign && !utmData.utm_medium) {
      return NextResponse.json({ success: true });
    }

    const normalizedEmail = email.toLowerCase().trim();

    await supabaseAdmin.from("referral_tracking").insert({
      customer_email: normalizedEmail,
      event_type: eventType || "login",
      auth_provider: authProvider || "email",
      utm_source: utmData.utm_source || null,
      utm_medium: utmData.utm_medium || null,
      utm_campaign: utmData.utm_campaign || null,
      utm_content: utmData.utm_content || null,
      utm_term: utmData.utm_term || null,
      landing_url: utmData.landing_url || null,
      referrer_url: utmData.referrer_url || null,
    });

    await supabaseAdmin
      .from("customers")
      .update({
        utm_source: utmData.utm_source || null,
        utm_medium: utmData.utm_medium || null,
        utm_campaign: utmData.utm_campaign || null,
      })
      .eq("email", normalizedEmail);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("UTM tracking error:", error);
    // Never fail the user experience for tracking
    return NextResponse.json({ success: true });
  }
}
