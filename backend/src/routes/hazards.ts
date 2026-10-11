import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as c from '../controllers/hazardController';
const r = Router();
r.use(authenticate);
r.get('/', c.listHazards);
r.get('/:id', c.getHazard);
r.post('/manual', authorize('ADMIN', 'SUPERVISOR'), c.manualHazard);
export default r;
