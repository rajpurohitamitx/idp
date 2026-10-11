import { api, unwrap } from './api';
import type { Hazard } from '../types';
export const listHazards = (params?: Record<string, string>) => unwrap<Hazard[]>(api.get('/hazards', { params }));
