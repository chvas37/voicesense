import type { NextConfig } from "next";

/**
 * Dev only: proxy `/api/*` → local gateway (same-origin, no CORS).
 * On Vercel/production, set `NEXT_PUBLIC_API_BASE_URL` to your real API — rewrites are off so `/api` is not sent to 127.0.0.1.
 */
const nextConfig: NextConfig = {
  async rewrites() {
    if (process.env.NODE_ENV !== "development") {
      return [];
    }
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8080/api/:path*",
      },
    ];
  },
};

export default nextConfig;
