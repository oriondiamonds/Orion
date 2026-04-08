// src/app/api/cron/refresh-gold-price/route.js
// Called every morning at 9:00 AM IST (3:30 AM UTC) by Vercel Cron.
// Fetches live gold price from Navkar and persists it to Supabase so that
// any cold-start fallback uses today's real price instead of the hardcoded value.

import { NextResponse } from "next/server";

export async function GET(request) {
  // Verify the request is from Vercel Cron (not a random caller)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Reuse the existing gold-price POST handler (force-refresh + persist)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/gold-price`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json();
  console.log(`⏰ Cron refresh-gold-price: source=${data.source} price=₹${data.price}/g`);

  return NextResponse.json({
    ok: true,
    source: data.source,
    price: data.price,
  });
}
