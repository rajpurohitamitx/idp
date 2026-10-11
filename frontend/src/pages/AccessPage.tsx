import { useEffect, useState } from 'react';
import * as accessService from '../services/accessService';

export function AccessPage() {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => { accessService.listAccessLogs().then(setLogs); }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Access Log</h1>
      <table className="w-full text-sm card">
        <thead><tr className="text-left text-xs text-slate-500 border-b border-line"><th className="p-3">Worker</th><th className="p-3">RFID</th><th className="p-3">Decision</th><th className="p-3">Time</th></tr></thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id} className="border-b border-line last:border-0">
              <td className="p-3">{l.worker?.name ?? '—'}</td><td className="p-3 font-mono text-xs text-slate-400">{l.rfidUid}</td>
              <td className="p-3"><span className={`badge ${l.decision === 'APPROVED' ? 'badge-ok' : l.decision === 'DENIED' ? 'badge-critical' : 'bg-panel2 text-slate-300'}`}>{l.decision}</span></td>
              <td className="p-3 text-slate-400">{new Date(l.timestamp).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
