import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as c from '../controllers/settingsController';
const r = Router();
r.use(authenticate, authorize('ADMIN'));
r.get('/', c.getSettings);
r.put('/', c.updateSettings);
export default r;
