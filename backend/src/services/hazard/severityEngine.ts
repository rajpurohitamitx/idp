import type { HazardType, ReadingLevel, Severity, SystemConfig } from '../../types';

const ORDER: Severity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const severityRank = (s: Severity) => ORDER.indexOf(s);
export const escalate = (s: Severity, steps = 1): Severity => ORDER[Math.max(0, Math.min(ORDER.length - 1, severityRank(s) + steps))];
export const maxSeverity = (a: Severity, b: Severity): Severity => (severityRank(a) >= severityRank(b) ? a : b);

export function severityForCamera(type: HazardType, confidence: number, cfg: SystemConfig['severity']): Severity {
  const base = cfg.cameraBase[type] ?? 'LOW';
  return confidence < cfg.lowConfidenceBelow ? escalate(base, -1) : base;
}

export function severityForSensor(
  level: ReadingLevel, value: number | null, criticalThreshold: number | null | undefined, cfg: SystemConfig['severity'],
): Severity {
  if (level === 'CRITICAL') {
    if (value != null && criticalThreshold != null && criticalThreshold > 0 && value >= criticalThreshold * cfg.criticalMultiplier) return 'CRITICAL';
    return cfg.sensorCritical;
  }
  if (level === 'WARNING') return cfg.sensorWarning;
  if (level === 'ANOMALY') return cfg.sensorAnomaly;
  return 'LOW';
}

export function severityForFusion(a: Severity, b: Severity): Severity {
  const top = maxSeverity(a, b);
  const escalated = escalate(top, 1);
  return severityRank(escalated) < severityRank('HIGH') ? 'HIGH' : escalated;
}
