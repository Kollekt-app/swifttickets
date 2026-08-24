import { Router } from 'express';

import { prisma } from '../_lib/prisma';
import { publicEvent } from '../_lib/serialize';
import { asString, badRequest, route } from '../_lib/http';
import { requireOrganizerAccess, requireUser } from '../_lib/auth';
import { describeTicket } from './tickets';

const router = Router();

/**
 * GET /api/scanner/events/active/:organizerId
 *
 * Events the gate staff can scan right now: published, and either running or
 * starting within the next 24 hours.
 */
router.get(
  '/events/active/:organizerId',
  route(async (req, res) => {
    const organizerId = asString(req.params.organizerId);
    await requireOrganizerAccess(req, organizerId);

    const now = new Date();
    const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const events = await prisma.event.findMany({
      where: {
        organizerId,
        status: 'Published',
        OR: [
          // Multi-day events that are currently running.
          { date: { lte: horizon }, endDate: { gte: now } },
          // Single-day events, kept scannable until the end of their day.
          { endDate: null, date: { gte: new Date(now.getTime() - 12 * 60 * 60 * 1000), lte: horizon } },
        ],
      },
      include: {
        organizer: { select: { id: true, name: true } },
        ticketTypes: { orderBy: { position: 'asc' } },
        tableOptions: { orderBy: { number: 'asc' } },
      },
      orderBy: { date: 'asc' },
    });

    const counts = await prisma.ticket.groupBy({
      by: ['eventId'],
      where: { eventId: { in: events.map((event) => event.id) } },
      _count: { _all: true },
    });

    const totals = new Map(counts.map((row) => [row.eventId, row._count._all]));

    res.json(
      events.map((event) => ({
        ...publicEvent(event),
        totalTickets: totals.get(event.id) ?? 0,
      })),
    );
  }),
);

/**
 * POST /api/scanner/scan — admits a ticket at a gate.
 *
 * The status transition is a conditional update, so two scanners hitting the
 * same code at the same moment can never both report a successful admission.
 */
router.post(
  '/scan',
  route(async (req, res) => {
    const staff = await requireUser(req);

    const code = asString(req.body?.ticketCode).toUpperCase();
    const eventId = asString(req.body?.eventId);
    const gate = asString(req.body?.gate) || 'Main Gate';

    if (!code) throw badRequest('Empty ticket code.');
    if (!eventId) throw badRequest('No event selected.');

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, organizerId: true, title: true },
    });

    if (!event) {
      res.status(404).json({
        valid: false,
        status: 'INVALID',
        message: 'That event no longer exists.',
      });
      return;
    }

    await requireOrganizerAccess(req, event.organizerId);

    const liveCounts = async () => {
      const [totalTickets, totalScanned] = await Promise.all([
        prisma.ticket.count({ where: { eventId } }),
        prisma.ticket.count({ where: { eventId, status: 'Scanned' } }),
      ]);

      return { totalTickets, totalScanned, liveCount: totalScanned, scannedCount: totalScanned };
    };

    const ticket = await prisma.ticket.findUnique({
      where: { ticketCode: code },
      include: {
        event: {
          select: {
            title: true,
            date: true,
            location: true,
            organizer: { select: { name: true } },
          },
        },
      },
    });

    if (!ticket) {
      res.json({
        valid: false,
        status: 'INVALID',
        message: 'Unknown ticket code. This ticket is not genuine.',
        ticketCode: code,
        ...(await liveCounts()),
      });
      return;
    }

    if (ticket.eventId !== eventId) {
      res.json({
        ...describeTicket(ticket),
        valid: false,
        status: 'WRONG_EVENT',
        message: `This ticket is for "${ticket.event?.title}", not "${event.title}".`,
        ...(await liveCounts()),
      });
      return;
    }

    if (ticket.status !== 'Active') {
      res.json({
        ...describeTicket(ticket),
        valid: false,
        ...(await liveCounts()),
      });
      return;
    }

    const admitted = await prisma.ticket.updateMany({
      where: { id: ticket.id, status: 'Active' },
      data: {
        status: 'Scanned',
        scannedAt: new Date(),
        scannedGate: gate,
        scannedBy: staff.id,
      },
    });

    if (admitted.count === 0) {
      const refreshed = await prisma.ticket.findUnique({
        where: { id: ticket.id },
        include: {
          event: {
            select: {
              title: true,
              date: true,
              location: true,
              organizer: { select: { name: true } },
            },
          },
        },
      });

      res.json({
        ...describeTicket(refreshed),
        valid: false,
        ...(await liveCounts()),
      });
      return;
    }

    const scannedAt = new Date().toISOString();

    res.json({
      valid: true,
      status: 'VALID',
      message: `Welcome, ${ticket.attendeeName}. Admitted at ${gate}.`,
      ticketCode: ticket.ticketCode,
      attendeeName: ticket.attendeeName,
      ticketType: ticket.ticketType,
      eventTitle: ticket.event?.title,
      eventDate: ticket.event?.date?.toISOString(),
      eventLocation: ticket.event?.location,
      organizerName: ticket.event?.organizer?.name,
      scannedAt,
      scannedGate: gate,
      ...(await liveCounts()),
    });
  }),
);

export default router;
