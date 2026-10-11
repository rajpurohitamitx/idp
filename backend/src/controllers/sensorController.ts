import { prisma } from '../config/db';
import { h, ok, notFound } from '../utils/http';
import { audit } from '../utils/audit';
import { sensorSchema, sensorUpdateSchema, readingBatchSchema, singleReadingSchema } from '../validators';
import { ingestReading, ingestBatch } from '../services/sensor/sensorIngestService';

const safe = (s: any) => ({ id: s.id, sensorId: s.sensorId, name: s.name, type: s.type, unit: s.unit, location: s.location, status: s.status, warningThreshold: s.warningThreshold, criticalThreshold: s.criticalThreshold, lowWarningThreshold: s.lowWarningThreshold, lastValue: s.lastValue, lastReadingAt: s.lastReadingAt, deviceId: s.deviceId });

export const listSensors = h(async (_req, res) => ok(res, (await prisma.sensor.findMany({ orderBy: { createdAt: 'desc' } })).map(safe)));
export const getSensor = h(async (req, res) => {
  const s = await prisma.sensor.findUnique({ where: { sensorId: req.params.id } });
  if (!s) throw notFound();
  const history = await prisma.sensorReading.findMany({ where: { sensorId: s.id }, orderBy: { timestamp: 'desc' }, take: 200 });
  ok(res, { ...safe(s), history: history.reverse() });
});
export const createSensor = h(async (req, res) => {
  const input = sensorSchema.parse(req.body);
  let deviceDbId: string | undefined;
  if (input.deviceId) { const d = await prisma.device.findUnique({ where: { deviceId: input.deviceId } }); deviceDbId = d?.id; }
  const sensor = await prisma.sensor.create({ data: { ...input, deviceId: deviceDbId } as any });
  await audit(req.user!.email, 'sensor_create', { userId: req.user!.id, entity: 'Sensor', entityId: sensor.id });
  ok(res, safe(sensor), 'Sensor created', 201);
});
export const updateSensor = h(async (req, res) => {
  const input = sensorUpdateSchema.parse(req.body);
  const sensor = await prisma.sensor.update({ where: { sensorId: req.params.id }, data: input as any });
  await audit(req.user!.email, 'sensor_config_change', { userId: req.user!.id, entity: 'Sensor', entityId: sensor.id, meta: input });
  ok(res, safe(sensor), 'Sensor updated');
});
export const deleteSensor = h(async (req, res) => {
  await prisma.sensor.delete({ where: { sensorId: req.params.id } });
  await audit(req.user!.email, 'sensor_delete', { userId: req.user!.id, entity: 'Sensor', entityId: req.params.id });
  ok(res, {}, 'Sensor deleted');
});

export const postReading = h(async (req, res) => {
  const input = singleReadingSchema.parse(req.body);
  const result = await ingestReading(req.device?.deviceId ?? null, { ...input, sensorId: req.params.id, timestamp: input.timestamp ?? new Date(), eventId: input.eventId });
  ok(res, { accepted: !result.duplicate ? 1 : 0, duplicate: result.duplicate, hazardCreated: !!('hazard' in result && result.hazard) }, 'Reading recorded', 201);
});

export const postBatch = h(async (req, res) => {
  const input = readingBatchSchema.parse(req.body);
  const result = await ingestBatch(input.deviceId, input.readings);
  ok(res, result, 'Batch processed', 201);
});

export const sensorHeartbeat = h(async (req, res) => {
  const sensor = await prisma.sensor.update({ where: { sensorId: req.params.id }, data: { status: 'ONLINE' } });
  ok(res, { status: sensor.status });
});
