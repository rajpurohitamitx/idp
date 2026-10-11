import { prisma } from '../config/db';
import { logger } from './logger';

export async function audit(actor: string, action: string, opts: { userId?: string; entity?: string; entityId?: string; meta?: object } = {}) {
  try {
    await prisma.auditLog.create({ data: { actor, action, userId: opts.userId, entity: opts.entity, entityId: opts.entityId, meta: opts.meta as any } });
  } catch (e) { logger.error({ err: e }, 'audit write failed'); }
}
