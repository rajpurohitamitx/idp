import { prisma } from '../../config/db';
import { generateDeviceToken, sha256 } from '../../utils/crypto';
import { emit } from '../../sockets';
import { getConfig } from '../../config/settings';
import { conflict, notFound } from '../../utils/http';
import type { DeviceType } from '@prisma/client';

export async function registerDevice(input: { deviceId: string; deviceType: DeviceType; deviceName: string; locationId: string; firmwareVersion?: string }, autoRegister: boolean) {
  const existing = await prisma.device.findUnique({ where: { deviceId: input.deviceId } });
  if (existing) return { device: existing, token: null as string | null, alreadyRegistered: true };
  if (!autoRegister) throw conflict('Device is not pre-authorized. An admin must create it via POST /api/devices before it can register.');
  const token = generateDeviceToken();
  const device = await prisma.device.create({
    data: { deviceId: input.deviceId, type: input.deviceType, name: input.deviceName, location: input.locationId, firmwareVersion: input.firmwareVersion, tokenHash: sha256(token), authorized: true },
  });
  return { device, token, alreadyRegistered: false };
}

export async function issueDeviceToken(deviceDbId: string) {
  const token = generateDeviceToken();
  const device = await prisma.device.update({ where: { id: deviceDbId }, data: { tokenHash: sha256(token) } });
  return { device, token };
}

export async function recordHeartbeat(deviceId: string, data: { firmwareVersion?: string; uptimeSeconds?: number; signalStrength?: number }) {
  const device = await prisma.device.findUnique({ where: { deviceId } });
  if (!device) throw notFound(`Unknown device ${deviceId}`);
  const wasOffline = device.status === 'OFFLINE';
  const updated = await prisma.device.update({
    where: { id: device.id },
    data: { status: 'ONLINE', lastHeartbeat: new Date(), lastCommunication: new Date(), firmwareVersion: data.firmwareVersion ?? device.firmwareVersion, uptimeSeconds: data.uptimeSeconds, signalStrength: data.signalStrength },
  });
  await prisma.camera.updateMany({ where: { deviceId: device.id, status: 'OFFLINE' }, data: { status: 'ONLINE', lastHeartbeat: new Date() } });
  await prisma.sensor.updateMany({ where: { deviceId: device.id, status: 'OFFLINE' }, data: { status: 'ONLINE' } });
  emit('device_status', { deviceId, status: 'ONLINE' });
  if (wasOffline) emit('new_alert', { kind: 'DEVICE_ONLINE', deviceId, message: `${deviceId} back online` });
  return updated;
}

export async function sweepOfflineDevices() {
  const cfg = await getConfig();
  const cutoff = new Date(Date.now() - cfg.heartbeat.timeoutSeconds * 1000);
  const stale = await prisma.device.findMany({ where: { status: 'ONLINE', OR: [{ lastHeartbeat: { lt: cutoff } }, { lastHeartbeat: null, createdAt: { lt: cutoff } }] } });
  for (const d of stale) {
    await prisma.device.update({ where: { id: d.id }, data: { status: 'OFFLINE' } });
    await prisma.camera.updateMany({ where: { deviceId: d.id }, data: { status: 'OFFLINE' } });
    await prisma.sensor.updateMany({ where: { deviceId: d.id }, data: { status: 'OFFLINE' } });
    emit('device_status', { deviceId: d.deviceId, status: 'OFFLINE' });
    await prisma.alert.create({ data: { kind: 'DEVICE_OFFLINE', title: `${d.name} offline`, message: `No heartbeat received within ${cfg.heartbeat.timeoutSeconds}s`, severity: 'MEDIUM', deviceId: d.deviceId, location: d.location } });
    emit('new_alert', { kind: 'DEVICE_OFFLINE', deviceId: d.deviceId, location: d.location });
  }
  const staleCams = await prisma.camera.findMany({ where: { status: 'ONLINE', lastHeartbeat: { lt: cutoff } } });
  for (const c of staleCams) {
    await prisma.camera.update({ where: { id: c.id }, data: { status: 'OFFLINE' } });
    emit('camera_status', { cameraId: c.cameraId, status: 'OFFLINE' });
    await prisma.alert.create({ data: { kind: 'DEVICE_OFFLINE', title: `Camera ${c.name} offline`, message: 'No heartbeat received', severity: 'MEDIUM', location: c.location } });
    emit('new_alert', { kind: 'DEVICE_OFFLINE', cameraId: c.cameraId, location: c.location });
  }
  return { devices: stale.length, cameras: staleCams.length };
}
