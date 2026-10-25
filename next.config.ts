import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Serve images straight from their source. Vercel's optimizer is metered and
    // returns 402 (OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED) once the plan quota is used up.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.dummyjson.com" },
    ],
  },
};

export default nextConfig;
