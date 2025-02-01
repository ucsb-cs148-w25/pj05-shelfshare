import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["covers.openlibrary.org"], // Allow Open Library images
  },
};

export default nextConfig;
