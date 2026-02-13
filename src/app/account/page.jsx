// src/app/account/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export default function AccountPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        // Fallback to session data if profile not found
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
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition"
                    >
                      <div className="flex justify-between items-start mb-3">
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
                          <span
                            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                              order.status === "paid"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {order.status === "paid" ? "Paid" : "Pending"}
                          </span>
                          <p className="font-bold text-lg">
                            {"\u20B9"}
                            {Number(order.subtotal).toLocaleString("en-IN")}
                          </p>
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
