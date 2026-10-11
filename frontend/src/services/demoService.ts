import { api, unwrap } from './api';
export const seedDemo = () => unwrap<any>(api.post('/demo/seed'));
export const simulatePpe = () => unwrap<any>(api.post('/demo/simulate/ppe-violation'));
export const simulateFusion = () => unwrap<any>(api.post('/demo/simulate/fusion'));
export const simulateAccess = () => unwrap<any>(api.post('/demo/simulate/access'));
