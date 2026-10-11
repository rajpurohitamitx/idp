import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { h, ok, unauthorized } from '../utils/http';
import { audit } from '../utils/audit';
import { loginSchema } from '../validators';

export const login = h(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) throw unauthorized('Invalid email or password');
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) throw unauthorized('Invalid email or password');
  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] });
  await audit(user.email, 'login', { userId: user.id });
  ok(res, { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } }, 'Logged in');
});

export const me = h(async (req, res) => {
  if (!req.user) throw unauthorized();
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw unauthorized();
  ok(res, { id: user.id, email: user.email, name: user.name, role: user.role });
});

export const logout = h(async (req, res) => {
  if (req.user) await audit(req.user.email, 'logout', { userId: req.user.id });
  ok(res, {}, 'Logged out');
});
