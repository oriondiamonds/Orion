/**
 * API Response Caching Utility
 * Provides helper functions to add cache headers and manage response caching
 */

/**
 * Set cache headers for API responses
 * @param {NextResponse} response - The response object
 * @param {Object} options - Cache options
 * @param {Number} options.maxAge - Max age in seconds (default: 60)
 * @param {Number} options.sMaxAge - Server max age for CDN (default: 300)
 * @param {Number} options.staleWhileRevalidate - Stale-while-revalidate duration (default: 600)
 * @returns {NextResponse} Updated response with cache headers
 */
export function setCacheHeaders(response, options = {}) {
  const {
    maxAge = 60,
    sMaxAge = 300,
    staleWhileRevalidate = 600,
    isPublic = true,
  } = options;

  const cacheControl = isPublic
    ? `public, s-maxage=${sMaxAge}, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
    : `private, max-age=${maxAge}`;

  response.headers.set("Cache-Control", cacheControl);
  response.headers.set("Content-Type", "application/json");

  // Add ETag for client-side caching
  response.headers.set("Vary", "Accept-Encoding");

  return response;
}

/**
 * Cache data in memory with TTL (simple in-process cache)
 * Useful for frequently accessed data like product listings, pricing
 */
const memoryCache = new Map();

export function getCachedData(key) {
  const cached = memoryCache.get(key);
  if (!cached) return null;

  const { data, expiresAt } = cached;
  if (Date.now() > expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  return data;
}

export function setCachedData(key, data, ttlSeconds = 300) {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  memoryCache.set(key, { data, expiresAt });
}

export function clearCache(keyPattern = null) {
  if (!keyPattern) {
    memoryCache.clear();
  } else {
    const regex = new RegExp(keyPattern);
    for (const key of memoryCache.keys()) {
      if (regex.test(key)) {
        memoryCache.delete(key);
      }
    }
  }
}

/**
 * Compress response data for smaller payloads
 * @param {Object} data - Data to be sent
 * @returns {Object} Potentially optimized data
 */
export function optimizeResponseData(data) {
  // Remove unnecessary fields from products
  if (Array.isArray(data) && data[0]?.productType) {
    return data.map((product) => ({
      id: product.id,
      title: product.title,
      handle: product.handle,
      image: product.featuredImage?.url,
      price: product.pricing?.currentPrice,
    }));
  }

  return data;
}

/**
 * Create revalidation tags for ISR (Incremental Static Regeneration)
 */
export function getRevalidationTags(category) {
  return [`products_${category}`, "products", "cart"];
}

/**
 * Rate limiting helper for API endpoints
 */
const rateLimitMap = new Map();

export function checkRateLimit(identifier, limit = 100, windowMs = 60000) {
  const now = Date.now();
  const key = identifier;

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, []);
  }

  const requests = rateLimitMap.get(key);
  const recentRequests = requests.filter((time) => now - time < windowMs);

  if (recentRequests.length >= limit) {
    return false;
  }

  recentRequests.push(now);
  rateLimitMap.set(key, recentRequests);

  // Cleanup old entries
  if (rateLimitMap.size > 1000) {
    rateLimitMap.clear();
  }

  return true;
}
