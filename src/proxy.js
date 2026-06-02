// src/proxy.js — Capture UTM params from URL into a cookie + Performance optimizations
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

// Search engines whose referrals should NOT be attributed as "referral" UTM
// (they are organic traffic, not paid/referral campaigns)
const SEARCH_ENGINE_DOMAINS = [
  "google.com", "google.co.in", "google.co.uk",
  "bing.com", "yahoo.com", "duckduckgo.com",
  "baidu.com", "yandex.com", "yandex.ru",
];

export function proxy(request) {
  const { searchParams, pathname } = request.nextUrl;
  const response = NextResponse.next();

  // Set caching headers for static assets and API responses
  if (pathname.startsWith("/api/")) {
    const nonCacheableApis = [
      "/api/cart",
      "/api/wishlist",
      "/api/orders",
      "/api/checkout",
      "/api/auth",
    ];

    const isNonCacheable = nonCacheableApis.some((p) => pathname.startsWith(p));
    if (isNonCacheable) {
      response.headers.set("Cache-Control", "no-store, private");
    } else {
      response.headers.set(
        "Cache-Control",
        "public, s-maxage=60, stale-while-revalidate=120"
      );
    }
  } else if (
    pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|webp|woff|woff2)$/)
  ) {
    response.headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable",
    );
  } else {
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400",
    );
  }

  response.headers.set("Accept-Encoding", "gzip, deflate, br");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  const utmData = {};
  let hasUtm = false;

  for (const param of UTM_PARAMS) {
    const value = searchParams.get(param);
    if (value) {
      utmData[param] = value;
      hasUtm = true;
    }
  }

  const couponCode = searchParams.get('coupon') ||
                     searchParams.get('coupon_code') ||
                     searchParams.get('utm_coupon');

  if (couponCode) {
    utmData.coupon_code = couponCode.trim().toUpperCase();
    hasUtm = true;
  }

  if (!hasUtm && !pathname.startsWith("/api/")) {
    const referer = request.headers.get("referer") || "";
    if (referer) {
      try {
        const refUrl = new URL(referer);
        const refHost = refUrl.hostname.replace(/^www\./, "");

        const isSelfReferral =
          refHost.includes("oriondiamonds.in") || refHost === "localhost";
        const isSearchEngine = SEARCH_ENGINE_DOMAINS.some(
          (se) => refHost === se || refHost.endsWith("." + se)
        );

        if (!isSelfReferral && !isSearchEngine) {
          utmData.utm_source = refHost;
          utmData.utm_medium = "referral";
          utmData.landing_url = pathname + request.nextUrl.search;
          hasUtm = true;
        }
      } catch {
        // Invalid referer URL — skip
      }
    }
  }

  if (hasUtm) {
    if (!utmData.landing_url) {
      utmData.landing_url = pathname + request.nextUrl.search;
    }

    response.cookies.set(UTM_COOKIE_NAME, JSON.stringify(utmData), {
      path: "/",
      maxAge: UTM_COOKIE_MAX_AGE,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    response.cookies.set("orion_utm_new", "1", {
      path: "/",
      maxAge: 60 * 5,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    response.headers.set("Cache-Control", "no-store, private");
  }

  return response;
}

// Run on page routes only — skip static assets, images, API routes
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.jpeg|.*\\.(?:jpg|jpeg|png|gif|svg|ico|webp|css|js|woff|woff2|ttf|eot)).*)",
  ],
};
