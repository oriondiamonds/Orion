import sharp from "sharp";

// Cache optimized images at Vercel's CDN edge — function runs once per unique
// src+width+quality combination, subsequent requests are served from CDN cache.
export const runtime = "nodejs";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const src = searchParams.get("url");
  const width = Math.min(parseInt(searchParams.get("w") || "640", 10), 1920);
  const quality = Math.min(parseInt(searchParams.get("q") || "75", 10), 100);

  if (!src) {
    return new Response("Missing url", { status: 400 });
  }

  // Only proxy known Supabase Storage URLs — reject arbitrary URLs
  const ALLOWED_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("https://", "");
  if (ALLOWED_HOST && !src.includes(ALLOWED_HOST)) {
    return new Response("URL not allowed", { status: 403 });
  }

  try {
    const upstream = await fetch(src, { next: { revalidate: 86400 } });
    if (!upstream.ok) {
      return new Response("Failed to fetch image", { status: upstream.status });
    }
    const buffer = Buffer.from(await upstream.arrayBuffer());

    const webp = await sharp(buffer)
      .resize(width, null, { withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();

    return new Response(webp, {
      headers: {
        "Content-Type": "image/webp",
        // Vercel CDN caches this response — function only runs once per unique URL
        "Cache-Control": "public, s-maxage=31536000, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("[img] sharp error:", err.message);
    return new Response("Image processing failed", { status: 500 });
  }
}
