/**
 * Custom Next.js image loader.
 *
 * Supabase Storage images are routed through /api/img — a serverless function
 * that uses sharp to convert to WebP + resize. Vercel CDN caches the result,
 * so the function only fires once per unique src+width+quality combination.
 * This avoids Vercel's /_next/image quota (402 on free tier) entirely.
 *
 * Local/static images are returned as-is (no processing needed).
 */
export default function imageLoader({ src, width, quality }) {
  if (src.includes(".supabase.co/storage/v1/object/public/")) {
    return `/api/img?url=${encodeURIComponent(src)}&w=${width}&q=${quality || 75}`;
  }
  return src;
}
