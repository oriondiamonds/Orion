/**
 * Proxy external image URLs through Next.js image optimizer.
 * Prevents Indian ISPs from blocking direct requests to supabase.co.
 * Local paths (starting with /) are returned unchanged.
 */
export function proxySrc(url, width = 800) {
  if (!url) return url;
  if (url.startsWith("/") || url.startsWith("data:") || url.startsWith("blob:")) return url;
  return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=75`;
}
