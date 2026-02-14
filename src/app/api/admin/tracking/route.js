// src/app/api/admin/tracking/route.js — Admin API for UTM tracking stats
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../utils/supabase-admin.js";

const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || "changeme123").trim();

function verifyPassword(password) {
  return password && String(password).trim() === ADMIN_PASSWORD;
}

export async function POST(request) {
  try {
    const { password, dateFrom, dateTo } = await request.json();

    if (!verifyPassword(password)) {
      return NextResponse.json(
        { error: "Invalid admin password" },
        { status: 401 }
      );
    }

    let query = supabaseAdmin
      .from("referral_tracking")
      .select("*")
      .order("created_at", { ascending: false });

    if (dateFrom) {
      query = query.gte("created_at", dateFrom);
    }
    if (dateTo) {
      query = query.lte("created_at", dateTo + "T23:59:59.999Z");
    }

    const { data: events, error } = await query;

    if (error) throw error;

    // Fetch utm_visits (impressions)
    let visitQuery = supabaseAdmin
      .from("utm_visits")
      .select("*")
      .order("created_at", { ascending: false });

    if (dateFrom) {
      visitQuery = visitQuery.gte("created_at", dateFrom);
    }
    if (dateTo) {
      visitQuery = visitQuery.lte("created_at", dateTo + "T23:59:59.999Z");
    }

    const { data: visits, error: visitError } = await visitQuery;
    if (visitError) throw visitError;

    // Aggregate visit counts by source and campaign
    const visitsBySource = {};
    const visitsByCampaign = {};
    const visitsByMedium = {};

    (visits || []).forEach((v) => {
      const source = v.utm_source || "(direct)";
      visitsBySource[source] = (visitsBySource[source] || 0) + 1;

      const campaign = v.utm_campaign || "(none)";
      visitsByCampaign[campaign] = (visitsByCampaign[campaign] || 0) + 1;

      const medium = v.utm_medium || "(none)";
      visitsByMedium[medium] = (visitsByMedium[medium] || 0) + 1;
    });

    // Compute aggregated stats
    const stats = {
      totalEvents: events.length,
      totalVisits: (visits || []).length,
      signups: events.filter((e) => e.event_type === "signup").length,
      logins: events.filter((e) => e.event_type === "login").length,
      bySource: {},
      byCampaign: {},
      byMedium: {},
      byProvider: {},
      recentEvents: events.slice(0, 50),
    };

    events.forEach((e) => {
      const source = e.utm_source || "(direct)";
      if (!stats.bySource[source])
        stats.bySource[source] = { signups: 0, logins: 0, total: 0, visits: 0 };
      stats.bySource[source].total++;
      stats.bySource[source][
        e.event_type === "signup" ? "signups" : "logins"
      ]++;

      const campaign = e.utm_campaign || "(none)";
      if (!stats.byCampaign[campaign])
        stats.byCampaign[campaign] = { signups: 0, logins: 0, total: 0, visits: 0 };
      stats.byCampaign[campaign].total++;
      stats.byCampaign[campaign][
        e.event_type === "signup" ? "signups" : "logins"
      ]++;

      const medium = e.utm_medium || "(none)";
      if (!stats.byMedium[medium])
        stats.byMedium[medium] = { signups: 0, logins: 0, total: 0, visits: 0 };
      stats.byMedium[medium].total++;
      stats.byMedium[medium][
        e.event_type === "signup" ? "signups" : "logins"
      ]++;

      const provider = e.auth_provider || "email";
      if (!stats.byProvider[provider])
        stats.byProvider[provider] = { signups: 0, logins: 0, total: 0 };
      stats.byProvider[provider].total++;
      stats.byProvider[provider][
        e.event_type === "signup" ? "signups" : "logins"
      ]++;
    });

    // Merge visit counts into bySource, byCampaign, byMedium
    for (const [source, count] of Object.entries(visitsBySource)) {
      if (!stats.bySource[source])
        stats.bySource[source] = { signups: 0, logins: 0, total: 0, visits: 0 };
      stats.bySource[source].visits = count;
    }

    for (const [campaign, count] of Object.entries(visitsByCampaign)) {
      if (!stats.byCampaign[campaign])
        stats.byCampaign[campaign] = { signups: 0, logins: 0, total: 0, visits: 0 };
      stats.byCampaign[campaign].visits = count;
    }

    for (const [medium, count] of Object.entries(visitsByMedium)) {
      if (!stats.byMedium[medium])
        stats.byMedium[medium] = { signups: 0, logins: 0, total: 0, visits: 0 };
      stats.byMedium[medium].visits = count;
    }

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error("Error fetching tracking stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracking data" },
      { status: 500 }
    );
  }
}
