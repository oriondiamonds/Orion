/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization settings
  images: {
    // Route Supabase Storage images through Supabase's own transform API
    // instead of Vercel's /_next/image — avoids the free-tier 402 quota error.
    loader: "custom",
    loaderFile: "./src/utils/imageLoader.js",

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

    // Cache optimized images for 1 day
    minimumCacheTTL: 86400,

    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 160, 256, 384],
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
