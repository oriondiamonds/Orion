// src/app/api/auth/register/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "../../../../utils/supabase-admin.js";

export async function POST(request) {
  try {
    const { email, password, firstName, lastName, utmData } =
      await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if customer already exists
    const { data: existing } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const displayName = [firstName, lastName].filter(Boolean).join(" ") || email;

    // Insert customer
    const { error: insertError } = await supabaseAdmin
      .from("customers")
      .insert({
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        first_name: firstName || null,
        last_name: lastName || null,
        display_name: displayName,
        auth_provider: "email",
      });

    if (insertError) throw insertError;

    // Record UTM tracking for signup (never blocks registration)
    try {
      if (
        utmData &&
        (utmData.utm_source || utmData.utm_campaign || utmData.utm_medium)
      ) {
        const normalizedEmail = email.toLowerCase().trim();

        await supabaseAdmin.from("referral_tracking").insert({
          customer_email: normalizedEmail,
          event_type: "signup",
          auth_provider: "email",
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
      }
    } catch (utmError) {
      console.error("UTM tracking error (non-blocking):", utmError);
    }

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
