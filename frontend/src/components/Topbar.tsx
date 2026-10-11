import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export function Topbar() {
  const { user, logout } = useAuth();
  const socket = useSocket();
  return (
    <header className="h-14 border-b border-line flex items-center justify-between px-6 bg-ink/80 backdrop-blur">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className={`w-1.5 h-1.5 rounded-full ${socket?.connected ? 'bg-ok' : 'bg-slate-600'}`} />
        {socket?.connected ? 'Live' : 'Connecting…'}
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-slate-400">{user?.name}</span>
        <span className="badge bg-panel2 text-slate-300">{user?.role}</span>
        <button onClick={logout} className="btn btn-ghost">Log out</button>
      </div>
    </header>
  );
}
