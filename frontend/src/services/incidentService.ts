import { api, unwrap } from './api';
import type { Incident } from '../types';
export const listIncidents = (params?: Record<string, string>) => unwrap<Incident[]>(api.get('/incidents', { params }));
export const resolveIncident = (id: string, notes?: string) => unwrap<Incident>(api.post(`/incidents/${id}/resolve`, { notes }));
