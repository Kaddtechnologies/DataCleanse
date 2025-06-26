import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    // Enable experimental features if needed
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Add any other configuration you need
  images: {
    domains: [
      'upload.wikimedia.org',
      'placehold.co'
    ],
  },
};

export default nextConfig;
