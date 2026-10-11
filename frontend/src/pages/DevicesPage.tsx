import { useEffect, useState } from 'react';
import * as deviceService from '../services/deviceService';
import type { Device } from '../types';
import { StatusDot } from '../components/StatusDot';
import { useSocketEvent } from '../hooks/useSocketEvent';

export function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const refresh = () => deviceService.listDevices().then(setDevices);
  useEffect(() => { refresh(); }, []);
  useSocketEvent('device_status', refresh);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Devices</h1>
      <div className="card divide-y divide-line">
        {devices.map((d) => (
          <div key={d.deviceId} className="p-4 flex items-center justify-between">
            <div><div className="font-medium text-sm">{d.name} <span className="text-slate-500 font-normal">· {d.deviceId}</span></div><div className="text-xs text-slate-500">{d.type} · {d.location}</div></div>
            <StatusDot status={d.status} />
          </div>
        ))}
        {devices.length === 0 && <div className="p-4 text-sm text-slate-500">No devices registered yet.</div>}
      </div>
    </div>
  );
}
