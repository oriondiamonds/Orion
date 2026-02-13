// src/utils/cartCleanup.js

/**
 * Validates and cleans up cart items in localStorage
 * Run this on app initialization or after errors
 */
export function cleanupCart() {
  try {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");

    if (!Array.isArray(cart)) {
      console.warn("Cart is not an array, resetting");
      localStorage.setItem("cart", "[]");
      return;
    }

    // Validate each item has required fields
    const validItems = cart.filter((item) => {
      // Must have these minimum fields
      const hasRequiredFields =
        item &&
        typeof item === "object" &&
        item.variantId &&
        item.title &&
        item.quantity &&
        typeof item.quantity === "number";

      if (!hasRequiredFields) {
        console.warn("Removing invalid cart item:", item);
        return false;
      }

      return true;
    });

    // Save cleaned cart
    if (validItems.length !== cart.length) {
      console.log(
        `Cleaned cart: removed ${cart.length - validItems.length} invalid items`
      );
      localStorage.setItem("cart", JSON.stringify(validItems));
      window.dispatchEvent(new Event("cartUpdated"));
    }

    return validItems;
  } catch (error) {
    console.error("Error cleaning up cart:", error);
    // If cart is corrupted, reset it
    localStorage.setItem("cart", "[]");
    return [];
  }
}

/**
 * Complete reset - use when things are really broken
 */
export function resetAllCartData() {
  localStorage.removeItem("cart");
  localStorage.removeItem("wishlist");
  console.log("All cart data cleared");
  window.dispatchEvent(new Event("cartUpdated"));
  window.dispatchEvent(new Event("wishlistUpdated"));
}

/**
 * Check if cart has valid structure
 */
export function validateCartStructure() {
  try {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");

    if (!Array.isArray(cart)) {
      return { valid: false, error: "Cart is not an array" };
    }

    const invalidItems = cart.filter((item) => {
      return !(item && item.variantId && item.title && item.quantity);
    });

    if (invalidItems.length > 0) {
      return {
        valid: false,
        error: `Found ${invalidItems.length} invalid items`,
        invalidItems,
      };
    }

    return { valid: true, itemCount: cart.length };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Run cleanup on module load (optional - can be called manually)
if (typeof window !== "undefined") {
  // Only run in browser environment
  window.cleanupCart = cleanupCart;
  window.resetAllCartData = resetAllCartData;
  window.validateCartStructure = validateCartStructure;
}
