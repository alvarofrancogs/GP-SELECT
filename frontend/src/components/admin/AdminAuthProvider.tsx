import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { adminApi, setUnauthorizedHandler } from '../../services/adminApi';
import { adminCopy } from '../../i18n/adminCopy';
import { AdminAuthContext, useAdminAuth, type AdminAuthState } from './adminAuth';

/** The session lives only in the HttpOnly cookie; the client keeps what /me answered, in memory. */
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AdminAuthState>({ status: 'checking' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    adminApi.me().then(
      (session) => { if (!ignore) setState(session ? { status: 'authenticated', email: session.email } : { status: 'anonymous', expired: false }); },
      () => { if (!ignore) setState({ status: 'unavailable' }); },
    );
    return () => { ignore = true; };
  }, [attempt]);

  useEffect(() => {
    setUnauthorizedHandler(() => setState((current) => current.status === 'authenticated' ? { status: 'anonymous', expired: true } : current));
    return () => setUnauthorizedHandler(null);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await adminApi.login(email, password);
    const session = await adminApi.me();
    setState(session ? { status: 'authenticated', email: session.email } : { status: 'anonymous', expired: false });
  }, []);

  const signOut = useCallback(async () => {
    try { await adminApi.logout(); } catch { /* The cookie may already be gone; the client state is cleared anyway. */ }
    setState({ status: 'anonymous', expired: false });
  }, []);

  const retry = useCallback(() => { setState({ status: 'checking' }); setAttempt((n) => n + 1); }, []);
  const value = useMemo(() => ({ state, signIn, signOut, retry }), [state, signIn, signOut, retry]);
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

/** Guards every /admin route except the login. */
export function RequireAdmin() {
  const { state, retry } = useAdminAuth();
  const location = useLocation();
  if (state.status === 'checking') return <p className="admin-state type-ui" role="status">{adminCopy.checkingSession}</p>;
  if (state.status === 'unavailable') return <div className="admin-state" role="alert">
    <p className="type-ui">{adminCopy.errors.network}</p>
    <button type="button" className="admin-link" onClick={retry}>{adminCopy.errors.retry}</button>
  </div>;
  if (state.status === 'anonymous') {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search, expired: state.expired }} />;
  }
  return <Outlet />;
}
