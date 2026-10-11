import { useEffect, useState } from 'react';
import * as incidentService from '../services/incidentService';
import type { Incident } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';

export function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const refresh = () => incidentService.listIncidents().then(setIncidents);
  useEffect(() => { refresh(); }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Incidents</h1>
      <table className="w-full text-sm card">
        <thead><tr className="text-left text-xs text-slate-500 border-b border-line"><th className="p-3">ID</th><th className="p-3">Severity</th><th className="p-3">Location</th><th className="p-3">Source</th><th className="p-3">Status</th><th className="p-3">Detected</th><th className="p-3"></th></tr></thead>
        <tbody>
          {incidents.map((i) => (
            <tr key={i.id} className="border-b border-line last:border-0">
              <td className="p-3 text-slate-400">{i.incidentId}</td>
              <td className="p-3"><SeverityBadge severity={i.severity} /></td>
              <td className="p-3">{i.location}</td>
              <td className="p-3 text-slate-400">{i.source}</td>
              <td className="p-3"><span className="badge bg-panel2 text-slate-300">{i.status}</span></td>
              <td className="p-3 text-slate-400">{new Date(i.detectedAt).toLocaleString()}</td>
              <td className="p-3">{i.status !== 'RESOLVED' && <button className="btn btn-ghost" onClick={() => incidentService.resolveIncident(i.incidentId).then(refresh)}>Resolve</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {incidents.length === 0 && <div className="text-sm text-slate-500">No incidents.</div>}
    </div>
  );
}
