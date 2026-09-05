"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Detects when a new Service Worker version is installed and waiting.
 * Shows a persistent toast prompting the user to update.
 *
 * Does NOT reload automatically — important because the timer may be running.
 * The user always controls when the reload happens.
 *
 * Flow:
 *   1. On mount, check if there's already a waiting SW (user had the app open
 *      during a previous deploy and never reloaded).
 *   2. Listen for future `updatefound` events in case a new SW installs
 *      while the app is already open.
 *   3. When a waiting SW is detected, show a toast with an "Atualizar" button.
 *   4. On button press: tell the waiting SW to skip waiting, then reload.
 */
export function PwaUpdatePrompt() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let toastShown = false;

    function showUpdateToast(waitingSW: ServiceWorker) {
      if (toastShown) return;
      toastShown = true;

      toast("Nova versão disponível", {
        description: "Uma atualização do Kairós está pronta.",
        duration: Infinity, // stays until dismissed or action taken
        action: {
          label: "Atualizar",
          onClick: () => {
            // Tell the waiting SW to skip the waiting phase and activate now.
            // Our sw.ts already has skipWaiting:true, but postMessage is the
            // reliable cross-browser way to trigger it programmatically from
            // a client page.
            waitingSW.postMessage({ type: "SKIP_WAITING" });

            // Reload once the new SW takes control.
            // We listen for the controllerchange event so we don't reload
            // before the SW has actually activated.
            navigator.serviceWorker.addEventListener(
              "controllerchange",
              () => window.location.reload(),
              { once: true }
            );
          },
        },
      });
    }

    async function checkForUpdate() {
      const registration = await navigator.serviceWorker.ready;

      // Case 1: there's already a waiting SW at the time we mount
      // (user kept the app open across a deploy)
      if (registration.waiting) {
        showUpdateToast(registration.waiting);
        return;
      }

      // Case 2: a new SW starts installing while the app is open
      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;

        installing.addEventListener("statechange", () => {
          // "installed" + an active controller means there's a previous version
          // running — the new one is waiting
          if (
            installing.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            showUpdateToast(installing);
          }
        });
      });
    }

    void checkForUpdate();

    // Periodically check for updates while the app is open.
    // navigator.serviceWorker.register triggers a background update check
    // automatically, but an explicit update() call forces it on long sessions.
    const interval = setInterval(() => {
      navigator.serviceWorker.ready
        .then((reg) => reg.update())
        .catch(() => {/* offline or not registered */});
    }, 60 * 60 * 1000); // check every hour

    return () => clearInterval(interval);
  }, []);

  // This component renders nothing — all UI is via toast
  return null;
}
