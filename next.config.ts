import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // allowedOrigins not restricted — works on any Vercel domain + custom domain
  experimental: { serverActions: { allowedOrigins: ["ap-home-platform.vercel.app", "finnhouses.com"] } },
};

export default nextConfig;
