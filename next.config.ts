import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.resolve(process.cwd()),
  experimental: {
    serverActions: {},
  },
  // Amplify hosting may require a custom output directory; using default for Next.js
  // Additional headers/rewrites for APIs or Cognito callbacks can be added here if needed.
  async redirects() {
    return [{ source: "/", destination: "/dashboard", permanent: false }];
  },
};

export default nextConfig;
