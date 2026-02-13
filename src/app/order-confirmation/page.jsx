// src/app/order-confirmation/page.jsx
"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Suspense } from "react";

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderNumber = searchParams.get("order");
  const couponCode = searchParams.get("coupon");
  const discount = searchParams.get("discount");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-lg p-10 border border-gray-100">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-serif font-semibold text-[#0a1833] mb-2">
            Order Confirmed!
          </h1>

          {orderNumber && (
            <p className="text-lg text-gray-600 mb-1">
              Order <span className="font-semibold">#{orderNumber}</span>
            </p>
          )}

          {couponCode && discount && parseFloat(discount) > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 my-4">
              <p className="text-green-800 text-sm">
                Coupon <span className="font-semibold">{couponCode}</span> applied
              </p>
              <p className="text-green-600 text-sm font-semibold">
                You saved ₹{parseFloat(discount).toFixed(2)}!
              </p>
            </div>
          )}

          <p className="text-gray-500 mb-8">
            Thank you for your purchase. We&apos;ll send you an email
            confirmation shortly.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => router.push("/account")}
              className="w-full bg-[#0a1833] text-white py-3 rounded-lg font-medium hover:bg-[#142850] transition"
            >
              View My Account
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full border border-[#0a1833] text-[#0a1833] py-3 rounded-lg font-medium hover:bg-gray-50 transition"
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
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-xl text-[#0a1833] font-medium">Loading...</div>
        </div>
      }
    >
      <OrderConfirmationContent />
    </Suspense>
  );
}
