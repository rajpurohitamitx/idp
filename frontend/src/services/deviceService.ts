import { api, unwrap } from './api';
import type { Device } from '../types';
export const listDevices = () => unwrap<Device[]>(api.get('/devices'));
