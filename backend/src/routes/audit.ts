import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as c from '../controllers/auditController';
const r = Router();
r.get('/', authenticate, authorize('ADMIN'), c.listAuditLogs);
export default r;
