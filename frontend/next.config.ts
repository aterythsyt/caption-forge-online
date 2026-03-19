import type { NextConfig } from "next";

const isStaticExport = process.env.NEXT_STATIC_EXPORT === "true";
const proxyTarget = process.env.NEXT_PUBLIC_API_PROXY_TARGET ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = isStaticExport
  ? {
      reactStrictMode: true,
      output: "export",
      images: {
        unoptimized: true,
      },
    }
  : {
  reactStrictMode: true,
      async rewrites() {
        return [
          {
            source: "/api/:path*",
            destination: `${proxyTarget}/api/:path*`,
          },
          {
            source: "/media/:path*",
            destination: `${proxyTarget}/media/:path*`,
          },
        ];
      },
    };

export default nextConfig;
