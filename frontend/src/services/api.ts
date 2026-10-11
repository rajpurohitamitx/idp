import axios from 'axios';
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api' });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ig_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) { localStorage.removeItem('ig_token'); window.location.assign('/login'); }
    return Promise.reject(err);
  },
);
export const unwrap = <T,>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);
