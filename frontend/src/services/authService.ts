import { api, unwrap } from './api';
export const login = (email: string, password: string) => unwrap<{ token: string; user: { id: string; email: string; name: string; role: string } }>(api.post('/auth/login', { email, password }));
export const me = () => unwrap<{ id: string; email: string; name: string; role: string }>(api.get('/auth/me'));
