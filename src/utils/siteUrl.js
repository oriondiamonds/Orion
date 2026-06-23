const FALLBACK_URL = "https://www.oriondiamonds.in";

// Resolves to whichever domain is actually serving the current request, so
// OG/meta tags point at assets that exist on that deployment. VERCEL_ENV
// alone isn't enough to detect "the real site" — the dev branch is deployed
// as its own Vercel project where "dev" is THAT project's production branch,
// so it also reports VERCEL_ENV=production. VERCEL_PROJECT_PRODUCTION_URL
// is scoped per-project instead, so it correctly resolves to
// www.oriondiamonds.in on the real site and orion-dev-ten.vercel.app on dev.
export function getSiteUrl() {
  const host =
    process.env.VERCEL_ENV === "production"
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL
      : process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL;

  return host ? `https://${host}` : FALLBACK_URL;
}
