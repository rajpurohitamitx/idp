import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

const Ctx = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const ref = useRef<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('ig_token');
    const onLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const envUrl = import.meta.env.VITE_SOCKET_URL;
    const url = onLocalhost ? (envUrl ?? 'http://localhost:4000') : (envUrl && !/localhost|127\.0\.0\.1/.test(envUrl) ? envUrl : '');
    if (!user || !token || !url) return; // live sockets disabled when VITE_SOCKET_URL is empty (e.g. Vercel)
    const s = io(url, { auth: { token } });
    ref.current = s; setSocket(s);
    return () => { s.disconnect(); ref.current = null; setSocket(null); };
  }, [user]);

  return <Ctx.Provider value={socket}>{children}</Ctx.Provider>;
}
export const useSocket = () => useContext(Ctx);
