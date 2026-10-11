import { useEffect, useState } from 'react';
import * as alertService from '../services/alertService';
import type { Alert } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { useSocketEvent } from '../hooks/useSocketEvent';

export function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const refresh = () => alertService.listAlerts().then(setAlerts);
  useEffect(() => { refresh(); }, []);
  useSocketEvent('new_alert', refresh);
  useSocketEvent('alert_updated', refresh);

  const act = async (fn: (id: string) => Promise<any>, id: string) => { await fn(id); refresh(); };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Alerts</h1>
      <div className="space-y-3">
        {alerts.map((a) => (
          <div key={a.id} className="card p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1"><SeverityBadge severity={a.severity} /><span className="font-medium text-sm">{a.title}</span></div>
              <div className="text-xs text-slate-500">{a.location ?? '—'} · {new Date(a.createdAt).toLocaleString()}</div>
              <div className="text-sm text-slate-400 mt-1">{a.message}</div>
            </div>
            <div className="flex gap-2 shrink-0">
              {a.status === 'OPEN' && <button className="btn btn-primary" onClick={() => act(alertService.acknowledgeAlert, a.id)}>Acknowledge</button>}
              {a.status !== 'RESOLVED' && a.status !== 'FALSE_ALARM' && <button className="btn btn-ghost" onClick={() => act((id) => alertService.resolveAlert(id), a.id)}>Resolve</button>}
              {a.status !== 'RESOLVED' && a.status !== 'FALSE_ALARM' && <button className="btn btn-ghost" onClick={() => act((id) => alertService.falseAlarmAlert(id), a.id)}>False Alarm</button>}
              {(a.status === 'RESOLVED' || a.status === 'FALSE_ALARM') && <span className="badge bg-panel2 text-slate-400">{a.status}</span>}
            </div>
          </div>
        ))}
        {alerts.length === 0 && <div className="text-sm text-slate-500">No alerts.</div>}
      </div>
    </div>
  );
}
