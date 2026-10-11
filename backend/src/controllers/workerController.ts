import { prisma } from '../config/db';
import { h, ok, notFound } from '../utils/http';
import { audit } from '../utils/audit';
import { workerSchema, workerUpdateSchema } from '../validators';

const safe = (w: any) => ({ id: w.id, employeeId: w.employeeId, name: w.name, department: w.department, designation: w.designation, photoUrl: w.photoUrl, rfidUid: w.rfidUid, status: w.status });

export const listWorkers = h(async (_req, res) => ok(res, (await prisma.worker.findMany({ orderBy: { createdAt: 'desc' } })).map(safe)));
export const getWorker = h(async (req, res) => { const w = await prisma.worker.findUnique({ where: { id: req.params.id } }); if (!w) throw notFound(); ok(res, safe(w)); });
export const createWorker = h(async (req, res) => {
  const input = workerSchema.parse(req.body);
  const worker = await prisma.worker.create({ data: input as any });
  await audit(req.user!.email, 'worker_create', { userId: req.user!.id, entity: 'Worker', entityId: worker.id });
  ok(res, safe(worker), 'Worker created', 201);
});
export const updateWorker = h(async (req, res) => {
  const input = workerUpdateSchema.parse(req.body);
  const worker = await prisma.worker.update({ where: { id: req.params.id }, data: input as any });
  await audit(req.user!.email, 'worker_update', { userId: req.user!.id, entity: 'Worker', entityId: worker.id });
  ok(res, safe(worker), 'Worker updated');
});
export const deleteWorker = h(async (req, res) => {
  await prisma.worker.update({ where: { id: req.params.id }, data: { status: 'INACTIVE' } });
  await audit(req.user!.email, 'worker_deactivate', { userId: req.user!.id, entity: 'Worker', entityId: req.params.id });
  ok(res, {}, 'Worker deactivated');
});
