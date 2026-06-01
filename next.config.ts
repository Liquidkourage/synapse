import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    /** Avoid picking a parent folder when multiple lockfiles exist on the machine. */
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: "/embed/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
