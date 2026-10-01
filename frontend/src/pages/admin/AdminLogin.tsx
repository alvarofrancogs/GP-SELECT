import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../components/admin/adminAuth';
import { adminCopy } from '../../i18n/adminCopy';
import { ApiError } from '../../services/adminApi';
import { describeError } from '../../lib/adminErrors';

interface LoginRouteState { from?: string; expired?: boolean; signOut?: boolean }

export function AdminLogin() {
  const text = adminCopy.login;
  const { state, signIn, signOut } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = (location.state ?? {}) as LoginRouteState;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // State is stale for a second submit in the same tick (double click, key repeat); a ref is not.
  const inFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const signingOut = routeState.signOut === true;

  useEffect(() => {
    if (!signingOut) return;
    void signOut().then(() => navigate(location.pathname, { replace: true, state: null }));
  }, [signingOut, signOut, navigate, location.pathname]);

  if (signingOut || state.status === 'checking') return <p className="admin-state type-ui" role="status">{adminCopy.checkingSession}</p>;
  if (state.status === 'authenticated') return <Navigate to={routeState.from ?? '/admin'} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    if (!email.trim() || !password) { setError(text.required); return; }
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (failure) {
      const status = failure instanceof ApiError ? failure.status : -1;
      setError(status === 401 ? text.invalid : status === 429 ? text.rateLimited : describeError(failure));
      setPassword('');
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  const notice = error ?? (routeState.expired ? text.expired : null);
  return <section className="admin-login" aria-labelledby="admin-login-title">
    <h1 id="admin-login-title" className="admin-title type-section">{text.title}</h1>
    <p className="admin-login__intro type-ui">{text.intro}</p>
    <form className="admin-login__form" onSubmit={submit} noValidate>
      {notice ? <p className="admin-notice" role={error ? 'alert' : 'status'}>{notice}</p> : null}
      <div className="admin-field">
        <label htmlFor="admin-email">{text.email}</label>
        <input id="admin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} autoFocus required />
      </div>
      <div className="admin-field">
        <label htmlFor="admin-password">{text.password}</label>
        <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      </div>
      <button type="submit" className="button button--dark admin-button" disabled={submitting}>
        <span>{submitting ? text.submitting : text.submit}</span><span className="button-arrow" aria-hidden="true">→</span>
      </button>
    </form>
  </section>;
}
