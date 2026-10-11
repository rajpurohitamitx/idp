import { Router } from 'express';
import { userOrDevice } from '../middleware/auth';
import { imageUpload } from '../middleware/upload';
import * as c from '../controllers/cameraController';
const r = Router();
r.post('/analyze', userOrDevice, imageUpload.single('image'), c.analyzeImageUpload);
export default r;
