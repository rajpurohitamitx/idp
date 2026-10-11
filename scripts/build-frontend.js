// Builds the React dashboard and copies it into public/ so ONE Vercel project serves
// the website (/) and the API (/api) from the same address.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const fe = path.join(root, 'frontend');
const run = (cmd, args) => spawnSync(cmd, args, { cwd: fe, stdio: 'inherit', shell: true }).status === 0;

if (!fs.existsSync(path.join(fe, 'package.json'))) {
  console.warn('[build-frontend] frontend/ folder not found - serving API only.');
  process.exit(0);
}
if (!run('npm', ['install', '--no-audit', '--no-fund']) || !run('npm', ['run', 'build:vercel'])) {
  console.error('[build-frontend] Frontend build FAILED - the API still deploys, but the website page is only a placeholder.');
  process.exit(0);
}
const dist = path.join(fe, 'dist');
fs.cpSync(dist, path.join(root, 'public'), { recursive: true, force: true });
console.log('[build-frontend] Website copied to public/.');
