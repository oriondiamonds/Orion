/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization settings
  images: {
    // Enable static imports
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",

    // Configure image optimization
    formats: ["image/avif", "image/webp"],

    // Define external image sources
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],

    // Cache optimized images for 1 year
    minimumCacheTTL: 31536000,

    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Enable compression
  compress: true,

  // Enable React strict mode for development
  reactStrictMode: true,

  // Optimize production builds
  productionBrowserSourceMaps: false,

  // Enable SWR caching with ISR (Incremental Static Regeneration)
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },

  // Middleware configuration
  middleware: {
    matcher: [
      /*
       * Match all request paths except for the ones starting with:
       * - api (API routes)
       * - _next/static (static files)
       * - _next/image (image optimization files)
       * - favicon.ico (favicon file)
       */
      "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
  },

  // Proxy /supabase-proxy/* → Supabase (fixes Indian ISP DNS blocking)
  async rewrites() {
    return [
      {
        source: "/supabase-proxy/:path*",
        destination:
          "https://ngjrleoelyckzdtrbkqb.supabase.co/:path*",
      },
    ];
  },

  // Preconnect to external origins used for images / APIs
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Link",
            value: '<https://ngjrleoelyckzdtrbkqb.supabase.co>; rel="preconnect"',
          },
        ],
      },
    ];
  },

  // Build optimization
  swcMinify: true,
  experimental: {
    // Optimize package imports for better bundle size
    optimizePackageImports: [
      "react-icons",
      "lucide-react",
      "@supabase/supabase-js",
    ],
  },
};

export default nextConfig;
