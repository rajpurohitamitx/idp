import { prisma } from '../config/db';
import { env } from '../config/env';
import { h, ok, notFound, badRequest } from '../utils/http';
import { audit } from '../utils/audit';
import { generateDeviceToken, sha256 } from '../utils/crypto';
import { deviceRegisterSchema, deviceCreateSchema, deviceUpdateSchema, heartbeatSchema, commandAckSchema } from '../validators';
import { registerDevice, recordHeartbeat } from '../services/device/deviceService';
import { getConfig } from '../config/settings';
import { nextCommandsForDevice, acknowledgeCommand } from '../services/device/commandService';

const safe = (d: any) => ({ id: d.id, deviceId: d.deviceId, name: d.name, type: d.type, location: d.location, status: d.status, firmwareVersion: d.firmwareVersion, lastHeartbeat: d.lastHeartbeat, lastCommunication: d.lastCommunication, authorized: d.authorized, createdAt: d.createdAt, updatedAt: d.updatedAt });

export const listDevices = h(async (_req, res) => ok(res, (await prisma.device.findMany({ orderBy: { createdAt: 'desc' } })).map(safe)));
export const getDevice = h(async (req, res) => {
  const d = await prisma.device.findUnique({ where: { deviceId: req.params.id } });
  if (!d) throw notFound(); ok(res, safe(d));
});

export const createDevice = h(async (req, res) => {
  const input = deviceCreateSchema.parse(req.body);
  const token = generateDeviceToken();
  const device = await prisma.device.create({ data: { deviceId: input.deviceId, name: input.name, type: input.type, location: input.location, firmwareVersion: input.firmwareVersion, config: input.config as any, tokenHash: sha256(token), authorized: true } });
  await audit(req.user!.email, 'device_create', { userId: req.user!.id, entity: 'Device', entityId: device.id });
  ok(res, { ...safe(device), deviceToken: token, warning: 'Store this token now — it will not be shown again.' }, 'Device created', 201);
});

export const updateDevice = h(async (req, res) => {
  const input = deviceUpdateSchema.parse(req.body);
  const device = await prisma.device.update({ where: { deviceId: req.params.id }, data: input as any });
  await audit(req.user!.email, 'device_update', { userId: req.user!.id, entity: 'Device', entityId: device.id });
  ok(res, safe(device), 'Device updated');
});

export const rotateDeviceToken = h(async (req, res) => {
  const token = generateDeviceToken();
  const device = await prisma.device.update({ where: { deviceId: req.params.id }, data: { tokenHash: sha256(token) } });
  await audit(req.user!.email, 'device_token_rotate', { userId: req.user!.id, entity: 'Device', entityId: device.id });
  ok(res, { deviceId: device.deviceId, deviceToken: token, warning: 'Store this token now — it will not be shown again.' }, 'Token rotated');
});

export const deleteDevice = h(async (req, res) => {
  await prisma.device.update({ where: { deviceId: req.params.id }, data: { authorized: false } });
  await audit(req.user!.email, 'device_deauthorize', { userId: req.user!.id, entity: 'Device', entityId: req.params.id });
  ok(res, {}, 'Device deauthorized');
});

export const register = h(async (req, res) => {
  const input = deviceRegisterSchema.parse(req.body);
  const { device, token, alreadyRegistered } = await registerDevice(input, env.ALLOW_DEVICE_AUTO_REGISTER);
  ok(res, { deviceId: device.deviceId, alreadyRegistered, ...(token ? { deviceToken: token, warning: 'Store this token now — it will not be shown again.' } : {}) }, alreadyRegistered ? 'Device already registered' : 'Device registered', alreadyRegistered ? 200 : 201);
});

export const heartbeat = h(async (req, res) => {
  const input = heartbeatSchema.parse(req.body);
  const device = await recordHeartbeat(input.deviceId, { firmwareVersion: input.firmwareVersion, uptimeSeconds: input.uptimeSeconds, signalStrength: input.signalStrength });
  const cfg = await getConfig();
  ok(res, { serverTime: new Date().toISOString(), nextHeartbeatSeconds: cfg.heartbeat.intervalSeconds, status: device.status });
});

export const getDeviceConfig = h(async (req, res) => {
  const device = await prisma.device.findUnique({ where: { deviceId: req.params.deviceId } });
  if (!device) throw notFound();
  const cfg = await getConfig();
  ok(res, { heartbeatIntervalSeconds: cfg.heartbeat.intervalSeconds, sensorUploadIntervalSeconds: cfg.heartbeat.sensorUploadIntervalSeconds, imageCaptureIntervalSeconds: cfg.heartbeat.imageCaptureIntervalSeconds, serverTime: new Date().toISOString(), ...(device.config as object ?? {}) });
});

export const pollCommands = h(async (req, res) => {
  if (!req.device) throw badRequest('device auth required');
  const cmds = await nextCommandsForDevice(req.device.id);
  ok(res, cmds.map((c) => ({ commandId: c.commandId, command: c.command, payload: c.payload, issuedAt: c.issuedAt, expiresAt: c.expiresAt })));
});

export const acknowledgeDeviceCommand = h(async (req, res) => {
  const input = commandAckSchema.parse(req.body);
  const cmd = await acknowledgeCommand(input);
  ok(res, { commandId: cmd.commandId, status: cmd.status });
});
