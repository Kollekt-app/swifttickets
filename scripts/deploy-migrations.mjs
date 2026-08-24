/**
 * Applies pending migrations at build time.
 *
 * Skipped (with a warning, not an error) when DATABASE_URL is absent so the
 * front end still deploys — the API then answers 503 with an explanation
 * until a database is attached.
 */
import { spawnSync } from 'node:child_process';

if (!process.env.DATABASE_URL?.trim()) {
  console.warn(
    '\n⚠  DATABASE_URL is not set — skipping `prisma migrate deploy`.\n' +
      '   The site will build, but every /api request will return 503 until\n' +
      '   you add a Postgres database and redeploy.\n',
  );
  process.exit(0);
}

const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
