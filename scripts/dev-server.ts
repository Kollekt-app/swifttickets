/**
 * Local API server. In production the same Express app is served by Vercel as
 * a serverless function (see api/index.ts); here it just listens on a port so
 * Vite's /api proxy has somewhere to go.
 */
import 'dotenv/config';

import app from '../api/index';

const port = Number(process.env.API_PORT || 3000);

app.listen(port, () => {
  console.log(`Swift Tickets API listening on http://localhost:${port}`);

  if (!process.env.DATABASE_URL) {
    console.warn(
      '\nDATABASE_URL is not set — every API call will return 503.\n' +
        'Copy .env.example to .env and point it at a Postgres database.\n',
    );
  }
});
