import { prisma } from '../config/db';
import { h, ok } from '../utils/http';
import { accessEventSchema } from '../validators';
import { ingestAccessEvent } from '../services/access/accessService';

export const postAccessEvent = h(async (req, res) => {
  const input = accessEventSchema.parse(req.body);
  const { log, duplicate, worker } = await ingestAccessEvent(input);
  ok(res, { eventId: log.eventId, decision: log.decision, worker: worker ? { employeeId: worker.employeeId, name: worker.name } : null, duplicate }, 'Access event recorded', duplicate ? 200 : 201);
});

export const listAccessLogs = h(async (req, res) => {
  const take = Math.min(Number(req.query.limit) || 100, 500);
  const logs = await prisma.accessLog.findMany({ orderBy: { timestamp: 'desc' }, take, include: { worker: true } });
  ok(res, logs.map((l) => ({ id: l.id, eventId: l.eventId, rfidUid: l.rfidUid, worker: l.worker ? { employeeId: l.worker.employeeId, name: l.worker.name } : null, decision: l.decision, reason: l.reason, timestamp: l.timestamp })));
});
