import { prisma } from '../../config/db';
import { emit } from '../../sockets';
import { getConfig } from '../../config/settings';
import { evaluateThreshold, isPersistent, hazardTypeForSensor, summarizeThermalGrid } from './thresholdEngine';
import { detectAnomaly, type Sample } from './anomalyEngine';
import { severityForSensor } from '../hazard/severityEngine';
import { createHazard } from '../hazard/hazardService';
import { badRequest, notFound } from '../../utils/http';
import type { ReadingLevel } from '../../types';

const lastHazardAt = new Map<string, number>();

export interface IncomingReading { eventId?: string; sensorId: string; value?: number; unit?: string; timestamp: Date; grid?: { rows: number; columns: number; values: number[] } }

export async function ingestReading(deviceId: string | null, r: IncomingReading) {
  const sensor = await prisma.sensor.findUnique({ where: { sensorId: r.sensorId } });
  if (!sensor) throw notFound(`Unknown sensor ${r.sensorId}`);

  let value = r.value ?? null;
  if (value == null && r.grid) {
    const sum = summarizeThermalGrid(r.grid.values);
    if (!sum) throw badRequest('grid contained no finite values');
    value = sum.max;
  }
  if (value == null) throw badRequest('reading requires value or grid');

  const eventId = r.eventId ?? `${r.sensorId}-${r.timestamp.getTime()}`;
  const existing = await prisma.sensorReading.findUnique({ where: { eventId } });
  if (existing) return { reading: existing, duplicate: true };

  const cfg = await getConfig();
  const thresholdLevel = evaluateThreshold(value, sensor);

  const historyRows = await prisma.sensorReading.findMany({ where: { sensorId: sensor.id }, orderBy: { timestamp: 'desc' }, take: cfg.sensor.anomalyHistorySize });
  const history: Sample[] = historyRows.reverse().filter((h) => h.value != null).map((h) => ({ value: h.value as number, t: h.timestamp.getTime() }));
  const recentLevels: ReadingLevel[] = historyRows.map((h) => h.level as ReadingLevel);

  let level: ReadingLevel = thresholdLevel;
  let anomalyInfo: ReturnType<typeof detectAnomaly> | null = null;
  if (level === 'NORMAL' && cfg.sensor.anomalyEnabled) {
    anomalyInfo = detectAnomaly(history, { value, t: r.timestamp.getTime() }, {
      rateLimitPerMin: sensor.rateOfChangeLimit, modifiedZ: cfg.sensor.anomalyModifiedZ, minSamples: cfg.sensor.anomalyMinSamples, minMad: cfg.sensor.anomalyMinMad,
    });
    if (anomalyInfo.anomalous) level = 'ANOMALY';
  }

  const reading = await prisma.sensorReading.create({
    data: { eventId, sensorId: sensor.id, value, unit: r.unit ?? sensor.unit, grid: r.grid as any, timestamp: r.timestamp, level },
  });
  await prisma.sensor.update({ where: { id: sensor.id }, data: { status: 'ONLINE', lastReadingAt: r.timestamp, lastValue: value } });
  emit('sensor_update', { sensorId: sensor.sensorId, value, unit: reading.unit, level, timestamp: r.timestamp });

  if (level === 'NORMAL') return { reading, duplicate: false };

  const required = level === 'CRITICAL' && cfg.sensor.criticalBypassesPersistence ? 1 : (sensor.requiredAbnormalReadings || cfg.sensor.defaultRequiredAbnormalReadings);
  const persistent = isPersistent([...recentLevels, level], required);
  if (!persistent) return { reading, duplicate: false, persistent: false };

  const cooldownMs = cfg.sensor.cooldownSeconds * 1000;
  const last = lastHazardAt.get(sensor.sensorId) ?? 0;
  if (Date.now() - last < cooldownMs) return { reading, duplicate: false, persistent: true, suppressed: 'cooldown' };
  lastHazardAt.set(sensor.sensorId, Date.now());

  const hazardType = hazardTypeForSensor(sensor.type, level);
  const severity = severityForSensor(level, value, sensor.criticalThreshold, cfg.severity);
  const { hazard, alert, incident, fused } = await createHazard({
    type: hazardType, severity, location: sensor.location, source: 'SENSOR', sensorId: sensor.id, confidence: level === 'ANOMALY' ? 0.75 : 0.95,
    details: { value, unit: reading.unit, warningThreshold: sensor.warningThreshold, criticalThreshold: sensor.criticalThreshold, level, anomaly: anomalyInfo },
  });
  return { reading, duplicate: false, persistent: true, hazard, alert, incident, fused };
}

export async function ingestBatch(deviceId: string, readings: IncomingReading[]) {
  let accepted = 0; let rejected = 0; const errors: Array<{ eventId?: string; error: string }> = [];
  for (const r of readings) {
    try { await ingestReading(deviceId, r); accepted++; }
    catch (e: any) { rejected++; errors.push({ eventId: r.eventId, error: e.message ?? 'unknown error' }); }
  }
  return { accepted, rejected, errors };
}
