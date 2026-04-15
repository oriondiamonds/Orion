/**
 * Custom Next.js image loader that routes Supabase Storage images through
 * Supabase's image transformation API instead of Vercel's /_next/image.
 *
 * Benefits:
 * - No Vercel image optimization quota consumed (avoids 402 on free tier)
 * - Supabase resizes + converts to WebP/format on the fly
 * - CDN-cached at the Supabase edge
 *
 * For non-Supabase URLs the original src is returned as-is.
 */
export default function supabaseImageLoader({ src, width, quality }) {
  if (src.includes(".supabase.co/storage/v1/object/public/")) {
    const renderUrl = src.replace(
      "/storage/v1/object/public/",
      "/storage/v1/render/image/public/"
    );
    return `${renderUrl}?width=${width}&quality=${quality || 75}&format=origin`;
  }
  // Local images or other external URLs — return unchanged
  return src;
}
