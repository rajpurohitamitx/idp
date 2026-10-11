import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setBusy(true);
    try { await login(email, password); nav('/'); }
    catch (err: any) { setError(err?.response?.status === 401 ? 'Invalid email or password' : 'Cannot reach the server. Please try again.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-ink">
      <form onSubmit={submit} className="card w-full max-w-sm p-6">
        <div className="flex items-center gap-2 mb-6 text-safety"><ShieldCheck size={22} /><span className="font-semibold text-slate-100">Industrial Guardian</span></div>
        {error && <div className="mb-4 text-sm text-hazard-critical bg-hazard-critical/10 border border-hazard-critical/30 rounded px-3 py-2">{error}</div>}
        <label className="block text-xs text-slate-400 mb-1">Email</label>
        <input type="email" autoComplete="username" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mb-4 bg-panel2 border border-line rounded px-3 py-2 text-sm" />
        <label className="block text-xs text-slate-400 mb-1">Password</label>
        <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mb-6 bg-panel2 border border-line rounded px-3 py-2 text-sm" />
        <button disabled={busy} className="btn btn-primary w-full">{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
