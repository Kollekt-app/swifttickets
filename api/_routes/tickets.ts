import { Router } from 'express';

import { prisma } from '../_lib/prisma';
import { publicTicket } from '../_lib/serialize';
import {
  asString,
  badRequest,
  notFound,
  originOf,
  route,
} from '../_lib/http';
import { currentSession, requireUser } from '../_lib/auth';
import { qrDataUrl, ticketCode, verifyUrl } from '../_lib/codes';
import { deliverTicket } from '../_lib/notify';

const router = Router();

const eventSelect = {
  select: {
    title: true,
    date: true,
    location: true,
    imageUrl: true,
    organizer: { select: { name: true } },
  },
} as const;

interface VerificationResult {
  valid: boolean;
  status: 'VALID' | 'ALREADY_SCANNED' | 'REFUNDED' | 'TRANSFERRED' | 'INVALID' | 'CANCELLED';
  message: string;
  ticketCode?: string;
  attendeeName?: string;
  ticketType?: string;
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  organizerName?: string;
  scannedAt?: string;
  scannedGate?: string;
}

/** Shared by the public verifier and the gate scanner. */
export const describeTicket = (ticket: any): VerificationResult => {
  const base = {
    ticketCode: ticket.ticketCode,
    attendeeName: ticket.attendeeName,
    ticketType: ticket.ticketType,
    eventTitle: ticket.event?.title,
    eventDate: ticket.event?.date?.toISOString?.() ?? undefined,
    eventLocation: ticket.event?.location,
    organizerName: ticket.event?.organizer?.name,
    scannedAt: ticket.scannedAt?.toISOString?.() ?? undefined,
    scannedGate: ticket.scannedGate ?? undefined,
  };

  if (ticket.status === 'Refunded') {
    return {
      ...base,
      valid: false,
      status: 'REFUNDED',
      message: 'This ticket was refunded and is no longer valid.',
    };
  }

  if (ticket.status === 'Cancelled') {
    return {
      ...base,
      valid: false,
      status: 'CANCELLED',
      message: 'This ticket was cancelled.',
    };
  }

  if (ticket.status === 'Scanned' || ticket.status === 'Used') {
    return {
      ...base,
      valid: false,
      status: 'ALREADY_SCANNED',
      message: ticket.scannedAt
        ? `Already admitted at ${new Date(ticket.scannedAt).toLocaleString()}${
            ticket.scannedGate ? ` via ${ticket.scannedGate}` : ''
          }.`
        : 'This ticket has already been admitted.',
    };
  }

  return {
    ...base,
    valid: true,
    status: 'VALID',
    message: 'Genuine ticket, not yet scanned.',
  };
};

/** GET /api/tickets/verify/:code — public authenticity check. */
router.get(
  '/verify/:code',
  route(async (req, res) => {
    const code = asString(req.params.code).toUpperCase();

    const ticket = await prisma.ticket.findUnique({
      where: { ticketCode: code },
      include: { event: eventSelect },
    });

    if (!ticket) {
      res.json({
        valid: false,
        status: 'INVALID',
        message: 'No ticket exists with that code. It may be counterfeit.',
      } satisfies VerificationResult);
      return;
    }

    res.json(describeTicket(ticket));
  }),
);

/** GET /api/tickets/user/:userId — the signed-in holder's wallet. */
router.get(
  '/user/:userId',
  route(async (req, res) => {
    const user = await requireUser(req);
    const requested = asString(req.params.userId);

    // The client may resolve the identifier to an id or an email; either is
    // accepted, but only for the caller's own account (admins see anyone).
    const isSelf =
      requested === user.id ||
      requested.toLowerCase() === user.email.toLowerCase();

    if (!isSelf && user.role !== 'Admin') {
      res.json({ all: [], upcoming: [], past: [] });
      return;
    }

    const target = isSelf
      ? user
      : (await prisma.user.findFirst({
          where: {
            OR: [{ id: requested }, { email: requested.toLowerCase() }],
          },
        })) ?? user;

    const tickets = await prisma.ticket.findMany({
      where: {
        OR: [{ userId: target.id }, { attendeeEmail: target.email.toLowerCase() }],
      },
      include: { event: eventSelect },
      orderBy: { createdAt: 'desc' },
    });

    const now = Date.now();
    const all = tickets.map(publicTicket);

    res.json({
      all,
      upcoming: all.filter(
        (ticket) => ticket.eventDate && new Date(ticket.eventDate).getTime() >= now,
      ),
      past: all.filter(
        (ticket) => ticket.eventDate && new Date(ticket.eventDate).getTime() < now,
      ),
    });
  }),
);

/**
 * POST /api/tickets/transfer — reissues a ticket to a new holder. The original
 * code is retired so it cannot be presented at the gate afterwards.
 */
router.post(
  '/transfer',
  route(async (req, res) => {
    const user = await requireUser(req);

    const code = asString(req.body?.ticketCode).toUpperCase();
    const newName = asString(req.body?.newRecipientName);
    const newEmail = asString(req.body?.newRecipientEmail).toLowerCase();
    const newPhone = asString(req.body?.newRecipientPhone);

    if (!code) throw badRequest('Missing ticket code.');
    if (!newName) throw badRequest('Recipient name is required.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail)) {
      throw badRequest('A valid recipient email is required.');
    }

    const ticket = await prisma.ticket.findUnique({
      where: { ticketCode: code },
      include: { event: eventSelect },
    });

    if (!ticket) throw notFound('No ticket exists with that code.');

    const owns =
      ticket.userId === user.id ||
      ticket.attendeeEmail.toLowerCase() === user.email.toLowerCase();

    if (!owns && user.role !== 'Admin') {
      throw badRequest('You can only transfer your own tickets.');
    }

    if (ticket.status !== 'Active') {
      throw badRequest(
        ticket.status === 'Scanned' || ticket.status === 'Used'
          ? 'This ticket has already been admitted and cannot be transferred.'
          : `This ticket is ${ticket.status.toLowerCase()} and cannot be transferred.`,
      );
    }

    const recipient = await prisma.user.findUnique({ where: { email: newEmail } });
    const issuedCode = ticketCode();

    const [, reissued] = await prisma.$transaction([
      prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: 'Cancelled' },
      }),
      prisma.ticket.create({
        data: {
          eventId: ticket.eventId,
          userId: recipient?.id ?? null,
          attendeeName: newName,
          attendeeEmail: newEmail,
          attendeePhone: newPhone || null,
          ticketType: ticket.ticketType,
          ticketCode: issuedCode,
          pricePaid: ticket.pricePaid,
          promoCodeUsed: ticket.promoCodeUsed,
          insuranceId: ticket.insuranceId,
          paymentRef: ticket.paymentRef,
          transferredFrom: ticket.ticketCode,
        },
        include: { event: eventSelect },
      }),
    ]);

    const origin = originOf(req);
    const link = verifyUrl(issuedCode, origin);
    const qr = await qrDataUrl(link);

    const notifications = await deliverTicket({
      to: newEmail,
      phone: newPhone || null,
      attendeeName: newName,
      eventTitle: ticket.event?.title ?? 'Your event',
      eventDate: ticket.event?.date
        ? new Date(ticket.event.date).toLocaleString()
        : '',
      eventLocation: ticket.event?.location ?? '',
      ticketType: ticket.ticketType,
      ticketCode: issuedCode,
      verifyLink: link,
      qrDataUrl: qr,
    });

    res.json({
      ok: true,
      message: `Ticket transferred to ${newName}.`,
      ticket: publicTicket(reissued),
      newTicketCode: issuedCode,
      qrDataUrl: qr,
      notifications,
    });
  }),
);

/** GET /api/tickets/:code/qr — regenerate the QR for an existing ticket. */
router.get(
  '/:code/qr',
  route(async (req, res) => {
    const code = asString(req.params.code).toUpperCase();

    const ticket = await prisma.ticket.findUnique({
      where: { ticketCode: code },
      select: { ticketCode: true, attendeeEmail: true, userId: true },
    });

    if (!ticket) throw notFound('No ticket exists with that code.');

    const session = currentSession(req);
    if (!session) throw badRequest('Sign in to download your ticket.');

    const link = verifyUrl(ticket.ticketCode, originOf(req));

    res.json({ ticketCode: ticket.ticketCode, verifyUrl: link, qrDataUrl: await qrDataUrl(link) });
  }),
);

export default router;
