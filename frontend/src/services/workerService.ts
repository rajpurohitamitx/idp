import { api, unwrap } from './api';
import type { Worker } from '../types';
export const listWorkers = () => unwrap<Worker[]>(api.get('/workers'));
