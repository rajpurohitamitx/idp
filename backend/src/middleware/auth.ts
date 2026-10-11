import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../config/db';
import { forbidden, unauthorized } from '../utils/http';
import { sha256 } from '../utils/crypto';

export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(unauthorized());
  try {
    const p = jwt.verify(header.slice(7), env.JWT_SECRET) as { sub: string; email: string; role: Role };
    req.user = { id: p.sub, email: p.email, role: p.role };
    next();
  } catch { next(unauthorized('Invalid or expired token')); }
};

export const authorize = (...roles: Role[]): RequestHandler => (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  if (!roles.includes(req.user.role)) return next(forbidden());
  next();
};

export const deviceAuth: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return next(unauthorized('Device token required'));
    const device = await prisma.device.findFirst({ where: { tokenHash: sha256(header.slice(7)), authorized: true } });
    if (!device) return next(unauthorized('Invalid device token'));
    const claimed = (req.body?.deviceId ?? req.query?.deviceId ?? req.params?.deviceId) as string | undefined;
    if (claimed && claimed !== device.deviceId) return next(forbidden('deviceId does not match token'));
    req.device = device;
    prisma.device.update({ where: { id: device.id }, data: { lastCommunication: new Date() } }).catch(() => undefined);
    next();
  } catch (e) { next(e); }
};

export const userOrDevice: RequestHandler = (req, res, next) => {
  const t = req.headers.authorization?.slice(7) ?? '';
  if (t.startsWith('igd_')) return deviceAuth(req, res, next);
  return authenticate(req, res, next);
};
