import { createServer } from 'node:http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { initSockets } from './sockets';
import { sweepOfflineDevices } from './services/device/deviceService';

async function main() {
  const app = createApp();
  const server = createServer(app);
  initSockets(server);

  server.listen(env.PORT, () => logger.info(`Industrial Guardian backend listening on :${env.PORT}`));

  const sweepMs = 15_000;
  const interval = setInterval(() => { sweepOfflineDevices().catch((e) => logger.error({ err: e }, 'offline sweep failed')); }, sweepMs);

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    clearInterval(interval);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((e) => { logger.error({ err: e }, 'fatal startup error'); process.exit(1); });
