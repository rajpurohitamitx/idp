import { prisma } from '../../config/db';
import { newId } from '../../utils/ids';
import { getConfig } from '../../config/settings';
import { notFound, badRequest } from '../../utils/http';
import type { CommandStatus } from '@prisma/client';

export async function issueCaptureCommand(cameraId: string) {
  const camera = await prisma.camera.findUnique({ where: { cameraId }, include: { device: true } });
  if (!camera) throw notFound(`Unknown camera ${cameraId}`);
  if (!camera.deviceId) throw badRequest('Camera has no controlling device to send the command to');
  const cfg = await getConfig();
  const cmd = await prisma.deviceCommand.create({
    data: { commandId: newId('CMD'), deviceId: camera.deviceId, command: 'CAPTURE_IMAGE', payload: { cameraId }, status: 'QUEUED', expiresAt: new Date(Date.now() + cfg.commands.ttlSeconds * 1000) },
  });
  return cmd;
}

export async function nextCommandsForDevice(deviceDbId: string) {
  const now = new Date();
  await prisma.deviceCommand.updateMany({ where: { deviceId: deviceDbId, status: { in: ['QUEUED', 'SENT'] }, expiresAt: { lt: now } }, data: { status: 'EXPIRED' } });
  const pending = await prisma.deviceCommand.findMany({ where: { deviceId: deviceDbId, status: 'QUEUED' }, orderBy: { issuedAt: 'asc' } });
  if (pending.length) await prisma.deviceCommand.updateMany({ where: { id: { in: pending.map((p) => p.id) } }, data: { status: 'SENT' } });
  return pending;
}

export async function acknowledgeCommand(input: { commandId: string; deviceId: string; status: CommandStatus; result?: unknown }) {
  const cmd = await prisma.deviceCommand.findUnique({ where: { commandId: input.commandId } });
  if (!cmd) throw notFound(`Unknown command ${input.commandId}`);
  return prisma.deviceCommand.update({ where: { id: cmd.id }, data: { status: input.status, result: input.result as any } });
}
