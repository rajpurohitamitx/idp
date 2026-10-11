import { api, unwrap } from './api';
export const listAccessLogs = () => unwrap<any[]>(api.get('/access-events'));
