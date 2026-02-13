// src/hooks/useServerCartSync.js
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  syncCartToServer,
  updateQuantityOnServer,
  removeItemFromServer,
  clearServerCart,
} from "../utils/cartSync";

export function useServerCart() {
  const { data: session } = useSession();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Safely get customer email from session or localStorage
  const getCustomerEmail = () => {
    if (session?.user?.email) return session.user.email;
    if (typeof window !== "undefined") {
      return localStorage.getItem("customer_email");
    }
    return null;
  };

  // Load cart from localStorage and subscribe to cartUpdated events
  useEffect(() => {
    if (typeof window === "undefined") return;

    loadCart();

    const handleCartUpdate = () => loadCart();
    window.addEventListener("cartUpdated", handleCartUpdate);

    return () => window.removeEventListener("cartUpdated", handleCartUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCart = () => {
    if (typeof window === "undefined") return;
    const items = JSON.parse(localStorage.getItem("cart") || "[]");
    setCartItems(items);
  };

  // Manually call this if you ever need a "force sync" button
  const syncToServer = async () => {
    const email = getCustomerEmail();
    if (!email) return;

    try {
      await syncCartToServer(email);
    } catch (error) {
      console.error("Error syncing to server:", error);
    }
  };

  const addItem = async (item) => {
    setLoading(true);

    try {
      if (typeof window === "undefined") return;

      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      const existingIndex = cart.findIndex(
        (i) => i.variantId === item.variantId
      );

      if (existingIndex > -1) {
        cart[existingIndex].quantity += item.quantity;
      } else {
        cart.push(item);
      }

      // Update local storage
      localStorage.setItem("cart", JSON.stringify(cart));
      setCartItems(cart);
      window.dispatchEvent(new Event("cartUpdated"));

      // Sync full cart to server
      const email = getCustomerEmail();
      if (email) {
        await syncCartToServer(email);
      }
    } catch (error) {
      console.error("Error adding item:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (variantId, newQuantity) => {
    if (newQuantity < 1) return;

    setLoading(true);

    try {
      if (typeof window === "undefined") return;

      const updatedCart = cartItems.map((item) =>
        item.variantId === variantId ? { ...item, quantity: newQuantity } : item
      );

      localStorage.setItem("cart", JSON.stringify(updatedCart));
      setCartItems(updatedCart);
      window.dispatchEvent(new Event("cartUpdated"));

      const email = getCustomerEmail();
      if (email) {
        await updateQuantityOnServer(email, variantId, newQuantity);
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (variantId) => {
    setLoading(true);

    try {
      if (typeof window === "undefined") return;

      const updatedCart = cartItems.filter(
        (item) => item.variantId !== variantId
      );

      localStorage.setItem("cart", JSON.stringify(updatedCart));
      setCartItems(updatedCart);
      window.dispatchEvent(new Event("cartUpdated"));

      const email = getCustomerEmail();
      if (email) {
        await removeItemFromServer(email, variantId);
      }
    } catch (error) {
      console.error("Error removing item:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    setLoading(true);

    try {
      if (typeof window === "undefined") return;

      localStorage.setItem("cart", JSON.stringify([]));
      setCartItems([]);
      window.dispatchEvent(new Event("cartUpdated"));

      const email = getCustomerEmail();
      if (email) {
        await clearServerCart(email);
      }
    } catch (error) {
      console.error("Error clearing cart:", error);
    } finally {
      setLoading(false);
    }
  };

  return {
    cartItems,
    loading,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    syncToServer,
  };
}
