import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/** @type {import('next').NextConfig} */
const baseConfig = {
  transpilePackages: ["roughjs"],
  images: {
    domains: ["lh3.googleusercontent.com"],
  },
};

export default function nextConfig(phase) {
  const isDevServer = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    ...baseConfig,
    // Keep dev and production artifacts separate to avoid stale chunk conflicts.
    distDir: isDevServer ? ".next-dev" : ".next",
  };
}
  
