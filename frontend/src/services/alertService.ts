import { api, unwrap } from './api';
import type { Alert } from '../types';
export const listAlerts = (params?: Record<string, string>) => unwrap<Alert[]>(api.get('/alerts', { params }));
export const acknowledgeAlert = (id: string) => unwrap<Alert>(api.post(`/alerts/${id}/acknowledge`));
export const resolveAlert = (id: string, notes?: string) => unwrap<Alert>(api.post(`/alerts/${id}/resolve`, { notes }));
export const falseAlarmAlert = (id: string, notes?: string) => unwrap<Alert>(api.post(`/alerts/${id}/false-alarm`, { notes }));
