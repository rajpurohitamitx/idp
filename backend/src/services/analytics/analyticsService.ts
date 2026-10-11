import { prisma } from '../../config/db';

export function rangeToDates(range: string, from?: string, to?: string) {
  const now = new Date();
  if (range === 'custom' && from) return { gte: new Date(from), lte: to ? new Date(to) : now };
  if (range === 'today') { const d = new Date(now); d.setHours(0, 0, 0, 0); return { gte: d, lte: now }; }
  const days = range === '30d' ? 30 : 7;
  return { gte: new Date(now.getTime() - days * 86400_000), lte: now };
}

export async function safetyAnalytics(window: { gte: Date; lte: Date }) {
  const [total, active, resolved, falseAlarms, resolvedIncidents] = await Promise.all([
    prisma.incident.count({ where: { detectedAt: window } }),
    prisma.incident.count({ where: { detectedAt: window, status: { in: ['OPEN', 'ACKNOWLEDGED'] } } }),
    prisma.incident.count({ where: { detectedAt: window, status: 'RESOLVED' } }),
    prisma.incident.count({ where: { detectedAt: window, status: 'FALSE_ALARM' } }),
    prisma.incident.findMany({ where: { detectedAt: window, status: 'RESOLVED', resolvedAt: { not: null } }, select: { detectedAt: true, resolvedAt: true } }),
  ]);
  const avgResponseMs = resolvedIncidents.length
    ? resolvedIncidents.reduce((s, i) => s + (i.resolvedAt!.getTime() - i.detectedAt.getTime()), 0) / resolvedIncidents.length
    : null;
  return { totalIncidents: total, activeIncidents: active, resolvedIncidents: resolved, falseAlarms, averageResponseSeconds: avgResponseMs != null ? Math.round(avgResponseMs / 1000) : null };
}

export async function ppeAnalytics(window: { gte: Date; lte: Date }) {
  const checks = await prisma.pPECheck.findMany({ where: { createdAt: window }, select: { items: true, result: true } });
  const counts = { helmet: 0, vest: 0, gloves: 0, shoes: 0, total: 0 };
  const present = { helmet: 0, vest: 0, gloves: 0, shoes: 0 };
  for (const c of checks) {
    const items = c.items as any; if (!items) continue;
    counts.total++;
    for (const k of ['helmet', 'vest', 'gloves', 'shoes'] as const) { if (items[k] && items[k] !== 'UNKNOWN') { counts[k]++; if (items[k] === 'PRESENT') present[k]++; } }
  }
  const pct = (p: number, c: number) => (c ? Math.round((p / c) * 100) : null);
  const overallCompliant = checks.filter((c) => c.result === 'COMPLIANT').length;
  return {
    helmetCompliance: pct(present.helmet, counts.helmet), vestCompliance: pct(present.vest, counts.vest),
    gloveCompliance: pct(present.gloves, counts.gloves), shoeCompliance: pct(present.shoes, counts.shoes),
    overallCompliance: pct(overallCompliant, checks.length),
  };
}

export async function hazardAnalytics(window: { gte: Date; lte: Date }) {
  const rows = await prisma.hazard.groupBy({ by: ['type'], where: { createdAt: window }, _count: { _all: true } });
  const out: Record<string, number> = {};
  for (const r of rows) out[r.type] = r._count._all;
  return out;
}

export async function deviceHealthAnalytics() {
  const [camOnline, camOffline, senOnline, senOffline, deviceFailures] = await Promise.all([
    prisma.camera.count({ where: { status: 'ONLINE' } }), prisma.camera.count({ where: { status: 'OFFLINE' } }),
    prisma.sensor.count({ where: { status: 'ONLINE' } }), prisma.sensor.count({ where: { status: 'OFFLINE' } }),
    prisma.alert.count({ where: { kind: 'DEVICE_OFFLINE', createdAt: { gte: new Date(Date.now() - 30 * 86400_000) } } }),
  ]);
  return { onlineCameras: camOnline, offlineCameras: camOffline, onlineSensors: senOnline, offlineSensors: senOffline, deviceFailures30d: deviceFailures };
}

export async function dashboardSnapshot() {
  const [activeAlerts, activeHazards, onlineCameras, onlineSensors, onlineDevices, workers, latestImage, latestReadings] = await Promise.all([
    prisma.alert.count({ where: { status: 'OPEN' } }),
    prisma.hazard.count({ where: { status: 'ACTIVE' } }),
    prisma.camera.count({ where: { status: 'ONLINE' } }),
    prisma.sensor.count({ where: { status: 'ONLINE' } }),
    prisma.device.count({ where: { status: 'ONLINE' } }),
    prisma.worker.count({ where: { status: 'ACTIVE' } }),
    prisma.image.findFirst({ orderBy: { capturedAt: 'desc' }, include: { analysis: true, camera: true } }),
    prisma.sensorReading.findMany({ orderBy: { timestamp: 'desc' }, take: 10, include: { sensor: true } }),
  ]);
  const ppe = await ppeAnalytics({ gte: new Date(Date.now() - 86400_000), lte: new Date() });
  return { activeAlerts, activeHazards, onlineCameras, onlineSensors, onlineDevices, workersMonitored: workers, ppeCompliance: ppe.overallCompliance, latestImage, latestReadings };
}
