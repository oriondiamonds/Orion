const PRODUCTION_URL = "https://www.oriondiamonds.in";

// Resolves to the production domain when deployed as production, otherwise
// to the current preview/branch deployment's own URL (e.g. the dev branch's
// orion-dev-ten.vercel.app) so OG/meta tags point at assets that actually
// exist on that deployment instead of 404ing against production.
export function getSiteUrl() {
  if (process.env.VERCEL_ENV === "production") {
    return PRODUCTION_URL;
  }

  const previewHost = process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL;
  return previewHost ? `https://${previewHost}` : PRODUCTION_URL;
}
