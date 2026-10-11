import { api, unwrap } from './api';
import type { Camera } from '../types';
export const listCameras = () => unwrap<Camera[]>(api.get('/cameras'));
export const getCamera = (id: string) => unwrap<any>(api.get(`/cameras/${id}`));
export const requestCapture = (id: string) => unwrap<any>(api.post(`/cameras/${id}/capture`));
export const analyzeImage = (file: File, cameraId: string, location?: string) => {
  const form = new FormData();
  form.append('image', file); form.append('cameraId', cameraId); form.append('timestamp', new Date().toISOString());
  if (location) form.append('location', location);
  return unwrap<any>(api.post('/images/analyze', form, { headers: { 'Content-Type': 'multipart/form-data' } }));
};
export const createCamera = (input: { cameraId: string; name: string; location: string; isEntryCamera?: boolean }) => unwrap<Camera>(api.post('/cameras', input));
