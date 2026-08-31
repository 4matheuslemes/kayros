import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

// Serwist (PWA) is only applied during production builds.
// In development, the service worker is NOT registered to avoid
// caching issues that would make local iteration painful.
const nextConfig = async (phase: string): Promise<NextConfig> => {
  const baseConfig: NextConfig = {
    reactStrictMode: true,
    // Security headers
    async headers() {
      return [
        {
          source: "/(.*)",
          headers: [
            { key: "X-Content-Type-Options",    value: "nosniff" },
            { key: "X-Frame-Options",           value: "DENY" },
            { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          ],
        },
      ];
    },
  };

  if (phase === PHASE_PRODUCTION_BUILD) {
    const { default: withSerwist } = await import("@serwist/next");
    return withSerwist({
      swSrc: "src/app/sw.ts",
      swDest: "public/sw.js",
      disable: false,
    })(baseConfig);
  }

  return baseConfig;
};

export default nextConfig;
