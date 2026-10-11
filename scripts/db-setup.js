// Runs during the Vercel build:
//  1) creates/updates the database tables from prisma/schema.prisma
//  2) optionally creates your first ADMIN login from the env vars ADMIN_EMAIL + ADMIN_PASSWORD
// It never fails the build; problems are printed as warnings.
const { spawnSync } = require('node:child_process');

async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').trim();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email || !password) { console.log('[db-setup] ADMIN_EMAIL / ADMIN_PASSWORD not set - skipping admin creation.'); return; }
  if (password.length < 8) { console.warn('[db-setup] ADMIN_PASSWORD must be at least 8 characters - skipping admin creation.'); return; }
  const { PrismaClient } = require('@prisma/client');
  const bcrypt = require('bcryptjs');
  const prisma = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      await prisma.user.create({ data: { email, name: process.env.ADMIN_NAME || 'Admin', passwordHash, role: 'ADMIN', active: true } });
      console.log(`[db-setup] Admin user created: ${email}`);
    } else if (process.env.ADMIN_RESET_PASSWORD === 'true') {
      await prisma.user.update({ where: { email }, data: { passwordHash, role: 'ADMIN', active: true } });
      console.log(`[db-setup] Admin password reset: ${email}`);
    } else {
      console.log(`[db-setup] Admin ${email} already exists (set ADMIN_RESET_PASSWORD=true to reset its password).`);
    }
  } catch (e) {
    console.warn('[db-setup] Could not create admin user:', e && e.message ? e.message : e);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.warn('[db-setup] DATABASE_URL is not set - skipping. Add it in Vercel and redeploy.');
    return;
  }
  const r = spawnSync('npx', ['prisma', 'db', 'push', '--skip-generate'], { stdio: 'inherit', shell: true });
  if (r.status !== 0) console.warn('[db-setup] Automatic table creation failed. Run database/database-setup.sql in your database SQL editor instead.');
  else console.log('[db-setup] Database tables are up to date.');
  await ensureAdmin();
}

main().catch((e) => console.warn('[db-setup] unexpected error:', e)).finally(() => process.exit(0));
