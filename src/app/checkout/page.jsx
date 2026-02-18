"use client";

import { useState, useEffect, Suspense } from "react";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { MapPin, ArrowLeft, Tag, X, ShoppingBag } from "lucide-react";
import toast from "react-hot-toast";
import CartItemPriceBreakup from "../../components/CartItemPriceBreakup";
import { clearServerCart } from "../../utils/cartSync";
import { markCartLocallyModified } from "../../utils/cartCleanup";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry",
];

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get("source"); // "cart" or "buynow"
  const { data: session } = useSession();

  const [items, setItems] = useState([]);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customerEmail, setCustomerEmail] = useState(null);
  const [shippingAddress, setShippingAddress] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
  });
  const [addressErrors, setAddressErrors] = useState({});

  // Resolve customer email
  useEffect(() => {
    if (typeof window === "undefined") return;
    const emailFromSession = session?.user?.email || null;
    const emailFromLocal = localStorage.getItem("customer_email");
    const finalEmail = emailFromSession || emailFromLocal || null;
    setCustomerEmail(finalEmail);

    if (!finalEmail) {
      toast.error("Please login to proceed to checkout");
      router.push("/login");
    }
  }, [session]);

  // Load items based on source
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!source || (source !== "cart" && source !== "buynow")) {
      router.push("/my-cart");
      return;
    }

    if (source === "cart") {
      const cartItems = JSON.parse(localStorage.getItem("cart") || "[]");
      if (cartItems.length === 0) {
        toast.error("Your cart is empty");
        router.push("/my-cart");
        return;
      }
      setItems(cartItems);

      // Load pre-applied coupon from sessionStorage
      const savedCoupon = sessionStorage.getItem("checkoutCoupon");
      if (savedCoupon) {
        try {
          setAppliedCoupon(JSON.parse(savedCoupon));
        } catch (e) {
          console.error("Failed to parse checkout coupon:", e);
        }
      }
    } else if (source === "buynow") {
      const buyNowItem = sessionStorage.getItem("buyNowItem");
      if (!buyNowItem) {
        toast.error("No item selected for purchase");
        router.push("/");
        return;
      }
      try {
        const item = JSON.parse(buyNowItem);
        setItems([item]);
      } catch (e) {
        toast.error("Invalid item data");
        router.push("/");
      }
    }
  }, [source]);

  // Pre-fill shipping address from customer profile
  useEffect(() => {
    if (!session?.user?.email) return;
    const fetchDefaultAddress = async () => {
      try {
        const res = await fetch(
          `/api/auth/profile?email=${encodeURIComponent(session.user.email)}`
        );
        if (res.ok) {
          const data = await res.json();
          const addr = data.customer?.defaultAddress;
          if (addr) {
            setShippingAddress({
              firstName: addr.firstName || "",
              lastName: addr.lastName || "",
              phone: addr.phone || "",
              address1: addr.address1 || "",
              address2: addr.address2 || "",
              city: addr.city || "",
              state: addr.province || addr.state || "",
              zip: addr.zip || "",
            });
          }
        }
      } catch (err) {
        console.error("Failed to load default address:", err);
      }
    };
    fetchDefaultAddress();
  }, [session]);

  const calculateSubtotal = () =>
    items.reduce((total, item) => {
      const itemPrice = parseFloat(item.calculatedPrice) || parseFloat(item.price) || parseFloat(item.priceBreakdown?.totalPrice) || 0;
      return total + itemPrice * item.quantity;
    }, 0);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    if (!customerEmail) {
      setCouponError("Please login to use coupons");
      return;
    }

    setCouponLoading(true);
    setCouponError("");

    try {
      const response = await fetch("/api/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode.trim(),
          cartItems: items,
          customerEmail,
        }),
      });

      const data = await response.json();

      if (data.valid) {
        setAppliedCoupon(data);
        toast.success(data.message);
      } else {
        setCouponError(data.error);
        toast.error(data.error);
      }
    } catch (err) {
      setCouponError("Failed to validate coupon");
      toast.error("Failed to validate coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
    toast.success("Coupon removed");
  };

  const validateShippingAddress = () => {
    const errors = {};
    if (!shippingAddress.firstName.trim()) errors.firstName = "Required";
    if (!shippingAddress.lastName.trim()) errors.lastName = "Required";
    if (!shippingAddress.phone.trim()) errors.phone = "Required";
    else if (!/^[6-9]\d{9}$/.test(shippingAddress.phone.trim()))
      errors.phone = "Enter valid 10-digit mobile number";
    if (!shippingAddress.address1.trim()) errors.address1 = "Required";
    if (!shippingAddress.city.trim()) errors.city = "Required";
    if (!shippingAddress.state) errors.state = "Required";
    if (!shippingAddress.zip.trim()) errors.zip = "Required";
    else if (!/^\d{6}$/.test(shippingAddress.zip.trim()))
      errors.zip = "Enter valid 6-digit PIN code";
    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const updateField = (field, value) => {
    setShippingAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handleConfirmAndPay = async () => {
    if (!validateShippingAddress()) {
      toast.error("Please fill in all required address fields");
      return;
    }

    if (!customerEmail) {
      toast.error("Please login to proceed to checkout");
      router.push("/login");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Step 1: Create Razorpay order on server
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: items,
          customerEmail,
          couponCode: appliedCoupon?.couponCode || null,
          shippingAddress,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        toast.error(data.error || "Failed to create order");
        setError(data.error);
        setLoading(false);
        return;
      }

      // Step 2: Open Razorpay checkout modal
      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: "Orion Diamonds",
        description: "Jewelry Purchase",
        order_id: data.orderId,
        prefill: {
          email: customerEmail,
        },
        theme: {
          color: "#0a1833",
        },
        handler: async (razorpayResponse) => {
          // Step 3: Verify payment on server
          try {
            toast.loading("Verifying payment...");

            const verifyRes = await fetch("/api/checkout/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: razorpayResponse.razorpay_order_id,
                razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                razorpay_signature: razorpayResponse.razorpay_signature,
                customerEmail,
                source, // Pass source so server knows whether to clear cart
              }),
            });

            const verifyData = await verifyRes.json();
            toast.dismiss();

            if (verifyData.success) {
              if (source === "cart") {
                // Clear local cart after successful cart-flow payment
                localStorage.setItem("cart", JSON.stringify([]));
                markCartLocallyModified();
                window.dispatchEvent(new Event("cartUpdated"));

                // Clear server-side cart
                try {
                  if (customerEmail) {
                    await clearServerCart(customerEmail);
                    try {
                      const { clearCartLocalChange } = await import("../../utils/cartCleanup");
                      clearCartLocalChange();
                    } catch (e) {}
                  }
                } catch (e) {
                  console.error("Failed to clear server cart after payment:", e);
                }
              } else if (source === "buynow") {
                // Only clear buy-now item, don't touch the cart
                sessionStorage.removeItem("buyNowItem");
              }

              // Clean up checkout coupon
              sessionStorage.removeItem("checkoutCoupon");

              toast.success("Payment successful!");
              const confirmUrl = `/order-confirmation?order=${verifyData.orderNumber}` +
                (verifyData.couponCode ? `&coupon=${verifyData.couponCode}&discount=${verifyData.discountAmount}` : "");
              router.push(confirmUrl);
            } else {
              toast.error("Payment verification failed. Please contact support.");
              setError("Payment verification failed");
            }
          } catch (verifyErr) {
            console.error("Verification error:", verifyErr);
            toast.dismiss();
            toast.error("Payment verification failed. Please contact support.");
          }
        },
        modal: {
          ondismiss: () => {
            toast("Payment cancelled", { icon: "ℹ️" });
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response) => {
        console.error("Payment failed:", response.error);
        toast.error(response.error.description || "Payment failed");
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Failed to create checkout");
      setError(`Failed to create checkout: ${err.message}`);
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (source === "cart") {
      router.push("/my-cart");
    } else {
      router.back();
    }
  };

  if (items.length === 0) {
    return (
      <div className="py-50 text-center max-w-2xl mx-auto px-4 sm:px-6">
        <ShoppingBag className="w-20 h-20 mx-auto text-gray-300 mb-6" />
        <h1 className="text-4xl font-bold text-[#0a1833] mb-3">
          Loading checkout...
        </h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-25 mt-10 px-4 sm:px-6 lg:px-8">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={handleBack}
            className="text-[#0a1833] hover:text-[#1a2f5a] transition"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold text-[#0a1833]">
            Checkout
          </h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Order Items */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-[#0a1833] mb-2">
              Order Items ({items.reduce((sum, i) => sum + i.quantity, 0)})
            </h2>
            {items.map((item) => (
              <div key={item.variantId} className="bg-white rounded-xl shadow-md p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-28 h-28 sm:w-24 sm:h-24 object-cover rounded-md"
                  />
                  <div className="flex-1 w-full text-center sm:text-left">
                    <h3 className="font-semibold text-lg text-[#0a1833]">
                      {item.title}
                    </h3>
                    {item.variantTitle && item.variantTitle !== "Default Title" && (
                      <p className="text-sm text-gray-600 mt-1">{item.variantTitle}</p>
                    )}
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <div className="text-sm text-gray-600 mt-1">
                        {item.selectedOptions.map((option, idx) => (
                          <span key={idx}>
                            {option.name}: {option.value}
                            {idx < item.selectedOptions.length - 1 && " • "}
                          </span>
                        ))}
                      </div>
                    )}
                    {(() => {
                      const unitPrice = parseFloat(item.calculatedPrice) || parseFloat(item.price) || parseFloat(item.priceBreakdown?.totalPrice) || 0;
                      const diamondPrice = parseFloat(item.priceBreakdown?.diamondPrice) || 0;

                      if (appliedCoupon && diamondPrice > 0 && appliedCoupon.discountType === "percentage") {
                        const diamondDiscount = (diamondPrice * appliedCoupon.discountValue) / 100;
                        const discountedPrice = unitPrice - diamondDiscount;
                        return (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-gray-400 line-through text-sm font-normal">
                              ₹{unitPrice.toFixed(2)}
                            </span>
                            <span className="text-lg font-bold text-green-600">
                              ₹{discountedPrice.toFixed(2)}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <p className="text-lg font-bold text-[#0a1833] mt-2">
                          ₹{unitPrice.toFixed(2)}
                        </p>
                      );
                    })()}
                    <p className="text-sm text-gray-500 mt-1">Qty: {item.quantity}</p>
                  </div>

                  <div className="text-right">
                    {(() => {
                      const unitPrice = parseFloat(item.calculatedPrice) || parseFloat(item.price) || parseFloat(item.priceBreakdown?.totalPrice) || 0;
                      const originalTotal = unitPrice * item.quantity;
                      const diamondPrice = parseFloat(item.priceBreakdown?.diamondPrice) || 0;

                      if (appliedCoupon && diamondPrice > 0 && appliedCoupon.discountType === "percentage") {
                        const diamondDiscount = (diamondPrice * appliedCoupon.discountValue) / 100;
                        const discountedTotal = (unitPrice - diamondDiscount) * item.quantity;
                        return (
                          <div>
                            <span className="text-gray-400 line-through text-sm">
                              ₹{originalTotal.toFixed(2)}
                            </span>
                            <p className="text-lg font-bold text-green-600">
                              ₹{discountedTotal.toFixed(2)}
                            </p>
                          </div>
                        );
                      }

                      return (
                        <p className="text-lg font-bold text-[#0a1833]">
                          ₹{originalTotal.toFixed(2)}
                        </p>
                      );
                    })()}
                  </div>
                </div>

                <CartItemPriceBreakup item={item} appliedCoupon={appliedCoupon} cartSubtotal={calculateSubtotal()} />
              </div>
            ))}
          </div>

          {/* Right: Summary + Shipping + Pay */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-4 space-y-6">
              {/* Order Summary */}
              <div>
                <h2 className="text-xl font-bold text-[#0a1833] mb-4">
                  Order Summary
                </h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold">₹{calculateSubtotal().toFixed(2)}</span>
                  </div>

                  {appliedCoupon && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({appliedCoupon.couponCode})</span>
                      <span className="font-semibold">-₹{appliedCoupon.discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-base font-bold text-[#0a1833] border-t pt-3">
                    <span>Total</span>
                    <div className="flex items-center gap-3">
                      {appliedCoupon && (
                        <span className="text-gray-400 line-through text-sm font-normal">
                          ₹{calculateSubtotal().toFixed(2)}
                        </span>
                      )}
                      <span className={appliedCoupon ? "text-green-600" : ""}>
                        ₹{(calculateSubtotal() - (appliedCoupon?.discountAmount || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coupon Section */}
              <div className="border-t pt-4">
                {source === "cart" && appliedCoupon ? (
                  // Cart flow: show pre-applied coupon with option to remove
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-green-800 font-semibold text-sm">
                          <Tag size={14} className="inline mr-1" />
                          {appliedCoupon.couponCode}
                        </span>
                        <p className="text-green-600 text-xs mt-0.5">{appliedCoupon.message}</p>
                      </div>
                      <button
                        onClick={removeCoupon}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remove coupon"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ) : !appliedCoupon ? (
                  // No coupon applied: show input
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Tag size={14} className="inline mr-1" />
                      Have a coupon code?
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                        placeholder="Enter code"
                        className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#0a1833] focus:border-transparent uppercase ${
                          couponCode ? "border-blue-400 bg-blue-50" : "border-gray-300"
                        }`}
                      />
                      <button
                        onClick={applyCoupon}
                        disabled={couponLoading || !couponCode.trim()}
                        className="px-4 py-2 bg-[#0a1833] text-white rounded-lg text-sm font-medium hover:bg-[#1a2f5a] disabled:opacity-50 transition"
                      >
                        {couponLoading ? "..." : "Apply"}
                      </button>
                    </div>
                    {couponError && <p className="text-red-500 text-xs mt-1">{couponError}</p>}
                    <div className="text-xs text-gray-500 mt-2">
                      * Coupon discounts apply to diamond price only
                    </div>
                  </div>
                ) : (
                  // Buy Now flow with applied coupon
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-green-800 font-semibold text-sm">
                          <Tag size={14} className="inline mr-1" />
                          {appliedCoupon.couponCode}
                        </span>
                        <p className="text-green-600 text-xs mt-0.5">{appliedCoupon.message}</p>
                      </div>
                      <button
                        onClick={removeCoupon}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remove coupon"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Shipping Form */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-[#0a1833]" />
                  <h3 className="font-semibold text-[#0a1833]">Shipping Address</h3>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        placeholder="First Name *"
                        value={shippingAddress.firstName}
                        onChange={(e) => updateField("firstName", e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#0a1833] focus:border-transparent ${addressErrors.firstName ? "border-red-400" : "border-gray-300"}`}
                      />
                      {addressErrors.firstName && <p className="text-red-500 text-xs mt-0.5">{addressErrors.firstName}</p>}
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Last Name *"
                        value={shippingAddress.lastName}
                        onChange={(e) => updateField("lastName", e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#0a1833] focus:border-transparent ${addressErrors.lastName ? "border-red-400" : "border-gray-300"}`}
                      />
                      {addressErrors.lastName && <p className="text-red-500 text-xs mt-0.5">{addressErrors.lastName}</p>}
                    </div>
                  </div>

                  <div>
                    <input
                      type="tel"
                      placeholder="Phone Number *"
                      value={shippingAddress.phone}
                      onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#0a1833] focus:border-transparent ${addressErrors.phone ? "border-red-400" : "border-gray-300"}`}
                    />
                    {addressErrors.phone && <p className="text-red-500 text-xs mt-0.5">{addressErrors.phone}</p>}
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Street Address *"
                      value={shippingAddress.address1}
                      onChange={(e) => updateField("address1", e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#0a1833] focus:border-transparent ${addressErrors.address1 ? "border-red-400" : "border-gray-300"}`}
                    />
                    {addressErrors.address1 && <p className="text-red-500 text-xs mt-0.5">{addressErrors.address1}</p>}
                  </div>

                  <input
                    type="text"
                    placeholder="Apartment, suite, etc. (optional)"
                    value={shippingAddress.address2}
                    onChange={(e) => updateField("address2", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        placeholder="City *"
                        value={shippingAddress.city}
                        onChange={(e) => updateField("city", e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#0a1833] focus:border-transparent ${addressErrors.city ? "border-red-400" : "border-gray-300"}`}
                      />
                      {addressErrors.city && <p className="text-red-500 text-xs mt-0.5">{addressErrors.city}</p>}
                    </div>
                    <div>
                      <select
                        value={shippingAddress.state}
                        onChange={(e) => updateField("state", e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#0a1833] focus:border-transparent ${addressErrors.state ? "border-red-400" : "border-gray-300"} ${!shippingAddress.state ? "text-gray-400" : ""}`}
                      >
                        <option value="">State *</option>
                        {INDIAN_STATES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      {addressErrors.state && <p className="text-red-500 text-xs mt-0.5">{addressErrors.state}</p>}
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="PIN Code *"
                      value={shippingAddress.zip}
                      onChange={(e) => updateField("zip", e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#0a1833] focus:border-transparent ${addressErrors.zip ? "border-red-400" : "border-gray-300"}`}
                    />
                    {addressErrors.zip && <p className="text-red-500 text-xs mt-0.5">{addressErrors.zip}</p>}
                  </div>
                </div>
              </div>

              {/* Confirm & Pay */}
              <button
                onClick={handleConfirmAndPay}
                disabled={loading}
                className="w-full bg-[#0a1833] text-white py-3 rounded-full hover:bg-[#1a2f5a] transition disabled:opacity-50 font-semibold text-sm"
              >
                {loading ? "Processing..." : "Confirm & Pay"}
              </button>
              <button
                onClick={handleBack}
                disabled={loading}
                className="w-full flex items-center justify-center gap-1 text-[#0a1833] py-2 text-sm font-medium hover:underline disabled:opacity-50"
              >
                <ArrowLeft size={14} />
                {source === "cart" ? "Back to Cart" : "Back to Product"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="py-50 text-center">
        <ShoppingBag className="w-20 h-20 mx-auto text-gray-300 mb-6" />
        <h1 className="text-2xl font-bold text-[#0a1833]">Loading checkout...</h1>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
