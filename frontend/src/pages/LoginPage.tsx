import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('admin@demo.industrialguardian.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setBusy(true);
    try { await login(email, password); nav('/'); }
    catch { setError('Invalid email or password'); }
    finally { setBusy(false); }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-ink">
      <form onSubmit={submit} className="card w-full max-w-sm p-6">
        <div className="flex items-center gap-2 mb-6 text-safety"><ShieldCheck size={22} /><span className="font-semibold text-slate-100">Industrial Guardian</span></div>
        {error && <div className="mb-4 text-sm text-hazard-critical bg-hazard-critical/10 border border-hazard-critical/30 rounded px-3 py-2">{error}</div>}
        <label className="block text-xs text-slate-400 mb-1">Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mb-4 bg-panel2 border border-line rounded px-3 py-2 text-sm" />
        <label className="block text-xs text-slate-400 mb-1">Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mb-6 bg-panel2 border border-line rounded px-3 py-2 text-sm" />
        <button disabled={busy} className="btn btn-primary w-full">{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="mt-4 text-xs text-slate-500">Demo: run <code className="text-slate-400">POST /api/demo/seed</code> first, then sign in with the seeded admin email and the password from your <code>.env</code>.</p>
      </form>
    </div>
  );
}
