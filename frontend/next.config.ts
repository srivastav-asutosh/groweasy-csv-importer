import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output is only for the Docker image (see Dockerfile).
  // Vercel manages its own build output, so it must stay unset there.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
};

export default nextConfig;
