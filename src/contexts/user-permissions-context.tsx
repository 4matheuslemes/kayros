"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  type UserPermissions,
  EMPTY_PERMISSIONS,
} from "@/lib/permissions";

export type { UserPermissions };

export interface UserPermissionsContextValue extends UserPermissions {
  /** Compatibilidade com código legado que lia `talksAccess` */
  talksAccess: boolean;
}

const defaultContextValue: UserPermissionsContextValue = {
  ...EMPTY_PERMISSIONS,
  talksAccess: false,
};

const UserPermissionsContext =
  createContext<UserPermissionsContextValue>(defaultContextValue);

export function UserPermissionsProvider({
  children,
  permissions,
}: {
  children: ReactNode;
  permissions: UserPermissions;
}) {
  const value: UserPermissionsContextValue = {
    ...permissions,
    talksAccess: permissions.canUseTalks,
  };

  return (
    <UserPermissionsContext.Provider value={value}>
      {children}
    </UserPermissionsContext.Provider>
  );
}

export function useUserPermissions(): UserPermissionsContextValue {
  return useContext(UserPermissionsContext);
}
