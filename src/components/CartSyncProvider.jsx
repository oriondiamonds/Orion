// src/components/CartSyncProvider.jsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  mergeLocalAndServerCart,
  loadCartFromServer,
  syncCartToServer,
} from "../utils/cartSync";
import {
  mergeLocalAndServerWishlist,
  loadWishlistFromServer,
} from "../utils/wishlistSync";
import { cleanupCart } from "../utils/cartCleanup";
import toast from "react-hot-toast";

export default function CartSyncProvider({ children }) {
  const { data: session, status } = useSession();
  const [synced, setSynced] = useState(false);

  // Run cleanup on mount
  useEffect(() => {
    cleanupCart();
  }, []);

  useEffect(() => {
    async function handleSync() {
      // Only sync once when user logs in
      if (status !== "authenticated" || !session?.user?.email || synced) {
        return;
      }

      try {
        const customerEmail = session.user.email;

        // Clean up cart before syncing
        const cleanedCart = cleanupCart();
        const hasLocalItems = cleanedCart && cleanedCart.length > 0;

        console.log("🔄 Starting cart sync for:", customerEmail);

        if (hasLocalItems) {
          // User has local items - merge with MongoDB
          console.log("📦 Merging", cleanedCart.length, "local items...");

          const mergedCart = await mergeLocalAndServerCart(customerEmail);

          if (mergedCart && mergedCart.length > 0) {
            toast.success(`Cart synced! ${mergedCart.length} item(s) in cart`, {
              duration: 2000,
            });
            window.dispatchEvent(new Event("cartUpdated"));
          } else {
            toast.success("Logged in successfully!", { duration: 2000 });
          }
        } else {
          // No local items, try to load from MongoDB
          console.log("📥 Loading cart from server...");
          const cartItems = await loadCartFromServer(customerEmail);

          if (cartItems && cartItems.length > 0) {
            toast.success(
              `Loaded ${cartItems.length} item(s) from your cart!`,
              {
                duration: 2000,
              }
            );
            window.dispatchEvent(new Event("cartUpdated"));
          }
        }

        // Sync wishlist alongside cart
        const localWishlist = JSON.parse(
          localStorage.getItem("wishlist") || "[]"
        );
        if (localWishlist.length > 0) {
          await mergeLocalAndServerWishlist(customerEmail);
        } else {
          await loadWishlistFromServer(customerEmail);
        }
        window.dispatchEvent(new Event("wishlistUpdated"));

        setSynced(true);
      } catch (error) {
        console.error("Cart sync error:", error);
        // Don't show error to user, sync will retry on next login
        setSynced(true); // Mark as synced to prevent infinite loops
      }
    }

    handleSync();
  }, [status, session, synced]);

  // Reset sync status on logout
  useEffect(() => {
    if (status === "unauthenticated") {
      setSynced(false);
    }
  }, [status]);

  return <>{children}</>;
}
