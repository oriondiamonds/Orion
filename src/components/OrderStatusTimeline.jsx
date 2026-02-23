"use client";

import { CheckCircle, ShoppingBag, Hammer, Truck, Package } from "lucide-react";

export const ORDER_STATUSES = [
  { key: "order_placed", label: "Order Placed", Icon: ShoppingBag },
  { key: "acknowledged", label: "Acknowledged", Icon: CheckCircle },
  { key: "manufacturing", label: "Manufacturing", Icon: Hammer },
  { key: "shipping", label: "Shipping", Icon: Truck },
  { key: "delivered", label: "Delivered", Icon: Package },
];

export const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  order_placed: "bg-blue-100 text-blue-800",
  paid: "bg-blue-100 text-blue-800",
  acknowledged: "bg-purple-100 text-purple-800",
  manufacturing: "bg-orange-100 text-orange-800",
  shipping: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
};

export const STATUS_LABELS = {
  pending: "Payment Pending",
  order_placed: "Order Placed",
  paid: "Order Placed",
  acknowledged: "Acknowledged",
  manufacturing: "Manufacturing",
  shipping: "Shipping",
  delivered: "Delivered",
};

export function getStatusIndex(status) {
  const normalized = status === "paid" ? "order_placed" : status;
  const idx = ORDER_STATUSES.findIndex((s) => s.key === normalized);
  return idx >= 0 ? idx : -1;
}

/**
 * Horizontal step-tracker showing the order's journey through all statuses.
 * Completed steps are green, current step is navy with a ring, future steps are gray.
 */
export default function OrderStatusTimeline({ status }) {
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
