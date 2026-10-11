import { Router } from 'express';
import * as c from '../controllers/demoController';
const r = Router();
r.post('/seed', c.seed);
r.post('/simulate/ppe-violation', c.ppe);
r.post('/simulate/fusion', c.fusion);
r.post('/simulate/access', c.access);
r.post('/simulate/heartbeat', c.heartbeat);
export default r;
