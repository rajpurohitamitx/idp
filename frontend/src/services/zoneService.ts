import { api, unwrap } from './api';
export interface Region { x: number; y: number; width: number; height: number }
export interface Zone { id: string; name: string; location: string; cameraId: string; active: boolean; region: Region | null }
export const listZones = () => unwrap<Zone[]>(api.get('/restricted-zones'));
export const createZone = (input: { name: string; location: string; cameraId: string; region?: Region | null; active?: boolean }) => unwrap<Zone>(api.post('/restricted-zones', input));
export const updateZone = (id: string, input: Partial<{ name: string; active: boolean; region: Region | null }>) => unwrap<Zone>(api.put(`/restricted-zones/${id}`, input));
export const deleteZone = (id: string) => api.delete(`/restricted-zones/${id}`);
