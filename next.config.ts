import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    /** Avoid picking a parent folder when multiple lockfiles exist on the machine. */
    root: process.cwd(),
  },
};

export default nextConfig;
