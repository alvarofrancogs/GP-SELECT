import { createContext, useContext } from 'react';

export type AdminAuthState =
  | { status: 'checking' }
  | { status: 'unavailable' }
  | { status: 'anonymous'; expired: boolean }
  | { status: 'authenticated'; email: string };

export interface AdminAuthValue {
  state: AdminAuthState;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  retry: () => void;
}

export const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return context;
}
