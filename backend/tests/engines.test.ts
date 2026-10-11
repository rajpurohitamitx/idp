import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG } from '../src/config/defaults';
import { evaluateThreshold, isPersistent, hazardTypeForSensor } from '../src/services/sensor/thresholdEngine';
import { detectAnomaly } from '../src/services/sensor/anomalyEngine';
import { ConsecutiveTracker } from '../src/services/camera/consecutiveTracker';
import { severityForCamera, severityForSensor, severityForFusion } from '../src/services/hazard/severityEngine';
import { findCorrelations, fuseConfidence, fusedHazardType } from '../src/services/fusion/fusionEngine';

describe('threshold analysis', () => {
  const cfg = { warningThreshold: 40, criticalThreshold: 70 };
  it('classifies against configured limits', () => {
    expect(evaluateThreshold(10, cfg)).toBe('NORMAL');
    expect(evaluateThreshold(40, cfg)).toBe('WARNING');
    expect(evaluateThreshold(82.5, cfg)).toBe('CRITICAL');
  });
  it('supports low-side limit', () => {
    expect(evaluateThreshold(9, { lowWarningThreshold: 10 })).toBe('WARNING');
  });
  it('requires persistence', () => {
    expect(isPersistent(['NORMAL', 'WARNING'], 2)).toBe(false);
    expect(isPersistent(['WARNING', 'CRITICAL'], 2)).toBe(true);
  });
  it('maps sensor types to hazards', () => {
    expect(hazardTypeForSensor('GAS', 'CRITICAL')).toBe('GAS_LEAK');
    expect(hazardTypeForSensor('TEMPERATURE', 'ANOMALY')).toBe('THERMAL_ANOMALY');
  });
});

describe('anomaly detection', () => {
  const opts = { modifiedZ: 6, minSamples: 5, minMad: 0.5, rateLimitPerMin: null };
  const series = [30, 31, 31, 32, 31, 30, 31];
  const hist = series.map((value, i) => ({ value, t: i * 5000 }));
  it('does not flag normal drift', () => {
    expect(detectAnomaly(hist, { value: 32, t: 35000 }, opts).anomalous).toBe(false);
  });
  it('flags a sudden jump (30,31,31,32 -> 45)', () => {
    expect(detectAnomaly(hist, { value: 45, t: 35000 }, opts).anomalous).toBe(true);
  });
  it('flags the continuing climb (47, 49) even after 45 entered history', () => {
    const h2 = [...hist, { value: 45, t: 35000 }];
    expect(detectAnomaly(h2, { value: 47, t: 40000 }, opts).anomalous).toBe(true);
  });
  it('flags rate of change when configured', () => {
    const r = detectAnomaly([{ value: 30, t: 0 }], { value: 36, t: 30000 }, { ...opts, rateLimitPerMin: 5 });
    expect(r).toMatchObject({ anomalous: true, reason: 'RATE_OF_CHANGE' });
  });
});

describe('false-positive protection', () => {
  it('confirms after N consecutive frames only', () => {
    const t = new ConsecutiveTracker();
    const k = 'CAM1:NO_HELMET';
    expect(t.update(k, true, 0.72, 0, 3, 15000).confirmed).toBe(false);
    expect(t.update(k, true, 0.81, 1000, 3, 15000).confirmed).toBe(false);
    const r = t.update(k, true, 0.9, 2000, 3, 15000);
    expect(r.confirmed).toBe(true);
    expect(r.avgConfidence).toBeCloseTo(0.81, 2);
  });
  it('resets on a clean frame or a long gap', () => {
    const t = new ConsecutiveTracker();
    t.update('k', true, 0.9, 0, 3, 15000); t.update('k', true, 0.9, 1000, 3, 15000);
    t.update('k', false, 0, 2000, 3, 15000);
    expect(t.update('k', true, 0.9, 3000, 3, 15000).streak).toBe(1);
    expect(t.update('k', true, 0.9, 60000, 3, 15000).streak).toBe(1);
  });
});

describe('severity engine', () => {
  it('uses configured camera rules and downgrades low confidence', () => {
    expect(severityForCamera('NO_HELMET', 0.93, DEFAULT_CONFIG.severity)).toBe('HIGH');
    expect(severityForCamera('NO_HELMET', 0.65, DEFAULT_CONFIG.severity)).toBe('MEDIUM');
  });
  it('scales sensor severity from thresholds', () => {
    expect(severityForSensor('WARNING', 45, 70, DEFAULT_CONFIG.severity)).toBe('MEDIUM');
    expect(severityForSensor('CRITICAL', 72, 70, DEFAULT_CONFIG.severity)).toBe('HIGH');
    expect(severityForSensor('CRITICAL', 95, 70, DEFAULT_CONFIG.severity)).toBe('CRITICAL');
  });
  it('escalates fused severity', () => {
    expect(severityForFusion('MEDIUM', 'MEDIUM')).toBe('HIGH');
    expect(severityForFusion('HIGH', 'MEDIUM')).toBe('CRITICAL');
  });
});

describe('camera + sensor fusion', () => {
  const now = Date.now();
  const cam = { id: 'c1', source: 'CAMERA' as const, type: 'SMOKE' as const, location: 'Production Floor A', timestampMs: now, confidence: 0.91, severity: 'HIGH' as const };
  const sen = { id: 's1', source: 'SENSOR' as const, type: 'GAS_LEAK' as const, location: 'production floor a', timestampMs: now - 8000, confidence: 0.9, severity: 'HIGH' as const };
  it('correlates same location, related type, inside window', () => {
    expect(findCorrelations(cam, [sen], DEFAULT_CONFIG.fusion)).toHaveLength(1);
  });
  it('rejects a different location', () => {
    expect(findCorrelations(cam, [{ ...sen, location: 'Chemical Area' }], DEFAULT_CONFIG.fusion)).toHaveLength(0);
  });
  it('rejects outside the configured window', () => {
    expect(findCorrelations(cam, [{ ...sen, timestampMs: now - 120000 }], DEFAULT_CONFIG.fusion)).toHaveLength(0);
    expect(findCorrelations(cam, [{ ...sen, timestampMs: now - 120000 }], { ...DEFAULT_CONFIG.fusion, correlationWindowSeconds: 300 })).toHaveLength(1);
  });
  it('never fuses unrelated hazard types or same-source events', () => {
    expect(findCorrelations({ ...cam, type: 'NO_HELMET' }, [sen], DEFAULT_CONFIG.fusion)).toHaveLength(0);
    expect(findCorrelations(cam, [{ ...sen, source: 'CAMERA' as const }], DEFAULT_CONFIG.fusion)).toHaveLength(0);
  });
  it('fuses confidence and type', () => {
    expect(fuseConfidence(0.91, 0.9)).toBeGreaterThan(0.98);
    expect(fusedHazardType('SMOKE', 'GAS_LEAK')).toBe('SMOKE');
  });
});
