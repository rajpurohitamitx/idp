import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as authService from '../services/authService';

interface User { id: string; email: string; name: string; role: string }
interface AuthCtx { user: User | null; loading: boolean; login: (e: string, p: string) => Promise<void>; logout: () => void }

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ig_token');
    if (!token) { setLoading(false); return; }
    authService.me().then(setUser).catch(() => localStorage.removeItem('ig_token')).finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { token, user } = await authService.login(email, password);
    localStorage.setItem('ig_token', token);
    setUser(user);
  };
  const logout = () => { localStorage.removeItem('ig_token'); setUser(null); window.location.assign('/login'); };

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}
export const useAuth = () => { const c = useContext(Ctx); if (!c) throw new Error('useAuth outside provider'); return c; };
