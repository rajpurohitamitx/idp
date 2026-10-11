import { prisma } from '../config/db';
import { h, ok } from '../utils/http';

export const listAuditLogs = h(async (req, res) => {
  const take = Math.min(Number(req.query.limit) || 100, 500);
  ok(res, await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take }));
});
