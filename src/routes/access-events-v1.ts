import { Router } from 'express';
import { deviceAuth } from '../middleware/auth';
import * as c from '../controllers/accessController';
const r = Router();
r.post('/', deviceAuth, c.postAccessEvent);
export default r;
