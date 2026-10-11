import { useEffect, useState } from 'react';
import * as zoneService from '../services/zoneService';
import type { Zone, Region } from '../services/zoneService';
import * as cameraService from '../services/cameraService';
import type { Camera } from '../types';
import { ZoneRegionEditor } from '../components/ZoneRegionEditor';

export function RestrictedZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [cameraId, setCameraId] = useState('');
  const [region, setRegion] = useState<Region | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => zoneService.listZones().then(setZones);
  useEffect(() => { refresh(); cameraService.listCameras().then((cs) => { setCameras(cs); if (cs[0]) setCameraId(cs[0].cameraId); }); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    if (!name || !location || !cameraId) { setError('Name, location and camera are required'); return; }
    try {
      await zoneService.createZone({ name, location, cameraId, region, active: true });
      setShowForm(false); setName(''); setLocation(''); setRegion(null);
      refresh();
    } catch (err: any) { setError(err?.response?.data?.error?.message ?? 'Failed to create zone'); }
  };

  const toggleActive = async (z: Zone) => { await zoneService.updateZone(z.id, { active: !z.active }); refresh(); };
  const remove = async (z: Zone) => { if (confirm(`Delete zone "${z.name}"?`)) { await zoneService.deleteZone(z.id); refresh(); } };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Restricted Zones</h1>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : 'New Zone'}</button>
      </div>
      {showForm && (
        <form onSubmit={submit} className="card p-4 space-y-3">
          {error && <div className="text-sm text-hazard-critical">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-slate-400 mb-1">Zone name</label><input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-panel2 border border-line rounded px-3 py-2 text-sm" /></div>
            <div><label className="block text-xs text-slate-400 mb-1">Location label</label><input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-panel2 border border-line rounded px-3 py-2 text-sm" /></div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Camera</label>
            <select value={cameraId} onChange={(e) => setCameraId(e.target.value)} className="w-full bg-panel2 border border-line rounded px-3 py-2 text-sm">
              {cameras.map((c) => <option key={c.cameraId} value={c.cameraId}>{c.name} — {c.location}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Restricted region (optional)</label>
            <ZoneRegionEditor value={region} onChange={setRegion} />
          </div>
          <button className="btn btn-primary">Create Zone</button>
        </form>
      )}
      <div className="card divide-y divide-line">
        {zones.map((z) => (
          <div key={z.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">{z.name}</div>
              <div className="text-xs text-slate-500">{z.location} · camera {z.cameraId}{z.region ? ' · custom region' : ' · whole frame'}</div>
            </div>
            <div className="flex items-center gap-3">
              <button className="btn btn-ghost" onClick={() => toggleActive(z)}>{z.active ? 'Deactivate' : 'Activate'}</button>
              <button className="btn btn-ghost text-hazard-critical" onClick={() => remove(z)}>Delete</button>
              <span className={`badge ${z.active ? 'badge-ok' : 'bg-panel2 text-slate-400'}`}>{z.active ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        ))}
        {zones.length === 0 && !showForm && <div className="p-4 text-sm text-slate-500">No restricted zones configured.</div>}
      </div>
    </div>
  );
}
