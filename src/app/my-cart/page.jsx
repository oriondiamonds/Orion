"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ShoppingCart, Trash2, Plus, Minus, Tag, X } from "lucide-react";
import { getProductByHandle } from "../../queries/products";
import toast from "react-hot-toast";
import CartItemPriceBreakup from "../../components/CartItemPriceBreakup";
import {
  updateQuantityOnServer,
  removeItemFromServer,
  clearServerCart,
  loadCartFromServer,
} from "../../utils/cartSync";
import { markCartLocallyModified, getCartLocalChangeAgeMs } from "../../utils/cartCleanup";

export default function CartPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [cartItems, setCartItems] = useState([]);
  const [cartInitialized, setCartInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [customerEmail, setCustomerEmail] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  // Resolve customerEmail + isLoggedIn safely (client-only)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const emailFromSession = session?.user?.email || null;
    const emailFromLocal = localStorage.getItem("customer_email");

    const finalEmail = emailFromSession || emailFromLocal || null;
    setCustomerEmail(finalEmail);
    setIsLoggedIn(!!finalEmail);
  }, [session]);

  // Load cart from localStorage and react to cartUpdated events
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadCart = async () => {
      const items = JSON.parse(localStorage.getItem("cart") || "[]");

      const enrichedItems = await Promise.all(
        items.map(async (item) => {
          if (!item.descriptionHtml && item.handle) {
            try {
              const response = await getProductByHandle(item.handle);
              if (response?.product) {
                return {
                  ...item,
                  descriptionHtml: response.product.descriptionHtml,
                };
              }
            } catch (err) {
              console.error("Error fetching product details:", err);
            }
          }
          return item;
        })
      );

      setCartItems(enrichedItems);
      setCartInitialized(true);
    };

    loadCart();

    // Refresh from server if logged in (cross-device sync)
    if (session?.user?.email) {
      const localChangeAge = getCartLocalChangeAgeMs();
      const hasRecentLocalChange = localChangeAge !== null && localChangeAge < 60000;
      if (!hasRecentLocalChange) {
        loadCartFromServer(session.user.email).then(() => {
          loadCart();
        });
      }
    }

    const handleCartUpdate = () => loadCart();
    window.addEventListener("cartUpdated", handleCartUpdate);
    return () => window.removeEventListener("cartUpdated", handleCartUpdate);
  }, [session]);

  // Auto-apply referral coupon if captured from URL params
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (appliedCoupon) return;
    if (couponCode) return;
    if (cartItems.length === 0) return;

    const referralCoupon = localStorage.getItem("referral_coupon");
    const referralCouponTime = localStorage.getItem("referral_coupon_time");

    if (!referralCoupon) return;

    const captureTime = referralCouponTime ? parseInt(referralCouponTime) : 0;
    const ageMs = Date.now() - captureTime;
    const maxAgeMs = 24 * 60 * 60 * 1000;

    if (ageMs > maxAgeMs) {
      localStorage.removeItem("referral_coupon");
      localStorage.removeItem("referral_coupon_time");
      return;
    }

    setCouponCode(referralCoupon);
    toast("Applying your referral coupon...", { duration: 2000 });

    setTimeout(() => {
      const applyReferralCoupon = async () => {
        setCouponLoading(true);
        setCouponError("");

        try {
          const response = await fetch("/api/coupon/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: referralCoupon,
              cartItems,
              customerEmail,
            }),
          });

          const data = await response.json();

          if (data.valid) {
            setAppliedCoupon(data);
            toast.success(`Coupon ${referralCoupon} applied! You save ₹${data.discountAmount.toFixed(2)}`);
            localStorage.removeItem("referral_coupon");
            localStorage.removeItem("referral_coupon_time");
          } else {
            setCouponError(data.error);
            toast.error(data.error);
            localStorage.removeItem("referral_coupon");
            localStorage.removeItem("referral_coupon_time");
          }
        } catch (err) {
          setCouponError("Failed to validate coupon");
          toast.error("Failed to validate coupon");
        } finally {
          setCouponLoading(false);
        }
      };
      applyReferralCoupon();
    }, 500);
  }, [isLoggedIn, appliedCoupon, couponCode, cartItems, customerEmail]);

  // Restore coupon code that was saved before login redirect
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isLoggedIn) return;
    if (appliedCoupon) return;

    const pending = sessionStorage.getItem("pendingCoupon");
    if (!pending) return;

    sessionStorage.removeItem("pendingCoupon");
    setCouponCode(pending);
    // Auto-apply after a brief tick so state has settled
    setTimeout(async () => {
      setCouponLoading(true);
      setCouponError("");
      try {
        const response = await fetch("/api/coupon/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: pending,
            cartItems,
            customerEmail,
          }),
        });
        const data = await response.json();
        if (data.valid) {
          setAppliedCoupon(data);
          toast.success(`Coupon ${pending} applied! You save ₹${data.discountAmount.toFixed(2)}`);
        } else {
          setCouponError(data.error);
        }
      } catch {
        setCouponError("Failed to restore coupon");
      } finally {
        setCouponLoading(false);
      }
    }, 300);
  }, [isLoggedIn]);

  const updateQuantity = async (variantId, newQuantity) => {
    if (newQuantity < 1) return;

    const updatedCart = cartItems.map((item) =>
      item.variantId === variantId ? { ...item, quantity: newQuantity } : item
    );

    setCartItems(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    markCartLocallyModified();
    window.dispatchEvent(new Event("cartUpdated"));

    const email = customerEmail || localStorage.getItem("customer_email");
    if (email) {
      try {
        await updateQuantityOnServer(email, variantId, newQuantity);
      } catch (error) {
        console.error("Failed to update quantity on server:", error);
      }
    }
  };

  const removeItem = async (variantId) => {
    const updatedCart = cartItems.filter(
      (item) => item.variantId !== variantId
    );
    setCartItems(updatedCart);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    markCartLocallyModified();
    window.dispatchEvent(new Event("cartUpdated"));
    toast.success("Item removed from cart");

    const email = customerEmail || localStorage.getItem("customer_email");
    if (email) {
      try {
        await removeItemFromServer(email, variantId);
      } catch (error) {
        console.error("Failed to remove item on server:", error);
      }
    }
  };

  const clearCart = async () => {
    if (!window.confirm("Clear all items from cart?")) return;
    setCartItems([]);
    localStorage.setItem("cart", JSON.stringify([]));
    markCartLocallyModified();
    window.dispatchEvent(new Event("cartUpdated"));
    setAppliedCoupon(null);
    setCouponCode("");

    const email = customerEmail || localStorage.getItem("customer_email");
    if (email) {
      try {
        await clearServerCart(email);
        toast.success("Cart cleared");
      } catch (error) {
        console.error("Failed to clear cart on server:", error);
      }
    } else {
      toast.success("Cart cleared");
    }
  };

  const calculateSubtotal = () =>
    cartItems.reduce(
      (total, item) => {
        const itemPrice = parseFloat(item.calculatedPrice) || parseFloat(item.price) || parseFloat(item.priceBreakdown?.totalPrice) || 0;
        return total + itemPrice * item.quantity;
      },
      0
    );

  // Clear coupon when cart items change
  const prevCartLength = cartItems.length;
  useEffect(() => {
    if (appliedCoupon && cartItems.length !== prevCartLength) {
      setAppliedCoupon(null);
      setCouponCode("");
      setCouponError("");
    }
  }, [cartItems.length]);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;

    setCouponLoading(true);
    setCouponError("");

    try {
      const response = await fetch("/api/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode.trim(),
          cartItems,
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

  const handleProceedToCheckout = () => {
    if (!isLoggedIn) {
      // Save the applied coupon code so it can be restored after login
      if (couponCode.trim()) {
        sessionStorage.setItem("pendingCoupon", couponCode.trim());
      }
      toast.error("Please login to proceed to checkout");
      router.push("/login");
      return;
    }
    // Pass coupon data to checkout page via sessionStorage
    if (appliedCoupon) {
      sessionStorage.setItem("checkoutCoupon", JSON.stringify(appliedCoupon));
    } else {
      sessionStorage.removeItem("checkoutCoupon");
    }
    router.push("/checkout?source=cart");
  };

  // Show skeleton while cart is being read from localStorage
  if (!cartInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 py-25 mt-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="h-9 w-48 bg-gray-200 rounded-lg mb-8 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-md p-6 flex gap-4 animate-pulse">
                  <div className="w-24 h-24 bg-gray-200 rounded-md shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-5 bg-gray-200 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-md p-6 animate-pulse space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-10 bg-gray-200 rounded-full mt-6" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="py-50 text-center max-w-2xl mx-auto px-4 sm:px-6">
        <ShoppingCart className="w-20 h-20 mx-auto text-gray-300 mb-6" />
        <h1 className="text-4xl font-bold text-[#0a1833] mb-3">
          Your Cart is Empty
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Add some beautiful jewelry pieces to your cart.
        </p>
        <button
          onClick={() => router.push("/")}
          className="bg-[#0a1833] text-white px-8 py-3 rounded-full hover:bg-[#1a2f5a] transition"
        >
          Start Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-25 mt-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-[#0a1833] text-center sm:text-left">
            Shopping Cart
          </h1>
          <button
            onClick={clearCart}
            className="text-red-600 hover:text-red-800 flex items-center gap-2 text-sm font-medium"
          >
            <Trash2 size={18} />
            Clear Cart
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div
                key={item.variantId}
                className="bg-white rounded-xl shadow-md p-4 sm:p-6"
              >
                <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                  {(() => {
                    const karat = item.selectedOptions?.find(o => o.name === "Gold Karat")?.value || "10K";
                    const productUrl = `/product/${item.handle}?karat=${karat}`;
                    return (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-28 h-28 sm:w-24 sm:h-24 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => router.push(productUrl)}
                      />
                    );
                  })()}
                  <div className="flex-1 w-full text-center sm:text-left">
                    <h3
                      className="font-semibold text-lg text-[#0a1833] cursor-pointer hover:underline"
                      onClick={() => {
                        const karat = item.selectedOptions?.find(o => o.name === "Gold Karat")?.value || "10K";
                        router.push(`/product/${item.handle}?karat=${karat}`);
                      }}
                    >
                      {item.title}
                    </h3>
                    {item.variantTitle &&
                      item.variantTitle !== "Default Title" && (
                        <p className="text-sm text-gray-600 mt-1">
                          {item.variantTitle}
                        </p>
                      )}
                    {item.selectedOptions &&
                      item.selectedOptions.length > 0 && (
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
                  </div>

                  <div className="flex sm:flex-col items-center justify-between gap-3 sm:gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => removeItem(item.variantId)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={18} />
                    </button>
                    <div className="flex items-center justify-center border rounded-md">
                      <button
                        onClick={() =>
                          updateQuantity(item.variantId, item.quantity - 1)
                        }
                        className="p-2 hover:bg-gray-100 disabled:opacity-50"
                        disabled={item.quantity <= 1}
                      >
                        <Minus size={16} />
                      </button>
                      <span className="px-3 font-semibold text-gray-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.variantId, item.quantity + 1)
                        }
                        className="p-2 hover:bg-gray-100"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <div className="mt-4 text-lg font-bold text-[#0a1833]">
                      {(() => {
                        const unitPrice = parseFloat(item.calculatedPrice) || parseFloat(item.price) || parseFloat(item.priceBreakdown?.totalPrice) || 0;
                        const originalTotal = unitPrice * item.quantity;
                        const diamondPrice = parseFloat(item.priceBreakdown?.diamondPrice) || 0;

                        if (appliedCoupon && diamondPrice > 0 && appliedCoupon.discountType === "percentage") {
                          const diamondDiscount = (diamondPrice * appliedCoupon.discountValue) / 100;
                          const discountedUnit = unitPrice - diamondDiscount;
                          const discountedTotal = discountedUnit * item.quantity;
                          return (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>Total:</span>
                              <span className="text-gray-400 line-through text-sm font-normal">
                                ₹{originalTotal.toFixed(2)}
                              </span>
                              <span className="text-green-600">
                                ₹{discountedTotal.toFixed(2)}
                              </span>
                            </div>
                          );
                        }

                        if (appliedCoupon && appliedCoupon.discountAmount > 0 && calculateSubtotal() > 0) {
                          const itemShare = (originalTotal / calculateSubtotal()) * appliedCoupon.discountAmount;
                          const discountedTotal = originalTotal - itemShare;
                          return (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>Total:</span>
                              <span className="text-gray-400 line-through text-sm font-normal">
                                ₹{originalTotal.toFixed(2)}
                              </span>
                              <span className="text-green-600">
                                ₹{discountedTotal.toFixed(2)}
                              </span>
                            </div>
                          );
                        }

                        return <span>Total: ₹{originalTotal.toFixed(2)}</span>;
                      })()}
                    </div>
                  </div>
                </div>

                <CartItemPriceBreakup item={item} appliedCoupon={appliedCoupon} cartSubtotal={calculateSubtotal()} />
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-4">
              <h2 className="text-xl font-bold text-[#0a1833] mb-4">
                Order Summary
              </h2>
              <div className="space-y-3 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">
                    ₹{calculateSubtotal().toFixed(2)}
                  </span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({appliedCoupon.couponCode})</span>
                    <span className="font-semibold">
                      -₹{appliedCoupon.discountAmount.toFixed(2)}
                    </span>
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

              {/* Coupon Input */}
              <div className="border-t pt-4 mb-4">
                {!appliedCoupon ? (
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
                          couponCode && !appliedCoupon
                            ? "border-blue-400 bg-blue-50"
                            : "border-gray-300"
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
                    {couponCode && !couponError && !couponLoading && (
                      <p className="text-blue-600 text-xs mt-1 flex items-center gap-1">
                        <Tag size={12} />
                        Referral code detected - click Apply to use it
                      </p>
                    )}
                    {couponError && (
                      <p className="text-red-500 text-xs mt-1">{couponError}</p>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                      * Coupon discounts apply to diamond price only
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-green-800 font-semibold text-sm">
                          <Tag size={14} className="inline mr-1" />
                          {appliedCoupon.couponCode}
                        </span>
                        <p className="text-green-600 text-xs mt-0.5">
                          {appliedCoupon.message}
                        </p>
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

              <button
                onClick={handleProceedToCheckout}
                disabled={loading}
                className="w-full bg-[#0a1833] text-white py-3 rounded-full hover:bg-[#1a2f5a] transition disabled:opacity-50 font-semibold text-sm"
              >
                Proceed to Checkout
              </button>
              <button
                onClick={() => router.push("/")}
                className="w-full mt-3 border border-[#0a1833] text-[#0a1833] py-3 rounded-full hover:bg-gray-50 transition font-semibold text-sm"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
