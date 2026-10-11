import type { HazardSource, HazardType, Severity, SystemConfig } from '../../types';

export interface FusionEvent {
  id: string;
  source: Extract<HazardSource, 'CAMERA' | 'SENSOR'>;
  type: HazardType;
  location: string;
  timestampMs: number;
  confidence?: number | null;
  severity: Severity;
}

const norm = (s: string) => s.trim().toLowerCase();

export function findCorrelations(
  evt: FusionEvent, candidates: FusionEvent[], cfg: SystemConfig['fusion'],
): FusionEvent[] {
  const related = cfg.relatedTypes[evt.type] ?? [];
  const windowMs = cfg.correlationWindowSeconds * 1000;
  return candidates
    .filter((c) =>
      c.id !== evt.id &&
      c.source !== evt.source &&
      norm(c.location) === norm(evt.location) &&
      (related.includes(c.type) || (cfg.relatedTypes[c.type] ?? []).includes(evt.type)) &&
      Math.abs(c.timestampMs - evt.timestampMs) <= windowMs)
    .sort((a, b) => Math.abs(a.timestampMs - evt.timestampMs) - Math.abs(b.timestampMs - evt.timestampMs));
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
export const fuseConfidence = (a: number, b: number) => 1 - (1 - clamp01(a)) * (1 - clamp01(b));

export function fusedHazardType(camera: HazardType, sensor: HazardType): HazardType {
  if (camera === 'FIRE' || sensor === 'FIRE') return 'FIRE';
  if (camera === 'SMOKE' || sensor === 'SMOKE') return 'SMOKE';
  return camera;
}
