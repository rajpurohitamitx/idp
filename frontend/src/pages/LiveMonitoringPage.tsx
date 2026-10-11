import { useEffect, useState } from 'react';
import * as cameraService from '../services/cameraService';
import type { Camera } from '../types';
import { StatusDot } from '../components/StatusDot';
import { useSocketEvent } from '../hooks/useSocketEvent';

export function LiveMonitoringPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [latest, setLatest] = useState<Record<string, any>>({});
  useEffect(() => { cameraService.listCameras().then(setCameras); }, []);
  useSocketEvent('image_analysis_complete', (p: any) => setLatest((prev) => ({ ...prev, [p.cameraId]: p })));
  useSocketEvent('camera_status', () => cameraService.listCameras().then(setCameras));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Live Monitoring</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cameras.map((c) => {
          const l = latest[c.cameraId];
          return (
            <div key={c.cameraId} className="card p-4">
              <div className="flex justify-between items-center mb-2">
                <div className="font-medium text-sm">{c.name} <span className="text-slate-500 font-normal">· {c.location}</span></div>
                <StatusDot status={c.status} />
              </div>
              <div className="aspect-video bg-panel2 rounded flex items-center justify-center text-xs text-slate-600 mb-2">
                {l ? `Last analysis: ${new Date(l.capturedAt ?? Date.now()).toLocaleTimeString()}` : 'No analysis yet'}
              </div>
              {l && (
                <div className="flex flex-wrap gap-1">
                  {l.detections?.map((d: any, i: number) => (
                    <span key={i} className={`badge ${d.type.startsWith('NO_') || d.type === 'FIRE' || d.type === 'SMOKE' ? 'badge-high' : 'badge-ok'}`}>{d.type} {Math.round(d.confidence * 100)}%</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {cameras.length === 0 && <div className="text-sm text-slate-500">No cameras registered yet.</div>}
      </div>
    </div>
  );
}
