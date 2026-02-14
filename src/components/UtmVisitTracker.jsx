"use client";

import { useEffect } from "react";
import { getUtmFromCookie } from "../utils/utm";

/**
 * Fires a one-time visit/impression record when a user arrives via a UTM link.
 * The middleware sets an `orion_utm_new` flag cookie when UTM params are detected.
 * This component checks for that flag, records the visit, then clears the flag.
 */
export default function UtmVisitTracker() {
  useEffect(() => {
    // Check if the flag cookie exists
    const hasFlag = document.cookie
      .split(";")
      .some((c) => c.trim().startsWith("orion_utm_new="));

    if (!hasFlag) return;

    const utmData = getUtmFromCookie();
    if (!utmData) return;

    // Add referrer
    utmData.referrer_url = document.referrer || null;

    // Fire and forget
    fetch("/api/track-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ utmData }),
    }).catch(() => {});

    // Clear the flag so we don't double-count
    document.cookie = "orion_utm_new=; path=/; max-age=0";
  }, []);

  return null;
}
