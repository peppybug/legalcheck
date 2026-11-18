import type { NextConfig } from "next";

// Static export for GitHub Pages. The deploy workflow sets NEXT_PUBLIC_BASE_PATH
// ("/legalcheck" on peppybug.github.io, empty once a custom domain is set).
const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
