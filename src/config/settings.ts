import { prisma } from './db';
import { DEFAULT_CONFIG } from './defaults';
import type { SystemConfig } from '../types';

const KEY = 'config';
let cache: { at: number; value: SystemConfig } | null = null;

function merge<T>(base: T, over: any): T {
  if (over === null || typeof over !== 'object' || Array.isArray(over)) return (over ?? base) as T;
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...(base as any) };
  for (const k of Object.keys(over)) out[k] = merge((base as any)?.[k], over[k]);
  return out;
}

export async function getConfig(): Promise<SystemConfig> {
  if (cache && Date.now() - cache.at < 5000) return cache.value;
  const row = await prisma.systemSetting.findUnique({ where: { key: KEY } });
  const value = merge(DEFAULT_CONFIG, row?.value ?? {});
  cache = { at: Date.now(), value };
  return value;
}

export async function saveConfigOverrides(overrides: unknown): Promise<SystemConfig> {
  await prisma.systemSetting.upsert({ where: { key: KEY }, create: { key: KEY, value: overrides as any }, update: { value: overrides as any } });
  cache = null;
  return getConfig();
}
export const getOverrides = async () => (await prisma.systemSetting.findUnique({ where: { key: KEY } }))?.value ?? {};
