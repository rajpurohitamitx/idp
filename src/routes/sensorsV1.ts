import { Router } from 'express';
import { deviceAuth } from '../middleware/auth';
import * as c from '../controllers/sensorController';
const r = Router();
r.post('/readings', deviceAuth, c.postBatch);
export default r;
