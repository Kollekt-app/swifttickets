import { Router } from 'express';

import { prisma } from '../_lib/prisma';
import { publicEvent, publicTicket } from '../_lib/serialize';
import {
  asBoolean,
  asNumber,
  asString,
  badRequest,
  forbidden,
  notFound,
  route,
} from '../_lib/http';
import {
  hashPassword,
  requireOrganizerAccess,
  requireUser,
  verifyPassword,
} from '../_lib/auth';

const router = Router();

const CATEGORIES = [
  'Music',
  'Club',
  'Beach',
  'Restaurant',
  'Conference',
  'Festival',
  'Nightlife',
  'Workshop',
];

const withRelations = {
  organizer: { select: { id: true, name: true, email: true, phone: true } },
  ticketTypes: { orderBy: { position: 'asc' } },
  tableOptions: { orderBy: { number: 'asc' } },
} as const;

const parseDate = (value: unknown, label: string): Date => {
  const parsed = new Date(asString(value));

  if (Number.isNaN(parsed.getTime())) {
    throw badRequest(`Please provide a valid ${label}.`);
  }

  return parsed;
};

const optionalDate = (value: unknown): Date | null => {
  const raw = asString(value);
  if (!raw) return null;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** GET /api/events — public catalogue, optionally scoped to one organizer. */
router.get(
  '/',
  route(async (req, res) => {
    const organizerId = asString(req.query.organizerId);

    const events = await prisma.event.findMany({
      where: {
        ...(organizerId ? { organizerId } : { status: 'Published' }),
      },
      include: withRelations,
      orderBy: [{ priorityLevel: 'desc' }, { date: 'asc' }],
      take: 200,
    });

    res.json(events.map(publicEvent));
  }),
);

/** POST /api/events — organizers (and admins) publish an event. */
router.post(
  '/',
  route(async (req, res) => {
    const user = await requireUser(req);

    if (user.role !== 'Organizer' && user.role !== 'Admin') {
      throw forbidden('Only organizers can create events.');
    }

    const organizerId =
      user.role === 'Admin' && asString(req.body?.organizerId)
        ? asString(req.body.organizerId)
        : user.id;

    const title = asString(req.body?.title);
    if (!title) throw badRequest('Please give the event a title.');

    const location = asString(req.body?.location);
    if (!location) throw badRequest('Please provide the event location.');

    const date = parseDate(req.body?.date, 'start date');
    const endDate = optionalDate(req.body?.endDate);

    if (endDate && endDate < date) {
      throw badRequest('The end date cannot be before the start date.');
    }

    const category = asString(req.body?.category);
    const isPrivate = asBoolean(req.body?.isPrivate);
    const password = asString(req.body?.password);

    if (isPrivate && !password) {
      throw badRequest('A private event needs a password.');
    }

    const rawTicketTypes = Array.isArray(req.body?.ticketTypes)
      ? req.body.ticketTypes
      : [];

    if (rawTicketTypes.length === 0) {
      throw badRequest('Add at least one ticket type.');
    }

    const ticketTypes = rawTicketTypes.map((type: any, index: number) => {
      const name = asString(type?.name);
      const price = asNumber(type?.price);
      const capacity = asNumber(type?.capacity);

      if (!name) throw badRequest('Every ticket type needs a name.');
      if (price < 0) throw badRequest(`"${name}" cannot have a negative price.`);
      if (capacity <= 0) {
        throw badRequest(`"${name}" needs a capacity of at least 1.`);
      }

      return { name, price, capacity, sold: 0, position: index };
    });

    const tableOptions = (
      Array.isArray(req.body?.tableOptions) ? req.body.tableOptions : []
    ).map((table: any) => ({
      number: asNumber(table?.number),
      price: asNumber(table?.price),
      capacity: asNumber(table?.capacity, 1),
      isReserved: false,
    }));

    const event = await prisma.event.create({
      data: {
        title,
        description: asString(req.body?.description),
        date,
        endDate,
        location,
        organizerId,
        imageUrl: asString(req.body?.imageUrl),
        images: Array.isArray(req.body?.images)
          ? req.body.images.filter((image: unknown) => typeof image === 'string')
          : [],
        category: CATEGORIES.includes(category) ? category : 'Music',
        status: asString(req.body?.status) === 'Draft' ? 'Draft' : 'Published',
        isPrivate,
        passwordHash: isPrivate ? await hashPassword(password) : null,
        schedule: Array.isArray(req.body?.schedule) ? req.body.schedule : undefined,
        insuranceEnabled: asBoolean(req.body?.insuranceEnabled),
        priorityLevel: asNumber(req.body?.priorityLevel),
        ticketTypes: { create: ticketTypes },
        ...(tableOptions.length
          ? { tableOptions: { create: tableOptions } }
          : {}),
      },
      include: withRelations,
    });

    res.status(201).json(publicEvent(event));
  }),
);

/** GET /api/events/:id — event detail. Counts as a view. */
router.get(
  '/:id',
  route(async (req, res) => {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: withRelations,
    });

    if (!event) throw notFound('That event does not exist.');

    // Fire and forget: a failed counter must never break the page.
    prisma.event
      .update({
        where: { id: event.id },
        data: { viewCount: { increment: 1 } },
      })
      .catch(() => undefined);

    res.json(publicEvent(event));
  }),
);

/** POST /api/events/:id/unlock — server-side password check for private events. */
router.post(
  '/:id/unlock',
  route(async (req, res) => {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      select: { isPrivate: true, passwordHash: true },
    });

    if (!event) throw notFound('That event does not exist.');

    if (!event.isPrivate || !event.passwordHash) {
      res.json({ unlocked: true });
      return;
    }

    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const unlocked = await verifyPassword(password, event.passwordHash);

    res.status(unlocked ? 200 : 401).json({
      unlocked,
      ...(unlocked ? {} : { error: 'Incorrect password.' }),
    });
  }),
);

/** PATCH /api/events/:id — organizer edits. */
router.patch(
  '/:id',
  route(async (req, res) => {
    const existing = await prisma.event.findUnique({
      where: { id: req.params.id },
      select: { organizerId: true },
    });

    if (!existing) throw notFound('That event does not exist.');

    await requireOrganizerAccess(req, existing.organizerId);

    const data: Record<string, unknown> = {};

    if (req.body?.title !== undefined) data.title = asString(req.body.title);
    if (req.body?.description !== undefined) {
      data.description = asString(req.body.description);
    }
    if (req.body?.location !== undefined) {
      data.location = asString(req.body.location);
    }
    if (req.body?.imageUrl !== undefined) {
      data.imageUrl = asString(req.body.imageUrl);
    }
    if (req.body?.date !== undefined) {
      data.date = parseDate(req.body.date, 'start date');
    }
    if (req.body?.endDate !== undefined) {
      data.endDate = optionalDate(req.body.endDate);
    }
    if (req.body?.status !== undefined) {
      const status = asString(req.body.status);
      if (!['Draft', 'Published', 'Cancelled'].includes(status)) {
        throw badRequest('Unknown event status.');
      }
      data.status = status;
    }
    if (req.body?.priorityLevel !== undefined) {
      data.priorityLevel = asNumber(req.body.priorityLevel);
    }

    const event = await prisma.event.update({
      where: { id: req.params.id },
      data,
      include: withRelations,
    });

    res.json(publicEvent(event));
  }),
);

/**
 * POST /api/events/:id/cancel — cancels the event and refunds every live
 * ticket, debiting the organizer wallet for what was already credited.
 */
router.post(
  '/:id/cancel',
  route(async (req, res) => {
    const existing = await prisma.event.findUnique({
      where: { id: req.params.id },
      select: { id: true, organizerId: true, title: true, status: true },
    });

    if (!existing) throw notFound('That event does not exist.');

    await requireOrganizerAccess(req, existing.organizerId);

    if (existing.status === 'Cancelled') {
      res.json({ ok: true, refunded: 0, message: 'Event was already cancelled.' });
      return;
    }

    const refundable = await prisma.ticket.findMany({
      where: { eventId: existing.id, status: { in: ['Active', 'Used', 'Scanned'] } },
      select: { id: true, pricePaid: true },
    });

    const refundTotal = refundable.reduce(
      (total, ticket) => total + ticket.pricePaid,
      0,
    );

    await prisma.$transaction([
      prisma.event.update({
        where: { id: existing.id },
        data: { status: 'Cancelled' },
      }),
      prisma.ticket.updateMany({
        where: { eventId: existing.id, status: { in: ['Active', 'Used', 'Scanned'] } },
        data: { status: 'Refunded' },
      }),
      ...(refundTotal > 0
        ? [
            prisma.walletTransaction.create({
              data: {
                organizerId: existing.organizerId,
                type: 'debit',
                amount: refundTotal,
                description: `Refunds for cancelled event: ${existing.title}`,
                reference: `REFUND-${existing.id}`,
              },
            }),
          ]
        : []),
    ]);

    res.json({
      ok: true,
      refunded: refundable.length,
      refundTotal,
      message: `Cancelled and refunded ${refundable.length} ticket(s).`,
    });
  }),
);

/** GET /api/events/:id/gate-manifest — offline-capable scanner manifest. */
router.get(
  '/:id/gate-manifest',
  route(async (req, res) => {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      select: { id: true, title: true, organizerId: true, date: true, location: true },
    });

    if (!event) throw notFound('That event does not exist.');

    await requireOrganizerAccess(req, event.organizerId);

    const tickets = await prisma.ticket.findMany({
      where: { eventId: event.id },
      orderBy: { createdAt: 'desc' },
    });

    const scanned = tickets.filter((ticket) => ticket.status === 'Scanned');

    res.json({
      eventId: event.id,
      eventTitle: event.title,
      eventDate: event.date.toISOString(),
      eventLocation: event.location,
      generatedAt: new Date().toISOString(),
      totalTickets: tickets.length,
      totalScanned: scanned.length,
      tickets: tickets.map(publicTicket),
    });
  }),
);

/** DELETE /api/events/:id — admin/organizer removal. */
router.delete(
  '/:id',
  route(async (req, res) => {
    const existing = await prisma.event.findUnique({
      where: { id: req.params.id },
      select: { organizerId: true },
    });

    if (!existing) throw notFound('That event does not exist.');

    await requireOrganizerAccess(req, existing.organizerId);

    await prisma.event.delete({ where: { id: req.params.id } });

    res.json({ ok: true });
  }),
);

export default router;
