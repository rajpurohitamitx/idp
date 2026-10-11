import axios from 'axios';
// On a real website always use the same-origin /api; only use localhost when the site itself runs on localhost.
const onLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const envUrl = import.meta.env.VITE_API_URL;
const baseURL = onLocalhost ? (envUrl || 'http://localhost:4000/api') : (envUrl && !/localhost|127\.0\.0\.1/.test(envUrl) ? envUrl : '/api');
export const api = axios.create({ baseURL });
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
