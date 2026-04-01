import type { NextConfig } from "next";
import path from "path";

const isIsolatedBuild = process.env.ISOLATED_BUILD === "true";

const nextConfig: NextConfig = {
  distDir: isIsolatedBuild ? ".next-build" : ".next",
  outputFileTracingRoot: path.resolve(process.cwd()),
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'sat.coilearn.com',
      },
      {
        protocol: 'https',
        hostname: 'thryftstore.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/__/auth/:path*',
        destination: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com/__/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
