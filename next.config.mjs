/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Enables src/instrumentation.ts (boots the in-process background worker in dev).
    instrumentationHook: true,
  },
  // Photos/documents are served through authorization-gated route handlers, not /public.
  images: { remotePatterns: [] },
};

export default nextConfig;
