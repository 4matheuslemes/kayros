"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface UserPermissions {
  talksAccess: boolean;
  isElder: boolean;
  isAdmin: boolean;
}

const UserPermissionsContext = createContext<UserPermissions>({
  talksAccess: false,
  isElder: false,
  isAdmin: false,
});

export function UserPermissionsProvider({
  children,
  permissions,
}: {
  children: ReactNode;
  permissions: UserPermissions;
}) {
  return (
    <UserPermissionsContext.Provider value={permissions}>
      {children}
    </UserPermissionsContext.Provider>
  );
}

export function useUserPermissions(): UserPermissions {
  return useContext(UserPermissionsContext);
}
