// An id for THIS deployment. Vercel sets one of these at build time; locally it
// falls back to 'local', which never triggers the "new version" banner.
const buildId = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || 'local';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Baked into both the browser code and the /api/version route, so an open tab
  // can compare "the version I was loaded with" against "the version live now".
  env: {
    NEXT_PUBLIC_BUILD_ID: buildId,
  },
};

module.exports = nextConfig;
