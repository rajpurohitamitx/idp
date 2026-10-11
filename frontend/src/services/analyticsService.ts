import { api, unwrap } from './api';
import type { DashboardSnapshot } from '../types';
export const getDashboard = () => unwrap<DashboardSnapshot>(api.get('/analytics/dashboard'));
export const getAnalytics = (range: string) => unwrap<any>(api.get('/analytics', { params: { range } }));
