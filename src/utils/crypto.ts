import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
export const generateDeviceToken = () => `igd_${randomBytes(32).toString('hex')}`;
export const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a); const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
