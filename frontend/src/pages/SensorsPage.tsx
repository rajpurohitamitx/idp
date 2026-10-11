import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import * as sensorService from '../services/sensorService';
import type { Sensor } from '../types';
import { StatusDot } from '../components/StatusDot';
import { useSocketEvent } from '../hooks/useSocketEvent';

export function SensorsPage() {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [history, setHistory] = useState<Sensor | null>(null);
  const refresh = () => sensorService.listSensors().then(setSensors);
  useEffect(() => { refresh(); }, []);
  useSocketEvent('sensor_update', refresh);

  useEffect(() => { if (expanded) sensorService.getSensor(expanded).then(setHistory); }, [expanded]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Sensors</h1>
      <div className="card divide-y divide-line">
        {sensors.map((s) => (
          <div key={s.sensorId}>
            <button onClick={() => setExpanded(expanded === s.sensorId ? null : s.sensorId)} className="w-full p-4 flex items-center justify-between text-left hover:bg-panel2/40">
              <div>
                <div className="font-medium text-sm">{s.name} <span className="text-slate-500 font-normal">· {s.type}</span></div>
                <div className="text-xs text-slate-500">{s.location} · threshold {s.warningThreshold ?? '—'}/{s.criticalThreshold ?? '—'} {s.unit}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm">{s.lastValue ?? '—'} {s.unit}</div>
                <StatusDot status={s.status} />
              </div>
            </button>
            {expanded === s.sensorId && history?.history && (
              <div className="px-4 pb-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history.history.map((h) => ({ t: new Date(h.timestamp).toLocaleTimeString(), v: h.value }))}>
                    <XAxis dataKey="t" stroke="#5b6b7a" fontSize={11} /> <YAxis stroke="#5b6b7a" fontSize={11} />
                    <Tooltip contentStyle={{ background: '#1d2630', border: '1px solid #2a3440' }} />
                    <Line type="monotone" dataKey="v" stroke="#f5a623" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ))}
        {sensors.length === 0 && <div className="p-4 text-sm text-slate-500">No sensors registered yet.</div>}
      </div>
    </div>
  );
}
