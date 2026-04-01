import type { NextConfig } from "next";

/** Dev: same-origin `/api/*` → gateway (avoids CORS and localhost/IPv6 quirks). */
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8080/api/:path*",
      },
    ];
  },
};

export default nextConfig;
