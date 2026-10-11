import { prisma } from '../config/db';
import { h, ok, notFound } from '../utils/http';
import { audit } from '../utils/audit';

export const listHazards = h(async (req, res) => {
  const { status, type, location, source } = req.query as Record<string, string | undefined>;
  const hazards = await prisma.hazard.findMany({
    where: { status: status as any, type: type as any, location: location ? { contains: location, mode: 'insensitive' } : undefined, source: source as any },
    orderBy: { lastSeenAt: 'desc' }, take: 200,
  });
  ok(res, hazards);
});
export const getHazard = h(async (req, res) => { const hz = await prisma.hazard.findUnique({ where: { hazardId: req.params.id } }); if (!hz) throw notFound(); ok(res, hz); });

export const manualHazard = h(async (req, res) => {
  const { type, severity, location, notes } = req.body;
  const hazard = await prisma.hazard.create({ data: { hazardId: `HZ-MANUAL-${Date.now()}`, type, severity, location, source: 'MANUAL', details: { notes, createdBy: req.user!.email } } });
  await audit(req.user!.email, 'manual_hazard_report', { userId: req.user!.id, entity: 'Hazard', entityId: hazard.id });
  ok(res, hazard, 'Hazard reported', 201);
});
