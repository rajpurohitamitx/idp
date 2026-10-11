import { prisma } from '../../config/db';
import { newId } from '../../utils/ids';
import { placeholderPng } from '../../utils/png';
import { imageStorage } from '../../utils/storage';
import { ingestReading } from '../sensor/sensorIngestService';
import { ingestAccessEvent } from '../access/accessService';
import { createHazard } from '../hazard/hazardService';
import { emit } from '../../sockets';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env';

export async function seedDemoData() {
  const admin = await prisma.user.upsert({ where: { email: 'admin@demo.industrialguardian.local' }, update: {}, create: { email: 'admin@demo.industrialguardian.local', name: 'Demo Admin', role: 'ADMIN', passwordHash: await bcrypt.hash(env.SEED_ADMIN_PASSWORD ?? 'Admin@12345', 12) } });
  await prisma.user.upsert({ where: { email: 'supervisor@demo.industrialguardian.local' }, update: {}, create: { email: 'supervisor@demo.industrialguardian.local', name: 'Demo Supervisor', role: 'SUPERVISOR', passwordHash: await bcrypt.hash(env.SEED_SUPERVISOR_PASSWORD ?? 'Super@12345', 12) } });
  await prisma.user.upsert({ where: { email: 'operator@demo.industrialguardian.local' }, update: {}, create: { email: 'operator@demo.industrialguardian.local', name: 'Demo Operator', role: 'OPERATOR', passwordHash: await bcrypt.hash(env.SEED_OPERATOR_PASSWORD ?? 'Oper@12345', 12) } });

  const device = await prisma.device.upsert({ where: { deviceId: 'DEMO-ESP32-001' }, update: {}, create: { deviceId: 'DEMO-ESP32-001', name: 'Demo Safety Controller', type: 'SENSOR_CONTROLLER', location: 'Production Floor A', status: 'ONLINE', lastHeartbeat: new Date(), isDemo: true } });
  const camera = await prisma.camera.upsert({ where: { cameraId: 'DEMO-CAMERA-04' }, update: {}, create: { cameraId: 'DEMO-CAMERA-04', name: 'Camera 04', location: 'Production Floor A', status: 'ONLINE', deviceId: device.id, isDemo: true, lastHeartbeat: new Date() } });
  const entryCamera = await prisma.camera.upsert({ where: { cameraId: 'DEMO-CAMERA-ENTRY' }, update: {}, create: { cameraId: 'DEMO-CAMERA-ENTRY', name: 'Entry Gate Camera', location: 'Main Entrance', status: 'ONLINE', deviceId: device.id, isEntryCamera: true, isDemo: true, lastHeartbeat: new Date() } });
  const gas = await prisma.sensor.upsert({ where: { sensorId: 'DEMO-GAS-01' }, update: {}, create: { sensorId: 'DEMO-GAS-01', name: 'Gas Sensor 01', type: 'GAS', unit: 'ppm', location: 'Chemical Area', warningThreshold: 40, criticalThreshold: 70, deviceId: device.id, status: 'ONLINE', isDemo: true } });
  const temp = await prisma.sensor.upsert({ where: { sensorId: 'DEMO-TEMP-01' }, update: {}, create: { sensorId: 'DEMO-TEMP-01', name: 'Temperature Sensor 01', type: 'TEMPERATURE', unit: 'C', location: 'Production Floor A', warningThreshold: 45, criticalThreshold: 60, deviceId: device.id, status: 'ONLINE', isDemo: true } });
  const elec = await prisma.sensor.upsert({ where: { sensorId: 'DEMO-ELEC-01' }, update: {}, create: { sensorId: 'DEMO-ELEC-01', name: 'Electrical Monitor 01', type: 'ELECTRICAL', unit: 'A', location: 'Panel Room', warningThreshold: 15, criticalThreshold: 25, rateOfChangeLimit: 10, deviceId: device.id, status: 'ONLINE', isDemo: true } });
  await prisma.sensor.upsert({ where: { sensorId: 'DEMO-SMOKE-01' }, update: {}, create: { sensorId: 'DEMO-SMOKE-01', name: 'Smoke Sensor 01', type: 'SMOKE', unit: 'pct_obscuration', location: 'Production Floor A', warningThreshold: 20, criticalThreshold: 40, deviceId: device.id, status: 'ONLINE', isDemo: true } });

  const worker = await prisma.worker.upsert({ where: { employeeId: 'DEMO-EMP-001' }, update: {}, create: { employeeId: 'DEMO-EMP-001', name: 'Demo Worker', department: 'Production', designation: 'Technician', rfidUid: 'DEMOA1B2C3', isDemo: true } });
  await prisma.restrictedZone.create({ data: { name: 'Chemical Storage', location: 'Chemical Area', cameraId: camera.id, active: true, isDemo: true } }).catch(() => undefined);

  const base = Date.now() - 20 * 60_000;
  const series = [30, 31, 31, 32, 31, 30, 31, 32];
  for (let i = 0; i < series.length; i++) {
    await ingestReading('DEMO-ESP32-001', { eventId: `DEMO-SEED-TEMP-${i}`, sensorId: 'DEMO-TEMP-01', value: series[i], unit: 'C', timestamp: new Date(base + i * 90_000) }).catch(() => undefined);
  }

  return { admin: { email: admin.email }, device: device.deviceId, cameras: [camera.cameraId, entryCamera.cameraId], sensors: [gas.sensorId, temp.sensorId, elec.sensorId], worker: worker.employeeId };
}

export async function simulatePpeViolation() {
  const camera = await prisma.camera.findFirst({ where: { cameraId: 'DEMO-CAMERA-04' } });
  if (!camera) throw new Error('Run seed first (POST /api/demo/seed)');
  const imageId = newId('IMG');
  const buf = placeholderPng(640, 480, [70, 60, 55]);
  const storagePath = await imageStorage.save(`${imageId}.png`, buf);
  const image = await prisma.image.create({ data: { imageId, cameraId: camera.id, storagePath, mimeType: 'image/png', sizeBytes: buf.length, location: camera.location, capturedAt: new Date(), status: 'COMPLETE', isDemo: true } });
  const detections = [
    { type: 'PERSON', confidence: 0.97, boundingBox: { x: 120, y: 80, width: 220, height: 420 } },
    { type: 'NO_HELMET', confidence: 0.93, boundingBox: { x: 140, y: 90, width: 80, height: 70 } },
  ];
  await prisma.imageAnalysis.create({ data: { analysisId: newId('AN'), imageId: image.id, modelName: 'demo-simulator', modelVersion: '0.0.0-demo', aiProcessingMs: 180, detections: detections as any, overallResult: 'VIOLATION', confidence: 0.93 } });
  await prisma.pPECheck.create({ data: { imageId: image.id, cameraId: camera.cameraId, purpose: 'MONITORING', result: 'VIOLATION', items: { helmet: 'MISSING', vest: 'PRESENT', gloves: 'PRESENT', shoes: 'PRESENT' } as any, isDemo: true } });
  emit('image_analysis_complete', { imageId, cameraId: camera.cameraId, location: camera.location, detections, overallResult: 'VIOLATION', isDemo: true });
  const { hazard, alert, incident } = await createHazard({ type: 'NO_HELMET', severity: 'HIGH', location: camera.location, source: 'CAMERA', cameraId: camera.id, imageId: image.id, confidence: 0.93, details: { isDemo: true } });
  return { imageId, hazard, alert, incident };
}

export async function simulateSmokeAndGasFusion() {
  const smoke = await prisma.sensor.findFirst({ where: { sensorId: 'DEMO-SMOKE-01' } });
  const camera = await prisma.camera.findFirst({ where: { cameraId: 'DEMO-CAMERA-04' } });
  if (!smoke || !camera) throw new Error('Run seed first (POST /api/demo/seed)');
  await ingestReading('DEMO-ESP32-001', { eventId: newId('DEMOEVT'), sensorId: 'DEMO-SMOKE-01', value: 25, unit: 'pct_obscuration', timestamp: new Date(Date.now() - 2000) });
  const sensorResult = await ingestReading('DEMO-ESP32-001', { eventId: newId('DEMOEVT'), sensorId: 'DEMO-SMOKE-01', value: 45, unit: 'pct_obscuration', timestamp: new Date() });
  const imageId = newId('IMG');
  const buf = placeholderPng(640, 480, [90, 85, 80]);
  const storagePath = await imageStorage.save(`${imageId}.png`, buf);
  const image = await prisma.image.create({ data: { imageId, cameraId: camera.id, storagePath, mimeType: 'image/png', sizeBytes: buf.length, location: camera.location, capturedAt: new Date(), status: 'COMPLETE', isDemo: true } });
  const result = await createHazard({ type: 'SMOKE', severity: 'HIGH', location: camera.location, source: 'CAMERA', cameraId: camera.id, imageId: image.id, confidence: 0.91, details: { isDemo: true } });
  return { sensorHazard: 'hazard' in sensorResult ? sensorResult.hazard : null, cameraResult: result };
}

export async function simulateAccessAndEntry() {
  const worker = await prisma.worker.findFirst({ where: { employeeId: 'DEMO-EMP-001' } });
  if (!worker) throw new Error('Run seed first (POST /api/demo/seed)');
  const access = await ingestAccessEvent({ eventId: newId('DEMOEVT'), deviceId: 'DEMO-ESP32-001', readerId: 'DEMO-RFID-001', rfidUid: worker.rfidUid!, timestamp: new Date() });
  return access;
}

export async function simulateDeviceHeartbeat() {
  const device = await prisma.device.update({ where: { deviceId: 'DEMO-ESP32-001' }, data: { status: 'ONLINE', lastHeartbeat: new Date() } });
  emit('device_status', { deviceId: device.deviceId, status: 'ONLINE', isDemo: true });
  return { deviceId: device.deviceId, status: device.status };
}
