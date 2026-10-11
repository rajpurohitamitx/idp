import { useEffect, useRef, useState } from 'react';
import * as cameraService from '../services/cameraService';
import type { Camera } from '../types';

export function ImageAnalysisPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [cameraId, setCameraId] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { cameraService.listCameras().then((cs) => { setCameras(cs); if (cs[0]) setCameraId(cs[0].cameraId); }); }, []);

  const analyze = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !cameraId) { setError('Choose a camera and an image file'); return; }
    setBusy(true); setError(null);
    try { setResult(await cameraService.analyzeImage(file, cameraId)); }
    catch (e: any) { setError(e?.response?.data?.error?.message ?? 'Analysis failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-xl font-semibold">Image Analysis</h1>
      <div className="card p-4 space-y-3">
        <div className="flex gap-3 items-center">
          <select value={cameraId} onChange={(e) => setCameraId(e.target.value)} className="bg-panel2 border border-line rounded px-3 py-2 text-sm">
            {cameras.map((c) => <option key={c.cameraId} value={c.cameraId}>{c.name} — {c.location}</option>)}
          </select>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="text-sm text-slate-400" />
          <button onClick={analyze} disabled={busy} className="btn btn-primary">{busy ? 'Analyzing…' : 'Analyze Image'}</button>
        </div>
        {error && <div className="text-sm text-hazard-critical">{error}</div>}
      </div>
      {result && (
        <div className="card p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div className="text-sm text-slate-400">Image {result.imageId}</div>
            <span className={`badge ${result.overallResult === 'VIOLATION' ? 'badge-high' : result.overallResult === 'COMPLIANT' ? 'badge-ok' : 'badge-low'}`}>{result.overallResult}</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-sm">
            {(['helmet', 'vest', 'gloves', 'shoes'] as const).map((k) => (
              <div key={k} className="card p-2 text-center">
                <div className="text-xs text-slate-500 uppercase">{k}</div>
                <div className={result.ppe[k] === 'PRESENT' ? 'text-ok' : result.ppe[k] === 'MISSING' ? 'text-hazard-critical' : 'text-slate-500'}>{result.ppe[k] === 'PRESENT' ? '✓' : result.ppe[k] === 'MISSING' ? '✗' : '—'}</div>
              </div>
            ))}
          </div>
          <div className="text-sm text-slate-400">Hazards created this analysis: {result.hazardsCreated}</div>
        </div>
      )}
    </div>
  );
}
