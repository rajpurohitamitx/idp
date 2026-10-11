import 'dotenv/config';
import { z } from 'zod';

const bool = z.enum(['true', 'false']).default('false').transform((v) => v === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  SOCKET_URL: z.string().optional(),
  AI_SERVICE_URL: z.string().default('http://localhost:8001'),
  AI_SERVICE_TIMEOUT_MS: z.coerce.number().default(8000),
  IMAGE_STORAGE_PATH: z.string().default(process.env.VERCEL ? '/tmp/images' : './storage/images'),
  IMAGE_MAX_BYTES: z.coerce.number().default(5 * 1024 * 1024),
  ALLOW_DEVICE_AUTO_REGISTER: bool,
  DEMO_MODE_ENABLED: bool,
  SEED_ADMIN_PASSWORD: z.string().optional(),
  SEED_SUPERVISOR_PASSWORD: z.string().optional(),
  SEED_OPERATOR_PASSWORD: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
