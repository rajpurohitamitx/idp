import { useEffect, useState } from 'react';
import * as cameraService from '../services/cameraService';
import type { Camera } from '../types';
import { StatusDot } from '../components/StatusDot';

export function CamerasPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  useEffect(() => { cameraService.listCameras().then(setCameras); }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Cameras</h1>
      <div className="card divide-y divide-line">
        {cameras.map((c) => (
          <div key={c.cameraId} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">{c.name} <span className="text-slate-500 font-normal">· {c.cameraId}</span></div>
              <div className="text-xs text-slate-500">{c.location}{c.isEntryCamera ? ' · Entry Camera' : ''}</div>
            </div>
            <div className="flex items-center gap-4">
              <StatusDot status={c.status} />
              <button className="btn btn-ghost" onClick={() => cameraService.requestCapture(c.cameraId)}>Capture Now</button>
            </div>
          </div>
        ))}
        {cameras.length === 0 && <div className="p-4 text-sm text-slate-500">No cameras registered yet.</div>}
      </div>
    </div>
  );
}
