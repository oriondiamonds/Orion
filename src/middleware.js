// src/middleware.js — Capture UTM params from URL into a cookie
import { NextResponse } from "next/server";

const UTM_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
];

const UTM_COOKIE_NAME = "orion_utm";
const UTM_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function middleware(request) {
  const { searchParams } = request.nextUrl;
  const response = NextResponse.next();

  // Check if any UTM params exist in the current URL
  const utmData = {};
  let hasUtm = false;

  for (const param of UTM_PARAMS) {
    const value = searchParams.get(param);
    if (value) {
      utmData[param] = value;
      hasUtm = true;
    }
  }

  // If UTM params found, set/overwrite the cookie (last-touch attribution)
  if (hasUtm) {
    utmData.landing_url = request.nextUrl.pathname + request.nextUrl.search;

    response.cookies.set(UTM_COOKIE_NAME, JSON.stringify(utmData), {
      path: "/",
      maxAge: UTM_COOKIE_MAX_AGE,
      httpOnly: false, // needs to be readable by client JS for OAuth flow
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    // Flag cookie so client-side tracker fires a one-time visit record
    response.cookies.set("orion_utm_new", "1", {
      path: "/",
      maxAge: 60 * 5, // 5 minutes — just long enough for client JS to pick up
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  }

  return response;
}

// Run on page routes only — skip static assets, images, API routes
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.jpeg|.*\\.(?:jpg|jpeg|png|gif|svg|ico|webp|css|js|woff|woff2|ttf|eot)).*)",
  ],
};
