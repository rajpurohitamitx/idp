import { prisma } from '../../config/db';
import { emit } from '../../sockets';
import { notFound } from '../../utils/http';

export async function ingestAccessEvent(input: { eventId: string; deviceId: string; readerId?: string; rfidUid: string; timestamp: Date }) {
  const existing = await prisma.accessLog.findUnique({ where: { eventId: input.eventId } });
  if (existing) return { log: existing, duplicate: true };

  const worker = await prisma.worker.findUnique({ where: { rfidUid: input.rfidUid } });
  let decision: 'PENDING_PPE' | 'APPROVED' | 'DENIED' | 'UNKNOWN_CARD' | 'INACTIVE_WORKER' = 'PENDING_PPE';
  let reason: string | undefined;
  if (!worker) { decision = 'UNKNOWN_CARD'; reason = 'No worker matches this RFID card'; }
  else if (worker.status !== 'ACTIVE') { decision = 'INACTIVE_WORKER'; reason = `Worker status is ${worker.status}`; }

  const log = await prisma.accessLog.create({ data: { eventId: input.eventId, deviceId: input.deviceId, readerId: input.readerId, rfidUid: input.rfidUid, workerId: worker?.id, decision, reason, timestamp: input.timestamp } });
  emit('access_event', { eventId: log.eventId, rfidUid: input.rfidUid, worker: worker ? { employeeId: worker.employeeId, name: worker.name } : null, decision });
  return { log, duplicate: false, worker };
}

export async function getDevice(deviceId: string) {
  const d = await prisma.device.findUnique({ where: { deviceId } });
  if (!d) throw notFound(`Unknown device ${deviceId}`);
  return d;
}
