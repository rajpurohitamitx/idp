import { prisma } from '../config/db';
import { h, ok } from '../utils/http';
import { emit } from '../sockets';
import { audit } from '../utils/audit';
import { resolveSchema } from '../validators';

export const listAlerts = h(async (req, res) => {
  const { status, severity } = req.query as Record<string, string | undefined>;
  const alerts = await prisma.alert.findMany({ where: { status: status as any, severity: severity as any }, orderBy: { createdAt: 'desc' }, take: 200, include: { hazard: true } });
  ok(res, alerts);
});

async function transition(req: any, status: 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_ALARM', action: string) {
  const alert = await prisma.alert.update({
    where: { id: req.params.id },
    data: { status, acknowledgedBy: status === 'ACKNOWLEDGED' ? req.user.email : undefined, acknowledgedAt: status === 'ACKNOWLEDGED' ? new Date() : undefined, resolvedBy: status !== 'ACKNOWLEDGED' ? req.user.email : undefined, resolvedAt: status !== 'ACKNOWLEDGED' ? new Date() : undefined },
  });
  if (alert.hazardId) {
    const hazardStatus = status === 'FALSE_ALARM' ? 'FALSE_ALARM' : status === 'RESOLVED' ? 'RESOLVED' : 'ACKNOWLEDGED';
    await prisma.hazard.update({ where: { id: alert.hazardId }, data: { status: hazardStatus } }).catch(() => undefined);
    if (status === 'RESOLVED' || status === 'FALSE_ALARM') {
      await prisma.incident.updateMany({ where: { hazardId: alert.hazardId }, data: { status: hazardStatus, resolvedAt: new Date(), resolvedBy: req.user.email } });
      emit('incident_resolved', { hazardId: alert.hazardId, status: hazardStatus });
    }
  }
  await audit(req.user.email, action, { userId: req.user.id, entity: 'Alert', entityId: alert.id });
  emit('alert_updated', { id: alert.id, status: alert.status });
  return alert;
}

export const acknowledgeAlert = h(async (req, res) => { const a = await transition(req, 'ACKNOWLEDGED', 'alert_acknowledge'); ok(res, a, 'Alert acknowledged'); });
export const resolveAlert = h(async (req, res) => { resolveSchema.parse(req.body); const a = await transition(req, 'RESOLVED', 'alert_resolve'); ok(res, a, 'Alert resolved'); });
export const falseAlarmAlert = h(async (req, res) => { resolveSchema.parse(req.body); const a = await transition(req, 'FALSE_ALARM', 'alert_false_alarm'); ok(res, a, 'Alert marked as false alarm'); });
