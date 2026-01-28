import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  /* config options here */
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      html2canvas: path.resolve(
        __dirname,
        "node_modules/html2canvas-pro"
      ),
    };
    return config;
  },
  experimental: {
    turbo: {
      resolveAlias: {
        html2canvas: "html2canvas-pro",
      },
    },
  },
};

export default nextConfig;
