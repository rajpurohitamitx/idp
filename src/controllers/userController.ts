import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { h, ok } from '../utils/http';
import { audit } from '../utils/audit';
import { userCreateSchema, userUpdateSchema } from '../validators';

const safe = (u: any) => ({ id: u.id, email: u.email, name: u.name, role: u.role, active: u.active, createdAt: u.createdAt });

export const listUsers = h(async (_req, res) => ok(res, (await prisma.user.findMany({ orderBy: { createdAt: 'desc' } })).map(safe)));

export const createUser = h(async (req, res) => {
  const input = userCreateSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({ data: { email: input.email, name: input.name, role: input.role, passwordHash } });
  await audit(req.user!.email, 'user_create', { userId: req.user!.id, entity: 'User', entityId: user.id, meta: { email: user.email, role: user.role } });
  ok(res, safe(user), 'User created', 201);
});

export const updateUser = h(async (req, res) => {
  const input = userUpdateSchema.parse(req.body);
  const data: any = { ...input };
  if (input.password) { data.passwordHash = await bcrypt.hash(input.password, 12); delete data.password; }
  const user = await prisma.user.update({ where: { id: req.params.id }, data });
  await audit(req.user!.email, 'user_update', { userId: req.user!.id, entity: 'User', entityId: user.id });
  ok(res, safe(user), 'User updated');
});

export const deleteUser = h(async (req, res) => {
  await prisma.user.update({ where: { id: req.params.id }, data: { active: false } });
  await audit(req.user!.email, 'user_deactivate', { userId: req.user!.id, entity: 'User', entityId: req.params.id });
  ok(res, {}, 'User deactivated');
});
