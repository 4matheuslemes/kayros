"use client";

import { useOnlineSync } from "@/hooks/use-online-sync";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Toaster } from "sonner";
import { usePathname } from "next/navigation";
import { AppLockGate } from "@/components/security/app-lock-gate";
import { PwaUpdatePrompt } from "@/components/pwa/update-prompt";

interface AppShellClientProps {
  children: React.ReactNode;
  talksAccess: boolean;
}

export function AppShellClient({ children, talksAccess }: AppShellClientProps) {
  const isOnline = useOnlineSync();
  const pathname = usePathname();
  const isPresentation = pathname?.includes("/discursos/") && pathname?.endsWith("/apresentar");

  return (
    <AppLockGate>
      <div className="app-shell">
        {/* Offline banner */}
        {!isOnline && (
          <div className="fixed top-0 inset-x-0 z-50 bg-[var(--accent)] text-white text-center text-xs py-1.5 font-sans font-medium">
            Sem conexão — suas alterações serão sincronizadas quando a internet voltar
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="page-content">{children}</div>
        </main>

        {pathname !== "/onboarding" && !isPresentation && <BottomNav talksAccess={talksAccess} />}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--ink)",
            },
          }}
        />
        <PwaUpdatePrompt />
      </div>
    </AppLockGate>
  );
}
