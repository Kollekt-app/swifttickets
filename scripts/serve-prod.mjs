/**
 * Serves `dist/` plus the API from one process, the way Vercel does:
 * static assets first, `/api/*` to the Express app, everything else to
 * index.html for the SPA router.
 *
 * Use it to sanity-check a production build locally (`npm run start:prod`).
 */
import 'dotenv/config';

import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { createServer } from 'node:http';

const { default: app } = await import('../api/index.ts');

const DIST = new URL('../dist/', import.meta.url).pathname;
const port = Number(process.env.PORT || 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

const sendFile = (res, path) => {
  res.writeHead(200, {
    'Content-Type': TYPES[extname(path)] || 'application/octet-stream',
  });
  createReadStream(path).pipe(res);
};

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);

  if (path.startsWith('/api')) return app(req, res);

  // normalize() collapses any ../ before it can escape dist/.
  const candidate = join(DIST, normalize(path).replace(/^(\.\.[/\\])+/, ''));

  if (
    candidate.startsWith(DIST) &&
    existsSync(candidate) &&
    statSync(candidate).isFile()
  ) {
    return sendFile(res, candidate);
  }

  return sendFile(res, join(DIST, 'index.html'));
}).listen(port, () => {
  console.log(`Swift Tickets (production build) on http://localhost:${port}`);
});
