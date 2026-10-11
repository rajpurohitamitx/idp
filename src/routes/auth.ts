import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as c from '../controllers/authController';
const r = Router();
r.post('/login', c.login);
r.get('/me', authenticate, c.me);
r.post('/logout', authenticate, c.logout);
export default r;
