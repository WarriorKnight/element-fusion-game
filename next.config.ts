import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [new URL('https://fusiongame.s3.eu-north-1.amazonaws.com/elements/**')],
  },
};

export default nextConfig;
