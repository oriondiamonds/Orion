// src/app/account/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  ShoppingBag,
  CheckCircle,
  Hammer,
  Truck,
  Package,
  MapPin,
  ChevronDown,
  ChevronUp,
  Tag,
  Clock,
} from "lucide-react";

const ORDER_STATUSES = [
  { key: "order_placed", label: "Order Placed", Icon: ShoppingBag },
  { key: "acknowledged", label: "Acknowledged", Icon: CheckCircle },
  { key: "manufacturing", label: "Manufacturing", Icon: Hammer },
  { key: "shipping", label: "Shipping", Icon: Truck },
  { key: "delivered", label: "Delivered", Icon: Package },
];

function getStatusIndex(status) {
  // Handle legacy "paid" as "order_placed"
  const normalized = status === "paid" ? "order_placed" : status;
  const idx = ORDER_STATUSES.findIndex((s) => s.key === normalized);
  return idx >= 0 ? idx : -1;
}

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  order_placed: "bg-blue-100 text-blue-800",
  paid: "bg-blue-100 text-blue-800",
  acknowledged: "bg-purple-100 text-purple-800",
  manufacturing: "bg-orange-100 text-orange-800",
  shipping: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
};

const STATUS_LABELS = {
  pending: "Payment Pending",
  order_placed: "Order Placed",
  paid: "Order Placed",
  acknowledged: "Acknowledged",
  manufacturing: "Manufacturing",
  shipping: "Shipping",
  delivered: "Delivered",
};

function StatusTimeline({ status }) {
  const currentIdx = getStatusIndex(status);
  if (currentIdx < 0) return null;

  return (
    <div className="flex items-center w-full mt-3 mb-1">
      {ORDER_STATUSES.map((step, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const Icon = step.Icon;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center ${
                  isCompleted
                    ? "bg-green-500 text-white"
                    : isCurrent
                    ? "bg-[#0a1833] text-white ring-2 ring-[#0a1833] ring-offset-2"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
              </div>
              <span
                className={`text-[10px] mt-1 text-center leading-tight ${
                  isCompleted || isCurrent
                    ? "text-[#0a1833] font-medium"
                    : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < ORDER_STATUSES.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 mt-[-14px] ${
                  idx < currentIdx ? "bg-green-500" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
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

export default function AccountPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  useEffect(() => {
    if (status === "loading") return;

    if (status !== "authenticated" || !session?.user?.email) {
      router.push("/login");
      return;
    }

    fetchCustomerData(session.user.email);
    fetchOrders(session.user.email);
  }, [status, session, router]);

  const fetchCustomerData = async (email) => {
    try {
      const res = await fetch(
        `/api/auth/profile?email=${encodeURIComponent(email)}`
      );

      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer);
      } else {
        setCustomer({
          firstName: session.user.name?.split(" ")[0] || "User",
          lastName: session.user.name?.split(" ").slice(1).join(" ") || "",
          displayName: session.user.name,
          email: session.user.email,
          image: session.user.image,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError("Failed to load account information");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async (email) => {
    try {
      const res = await fetch(
        `/api/orders?email=${encodeURIComponent(email)}`
      );
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    localStorage.removeItem("customer_email");
    router.push("/login");
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0a1833] mx-auto mb-4"></div>
          <div className="text-xl text-[#0a1833] font-medium">Loading...</div>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-600 text-lg">{error}</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 py-40 px-4 sm:px-8 lg:px-12 text-[#0a1833]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow-lg rounded-2xl p-8 mb-10 border border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              {customer?.image && (
                <img
                  src={customer.image}
                  alt="Profile"
                  className="w-16 h-16 rounded-full border-2 border-[#0a1833]"
                />
              )}
              <div>
                <h1 className="text-4xl font-serif font-semibold text-[#0a1833]">
                  Welcome back, {customer?.firstName}!
                </h1>
                <p className="text-gray-600 mt-2">{customer?.email}</p>
                {customer?.authProvider && customer.authProvider !== "email" && (
                  <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    Signed in with{" "}
                    {customer.authProvider.charAt(0).toUpperCase() +
                      customer.authProvider.slice(1)}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-[#0a1833] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#142850] transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel */}
          <div className="space-y-8">
            {/* Account Details */}
            <div className="bg-white rounded-2xl shadow-md p-8 border border-gray-100 hover:shadow-lg transition">
              <h2 className="text-2xl font-semibold mb-6 font-serif">
                Account Details
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{customer?.displayName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{customer?.email}</p>
                </div>
                {customer?.phone && (
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{customer.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Member Since</p>
                  <p className="font-medium">
                    {new Date(customer?.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Default Address */}
            {customer?.defaultAddress && (
              <div className="bg-white rounded-2xl shadow-md p-8 border border-gray-100 hover:shadow-lg transition">
                <h2 className="text-2xl font-semibold mb-6 font-serif">
                  Default Address
                </h2>
                <div className="text-gray-700 leading-relaxed">
                  <p>
                    {customer.defaultAddress.firstName}{" "}
                    {customer.defaultAddress.lastName}
                  </p>
                  <p>{customer.defaultAddress.address1}</p>
                  {customer.defaultAddress.address2 && (
                    <p>{customer.defaultAddress.address2}</p>
                  )}
                  <p>
                    {customer.defaultAddress.city},{" "}
                    {customer.defaultAddress.province}{" "}
                    {customer.defaultAddress.zip}
                  </p>
                  <p>{customer.defaultAddress.country}</p>
                  {customer.defaultAddress.phone && (
                    <p>{customer.defaultAddress.phone}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Orders */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-md p-8 border border-gray-100">
              <h2 className="text-2xl font-semibold mb-6 font-serif">
                Order History
              </h2>

              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="w-20 h-20 mx-auto text-gray-300 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                  <p className="text-gray-600 text-lg">No orders yet</p>
                  <button
                    onClick={() => router.push("/")}
                    className="mt-4 bg-[#0a1833] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#142850] transition"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => {
                    const isExpanded = expandedOrderId === order.id;
                    const isPending = order.status === "pending";
                    const statusColor = STATUS_COLORS[order.status] || "bg-gray-100 text-gray-800";
                    const statusLabel = STATUS_LABELS[order.status] || order.status;

                    return (
                      <div
                        key={order.id}
                        className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition"
                      >
                        {/* Order Header — clickable */}
                        <button
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          className="w-full text-left p-5"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <p className="font-semibold text-lg">
                                Order #{order.orderNumber}
                              </p>
                              <p className="text-sm text-gray-500">
                                {new Date(order.createdAt).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor}`}>
                                {statusLabel}
                              </span>
                              <p className="font-bold text-lg">
                                {"\u20B9"}
                                {Number(order.subtotal).toLocaleString("en-IN")}
                              </p>
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                          </div>

                          <div className="text-sm text-gray-600">
                            <p>
                              {order.items.length}{" "}
                              {order.items.length === 1 ? "item" : "items"}
                              {" \u2014 "}
                              {order.items
                                .map((item) => item.title)
                                .join(", ")}
                            </p>
                          </div>

                          {/* Status Timeline (non-pending orders) */}
                          {!isPending && <StatusTimeline status={order.status} />}
                        </button>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="border-t border-gray-100 p-5 bg-gray-50 space-y-5">
                            {/* Items List */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">Items</h4>
                              <div className="space-y-2">
                                {order.items.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-3 bg-white rounded-lg p-3"
                                  >
                                    {item.image && (
                                      <img
                                        src={item.image}
                                        alt={item.title}
                                        className="w-12 h-12 rounded object-cover"
                                      />
                                    )}
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">{item.title}</p>
                                      {item.variantTitle && item.variantTitle !== "Default Title" && (
                                        <p className="text-xs text-gray-500">{item.variantTitle}</p>
                                      )}
                                    </div>
                                    <div className="text-right text-sm">
                                      <p className="font-medium">
                                        {"\u20B9"}{parseFloat(item.calculatedPrice || item.price).toLocaleString("en-IN")}
                                      </p>
                                      <p className="text-xs text-gray-500">Qty: {item.quantity || 1}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Coupon / Discount */}
                            {order.couponCode && (
                              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                                <Tag className="w-4 h-4" />
                                <span>
                                  Coupon <strong>{order.couponCode}</strong> applied
                                  {order.discountAmount > 0 && (
                                    <> &mdash; {"\u20B9"}{Number(order.discountAmount).toLocaleString("en-IN")} off</>
                                  )}
                                </span>
                              </div>
                            )}

                            {/* Shipping Address */}
                            {order.shippingAddress && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                                  <MapPin className="w-4 h-4" /> Shipping Address
                                </h4>
                                <div className="bg-white rounded-lg p-3 text-sm text-gray-700 leading-relaxed">
                                  <p>
                                    {order.shippingAddress.firstName}{" "}
                                    {order.shippingAddress.lastName}
                                  </p>
                                  <p>{order.shippingAddress.address1}</p>
                                  {order.shippingAddress.address2 && (
                                    <p>{order.shippingAddress.address2}</p>
                                  )}
                                  <p>
                                    {order.shippingAddress.city},{" "}
                                    {order.shippingAddress.state}{" "}
                                    {order.shippingAddress.zip}
                                  </p>
                                  {order.shippingAddress.phone && (
                                    <p>Phone: {order.shippingAddress.phone}</p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Status History */}
                            {order.statusHistory && order.statusHistory.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                                  <Clock className="w-4 h-4" /> Status History
                                </h4>
                                <div className="space-y-2">
                                  {order.statusHistory.map((entry, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-start gap-3 text-sm"
                                    >
                                      <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                                      <div>
                                        <p className="font-medium">
                                          {STATUS_LABELS[entry.status] || entry.status}
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
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
