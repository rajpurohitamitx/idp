import { useEffect, useState } from 'react';
import { api, unwrap } from '../services/api';
import * as demoService from '../services/demoService';

export function SettingsPage() {
  const [config, setConfig] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { unwrap<any>(api.get('/settings')).then((d) => setConfig(d.effective)); }, []);

  const runDemo = async (fn: () => Promise<any>, label: string) => { await fn(); setMsg(`${label} triggered`); setTimeout(() => setMsg(null), 3000); };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-semibold">Settings</h1>
      <div className="card p-4">
        <h2 className="text-sm font-medium text-slate-300 mb-3">Demo Mode</h2>
        <p className="text-xs text-slate-500 mb-3">Simulated data only — never presented as real hardware. Requires DEMO_MODE_ENABLED=true on the backend.</p>
        <div className="flex gap-2 flex-wrap">
          <button className="btn btn-primary" onClick={() => runDemo(demoService.seedDemo, 'Seed')}>Seed Demo Data</button>
          <button className="btn btn-ghost" onClick={() => runDemo(demoService.simulatePpe, 'PPE violation')}>Simulate PPE Violation</button>
          <button className="btn btn-ghost" onClick={() => runDemo(demoService.simulateFusion, 'Fusion')}>Simulate Fusion Hazard</button>
          <button className="btn btn-ghost" onClick={() => runDemo(demoService.simulateAccess, 'Access event')}>Simulate RFID Access</button>
        </div>
        {msg && <div className="mt-2 text-sm text-ok">{msg}</div>}
      </div>
      <div className="card p-4">
        <h2 className="text-sm font-medium text-slate-300 mb-3">Effective Configuration</h2>
        <pre className="text-xs text-slate-400 overflow-x-auto">{config ? JSON.stringify(config, null, 2) : 'Loading…'}</pre>
      </div>
    </div>
  );
}
