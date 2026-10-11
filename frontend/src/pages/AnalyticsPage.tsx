import { useEffect, useState } from 'react';
import * as analyticsService from '../services/analyticsService';

export function AnalyticsPage() {
  const [range, setRange] = useState('7d');
  const [data, setData] = useState<any>(null);
  useEffect(() => { analyticsService.getAnalytics(range).then(setData); }, [range]);
  if (!data) return <div className="text-sm text-slate-500">Loading…</div>;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Analytics</h1>
        <select value={range} onChange={(e) => setRange(e.target.value)} className="bg-panel2 border border-line rounded px-3 py-1.5 text-sm">
          <option value="today">Today</option><option value="7d">7 days</option><option value="30d">30 days</option>
        </select>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4"><div className="text-xs text-slate-500">Total Incidents</div><div className="text-2xl font-semibold">{data.safety.totalIncidents}</div></div>
        <div className="card p-4"><div className="text-xs text-slate-500">Active</div><div className="text-2xl font-semibold">{data.safety.activeIncidents}</div></div>
        <div className="card p-4"><div className="text-xs text-slate-500">Resolved</div><div className="text-2xl font-semibold">{data.safety.resolvedIncidents}</div></div>
        <div className="card p-4"><div className="text-xs text-slate-500">False Alarms</div><div className="text-2xl font-semibold">{data.safety.falseAlarms}</div></div>
      </div>
      <div className="card p-4">
        <h2 className="text-sm font-medium text-slate-300 mb-3">PPE Compliance</h2>
        <div className="grid grid-cols-5 gap-3 text-sm">
          {(['helmetCompliance', 'vestCompliance', 'gloveCompliance', 'shoeCompliance', 'overallCompliance'] as const).map((k) => (
            <div key={k}><div className="text-xs text-slate-500">{k.replace('Compliance', '')}</div><div className="text-lg">{data.ppe[k] != null ? `${data.ppe[k]}%` : '—'}</div></div>
          ))}
        </div>
      </div>
      <div className="card p-4">
        <h2 className="text-sm font-medium text-slate-300 mb-3">Hazards by Type</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          {Object.entries(data.hazards).map(([k, v]) => <div key={k} className="badge bg-panel2 text-slate-300">{k}: {v as any}</div>)}
          {Object.keys(data.hazards).length === 0 && <span className="text-slate-500">No hazards in this range.</span>}
        </div>
      </div>
    </div>
  );
}
