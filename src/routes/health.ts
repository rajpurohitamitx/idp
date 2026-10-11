import { Router } from 'express';
import * as c from '../controllers/healthController';
const r = Router();
r.get('/', c.health);
export default r;
