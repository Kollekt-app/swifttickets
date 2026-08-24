# Swift Tickets

Event discovery, ticket purchasing and table reservations for Liberia — with a
gate scanner, organizer escrow wallet, admin payout queue and paid-voting
competitions.

React + Vite on the front, an Express API running as a Vercel serverless
function on the back, Postgres via Prisma underneath.

---

## Deploy to Vercel

### 1. Create a database

Any Postgres works. The quickest path is Vercel's own integration:

1. Open your project on Vercel → **Storage** → **Create Database** → **Neon**
   (or **Postgres**).
2. Attach it to the project. Vercel sets `DATABASE_URL` for you.

Bringing your own (Supabase, Railway, RDS)? Add `DATABASE_URL` manually under
**Settings → Environment Variables**, and use the **pooled** connection string —
serverless functions open many short-lived connections.

### 2. Set the session secret

Under **Settings → Environment Variables**, add:

| Name             | Value                                    |
| ---------------- | ---------------------------------------- |
| `SESSION_SECRET` | output of `openssl rand -base64 32`      |

The API refuses to sign sessions in production without it.

### 3. Deploy

Push to your connected branch, or run `vercel --prod`. The build command runs
`prisma generate`, applies any pending migrations, then builds the front end.

### 4. Create the first account

Open the deployed site and **Register**. The first account to register becomes
the **Admin** — everyone after that is a Customer or Organizer, and only an
admin can change roles from the admin panel.

Prefer demo data instead? Point your local `.env` at the production database
once and run `npm run db:seed`.

---

## Optional integrations

Everything below is optional. Without it the feature is *simulated*: the flow
completes and the confirmation screen shows exactly what would have been sent,
but nothing leaves the server.

| Feature       | Variables                                                     | Without it                                                     |
| ------------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| Card payments | `STRIPE_SECRET_KEY`, `STRIPE_CURRENCY`                        | Cards are validated (Luhn, expiry, CVC) and approved; no charge |
| Ticket email  | `RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL`                   | Email is previewed in the app, not delivered                    |
| Ticket SMS    | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | SMS is previewed in the app, not delivered                    |

`GET /api/health` reports which mode each one is in.

### About card payments

Checkout currently posts card details to `/api/stripe/process-payment`, which
validates and approves them without moving money. **Do not take real payments
this way.** Stripe only accepts raw card numbers from PCI-DSS-approved
merchants, so going live means collecting the card with **Stripe Elements** in
the browser and sending the resulting `paymentMethodId` instead.

The server side of that path is already written: pass `paymentMethodId` in the
request body with `STRIPE_SECRET_KEY` set and the API confirms a real
PaymentIntent (`api/_lib/payments.ts`). Only the checkout form needs swapping.

---

## Run it locally

```bash
npm install
cp .env.example .env          # then fill in DATABASE_URL
npm run db:migrate            # create the tables
npm run db:seed               # optional demo data
npm run dev                   # API on :3000, web on :5173
```

`npm run dev` starts both processes; Vite proxies `/api` to the local API
server so it behaves exactly like production.

Seeded logins (`npm run db:seed`):

| Role      | Email                        | Password        |
| --------- | ---------------------------- | --------------- |
| Admin     | `admin@swifttickets.lr`      | `ChangeMe123!`  |
| Organizer | `organizer@swifttickets.lr`  | `Password123!`  |
| Customer  | `customer@swifttickets.lr`   | `Password123!`  |

Override with `SEED_ADMIN_PASSWORD` / `SEED_DEMO_PASSWORD`. Change them before
pointing the seed at anything public.

### Scripts

| Command              | Does                                             |
| -------------------- | ------------------------------------------------ |
| `npm run dev`        | API + web together                               |
| `npm run dev:api`    | API only, with reload                            |
| `npm run dev:web`    | Vite only                                        |
| `npm run build`      | Production build                                 |
| `npm run lint`       | Typecheck the whole repo                         |
| `npm run db:migrate` | Create and apply a migration                     |
| `npm run db:deploy`  | Apply existing migrations (used by the CI build) |
| `npm run db:seed`    | Load demo data                                   |
| `npm run db:studio`  | Browse the database                              |

---

## How it fits together

```
src/                 React app (Vite)
api/index.ts         Express app — one Vercel function serving all of /api
api/_routes/         Route modules (auth, events, bookings, tickets, …)
api/_lib/            Prisma client, sessions, serializers, QR, payments, notify
prisma/schema.prisma Data model
prisma/seed.ts       Demo data
```

Files under `api/` starting with `_` are ignored by Vercel's function detection,
so `api/index.ts` is the single function; `vercel.json` rewrites `/api/*` to it
and everything else to `index.html` for the SPA router.

### Endpoints

| Method | Path                                       | Who        |
| ------ | ------------------------------------------ | ---------- |
| POST   | `/api/auth/register`, `/login`, `/logout`  | public     |
| GET    | `/api/auth/me`                             | signed in  |
| GET    | `/api/events`, `/api/events/:id`           | public     |
| POST   | `/api/events`                              | organizer  |
| PATCH  | `/api/events/:id`                          | owner      |
| POST   | `/api/events/:id/unlock`                   | public     |
| POST   | `/api/events/:id/cancel`                   | owner      |
| GET    | `/api/events/:id/gate-manifest`            | owner      |
| DELETE | `/api/events/:id`                          | owner      |
| POST   | `/api/bookings`                            | public     |
| GET    | `/api/tickets/verify/:code`                | public     |
| GET    | `/api/tickets/user/:userId`                | owner      |
| POST   | `/api/tickets/transfer`                    | holder     |
| GET    | `/api/organizer/wallet/:id`, `/transactions/:id`, `/events/:id`, `/analytics/:eventId` | owner |
| POST   | `/api/payouts/request`                     | organizer  |
| GET    | `/api/admin/users`, `/payouts/pending`, `/stats` | admin |
| POST   | `/api/admin/users/:uid/role`, `/payouts/process` | admin |
| GET    | `/api/scanner/events/active/:organizerId`  | owner      |
| POST   | `/api/scanner/scan`                        | owner      |
| GET    | `/api/competitions`                        | public     |
| POST   | `/api/competitions`, `/:id/candidates`     | organizer  |
| POST   | `/api/competitions/:id/votes`              | public     |
| GET    | `/api/health`                              | public     |

### Rules the server enforces

Money and inventory are decided server-side; the client is never trusted with
them.

- **Tickets cannot be oversold.** Inventory is claimed with a conditional
  update inside the booking transaction, so two simultaneous buyers competing
  for the last seat cannot both succeed.
- **A ticket admits once.** The scanner's `Active → Scanned` transition is
  conditional, so a duplicate scan reports `ALREADY_SCANNED` rather than
  admitting twice.
- **Transfers retire the old code.** The original is cancelled and a fresh code
  is issued and delivered, so a forwarded screenshot is worthless.
- **The wallet is a ledger.** Balance is credited sales minus debits minus
  money held by pending withdrawals; you cannot withdraw more than that, and
  cancelling an event writes the refunds back.
- **Vote pricing is server-side.** The bundle is priced from the competition's
  own vote price and the platform commission is split before the organizer is
  credited.
- **Private event passwords are checked on the server** and their hashes never
  reach the browser.

---

## Troubleshooting

**Red banner: "Database not configured"** — `DATABASE_URL` is missing. Add it
and redeploy. `/api/health` confirms.

**Red banner: "Cannot reach the Swift Tickets API"** — the function is erroring.
Check the runtime logs in Vercel; a missing `SESSION_SECRET` in production is
the usual cause.

**Tables exist but the site is empty** — that is expected on a fresh database.
Register the first account, or run `npm run db:seed` against it.
