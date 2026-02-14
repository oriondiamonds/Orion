// src/utils/utm.js — UTM cookie utility for tracking referral links

const UTM_COOKIE_NAME = "orion_utm";
const UTM_FIELDS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
];

/**
 * Parse UTM data from a raw cookie string.
 * Works in both client (document.cookie) and server (cookie header) contexts.
 */
export function parseUtmFromCookieString(cookieString) {
  if (!cookieString) return null;

  try {
    const match = cookieString
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(UTM_COOKIE_NAME + "="));

    if (!match) return null;

    const value = decodeURIComponent(match.split("=").slice(1).join("="));
    const data = JSON.parse(value);

    const hasUtm = UTM_FIELDS.some((f) => data[f]);
    return hasUtm ? data : null;
  } catch {
    return null;
  }
}

/**
 * Client-side: read UTM data from document.cookie.
 */
export function getUtmFromCookie() {
  if (typeof document === "undefined") return null;
  return parseUtmFromCookieString(document.cookie);
}

/**
 * Client-side: clear the UTM cookie after it has been recorded.
 */
export function clearUtmCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${UTM_COOKIE_NAME}=; path=/; max-age=0`;
}

export { UTM_COOKIE_NAME, UTM_FIELDS };
