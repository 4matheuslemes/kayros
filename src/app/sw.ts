/// <reference lib="webworker" />
/// <reference types="@serwist/next/typings" />

import { Serwist, CacheFirst, NetworkFirst, StaleWhileRevalidate, ExpirationPlugin } from "serwist";
import { defaultCache } from "@serwist/next/worker";

declare global {
  interface ServiceWorkerGlobalScope {
    __SW_MANIFEST: (import("serwist").PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // ─────────────────────────────────────────────────────────
    // Next.js static chunks (JS/CSS) — names contain content hash,
    // so they are immutable. Serve from cache instantly on first
    // visit after the SW has cached them (CacheFirst).
    // ─────────────────────────────────────────────────────────
    {
      matcher: /\/_next\/static\/.*/i,
      handler: new CacheFirst({
        cacheName: "next-static-assets",
        plugins: [
          new ExpirationPlugin({
            // Keep chunks for 30 days — a new deploy generates new hashes anyway
            maxAgeSeconds: 30 * 24 * 60 * 60,
            maxEntries: 256,
          }),
        ],
      }),
    },

    // ─────────────────────────────────────────────────────────
    // Next.js image optimization endpoint — StaleWhileRevalidate
    // so images load instantly from cache while quietly refreshing.
    // ─────────────────────────────────────────────────────────
    {
      matcher: /\/_next\/image\?.*/i,
      handler: new StaleWhileRevalidate({
        cacheName: "next-image-cache",
        plugins: [
          new ExpirationPlugin({
            maxAgeSeconds: 7 * 24 * 60 * 60,
            maxEntries: 64,
          }),
        ],
      }),
    },

    // ─────────────────────────────────────────────────────────
    // Supabase API calls — NetworkFirst so data is always fresh
    // when online, falling back to cache when offline.
    // ─────────────────────────────────────────────────────────
    {
      matcher: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: new NetworkFirst({
        cacheName: "supabase-api",
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({
            maxAgeSeconds: 24 * 60 * 60,
            maxEntries: 32,
          }),
        ],
      }),
    },

    // ─────────────────────────────────────────────────────────
    // Google Fonts — CacheFirst, they are versioned and immutable
    // ─────────────────────────────────────────────────────────
    {
      matcher: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
      handler: new CacheFirst({
        cacheName: "google-fonts",
        plugins: [
          new ExpirationPlugin({
            maxAgeSeconds: 365 * 24 * 60 * 60,
            maxEntries: 20,
          }),
        ],
      }),
    },

    // ─────────────────────────────────────────────────────────
    // Everything else — use Serwist's sensible defaults
    // ─────────────────────────────────────────────────────────
    ...defaultCache,
  ],
});

serwist.addEventListeners();
