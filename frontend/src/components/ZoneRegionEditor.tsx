import { useRef, useState } from 'react';
import type { Region } from '../services/zoneService';

export function ZoneRegionEditor({ value, onChange }: { value: Region | null; onChange: (r: Region | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);

  const toNorm = (clientX: number, clientY: number) => {
    const box = ref.current!.getBoundingClientRect();
    return { x: Math.min(Math.max((clientX - box.left) / box.width, 0), 1), y: Math.min(Math.max((clientY - box.top) / box.height, 0), 1) };
  };

  const onMouseDown = (e: React.MouseEvent) => { const p = toNorm(e.clientX, e.clientY); setDrag(p); onChange({ x: p.x, y: p.y, width: 0, height: 0 }); };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag) return;
    const p = toNorm(e.clientX, e.clientY);
    onChange({ x: Math.min(drag.x, p.x), y: Math.min(drag.y, p.y), width: Math.abs(p.x - drag.x), height: Math.abs(p.y - drag.y) });
  };
  const onMouseUp = () => setDrag(null);

  return (
    <div>
      <div
        ref={ref} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        className="relative aspect-video bg-panel2 rounded border border-line cursor-crosshair select-none overflow-hidden"
      >
        <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-600">Drag to mark the restricted area</div>
        {value && value.width > 0 && value.height > 0 && (
          <div className="absolute border-2 border-hazard-high bg-hazard-high/15" style={{ left: `${value.x * 100}%`, top: `${value.y * 100}%`, width: `${value.width * 100}%`, height: `${value.height * 100}%` }} />
        )}
      </div>
      <div className="flex justify-between items-center mt-1">
        <span className="text-xs text-slate-500">{value && value.width > 0 ? `x:${value.x.toFixed(2)} y:${value.y.toFixed(2)} w:${value.width.toFixed(2)} h:${value.height.toFixed(2)}` : 'No region set — whole frame is restricted'}</span>
        {value && <button type="button" className="text-xs text-slate-400 hover:text-slate-200" onClick={() => onChange(null)}>Clear</button>}
      </div>
    </div>
  );
}
