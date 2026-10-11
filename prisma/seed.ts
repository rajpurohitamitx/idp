import { seedDemoData } from '../src/services/demo/demoService';
import { prisma } from '../src/config/db';
import { logger } from '../src/utils/logger';

async function main() {
  const result = await seedDemoData();
  logger.info({ result }, 'Database seeded with demo data (all isDemo=true)');
  logger.info('Demo login: admin@demo.industrialguardian.local / (see SEED_ADMIN_PASSWORD in .env)');
}

main().catch((e) => { logger.error({ err: e }, 'seed failed'); process.exit(1); }).finally(() => prisma.$disconnect());
