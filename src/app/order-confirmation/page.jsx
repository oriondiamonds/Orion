"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Package, MapPin, Tag, ShoppingBag, ArrowRight } from "lucide-react";
import OrderStatusTimeline, {
  STATUS_COLORS,
  STATUS_LABELS,
} from "../../components/OrderStatusTimeline.jsx";

function OrderConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order");
  const couponFromUrl = searchParams.get("coupon");
  const discountFromUrl = parseFloat(searchParams.get("discount") || "0");

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const intervalRef = useRef(null);

  const fetchOrder = async (isPolling = false) => {
    if (!orderNumber) return;
    try {
      const res = await fetch(`/api/orders?orderNumber=${encodeURIComponent(orderNumber)}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!data.success || !data.order) {
        if (!isPolling) setError("Order not found. It may still be processing — check My Orders in a moment.");
      } else {
        setOrder(data.order);
        setError("");
      }
    } catch (err) {
      if (!isPolling) setError("Failed to load order details.");
    } finally {
      if (!isPolling) setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (!orderNumber) {
      setError("No order number provided.");
      setLoading(false);
      return;
    }
    fetchOrder(false);
  }, [orderNumber]);

  // Poll every 30 seconds so status changes appear without a refresh
  useEffect(() => {
    if (!orderNumber) return;
    intervalRef.current = setInterval(() => fetchOrder(true), 30000);
    return () => clearInterval(intervalRef.current);
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-25 mt-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto animate-pulse space-y-6">
          <div className="h-20 w-20 bg-gray-200 rounded-full mx-auto" />
          <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto" />
          <div className="bg-white rounded-xl shadow-md p-8 space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-25 mt-10 px-4 sm:px-6 text-center">
        <Package className="w-20 h-20 mx-auto text-gray-300 mb-6" />
        <h1 className="text-2xl font-bold text-[#0a1833] mb-3">Order Details Unavailable</h1>
        <p className="text-gray-600 mb-4">{error}</p>
        {orderNumber && (
          <p className="text-sm text-gray-500 mb-6">
            Your order number is{" "}
            <span className="font-semibold text-[#0a1833]">{orderNumber}</span> — keep this safe.
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => router.push("/account")}
            className="bg-[#0a1833] text-white px-6 py-3 rounded-full hover:bg-[#1a2f5a] transition font-semibold text-sm"
          >
            View My Orders
          </button>
          <button
            onClick={() => router.push("/")}
            className="border border-[#0a1833] text-[#0a1833] px-6 py-3 rounded-full hover:bg-gray-50 transition font-semibold text-sm"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  const addr = order.shippingAddress || {};
  const subtotal = parseFloat(order.subtotal) || 0;
  const discountAmount = parseFloat(order.discountAmount) || discountFromUrl;
  const total = subtotal - discountAmount;
  const couponCode = order.couponCode || couponFromUrl;

  return (
    <div className="min-h-screen bg-gray-50 py-25 mt-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">

        {/* Success header */}
        <div className="text-center mb-10">
          <CheckCircle className="w-20 h-20 mx-auto text-green-500 mb-4" />
          <h1 className="text-3xl font-bold text-[#0a1833] mb-2">Order Confirmed!</h1>
          <p className="text-gray-600">
            Thank you for your purchase. Your order has been placed successfully.
          </p>
          <div className="mt-4 inline-block bg-green-50 border border-green-200 rounded-full px-5 py-2">
            <span className="text-green-800 font-semibold text-sm">
              Order #{order.orderNumber}
            </span>
          </div>
        </div>

        <div className="space-y-6">

          {/* Order Status */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#0a1833]">Order Status</h2>
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  STATUS_COLORS[order.status] || "bg-gray-100 text-gray-700"
                }`}
              >
                {STATUS_LABELS[order.status] || order.status}
              </span>
            </div>
            <OrderStatusTimeline status={order.status} />
            {order.statusHistory && order.statusHistory.length > 0 && (
              <div className="mt-5 border-t pt-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Status History
                </p>
                {[...order.statusHistory].reverse().map((entry, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-sm">
                    <span className="w-2 h-2 rounded-full bg-[#0a1833] mt-1.5 shrink-0" />
                    <div>
                      <span className="font-medium text-[#0a1833]">
                        {STATUS_LABELS[entry.status] || entry.status}
                      </span>
                      {entry.note && (
                        <span className="text-gray-500"> — {entry.note}</span>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(entry.timestamp).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold text-[#0a1833] mb-4 flex items-center gap-2">
              <ShoppingBag size={20} />
              Items Ordered
            </h2>
            <div className="divide-y">
              {(order.items || []).map((item, idx) => {
                const unitPrice =
                  parseFloat(item.calculatedPrice) ||
                  parseFloat(item.price) ||
                  parseFloat(item.priceBreakdown?.totalPrice) ||
                  0;
                return (
                  <div key={idx} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-20 h-20 object-cover rounded-md shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#0a1833] text-sm leading-snug">
                        {item.title}
                      </h3>
                      {item.variantTitle && item.variantTitle !== "Default Title" && (
                        <p className="text-xs text-gray-500 mt-0.5">{item.variantTitle}</p>
                      )}
                      {item.selectedOptions && item.selectedOptions.length > 0 && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.selectedOptions.map((o) => `${o.name}: ${o.value}`).join(" · ")}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-[#0a1833] text-sm">
                        ₹{(unitPrice * item.quantity).toFixed(2)}
                      </p>
                      {item.quantity > 1 && (
                        <p className="text-xs text-gray-400">₹{unitPrice.toFixed(2)} each</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold text-[#0a1833] mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">₹{subtotal.toFixed(2)}</span>
              </div>
              {couponCode && discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center gap-1">
                    <Tag size={13} />
                    Discount ({couponCode})
                  </span>
                  <span className="font-medium">-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-base font-bold text-[#0a1833] border-t pt-3 mt-3">
                <span>Total Paid</span>
                <span className={discountAmount > 0 ? "text-green-600" : ""}>
                  ₹{total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          {addr.firstName && (
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold text-[#0a1833] mb-3 flex items-center gap-2">
                <MapPin size={20} />
                Shipping To
              </h2>
              <address className="not-italic text-sm text-gray-700 space-y-1">
                <p className="font-semibold text-[#0a1833]">
                  {addr.firstName} {addr.lastName}
                </p>
                <p>{addr.address1}</p>
                {addr.address2 && <p>{addr.address2}</p>}
                <p>{addr.city}, {addr.state} – {addr.zip}</p>
                {addr.phone && <p>📞 {addr.phone}</p>}
              </address>
            </div>
          )}

          {/* What's Next */}
          <div className="bg-[#0a1833] text-white rounded-xl p-6">
            <h2 className="text-lg font-bold mb-3">What Happens Next?</h2>
            <ol className="space-y-3 text-sm text-gray-300">
              <li className="flex items-start gap-3">
                <span className="bg-white text-[#0a1833] rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  1
                </span>
                Your order is being reviewed and will enter production shortly.
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-white text-[#0a1833] rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  2
                </span>
                Once shipped, you'll receive a tracking update via My Orders.
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-white text-[#0a1833] rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  3
                </span>
                Expected delivery: 7–10 business days.
              </li>
            </ol>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 pb-6">
            <button
              onClick={() => router.push("/account")}
              className="flex-1 flex items-center justify-center gap-2 bg-[#0a1833] text-white py-3 rounded-full hover:bg-[#1a2f5a] transition font-semibold text-sm"
            >
              View My Orders
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => router.push("/")}
              className="flex-1 border border-[#0a1833] text-[#0a1833] py-3 rounded-full hover:bg-gray-50 transition font-semibold text-sm"
            >
              Continue Shopping
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 py-25 mt-10 px-4 text-center">
          <div className="max-w-3xl mx-auto animate-pulse space-y-6 mt-10">
            <div className="h-20 w-20 bg-gray-200 rounded-full mx-auto" />
            <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto" />
          </div>
        </div>
      }
    >
      <OrderConfirmationContent />
    </Suspense>
  );
}
