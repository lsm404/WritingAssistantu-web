import type { NextConfig } from "next";

const apiBaseUrl =
  process.env.NODE_ENV === "production"
    ? "http://49.235.172.63:3100"
    : "http://localhost:3100";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    proxyTimeout: 600_000,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiBaseUrl}/api/:path*`,
      },
      { source: '/workspace', destination: '/' },
      { source: '/membership', destination: '/' },
      { source: '/wechat', destination: '/' },
      { source: '/prompt', destination: '/' },
      { source: '/settings', destination: '/' },
      { source: '/model', destination: '/' },
      { source: '/placeholder', destination: '/' },
      { source: '/agent', destination: '/' },
      { source: '/image', destination: '/' },
    ];
  },
};

export default nextConfig;
