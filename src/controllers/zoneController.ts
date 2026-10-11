import { prisma } from '../config/db';
import { h, ok, badRequest } from '../utils/http';
import { audit } from '../utils/audit';
import { zoneSchema, zoneUpdateSchema } from '../validators';

export const listZones = h(async (_req, res) => ok(res, await prisma.restrictedZone.findMany({ orderBy: { createdAt: 'desc' } })));
export const createZone = h(async (req, res) => {
  const input = zoneSchema.parse(req.body);
  const cam = await prisma.camera.findUnique({ where: { cameraId: input.cameraId } });
  if (!cam) throw badRequest('Unknown cameraId');
  const zone = await prisma.restrictedZone.create({ data: { name: input.name, location: input.location, cameraId: cam.id, region: input.region as any, active: input.active ?? true } });
  await audit(req.user!.email, 'zone_create', { userId: req.user!.id, entity: 'RestrictedZone', entityId: zone.id });
  ok(res, zone, 'Restricted zone created', 201);
});
export const updateZone = h(async (req, res) => {
  const input = zoneUpdateSchema.parse(req.body);
  const zone = await prisma.restrictedZone.update({ where: { id: req.params.id }, data: { ...input, region: input.region as any } });
  await audit(req.user!.email, 'zone_update', { userId: req.user!.id, entity: 'RestrictedZone', entityId: zone.id });
  ok(res, zone, 'Zone updated');
});
export const deleteZone = h(async (req, res) => {
  await prisma.restrictedZone.delete({ where: { id: req.params.id } });
  await audit(req.user!.email, 'zone_delete', { userId: req.user!.id, entity: 'RestrictedZone', entityId: req.params.id });
  ok(res, {}, 'Zone deleted');
});
