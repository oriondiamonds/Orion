// src/utils/wishlistSync.js - Server Wishlist Sync

/**
 * Sync local wishlist to server using POST (for batch updates)
 */
async function syncWishlistViaPost(customerEmail) {
  const localWishlist = JSON.parse(localStorage.getItem("wishlist") || "[]");

  if (localWishlist.length === 0) {
    return { success: true, itemCount: 0 };
  }

  const validItems = localWishlist.filter(
    (item) => item && item.id && item.handle && item.title
  );

  if (validItems.length === 0) {
    return { success: true, itemCount: 0 };
  }

  const response = await fetch("/api/wishlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: customerEmail,
      items: validItems,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to save wishlist to server");
  }

  const result = await response.json();
  return result;
}

/**
 * Main export: Sync local wishlist to server
 */
export async function syncWishlistToServer(customerEmail) {
  try {
    return await syncWishlistViaPost(customerEmail);
  } catch (error) {
    console.error("Error syncing wishlist to server:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove single item from wishlist on server
 * Uses DELETE endpoint to ensure proper server-side removal without merge conflicts
 */
export async function removeWishlistItemFromServer(
  customerEmail,
  variantId
) {
  try {
    const response = await fetch(
      `/api/wishlist?email=${encodeURIComponent(customerEmail)}&variantId=${encodeURIComponent(
        variantId
      )}`,
      { method: "DELETE" }
    );

    if (!response.ok) {
      throw new Error("Failed to remove item from server wishlist");
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error removing wishlist item from server:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Clear entire wishlist on server and locally
 */
export async function clearWishlistOnServerAndLocal(customerEmail) {
  try {
    const response = await fetch(
      `/api/wishlist?email=${encodeURIComponent(customerEmail)}`,
      { method: "DELETE" }
    );

    if (!response.ok) {
      throw new Error("Failed to clear wishlist on server");
    }

    localStorage.setItem("wishlist", JSON.stringify([]));
    return await response.json();
  } catch (error) {
    console.error("Error clearing wishlist on server:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Load wishlist from server and store in localStorage
 */
export async function loadWishlistFromServer(customerEmail) {
  try {
    const response = await fetch(
      `/api/wishlist?email=${encodeURIComponent(customerEmail)}`
    );

    if (!response.ok) {
      throw new Error("Failed to load wishlist from server");
    }

    const data = await response.json();

    if (!data.success || !data.items || data.items.length === 0) {
      return [];
    }

    localStorage.setItem("wishlist", JSON.stringify(data.items));
    return data.items;
  } catch (error) {
    console.error("Error loading wishlist from server:", error);
    return [];
  }
}

/**
 * Merge local and server wishlists (union by variantId, local takes precedence)
 * WARNING: Only use on initial login sync to preserve both local and server items.
 * Do NOT use after explicit deletions as it will re-add removed items.
 */
export async function mergeLocalAndServerWishlist(customerEmail) {
  try {
    const localWishlist = JSON.parse(
      localStorage.getItem("wishlist") || "[]"
    );

    const serverResponse = await fetch(
      `/api/wishlist?email=${encodeURIComponent(customerEmail)}`
    );
    const serverData = await serverResponse.json();
    const serverWishlist = serverData.items || [];

    if (localWishlist.length === 0 && serverWishlist.length === 0) {
      return [];
    }

    // Merge: union by variantId, local items take precedence
    const mergedMap = new Map();

    serverWishlist.forEach((item) => {
      mergedMap.set(item.variantId, item);
    });

    localWishlist.forEach((item) => {
      mergedMap.set(item.variantId, item);
    });

    const mergedWishlist = Array.from(mergedMap.values());

    // Save merged wishlist to server
    await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: customerEmail,
        items: mergedWishlist,
      }),
    });

    // Update localStorage
    localStorage.setItem("wishlist", JSON.stringify(mergedWishlist));

    return mergedWishlist;
  } catch (error) {
    console.error("Error merging wishlists:", error);
    return JSON.parse(localStorage.getItem("wishlist") || "[]");
  }
}
