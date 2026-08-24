import express, { type NextFunction, type Request, type Response } from 'express';

import { isDatabaseConfigured, prisma } from './_lib/prisma';
import { attachSession } from './_lib/auth';
import { HttpError } from './_lib/http';
import { isStripeLive } from './_lib/payments';

import authRoutes from './_routes/auth';
import eventRoutes from './_routes/events';
import bookingRoutes from './_routes/bookings';
import ticketRoutes from './_routes/tickets';
import organizerRoutes from './_routes/organizer';
import payoutRoutes from './_routes/payouts';
import adminRoutes from './_routes/admin';
import scannerRoutes from './_routes/scanner';
import stripeRoutes from './_routes/stripe';
import competitionRoutes from './_routes/competitions';

const app = express();

app.set('trust proxy', true);
app.disable('x-powered-by');

app.use(express.json({ limit: '8mb' })); // event images arrive as data URLs
app.use(express.urlencoded({ extended: true }));

/**
 * Without a database every route would fail with an opaque Prisma error, so
 * answer with something the UI can explain to the operator instead.
 */
app.use('/api', (req, res, next) => {
  if (isDatabaseConfigured || req.path === '/health') return next();

  res.status(503).json({
    error:
      'The database is not configured. Set DATABASE_URL in your environment and redeploy.',
    code: 'DATABASE_NOT_CONFIGURED',
  });
});

app.use(attachSession);

app.get('/api/health', async (_req, res) => {
  let database: 'ok' | 'not_configured' | 'unreachable' = 'not_configured';

  if (isDatabaseConfigured) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = 'ok';
    } catch {
      database = 'unreachable';
    }
  }

  res.status(database === 'ok' ? 200 : 503).json({
    status: database === 'ok' ? 'ok' : 'degraded',
    database,
    payments: isStripeLive() ? 'stripe' : 'demo',
    email: process.env.RESEND_API_KEY ? 'resend' : 'simulated',
    sms: process.env.TWILIO_ACCOUNT_SID ? 'twilio' : 'simulated',
    time: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/organizer', organizerRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/scanner', scannerRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/competitions', competitionRoutes);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Unknown API endpoint.' });
});

app.use(
  (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message, details: error.details });
      return;
    }

    const prismaCode = (error as { code?: string })?.code;

    // Unique constraint — surfaces as a readable conflict rather than a 500.
    if (prismaCode === 'P2002') {
      res.status(409).json({ error: 'That record already exists.' });
      return;
    }

    if (prismaCode === 'P2025') {
      res.status(404).json({ error: 'Not found.' });
      return;
    }

    console.error('Unhandled API error:', error);

    res.status(500).json({
      error:
        process.env.NODE_ENV === 'production'
          ? 'Something went wrong on our side. Please try again.'
          : (error as Error)?.message || 'Internal server error',
    });
  },
);

export default app;
