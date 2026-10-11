import type { ReadingLevel, HazardType, SensorType } from '../../types';

export interface ThresholdCfg {
  warningThreshold?: number | null;
  criticalThreshold?: number | null;
  lowWarningThreshold?: number | null;
}

export function evaluateThreshold(value: number, cfg: ThresholdCfg): 'NORMAL' | 'WARNING' | 'CRITICAL' {
  const { warningThreshold: w, criticalThreshold: c, lowWarningThreshold: low } = cfg;
  if (c != null && value >= c) return 'CRITICAL';
  if (w != null && value >= w) return 'WARNING';
  if (low != null && value <= low) return 'WARNING';
  return 'NORMAL';
}

export function isPersistent(levels: ReadingLevel[], required: number): boolean {
  if (required <= 1) return levels.length > 0 && levels[levels.length - 1] !== 'NORMAL';
  if (levels.length < required) return false;
  return levels.slice(-required).every((l) => l !== 'NORMAL');
}

export function hazardTypeForSensor(type: SensorType, level: ReadingLevel): HazardType {
  if (level === 'ANOMALY' && (type === 'TEMPERATURE' || type === 'THERMAL')) return 'THERMAL_ANOMALY';
  switch (type) {
    case 'GAS': return 'GAS_LEAK';
    case 'SMOKE': return 'SMOKE';
    case 'TEMPERATURE': return 'HIGH_TEMPERATURE';
    case 'THERMAL': return 'THERMAL_ANOMALY';
    case 'ELECTRICAL': return 'ELECTRICAL_ANOMALY';
    default: return 'OTHER';
  }
}

export function summarizeThermalGrid(values: number[]): { max: number; avg: number } | null {
  const v = values.filter((n) => Number.isFinite(n));
  if (!v.length) return null;
  return { max: Math.max(...v), avg: v.reduce((a, b) => a + b, 0) / v.length };
}
