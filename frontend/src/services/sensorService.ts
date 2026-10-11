import { api, unwrap } from './api';
import type { Sensor } from '../types';
export const listSensors = () => unwrap<Sensor[]>(api.get('/sensors'));
export const getSensor = (id: string) => unwrap<Sensor>(api.get(`/sensors/${id}`));
