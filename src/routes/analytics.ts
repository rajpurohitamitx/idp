import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as c from '../controllers/analyticsController';
const r = Router();
r.use(authenticate);
r.get('/dashboard', c.getDashboard);
r.get('/', c.getAnalytics);
export default r;
