import { prisma } from '../config/db';
import { h, ok, notFound } from '../utils/http';
import { audit } from '../utils/audit';
import { newId } from '../utils/ids';
import { incidentCreateSchema, incidentUpdateSchema, resolveSchema } from '../validators';

export const listIncidents = h(async (req, res) => {
  const { status, severity, location, from, to } = req.query as Record<string, string | undefined>;
  const incidents = await prisma.incident.findMany({
    where: { status: status as any, severity: severity as any, location: location ? { contains: location, mode: 'insensitive' } : undefined, detectedAt: from || to ? { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } : undefined },
    orderBy: { detectedAt: 'desc' }, take: 200,
  });
  ok(res, incidents);
});
export const getIncident = h(async (req, res) => { const i = await prisma.incident.findUnique({ where: { incidentId: req.params.id }, include: { hazard: true } }); if (!i) throw notFound(); ok(res, i); });

export const createIncident = h(async (req, res) => {
  const input = incidentCreateSchema.parse(req.body);
  const hazard = await prisma.hazard.create({ data: { hazardId: newId('HZ'), type: input.type, severity: input.severity, location: input.location, source: 'MANUAL', details: { notes: input.notes } } });
  const incident = await prisma.incident.create({ data: { incidentId: newId('INC'), hazardId: hazard.id, severity: input.severity, location: input.location, source: 'MANUAL', notes: input.notes, detectedAt: new Date() } });
  await audit(req.user!.email, 'incident_create', { userId: req.user!.id, entity: 'Incident', entityId: incident.id });
  ok(res, incident, 'Incident created', 201);
});
export const updateIncident = h(async (req, res) => {
  const input = incidentUpdateSchema.parse(req.body);
  const incident = await prisma.incident.update({ where: { incidentId: req.params.id }, data: input });
  ok(res, incident, 'Incident updated');
});
export const resolveIncident = h(async (req, res) => {
  const input = resolveSchema.parse(req.body);
  const incident = await prisma.incident.update({ where: { incidentId: req.params.id }, data: { status: 'RESOLVED', resolvedAt: new Date(), resolvedBy: req.user!.email, notes: input.notes } });
  await prisma.hazard.update({ where: { id: incident.hazardId }, data: { status: 'RESOLVED' } }).catch(() => undefined);
  await audit(req.user!.email, 'incident_resolve', { userId: req.user!.id, entity: 'Incident', entityId: incident.id });
  ok(res, incident, 'Incident resolved');
});
