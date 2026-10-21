import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

// Serwist (PWA) is only applied during production builds.
// In development, the service worker is NOT registered to avoid
// caching issues that would make local iteration painful.
const nextConfig = async (phase: string): Promise<NextConfig> => {
  const baseConfig: NextConfig = {
    reactStrictMode: true,
    serverExternalPackages: ["@react-pdf/renderer"],
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
      exclude: [
        ({ asset }: { asset: any }) => {
          if (!asset?.name) return false;
          // 1. URLs ou rotas de discursos / tiptap
          if (/discursos|tiptap|prosemirror|tippy|pdf/i.test(asset.name)) return true;

          // 2. Chunks JS que contêm código do Tiptap, ProseMirror ou Tippy
          if (asset.name.endsWith(".js") && asset.source) {
            try {
              const raw = typeof asset.source.source === "function" ? asset.source.source() : asset.source;
              const text = typeof raw === "string" ? raw : raw?.toString?.("utf8") || "";
              if (
                text.includes("ProseMirror") ||
                text.includes("@tiptap") ||
                text.includes("tippy") ||
                text.includes("useDiscourseTimer") ||
                text.includes("closeVersePanel") ||
                text.includes("bible-data") ||
                text.includes("number:1,name:") ||
                text.includes("G\\xeanesis")
              ) {
                return true;
              }
            } catch {}
          }
          return false;
        },
      ],
      manifestTransforms: [
        async (manifestEntries, compilation) => {
          const filtered = manifestEntries.filter((entry) => {
            const url = entry.url;
            if (/discursos|tiptap|prosemirror|tippy|pdf/i.test(url)) return false;

            const comp = compilation as any;
            if (comp) {
              const assetName = url.replace(/^\/_next\//, "");
              const asset = comp.getAsset ? comp.getAsset(assetName) : comp.assets?.[assetName];
              if (asset?.source) {
                try {
                  const raw = typeof asset.source.source === "function" ? asset.source.source() : asset.source;
                  const text = typeof raw === "string" ? raw : raw?.toString?.("utf8") || "";
                  if (
                    text.includes("ProseMirror") ||
                    text.includes("@tiptap") ||
                    text.includes("tippy") ||
                    text.includes("useDiscourseTimer") ||
                    text.includes("closeVersePanel") ||
                    text.includes("bible-data") ||
                    text.includes("number:1,name:") ||
                    text.includes("G\\xeanesis")
                  ) {
                    return false;
                  }
                } catch {}
              }
            }
            return true;
          });
          return { manifest: filtered };
        },
      ],
    })(baseConfig);
  }

  return baseConfig;
};

export default nextConfig;
