/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization settings
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ["image/avif", "image/webp"],
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
    minimumCacheTTL: 31536000,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 160, 256, 384],
  },

  compress: true,
  reactStrictMode: true,
  productionBrowserSourceMaps: false,

  experimental: {
    optimizePackageImports: [
      "react-icons",
      "lucide-react",
      "@supabase/supabase-js",
    ],
    // Keep heavy server-only packages external (not bundled into each function)
    serverExternalPackages: ["mongoose", "mongodb", "nodemailer", "razorpay"],
  },

  // Exclude dead legacy files from serverless function traces
  outputFileTracingExcludes: {
    "*": [
      "node_modules/mongoose/**",
      "node_modules/mongodb/**",
      "node_modules/bson/**",
      "node_modules/kerberos/**",
    ],
  },
};

export default nextConfig;
