// src/app/api/admin/tracking/route.js — Admin API for UTM tracking stats
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../utils/supabase-admin.js";

const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || "changeme123").trim();

function verifyPassword(password) {
  return password && String(password).trim() === ADMIN_PASSWORD;
}

export async function POST(request) {
  try {
    const {
      password,
      dateFrom,
      dateTo,
      filters,
      eventsPage = 1,
      eventsLimit = 50,
      ordersPage = 1,
      ordersLimit = 50
    } = await request.json();

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

    // Apply UTM filters to events
    if (filters?.utm_sources?.length) {
      query = query.in('utm_source', filters.utm_sources);
    }
    if (filters?.utm_campaigns?.length) {
      query = query.in('utm_campaign', filters.utm_campaigns);
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

    // Apply UTM filters to visits
    if (filters?.utm_sources?.length) {
      visitQuery = visitQuery.in('utm_source', filters.utm_sources);
    }
    if (filters?.utm_campaigns?.length) {
      visitQuery = visitQuery.in('utm_campaign', filters.utm_campaigns);
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
    const eventVisits = events.filter((e) => e.event_type === "visit").length;
    const stats = {
      totalEvents: events.length,
      totalVisits: (visits || []).length + eventVisits,
      signups: events.filter((e) => e.event_type === "signup").length,
      logins: events.filter((e) => e.event_type === "login").length,
      eventVisits,
      bySource: {},
      byCampaign: {},
      byMedium: {},
      byProvider: {},
    };

    events.forEach((e) => {
      const eventBucket = e.event_type === "signup" ? "signups" : e.event_type === "login" ? "logins" : "visits";

      const source = e.utm_source || "(direct)";
      if (!stats.bySource[source])
        stats.bySource[source] = { signups: 0, logins: 0, total: 0, visits: 0 };
      stats.bySource[source].total++;
      stats.bySource[source][eventBucket]++;

      const campaign = e.utm_campaign || "(none)";
      if (!stats.byCampaign[campaign])
        stats.byCampaign[campaign] = { signups: 0, logins: 0, total: 0, visits: 0 };
      stats.byCampaign[campaign].total++;
      stats.byCampaign[campaign][eventBucket]++;

      const medium = e.utm_medium || "(none)";
      if (!stats.byMedium[medium])
        stats.byMedium[medium] = { signups: 0, logins: 0, total: 0, visits: 0 };
      stats.byMedium[medium].total++;
      stats.byMedium[medium][eventBucket]++;

      const provider = e.auth_provider || "direct";
      if (!stats.byProvider[provider])
        stats.byProvider[provider] = { signups: 0, logins: 0, visits: 0, total: 0 };
      stats.byProvider[provider].total++;
      stats.byProvider[provider][eventBucket]++;
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

    // ============================================
    // ORDERS QUERY - Add revenue/order tracking
    // ============================================
    let ordersQuery = supabaseAdmin
      .from('orders')
      .select(`
        id,
        order_number,
        customer_email,
        subtotal,
        discount_amount,
        coupon_code,
        attributed_utm_source,
        attributed_utm_campaign,
        attributed_utm_medium,
        attributed_agency_id,
        created_at,
        agencies:attributed_agency_id (
          id,
          name
        )
      `)
      .in('status', ['order_placed', 'acknowledged', 'manufacturing', 'shipping', 'delivered']);

    // Apply date filters to orders
    if (dateFrom) {
      ordersQuery = ordersQuery.gte('created_at', dateFrom);
    }
    if (dateTo) {
      ordersQuery = ordersQuery.lte('created_at', dateTo + 'T23:59:59.999Z');
    }

    // Apply filters if provided
    if (filters?.coupon_codes?.length) {
      ordersQuery = ordersQuery.in('coupon_code', filters.coupon_codes);
    }
    if (filters?.utm_sources?.length) {
      ordersQuery = ordersQuery.in('attributed_utm_source', filters.utm_sources);
    }
    if (filters?.utm_campaigns?.length) {
      ordersQuery = ordersQuery.in('attributed_utm_campaign', filters.utm_campaigns);
    }
    if (filters?.agencies?.length) {
      ordersQuery = ordersQuery.in('attributed_agency_id', filters.agencies);
    }

    const { data: orders, error: ordersError } = await ordersQuery;

    if (ordersError) {
      console.error('Failed to fetch orders:', ordersError);
      // Non-blocking: continue without order data
    }

    // ============================================
    // AGGREGATE ORDER METRICS
    // ============================================
    const safeOrders = orders || [];

    // Fetch coupon details for orders that used coupons
    const couponCodes = [...new Set(safeOrders.map(o => o.coupon_code).filter(Boolean))];
    let couponsMap = {};

    if (couponCodes.length > 0) {
      const { data: couponsData } = await supabaseAdmin
        .from('coupons')
        .select('code, utm_campaign, utm_source, utm_medium, channel, discount_type, discount_value, agency_id')
        .in('code', couponCodes);

      if (couponsData) {
        couponsMap = Object.fromEntries(couponsData.map(c => [c.code, c]));
      }
    }

    // Rollup metrics
    stats.totalOrders = safeOrders.length;
    stats.totalRevenue = safeOrders.reduce((sum, o) => sum + (parseFloat(o.subtotal) || 0), 0);
    stats.totalDiscount = safeOrders.reduce((sum, o) => sum + (parseFloat(o.discount_amount) || 0), 0);
    stats.netRevenue = stats.totalRevenue - stats.totalDiscount;
    stats.avgOrderValue = stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;

    // Aggregate orders by source
    const ordersBySource = {};
    safeOrders.forEach(order => {
      const source = order.attributed_utm_source || '(direct)';
      if (!ordersBySource[source]) {
        ordersBySource[source] = { orders: 0, revenue: 0, discount: 0 };
      }
      ordersBySource[source].orders++;
      ordersBySource[source].revenue += parseFloat(order.subtotal) || 0;
      ordersBySource[source].discount += parseFloat(order.discount_amount) || 0;
    });

    // Merge order metrics into bySource
    Object.keys(ordersBySource).forEach(source => {
      if (!stats.bySource[source]) {
        stats.bySource[source] = { visits: 0, signups: 0, logins: 0, total: 0 };
      }
      stats.bySource[source].orders = ordersBySource[source].orders;
      stats.bySource[source].revenue = ordersBySource[source].revenue;
      stats.bySource[source].discount = ordersBySource[source].discount;
      stats.bySource[source].netRevenue = ordersBySource[source].revenue - ordersBySource[source].discount;
      stats.bySource[source].conversionRate = stats.bySource[source].visits > 0
        ? ((ordersBySource[source].orders / stats.bySource[source].visits) * 100).toFixed(2)
        : 0;
    });

    // Aggregate orders by campaign
    const ordersByCampaign = {};
    safeOrders.forEach(order => {
      const campaign = order.attributed_utm_campaign || '(none)';
      if (!ordersByCampaign[campaign]) {
        ordersByCampaign[campaign] = { orders: 0, revenue: 0, discount: 0 };
      }
      ordersByCampaign[campaign].orders++;
      ordersByCampaign[campaign].revenue += parseFloat(order.subtotal) || 0;
      ordersByCampaign[campaign].discount += parseFloat(order.discount_amount) || 0;
    });

    // Merge order metrics into byCampaign
    Object.keys(ordersByCampaign).forEach(campaign => {
      if (!stats.byCampaign[campaign]) {
        stats.byCampaign[campaign] = { visits: 0, signups: 0, logins: 0, total: 0 };
      }
      stats.byCampaign[campaign].orders = ordersByCampaign[campaign].orders;
      stats.byCampaign[campaign].revenue = ordersByCampaign[campaign].revenue;
      stats.byCampaign[campaign].discount = ordersByCampaign[campaign].discount;
      stats.byCampaign[campaign].netRevenue = ordersByCampaign[campaign].revenue - ordersByCampaign[campaign].discount;
      stats.byCampaign[campaign].conversionRate = stats.byCampaign[campaign].visits > 0
        ? ((ordersByCampaign[campaign].orders / stats.byCampaign[campaign].visits) * 100).toFixed(2)
        : 0;
    });

    // Aggregate orders by medium
    const ordersByMedium = {};
    safeOrders.forEach(order => {
      const medium = order.attributed_utm_medium || '(none)';
      if (!ordersByMedium[medium]) {
        ordersByMedium[medium] = { orders: 0, revenue: 0, discount: 0 };
      }
      ordersByMedium[medium].orders++;
      ordersByMedium[medium].revenue += parseFloat(order.subtotal) || 0;
      ordersByMedium[medium].discount += parseFloat(order.discount_amount) || 0;
    });

    // Merge order metrics into byMedium
    Object.keys(ordersByMedium).forEach(medium => {
      if (!stats.byMedium[medium]) {
        stats.byMedium[medium] = { visits: 0, signups: 0, logins: 0, total: 0 };
      }
      stats.byMedium[medium].orders = ordersByMedium[medium].orders;
      stats.byMedium[medium].revenue = ordersByMedium[medium].revenue;
      stats.byMedium[medium].discount = ordersByMedium[medium].discount;
      stats.byMedium[medium].netRevenue = ordersByMedium[medium].revenue - ordersByMedium[medium].discount;
    });

    // ============================================
    // NEW BREAKDOWNS: By Coupon, Agency, Channel
    // ============================================

    // By Coupon - Enhanced with full funnel (visits, signups, logins, orders)
    stats.byCoupon = {};

    // First, aggregate visits with coupons
    (visits || []).forEach(visit => {
      if (!visit.coupon_code) return;
      const code = visit.coupon_code;

      if (!stats.byCoupon[code]) {
        stats.byCoupon[code] = {
          couponDetails: {
            code,
            utm_campaign: null,
            utm_source: null,
            agency_name: null,
            discount_type: null,
            discount_value: null,
          },
          visits: 0,
          signups: 0,
          logins: 0,
          usageCount: 0,
          totalDiscount: 0,
          ordersRevenue: 0,
          netRevenue: 0,
          avgDiscount: 0,
          conversionRate: 0,
        };
      }
      stats.byCoupon[code].visits++;
    });

    // Second, aggregate events (signups/logins) with coupons
    events.forEach(event => {
      if (!event.coupon_code) return;
      const code = event.coupon_code;

      if (!stats.byCoupon[code]) {
        stats.byCoupon[code] = {
          couponDetails: {
            code,
            utm_campaign: event.utm_campaign || null,
            utm_source: event.utm_source || null,
            agency_name: null,
            discount_type: null,
            discount_value: null,
          },
          visits: 0,
          signups: 0,
          logins: 0,
          usageCount: 0,
          totalDiscount: 0,
          ordersRevenue: 0,
          netRevenue: 0,
          avgDiscount: 0,
          conversionRate: 0,
        };
      }

      if (event.event_type === 'signup') {
        stats.byCoupon[code].signups++;
      } else if (event.event_type === 'login') {
        stats.byCoupon[code].logins++;
      } else if (event.event_type === 'visit') {
        stats.byCoupon[code].visits++;
      }

      // Update campaign/source from event if not already set
      if (!stats.byCoupon[code].couponDetails.utm_campaign && event.utm_campaign) {
        stats.byCoupon[code].couponDetails.utm_campaign = event.utm_campaign;
      }
      if (!stats.byCoupon[code].couponDetails.utm_source && event.utm_source) {
        stats.byCoupon[code].couponDetails.utm_source = event.utm_source;
      }
    });

    // Third, aggregate orders with coupons
    safeOrders.forEach(order => {
      if (!order.coupon_code) return;

      const code = order.coupon_code;
      const couponDetails = couponsMap[code];

      if (!stats.byCoupon[code]) {
        stats.byCoupon[code] = {
          couponDetails: {
            code,
            utm_campaign: couponDetails?.utm_campaign || null,
            utm_source: couponDetails?.utm_source || null,
            agency_name: order.agencies?.name || null,
            discount_type: couponDetails?.discount_type || null,
            discount_value: couponDetails?.discount_value || null,
          },
          visits: 0,
          signups: 0,
          logins: 0,
          usageCount: 0,
          totalDiscount: 0,
          ordersRevenue: 0,
          netRevenue: 0,
          avgDiscount: 0,
          conversionRate: 0,
        };
      }

      // Merge coupon details from database
      if (couponDetails) {
        stats.byCoupon[code].couponDetails.utm_campaign = couponDetails.utm_campaign || stats.byCoupon[code].couponDetails.utm_campaign;
        stats.byCoupon[code].couponDetails.utm_source = couponDetails.utm_source || stats.byCoupon[code].couponDetails.utm_source;
        stats.byCoupon[code].couponDetails.discount_type = couponDetails.discount_type;
        stats.byCoupon[code].couponDetails.discount_value = couponDetails.discount_value;
      }
      if (order.agencies?.name) {
        stats.byCoupon[code].couponDetails.agency_name = order.agencies.name;
      }

      stats.byCoupon[code].usageCount++;
      stats.byCoupon[code].totalDiscount += parseFloat(order.discount_amount) || 0;
      stats.byCoupon[code].ordersRevenue += parseFloat(order.subtotal) || 0;
    });

    // Calculate final metrics for each coupon
    Object.keys(stats.byCoupon).forEach(code => {
      const couponData = stats.byCoupon[code];
      couponData.netRevenue = couponData.ordersRevenue - couponData.totalDiscount;
      couponData.avgDiscount = couponData.usageCount > 0
        ? couponData.totalDiscount / couponData.usageCount
        : 0;
      couponData.conversionRate = couponData.visits > 0
        ? ((couponData.usageCount / couponData.visits) * 100).toFixed(2)
        : 0;
    });

    // By Agency - Enhanced with full funnel (visits, signups, logins, orders)
    stats.byAgency = {};

    // Create coupon-to-agency mapping from coupons table
    const couponToAgency = {};
    Object.values(couponsMap).forEach(coupon => {
      if (coupon.agency_id && coupon.code) {
        couponToAgency[coupon.code] = coupon.agency_id;
      }
    });

    // Fetch agency details for mapping agency_id to name
    const agencyIds = [...new Set(Object.values(couponToAgency))];
    const agencyIdToName = {};
    if (agencyIds.length > 0) {
      const { data: agenciesData } = await supabaseAdmin
        .from('agencies')
        .select('id, name')
        .in('id', agencyIds);

      if (agenciesData) {
        agenciesData.forEach(agency => {
          agencyIdToName[agency.id] = agency.name;
        });
      }
    }

    // Aggregate visits by agency (via coupon)
    (visits || []).forEach(visit => {
      if (!visit.coupon_code) return;
      const agencyId = couponToAgency[visit.coupon_code];
      if (!agencyId) return;
      const agencyName = agencyIdToName[agencyId];
      if (!agencyName) return;

      if (!stats.byAgency[agencyName]) {
        stats.byAgency[agencyName] = {
          agencyId,
          coupons: new Set(),
          visits: 0,
          signups: 0,
          logins: 0,
          orders: 0,
          revenue: 0,
          discount: 0,
          netRevenue: 0,
        };
      }
      stats.byAgency[agencyName].visits++;
      stats.byAgency[agencyName].coupons.add(visit.coupon_code);
    });

    // Aggregate events (signups/logins) by agency (via coupon)
    events.forEach(event => {
      if (!event.coupon_code) return;
      const agencyId = couponToAgency[event.coupon_code];
      if (!agencyId) return;
      const agencyName = agencyIdToName[agencyId];
      if (!agencyName) return;

      if (!stats.byAgency[agencyName]) {
        stats.byAgency[agencyName] = {
          agencyId,
          coupons: new Set(),
          visits: 0,
          signups: 0,
          logins: 0,
          orders: 0,
          revenue: 0,
          discount: 0,
          netRevenue: 0,
        };
      }

      if (event.event_type === 'signup') {
        stats.byAgency[agencyName].signups++;
      } else if (event.event_type === 'login') {
        stats.byAgency[agencyName].logins++;
      } else if (event.event_type === 'visit') {
        stats.byAgency[agencyName].visits++;
      }
      stats.byAgency[agencyName].coupons.add(event.coupon_code);
    });

    // Aggregate orders by agency
    safeOrders.forEach(order => {
      if (!order.agencies || !order.agencies.name) return;

      const agencyName = order.agencies.name;
      if (!stats.byAgency[agencyName]) {
        stats.byAgency[agencyName] = {
          agencyId: order.agencies.id,
          coupons: new Set(),
          visits: 0,
          signups: 0,
          logins: 0,
          orders: 0,
          revenue: 0,
          discount: 0,
          netRevenue: 0,
        };
      }

      if (order.coupon_code) {
        stats.byAgency[agencyName].coupons.add(order.coupon_code);
      }
      stats.byAgency[agencyName].orders++;
      stats.byAgency[agencyName].revenue += parseFloat(order.subtotal) || 0;
      stats.byAgency[agencyName].discount += parseFloat(order.discount_amount) || 0;
    });

    // Convert Set to Array and calculate netRevenue
    Object.keys(stats.byAgency).forEach(agencyName => {
      stats.byAgency[agencyName].coupons = Array.from(stats.byAgency[agencyName].coupons);
      stats.byAgency[agencyName].netRevenue = stats.byAgency[agencyName].revenue - stats.byAgency[agencyName].discount;
    });

    // By Channel
    stats.byChannel = {};
    safeOrders.forEach(order => {
      const couponDetails = order.coupon_code ? couponsMap[order.coupon_code] : null;
      if (!couponDetails || !couponDetails.channel) return;

      const channel = couponDetails.channel;
      if (!stats.byChannel[channel]) {
        stats.byChannel[channel] = {
          orders: 0,
          revenue: 0,
          discount: 0,
          netRevenue: 0,
          avgOrderValue: 0,
        };
      }

      stats.byChannel[channel].orders++;
      stats.byChannel[channel].revenue += parseFloat(order.subtotal) || 0;
      stats.byChannel[channel].discount += parseFloat(order.discount_amount) || 0;
    });

    // Calculate netRevenue and avgOrderValue for each channel
    Object.keys(stats.byChannel).forEach(channel => {
      const channelData = stats.byChannel[channel];
      channelData.netRevenue = channelData.revenue - channelData.discount;
      channelData.avgOrderValue = channelData.orders > 0
        ? channelData.revenue / channelData.orders
        : 0;
    });

    // ============================================
    // PAGINATED RECENT EVENTS (merge visits + auth events)
    // ============================================
    // Convert utm_visits into event-shaped objects
    const visitEvents = (visits || []).map((v) => ({
      id: v.id,
      customer_email: "anonymous",
      event_type: "visit",
      auth_provider: "direct",
      utm_source: v.utm_source,
      utm_medium: v.utm_medium,
      utm_campaign: v.utm_campaign,
      utm_content: v.utm_content,
      utm_term: v.utm_term,
      landing_url: v.landing_url,
      referrer_url: v.referrer_url,
      coupon_code: v.coupon_code,
      created_at: v.created_at,
    }));

    // Merge and sort by date (newest first)
    const allEvents = [...events, ...visitEvents].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    const eventsOffset = (eventsPage - 1) * eventsLimit;
    stats.recentEvents = allEvents.slice(eventsOffset, eventsOffset + eventsLimit);
    stats.totalEventsCount = allEvents.length;
    stats.eventsPage = eventsPage;
    stats.eventsLimit = eventsLimit;
    stats.eventsTotalPages = Math.ceil(allEvents.length / eventsLimit);

    // ============================================
    // PAGINATED RECENT ORDERS
    // ============================================
    const sortedOrders = safeOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const ordersOffset = (ordersPage - 1) * ordersLimit;

    stats.recentOrders = sortedOrders
      .slice(ordersOffset, ordersOffset + ordersLimit)
      .map(o => ({
        order_number: o.order_number,
        customer_email: o.customer_email,
        created_at: o.created_at,
        subtotal: o.subtotal,
        discount_amount: o.discount_amount,
        coupon_code: o.coupon_code,
        attributed_utm_source: o.attributed_utm_source,
        attributed_utm_campaign: o.attributed_utm_campaign,
        agency_name: o.agencies?.name || null,
      }));

    stats.totalOrdersCount = sortedOrders.length;
    stats.ordersPage = ordersPage;
    stats.ordersLimit = ordersLimit;
    stats.ordersTotalPages = Math.ceil(sortedOrders.length / ordersLimit);

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error("Error fetching tracking stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracking data" },
      { status: 500 }
    );
  }
}
