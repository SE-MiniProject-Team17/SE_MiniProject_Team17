import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiError } from '../api/client';

/** Basic login form. Owned by #5 (login & session) – extend there. */
export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(location.state?.message || '');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(apiError(err).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="narrow">
        <div className="auth-header">
          <span className="brand-mark" aria-hidden="true">SQ</span>
          <h1>Welcome back</h1>
          <p className="muted">Log in to continue to Study &amp; Quiz.</p>
        </div>
        {error && <p className="alert" role="alert">{error}</p>}
        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        </form>
      </section>
    </div>
  );
}
