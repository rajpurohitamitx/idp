import { prisma } from '../config/db';
import { h, ok } from '../utils/http';
import { aiServiceHealthy } from '../services/ai/aiClient';

export const health = h(async (_req, res) => {
  let database = 'connected';
  try { await prisma.$queryRaw`SELECT 1`; } catch { database = 'disconnected'; }
  const aiService = (await aiServiceHealthy()) ? 'connected' : 'disconnected';
  res.status(database === 'connected' ? 200 : 503).json({ success: database === 'connected', status: database === 'connected' ? 'healthy' : 'degraded', database, aiService, timestamp: new Date().toISOString() });
});
