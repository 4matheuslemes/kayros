"use client";

import { useMemo } from "react";
import { useOnlineSync } from "@/hooks/use-online-sync";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Toaster } from "sonner";
import { usePathname } from "next/navigation";
import { AppLockGate } from "@/components/security/app-lock-gate";
import { PwaUpdatePrompt } from "@/components/pwa/update-prompt";
import { FLOATING_NAV_ITEMS } from "@/lib/constants";
import { UserPermissionsProvider } from "@/contexts/user-permissions-context";
import {
  type UserPermissions,
  type FloatingNavId,
  isFloatingItemAllowed,
  derivePermissions,
} from "@/lib/permissions";

interface AppShellClientProps {
  children: React.ReactNode;
  permissions?: UserPermissions;
  talksAccess?: boolean;
  isElder?: boolean;
  isAdmin?: boolean;
}

export function AppShellClient({
  children,
  permissions: propPermissions,
  talksAccess = false,
  isElder = false,
  isAdmin = false,
}: AppShellClientProps) {
  const isOnline = useOnlineSync();
  const pathname = usePathname();
  const isPresentation =
    pathname?.includes("/discursos/") && pathname?.endsWith("/apresentar");

  const permissions = useMemo(() => {
    if (propPermissions) return propPermissions;
    return derivePermissions({
      is_admin: isAdmin,
      is_elder: isElder,
      talks_access: talksAccess,
      contacts_access: true,
      hours_access: false,
    });
  }, [propPermissions, talksAccess, isElder, isAdmin]);

  const hasVisibleFloatingNav = useMemo(() => {
    const items = FLOATING_NAV_ITEMS as readonly FloatingNavId[];
    if (items.length === 0) return false;
    if (pathname === "/onboarding" || isPresentation) return false;
    return items.some((id) => isFloatingItemAllowed(id, permissions));
  }, [permissions, pathname, isPresentation]);

  return (
    <UserPermissionsProvider permissions={permissions}>
      <AppLockGate>
        <div
          className="app-shell"
          style={hasVisibleFloatingNav ? undefined : { paddingBottom: 0 }}
        >
          {/* Offline banner */}
          {!isOnline && (
            <div className="fixed top-0 inset-x-0 z-50 bg-[var(--accent)] text-white text-center text-xs py-1.5 font-sans font-medium">
              Sem conexão — suas alterações serão sincronizadas quando a internet voltar
            </div>
          )}

          <main className="flex-1 overflow-y-auto">
            <div className="page-content">{children}</div>
          </main>

          {hasVisibleFloatingNav && <BottomNav permissions={permissions} />}
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
    </UserPermissionsProvider>
  );
}
