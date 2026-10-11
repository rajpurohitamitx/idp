import { useEffect, useState } from 'react';
import * as workerService from '../services/workerService';
import type { Worker } from '../types';

export function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  useEffect(() => { workerService.listWorkers().then(setWorkers); }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Workers</h1>
      <table className="w-full text-sm card">
        <thead><tr className="text-left text-xs text-slate-500 border-b border-line"><th className="p-3">Employee ID</th><th className="p-3">Name</th><th className="p-3">Department</th><th className="p-3">Designation</th><th className="p-3">RFID</th><th className="p-3">Status</th></tr></thead>
        <tbody>
          {workers.map((w) => (
            <tr key={w.id} className="border-b border-line last:border-0">
              <td className="p-3 text-slate-400">{w.employeeId}</td><td className="p-3">{w.name}</td><td className="p-3">{w.department ?? '—'}</td>
              <td className="p-3">{w.designation ?? '—'}</td><td className="p-3 font-mono text-xs text-slate-400">{w.rfidUid ?? '—'}</td>
              <td className="p-3"><span className="badge bg-panel2 text-slate-300">{w.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
