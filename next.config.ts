import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output: `next build` emits .next/standalone with a minimal server.js and only
  // the traced node_modules, so the production image stays small (see Dockerfile).
  output: "standalone",
};

export default nextConfig;
