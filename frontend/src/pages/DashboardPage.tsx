import { useEffect, useState } from 'react';
import { AlertTriangle, Bell, Camera, Radio, HardDrive, Users, ShieldCheck } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import * as analyticsService from '../services/analyticsService';
import type { DashboardSnapshot } from '../types';
import { useSocketEvent } from '../hooks/useSocketEvent';

export function DashboardPage() {
  const [data, setData] = useState<DashboardSnapshot | null>(null);
  const refresh = () => analyticsService.getDashboard().then(setData).catch(() => {});
  useEffect(() => { refresh(); const t = setInterval(refresh, 15000); return () => clearInterval(t); }, []);
  useSocketEvent('new_alert', refresh);
  useSocketEvent('hazard_detected', refresh);
  useSocketEvent('device_status', refresh);

  if (!data) return <div className="text-slate-500 text-sm">Loading…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Safety Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Alerts" value={data.activeAlerts} icon={<Bell size={20} />} tone={data.activeAlerts > 0 ? 'bad' : undefined} />
        <StatCard label="Active Hazards" value={data.activeHazards} icon={<AlertTriangle size={20} />} tone={data.activeHazards > 0 ? 'warn' : undefined} />
        <StatCard label="Cameras Online" value={data.onlineCameras} icon={<Camera size={20} />} />
        <StatCard label="Sensors Online" value={data.onlineSensors} icon={<Radio size={20} />} />
        <StatCard label="Devices Online" value={data.onlineDevices} icon={<HardDrive size={20} />} />
        <StatCard label="Workers Monitored" value={data.workersMonitored} icon={<Users size={20} />} />
        <StatCard label="PPE Compliance" value={data.ppeCompliance != null ? `${data.ppeCompliance}%` : '—'} icon={<ShieldCheck size={20} />} tone={data.ppeCompliance != null && data.ppeCompliance < 90 ? 'warn' : undefined} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h2 className="text-sm font-medium text-slate-300 mb-3">Latest Camera Analysis</h2>
          {data.latestImage ? (
            <div className="text-sm space-y-1">
              <div className="text-slate-400">{data.latestImage.camera?.name} · {data.latestImage.location}</div>
              <div className="text-xs text-slate-500">{new Date(data.latestImage.capturedAt).toLocaleString()}</div>
              {data.latestImage.analysis && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {data.latestImage.analysis.detections.map((d, i) => (
                    <span key={i} className={`badge ${d.type.startsWith('NO_') || d.type === 'FIRE' || d.type === 'SMOKE' ? 'badge-high' : 'badge-ok'}`}>{d.type} {Math.round(d.confidence * 100)}%</span>
                  ))}
                </div>
              )}
            </div>
          ) : <div className="text-sm text-slate-500">No images analyzed yet.</div>}
        </div>
        <div className="card p-4">
          <h2 className="text-sm font-medium text-slate-300 mb-3">Latest Sensor Events</h2>
          <div className="space-y-2">
            {data.latestReadings.length === 0 && <div className="text-sm text-slate-500">No readings yet.</div>}
            {data.latestReadings.map((r, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-slate-400">{r.sensor?.name ?? r.sensorId}</span>
                <span className="text-slate-200">{r.value} {r.unit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
