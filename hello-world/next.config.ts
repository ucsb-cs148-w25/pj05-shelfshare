import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "covers.openlibrary.org",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https", // Add support for https
        hostname: "books.google.com", // Google Books
      },
      {
        protocol: "http", // Add support for http as well
        hostname: "books.google.com", // Google Books
      },
    ],
  },
};

export default nextConfig;
