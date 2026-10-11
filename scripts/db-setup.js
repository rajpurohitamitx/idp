// Runs during the Vercel build: creates/updates the database tables from prisma/schema.prisma.
// Never fails the build; if it can't connect it prints how to set up the tables manually.
const { spawnSync } = require('node:child_process');

if (!process.env.DATABASE_URL) {
  console.warn('[db-setup] DATABASE_URL is not set - skipping table creation. Add it in Vercel and redeploy.');
  process.exit(0);
}
const r = spawnSync('npx', ['prisma', 'db', 'push', '--skip-generate'], { stdio: 'inherit', shell: true });
if (r.status !== 0) {
  console.warn('[db-setup] Automatic table creation failed. Run database/database-setup.sql in your database SQL editor instead.');
} else {
  console.log('[db-setup] Database tables are up to date.');
}
process.exit(0);
