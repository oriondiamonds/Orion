"use client";
import { useState } from "react";
import {
  Lock,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

const STATUS_ORDER = [
  "pending",
  "order_placed",
  "acknowledged",
  "manufacturing",
  "shipping",
  "delivered",
];

const STATUS_LABELS = {
  pending: "Payment Pending",
  order_placed: "Order Placed",
  paid: "Order Placed",
  acknowledged: "Acknowledged",
  manufacturing: "Manufacturing",
  shipping: "Shipping",
  delivered: "Delivered",
};

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  order_placed: "bg-blue-100 text-blue-800",
  paid: "bg-blue-100 text-blue-800",
  acknowledged: "bg-purple-100 text-purple-800",
  manufacturing: "bg-orange-100 text-orange-800",
  shipping: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminOrdersPage() {
  const [password, setPassword] = useState("");
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [updateNote, setUpdateNote] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const limit = 25;

  const fetchOrders = async (targetPage = page) => {
    if (!password) {
      setError("Enter admin password");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          statusFilter,
          search: search.trim() || undefined,
          page: targetPage,
          limit,
        }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setOrders([]);
      } else {
        setOrders(data.orders);
        setTotal(data.total);
        setPage(targetPage);
        toast.success(`${data.total} orders loaded`);
      }
    } catch {
      setError("Failed to load orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          orderId,
          newStatus,
          note: updateNote.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(`Status updated to ${STATUS_LABELS[newStatus]}`);
        setUpdateNote("");
        fetchOrders(page);
      }
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const getForwardStatuses = (currentStatus) => {
    const currentIdx = STATUS_ORDER.indexOf(currentStatus);
    if (currentIdx < 0) return [];
    return STATUS_ORDER.slice(currentIdx + 1);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gray-50 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 mt-10">
          <Package className="w-8 h-8 text-[#0a1833]" />
          <div>
            <h1 className="text-3xl font-bold text-[#0a1833]">
              Order Management
            </h1>
            <p className="text-gray-500 text-sm">
              View and update order statuses
            </p>
          </div>
        </div>

        {/* Password + Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[200px]">
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
                  onKeyDown={(e) => e.key === "Enter" && fetchOrders(1)}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
                />
              </div>
            </div>

            <div className="min-w-[150px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchOrders(1)}
                  placeholder="Order # or email"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
                />
              </div>
            </div>

            <button
              onClick={() => fetchOrders(1)}
              disabled={loading}
              className="flex items-center gap-2 bg-[#0a1833] text-white px-5 py-2 rounded-lg font-medium hover:bg-[#142850] transition disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              {loading ? "Loading..." : "Load Orders"}
            </button>
          </div>

          {error && (
            <p className="mt-3 text-red-600 text-sm font-medium">{error}</p>
          )}
        </div>

        {/* Orders List */}
        {orders.length > 0 && (
          <>
            <div className="space-y-3 mb-6">
              {orders.map((order) => {
                const isExpanded = expandedOrderId === order.id;
                const forwardStatuses = getForwardStatuses(order.status);
                const statusColor =
                  STATUS_COLORS[order.status] || "bg-gray-100 text-gray-800";
                const statusLabel =
                  STATUS_LABELS[order.status] || order.status;

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                  >
                    {/* Order Row */}
                    <button
                      onClick={() =>
                        setExpandedOrderId(isExpanded ? null : order.id)
                      }
                      className="w-full text-left p-4 hover:bg-gray-50 transition"
                    >
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="min-w-[100px]">
                          <p className="font-semibold text-[#0a1833]">
                            #{order.order_number}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                        <div className="flex-1 min-w-[150px]">
                          <p className="text-sm text-gray-700 truncate">
                            {order.customer_email}
                          </p>
                          <p className="text-xs text-gray-500">
                            {order.items?.length || 0} items
                          </p>
                        </div>
                        <div className="text-right min-w-[80px]">
                          <p className="font-semibold text-[#0a1833]">
                            {"\u20B9"}
                            {Number(order.subtotal).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor}`}
                        >
                          {statusLabel}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 p-5 bg-gray-50 space-y-5">
                        {/* Items */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">
                            Items
                          </h4>
                          <div className="space-y-2">
                            {(order.items || []).map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-3 bg-white rounded-lg p-3 text-sm"
                              >
                                {item.image && (
                                  <img
                                    src={item.image}
                                    alt={item.title}
                                    className="w-10 h-10 rounded object-cover"
                                  />
                                )}
                                <div className="flex-1">
                                  <p className="font-medium">{item.title}</p>
                                  {item.variantTitle &&
                                    item.variantTitle !== "Default Title" && (
                                      <p className="text-xs text-gray-500">
                                        {item.variantTitle}
                                      </p>
                                    )}
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">
                                    {"\u20B9"}
                                    {parseFloat(
                                      item.calculatedPrice || item.price
                                    ).toLocaleString("en-IN")}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Qty: {item.quantity || 1}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Coupon */}
                        {order.coupon_code && (
                          <div className="text-sm bg-green-50 border border-green-200 rounded-lg p-3 text-green-700">
                            Coupon{" "}
                            <strong>{order.coupon_code}</strong> applied
                            {order.discount_amount > 0 && (
                              <>
                                {" "}
                                &mdash; {"\u20B9"}
                                {Number(order.discount_amount).toLocaleString(
                                  "en-IN"
                                )}{" "}
                                off
                              </>
                            )}
                          </div>
                        )}

                        {/* Shipping Address */}
                        {order.shipping_address && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                              <MapPin className="w-4 h-4" /> Shipping Address
                            </h4>
                            <div className="bg-white rounded-lg p-3 text-sm text-gray-700 leading-relaxed">
                              <p>
                                {order.shipping_address.firstName}{" "}
                                {order.shipping_address.lastName}
                              </p>
                              <p>{order.shipping_address.address1}</p>
                              {order.shipping_address.address2 && (
                                <p>{order.shipping_address.address2}</p>
                              )}
                              <p>
                                {order.shipping_address.city},{" "}
                                {order.shipping_address.state}{" "}
                                {order.shipping_address.zip}
                              </p>
                              {order.shipping_address.phone && (
                                <p>Phone: {order.shipping_address.phone}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Status History */}
                        {order.status_history &&
                          order.status_history.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                                <Clock className="w-4 h-4" /> Status History
                              </h4>
                              <div className="space-y-2">
                                {order.status_history.map((entry, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-3 text-sm"
                                  >
                                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                                    <div>
                                      <p className="font-medium">
                                        {STATUS_LABELS[entry.status] ||
                                          entry.status}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {formatDateTime(entry.timestamp)}
                                        {entry.note && ` — ${entry.note}`}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        {/* Status Update Controls */}
                        {forwardStatuses.length > 0 && (
                          <div className="border-t border-gray-200 pt-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">
                              Update Status
                            </h4>
                            <div className="flex flex-wrap gap-3 items-end">
                              <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs text-gray-500 mb-1">
                                  Note (optional)
                                </label>
                                <input
                                  type="text"
                                  value={
                                    expandedOrderId === order.id
                                      ? updateNote
                                      : ""
                                  }
                                  onChange={(e) =>
                                    setUpdateNote(e.target.value)
                                  }
                                  placeholder="Add a note..."
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
                                />
                              </div>
                              {forwardStatuses.map((s) => (
                                <button
                                  key={s}
                                  onClick={() =>
                                    handleStatusUpdate(order.id, s)
                                  }
                                  disabled={updatingId === order.id}
                                  className={`px-4 py-2 rounded-lg text-xs font-medium transition disabled:opacity-50 ${STATUS_COLORS[s]} hover:opacity-80 border border-transparent`}
                                >
                                  {updatingId === order.id
                                    ? "..."
                                    : `→ ${STATUS_LABELS[s]}`}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-3">
                <p className="text-sm text-gray-600">
                  Showing {(page - 1) * limit + 1}–
                  {Math.min(page * limit, total)} of {total} orders
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchOrders(page - 1)}
                    disabled={page <= 1 || loading}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium text-[#0a1833]">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => fetchOrders(page + 1)}
                    disabled={page >= totalPages || loading}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {orders.length === 0 && !error && !loading && password && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No orders found</p>
            <p className="text-gray-400 text-sm mt-1">
              Try adjusting your filters or search term.
            </p>
          </div>
        )}

        {/* Placeholder before login */}
        {!password && !error && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Lock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              Enter admin password to manage orders
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
