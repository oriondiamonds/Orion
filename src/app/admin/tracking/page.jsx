"use client";
import { useState, useEffect } from "react";
import {
  Lock,
  BarChart3,
  Users,
  UserPlus,
  LogIn,
  RefreshCw,
  Globe,
  Megaphone,
  Radio,
  Shield,
  Calendar,
  MousePointerClick,
  TrendingUp,
  ShoppingBag,
  IndianRupee,
  Tag,
  Building2,
} from "lucide-react";
import toast from "react-hot-toast";
import MultiSelectDropdown from "../../../components/MultiSelectDropdown";
import Pagination from "../../../components/Pagination";

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatsTable({ title, icon: Icon, data, showVisits }) {
  const entries = Object.entries(data).sort((a, b) => {
    // Sort by orders if available, otherwise by total
    const aVal = b[1].orders !== undefined ? b[1].orders : b[1].total;
    const bVal = a[1].orders !== undefined ? a[1].orders : a[1].total;
    return aVal - bVal;
  });

  if (entries.length === 0) return null;

  // Check if data has order metrics
  const hasOrders = entries.some(([, counts]) => counts.orders !== undefined);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <Icon className="w-5 h-5 text-[#0a1833]" />
        <h3 className="font-semibold text-[#0a1833]">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="text-left px-6 py-3 font-medium">Name</th>
              {showVisits && (
                <th className="text-center px-4 py-3 font-medium">Visits</th>
              )}
              <th className="text-center px-4 py-3 font-medium">Signups</th>
              <th className="text-center px-4 py-3 font-medium">Logins</th>
              <th className="text-center px-4 py-3 font-medium">Total</th>
              {hasOrders && (
                <>
                  <th className="text-center px-4 py-3 font-medium">Orders</th>
                  <th className="text-right px-4 py-3 font-medium">Revenue</th>
                  <th className="text-right px-4 py-3 font-medium">Discount</th>
                  <th className="text-right px-4 py-3 font-medium">Net Revenue</th>
                </>
              )}
              {showVisits && (
                <th className="text-center px-4 py-3 font-medium">Conv %</th>
              )}
            </tr>
          </thead>
          <tbody>
            {entries.map(([name, counts]) => {
              // Use provided conversionRate if available (for coupons: orders/visits)
              // Otherwise calculate signup conversion (for sources/campaigns: signups/visits)
              const convRate =
                showVisits && counts.visits > 0
                  ? (counts.conversionRate !== undefined
                      ? counts.conversionRate
                      : ((counts.signups / counts.visits) * 100).toFixed(1))
                  : null;
              return (
                <tr
                  key={name}
                  className="border-t border-gray-50 hover:bg-gray-50"
                >
                  <td className="px-6 py-3 font-medium text-[#0a1833]">
                    {name}
                  </td>
                  {showVisits && (
                    <td className="text-center px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full text-xs font-medium">
                        {counts.visits || 0}
                      </span>
                    </td>
                  )}
                  <td className="text-center px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium">
                      {counts.signups || 0}
                    </span>
                  </td>
                  <td className="text-center px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full text-xs font-medium">
                      {counts.logins || 0}
                    </span>
                  </td>
                  <td className="text-center px-4 py-3 font-semibold">
                    {counts.total || 0}
                  </td>
                  {hasOrders && (
                    <>
                      <td className="text-center px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full text-xs font-medium">
                          {counts.orders || 0}
                        </span>
                      </td>
                      <td className="text-right px-4 py-3 text-gray-700">
                        ₹{((counts.revenue || 0)).toLocaleString('en-IN')}
                      </td>
                      <td className="text-right px-4 py-3 text-red-600">
                        -₹{((counts.discount || 0)).toLocaleString('en-IN')}
                      </td>
                      <td className="text-right px-4 py-3 font-semibold text-teal-700">
                        ₹{((counts.netRevenue || 0)).toLocaleString('en-IN')}
                      </td>
                    </>
                  )}
                  {showVisits && (
                    <td className="text-center px-4 py-3">
                      {convRate !== null ? (
                        <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full text-xs font-medium">
                          {convRate}%
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminTrackingPage() {
  const [password, setPassword] = useState("");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Filter state
  const [filters, setFilters] = useState({
    couponCodes: [],
    utmSources: [],
    utmCampaigns: [],
    agencies: [],
    channels: []
  });

  // Available filter options
  const [availableOptions, setAvailableOptions] = useState({
    coupons: [],
    sources: [],
    campaigns: [],
    agencies: [],
    channels: ['google-ads', 'facebook', 'instagram', 'email', 'self-marketing', 'other']
  });

  // Pagination state
  const [eventsPage, setEventsPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const eventsLimit = 50;
  const ordersLimit = 50;

  // Load filter options (agencies and coupons) when password is set
  useEffect(() => {
    if (!password) return;

    const loadFilterOptions = async () => {
      try {
        // Load agencies (no auth required for GET)
        const agenciesRes = await fetch('/api/admin/agencies');
        const agenciesData = await agenciesRes.json();

        setAvailableOptions(prev => ({
          ...prev,
          agencies: agenciesData.agencies || []
        }));
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    };

    loadFilterOptions();
  }, [password]);

  // Extract sources/campaigns from stats after loading
  useEffect(() => {
    if (!stats) return;

    const sources = Object.keys(stats.bySource || {});
    const campaigns = Object.keys(stats.byCampaign || {});

    setAvailableOptions(prev => ({
      ...prev,
      sources: sources.filter(s => s !== '(direct)'),
      campaigns: campaigns.filter(c => c !== '(none)')
    }));
  }, [stats]);

  // Auto-fetch when events page changes (but not when filters change)
  useEffect(() => {
    if (stats && eventsPage !== (stats.eventsPage || 1)) {
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventsPage]);

  // Auto-fetch when orders page changes (but not when filters change)
  useEffect(() => {
    if (stats && ordersPage !== (stats.ordersPage || 1)) {
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordersPage]);

  // Reset pagination and re-fetch when filters change
  useEffect(() => {
    if (stats) {
      const wasOnFirstPage = eventsPage === 1 && ordersPage === 1;
      setEventsPage(1);
      setOrdersPage(1);

      // Only fetch if we were already on page 1 (no pagination reset needed)
      // Otherwise, the pagination useEffects above will trigger the fetch
      if (wasOnFirstPage) {
        fetchStats();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, dateFrom, dateTo]);

  const fetchStats = async () => {
    if (!password) {
      setError("Enter admin password");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          filters: {
            coupon_codes: filters.couponCodes.length ? filters.couponCodes : undefined,
            utm_sources: filters.utmSources.length ? filters.utmSources : undefined,
            utm_campaigns: filters.utmCampaigns.length ? filters.utmCampaigns : undefined,
            agencies: filters.agencies.length ? filters.agencies : undefined,
            channels: filters.channels.length ? filters.channels : undefined
          },
          eventsPage,
          eventsLimit,
          ordersPage,
          ordersLimit
        }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setStats(null);
      } else {
        setStats(data.stats);
        toast.success("Stats loaded");
      }
    } catch {
      setError("Failed to load stats");
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 mt-16">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 mt-10">
          <BarChart3 className="w-8 h-8 text-[#0a1833]" />
          <div>
            <h1 className="text-3xl font-bold text-[#0a1833]">
              UTM & Referral Tracking
            </h1>
            <p className="text-gray-500 text-sm">
              Track signups and logins from referral links
            </p>
          </div>
        </div>

        {/* Password + Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="space-y-4">
            {/* Row 1: Password + Date Range + Load Button */}
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Admin Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && fetchStats()}
                    placeholder="Enter password"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  From
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  To
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
                  />
                </div>
              </div>

              <button
                onClick={fetchStats}
                disabled={loading}
                className="flex items-center gap-2 bg-[#0a1833] text-white px-5 py-2 rounded-lg font-medium hover:bg-[#142850] transition disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                {loading ? "Loading..." : "Load Stats"}
              </button>
            </div>

            {/* Row 2: Multi-Select Filters */}
            {stats && (
              <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
                <MultiSelectDropdown
                  label="Sources"
                  options={availableOptions.sources}
                  selected={filters.utmSources}
                  onChange={(val) => setFilters({...filters, utmSources: val})}
                />

                <MultiSelectDropdown
                  label="Campaigns"
                  options={availableOptions.campaigns}
                  selected={filters.utmCampaigns}
                  onChange={(val) => setFilters({...filters, utmCampaigns: val})}
                />

                <MultiSelectDropdown
                  label="Agencies"
                  options={availableOptions.agencies}
                  selected={filters.agencies}
                  onChange={(val) => setFilters({...filters, agencies: val})}
                />

                <MultiSelectDropdown
                  label="Channels"
                  options={availableOptions.channels}
                  selected={filters.channels}
                  onChange={(val) => setFilters({...filters, channels: val})}
                />
              </div>
            )}
          </div>

          {error && (
            <p className="mt-3 text-red-600 text-sm font-medium">{error}</p>
          )}
        </div>

        {/* Stats Content — only shown after password verified */}
        {stats && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-3">
                <div className="p-2.5 bg-orange-50 rounded-lg">
                  <MousePointerClick className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0a1833]">
                    {stats.totalVisits || 0}
                  </p>
                  <p className="text-xs text-gray-500">Visits</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-3">
                <div className="p-2.5 bg-green-50 rounded-lg">
                  <UserPlus className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0a1833]">
                    {stats.signups}
                  </p>
                  <p className="text-xs text-gray-500">Signups</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-lg">
                  <LogIn className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0a1833]">
                    {stats.logins}
                  </p>
                  <p className="text-xs text-gray-500">Logins</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-3">
                <div className="p-2.5 bg-purple-50 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0a1833]">
                    {stats.totalEvents}
                  </p>
                  <p className="text-xs text-gray-500">Total Events</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-3">
                <div className="p-2.5 bg-teal-50 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0a1833]">
                    {stats.totalVisits > 0
                      ? ((stats.signups / stats.totalVisits) * 100).toFixed(1)
                      : "0"}
                    %
                  </p>
                  <p className="text-xs text-gray-500">Conversion</p>
                </div>
              </div>
            </div>

            {/* Order/Revenue KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-lg">
                  <ShoppingBag className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0a1833]">
                    {stats.totalOrders || 0}
                  </p>
                  <p className="text-xs text-gray-500">Orders</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-3">
                <div className="p-2.5 bg-purple-50 rounded-lg">
                  <IndianRupee className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0a1833]">
                    ₹{((stats.totalRevenue || 0) / 1000).toFixed(1)}K
                  </p>
                  <p className="text-xs text-gray-500">Revenue</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-3">
                <div className="p-2.5 bg-red-50 rounded-lg">
                  <Tag className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0a1833]">
                    ₹{((stats.totalDiscount || 0) / 1000).toFixed(1)}K
                  </p>
                  <p className="text-xs text-gray-500">Discount</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-3">
                <div className="p-2.5 bg-teal-50 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0a1833]">
                    ₹{((stats.netRevenue || 0) / 1000).toFixed(1)}K
                  </p>
                  <p className="text-xs text-gray-500">Net Revenue</p>
                </div>
              </div>
            </div>

            {/* Breakdown Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <StatsTable
                title="By Source"
                icon={Globe}
                data={stats.bySource}
                showVisits
              />
              <StatsTable
                title="By Campaign"
                icon={Megaphone}
                data={stats.byCampaign}
                showVisits
              />
              <StatsTable
                title="By Medium"
                icon={Radio}
                data={stats.byMedium}
                showVisits
              />
              <StatsTable
                title="By Auth Provider"
                icon={Shield}
                data={stats.byProvider}
              />
            </div>

            {/* New Breakdown Tables: By Coupon, By Agency, By Channel */}
            {(stats.byCoupon && Object.keys(stats.byCoupon).length > 0) ||
             (stats.byAgency && Object.keys(stats.byAgency).length > 0) ||
             (stats.byChannel && Object.keys(stats.byChannel).length > 0) ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {stats.byCoupon && Object.keys(stats.byCoupon).length > 0 && (
                  <StatsTable
                    title="By Coupon"
                    icon={Tag}
                    data={stats.byCoupon}
                    showVisits={true}
                  />
                )}
                {stats.byAgency && Object.keys(stats.byAgency).length > 0 && (
                  <StatsTable
                    title="By Agency"
                    icon={Building2}
                    data={stats.byAgency}
                    showVisits={true}
                  />
                )}
                {stats.byChannel && Object.keys(stats.byChannel).length > 0 && (
                  <StatsTable
                    title="By Channel"
                    icon={Radio}
                    data={stats.byChannel}
                    showVisits={false}
                  />
                )}
              </div>
            ) : null}

            {/* Recent Events Table */}
            {stats.recentEvents.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-[#0a1833]">
                    Recent Events
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600">
                        <th className="text-left px-4 py-3 font-medium">
                          Date
                        </th>
                        <th className="text-left px-4 py-3 font-medium">
                          Email
                        </th>
                        <th className="text-center px-4 py-3 font-medium">
                          Event
                        </th>
                        <th className="text-center px-4 py-3 font-medium">
                          Provider
                        </th>
                        <th className="text-left px-4 py-3 font-medium">
                          Source
                        </th>
                        <th className="text-left px-4 py-3 font-medium">
                          Campaign
                        </th>
                        <th className="text-left px-4 py-3 font-medium">
                          Coupon
                        </th>
                        <th className="text-left px-4 py-3 font-medium">
                          Landing URL
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentEvents.map((event) => (
                        <tr
                          key={event.id}
                          className="border-t border-gray-50 hover:bg-gray-50"
                        >
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {formatDate(event.created_at)}
                          </td>
                          <td className="px-4 py-3 font-medium text-[#0a1833] max-w-[180px] truncate">
                            {event.customer_email}
                          </td>
                          <td className="text-center px-4 py-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                event.event_type === "signup"
                                  ? "bg-green-50 text-green-700"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              {event.event_type}
                            </span>
                          </td>
                          <td className="text-center px-4 py-3 text-gray-600">
                            {event.auth_provider}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {event.utm_source || "-"}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {event.utm_campaign || "-"}
                          </td>
                          <td className="px-4 py-3">
                            {event.coupon_code ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                                {event.coupon_code}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate text-xs">
                            {event.landing_url || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Events Pagination */}
                <Pagination
                  currentPage={stats.eventsPage || eventsPage}
                  totalPages={stats.eventsTotalPages || 1}
                  totalCount={stats.totalEventsCount}
                  onPageChange={(page) => {
                    setEventsPage(page);
                  }}
                />
              </div>
            )}

            {/* Recent Orders Table */}
            {stats.recentOrders && stats.recentOrders.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-[#0a1833]">
                    Recent Orders
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600">
                        <th className="text-left px-4 py-3 font-medium">Order #</th>
                        <th className="text-left px-4 py-3 font-medium">Date</th>
                        <th className="text-left px-4 py-3 font-medium">Email</th>
                        <th className="text-right px-4 py-3 font-medium">Subtotal</th>
                        <th className="text-right px-4 py-3 font-medium">Discount</th>
                        <th className="text-left px-4 py-3 font-medium">Coupon</th>
                        <th className="text-left px-4 py-3 font-medium">Source</th>
                        <th className="text-left px-4 py-3 font-medium">Campaign</th>
                        <th className="text-left px-4 py-3 font-medium">Agency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentOrders.map((order) => (
                        <tr
                          key={order.order_number}
                          className="border-t border-gray-50 hover:bg-gray-50"
                        >
                          <td className="px-4 py-3 font-medium text-[#0a1833]">
                            {order.order_number}
                          </td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                            {formatDate(order.created_at)}
                          </td>
                          <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">
                            {order.customer_email}
                          </td>
                          <td className="text-right px-4 py-3 text-gray-700">
                            ₹{(order.subtotal || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="text-right px-4 py-3 text-red-600">
                            -₹{(order.discount_amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {order.coupon_code || '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {order.attributed_utm_source || '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {order.attributed_utm_campaign || '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {order.agency_name || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Orders Pagination */}
                <Pagination
                  currentPage={stats.ordersPage || ordersPage}
                  totalPages={stats.ordersTotalPages || 1}
                  totalCount={stats.totalOrdersCount}
                  onPageChange={(page) => {
                    setOrdersPage(page);
                  }}
                />
              </div>
            )}

            {stats.totalEvents === 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No tracking events yet</p>
                <p className="text-gray-400 text-sm mt-1">
                  Events will appear here when users sign up or log in via
                  referral links with UTM parameters.
                </p>
              </div>
            )}
          </>
        )}

        {/* Placeholder when no stats loaded yet */}
        {!stats && !error && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Lock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              Enter admin password to view tracking stats
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
