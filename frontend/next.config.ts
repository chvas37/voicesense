import type { NextConfig } from "next";

function gatewayOrigin(): string {
  const raw =
    process.env.API_GATEWAY_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    "";
  return raw.replace(/\/$/, "");
}

/**
 * Same-origin `/api/*` → real gateway (no CORS in the browser).
 * - Dev: localhost:8080
 * - Prod (Vercel): set `API_GATEWAY_URL=https://your-api.example.com` (server env, not NEXT_PUBLIC)
 *   or `NEXT_PUBLIC_API_BASE_URL` (also used for rewrites at build time).
 */
const nextConfig: NextConfig = {
  async rewrites() {
    if (process.env.NODE_ENV === "development") {
      return [
        {
          source: "/api/:path*",
          destination: "http://127.0.0.1:8080/api/:path*",
        },
      ];
    }
    const origin = gatewayOrigin();
    if (!origin) {
      return [];
    }
    return [
      {
        source: "/api/:path*",
        destination: `${origin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
