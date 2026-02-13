// src/app/api/auth/profile/route.js
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../utils/supabase-admin.js";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const { data: customer, error } = await supabaseAdmin
      .from("customers")
      .select(
        "id, email, first_name, last_name, display_name, phone, image_url, auth_provider, default_address, addresses, created_at"
      )
      .eq("email", email.toLowerCase().trim())
      .single();

    if (error || !customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        displayName: customer.display_name,
        phone: customer.phone,
        image: customer.image_url,
        authProvider: customer.auth_provider,
        defaultAddress: customer.default_address,
        addresses: customer.addresses,
        createdAt: customer.created_at,
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
