import { Router } from 'express';

import { prisma } from '../_lib/prisma';
import { publicTicket } from '../_lib/serialize';
import {
  asNumber,
  asString,
  badRequest,
  conflict,
  money,
  notFound,
  originOf,
  route,
} from '../_lib/http';
import { currentSession } from '../_lib/auth';
import { qrDataUrl, reference, ticketCode, verifyUrl } from '../_lib/codes';
import { deliverTicket } from '../_lib/notify';

const router = Router();

const TABLE_PREFIX = /^Table\s+(\d+)$/i;

const formatEventDate = (date: Date): string =>
  date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

/**
 * POST /api/bookings
 *
 * Issues one ticket per seat, reserves inventory and credits the organizer's
 * escrow wallet — all inside a single transaction so an oversell can never be
 * committed. Delivery (email + SMS) happens after the commit.
 */
router.post(
  '/',
  route(async (req, res) => {
    const eventId = asString(req.body?.eventId);
    const ticketTypeName = asString(req.body?.ticketType);
    const attendeeName = asString(req.body?.attendeeName);
    const attendeeEmail = asString(req.body?.attendeeEmail).toLowerCase();
    const attendeePhone = asString(req.body?.attendeePhone);
    const quantity = Math.max(1, Math.min(20, Math.trunc(asNumber(req.body?.quantity, 1))));
    const pricePaid = money(asNumber(req.body?.pricePaid));
    const paymentProvider = asString(req.body?.paymentProvider) || 'orange_money';

    if (!eventId) throw badRequest('Missing event.');
    if (!ticketTypeName) throw badRequest('Choose a ticket type.');
    if (!attendeeName) throw badRequest('Attendee name is required.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(attendeeEmail)) {
      throw badRequest('A valid attendee email is required.');
    }
    if (pricePaid < 0) throw badRequest('Invalid payment amount.');

    // Trust the signed session over the client-supplied userId.
    const session = currentSession(req);
    const userId =
      session?.sub ??
      (asString(req.body?.userId) || null);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organizer: { select: { id: true, name: true } },
        ticketTypes: true,
        tableOptions: true,
      },
    });

    if (!event) throw notFound('That event does not exist.');
    if (event.status === 'Cancelled') {
      throw conflict('This event has been cancelled.');
    }

    const tableMatch = ticketTypeName.match(TABLE_PREFIX);
    const paymentRef = reference(
      paymentProvider === 'stripe' ? 'STRIPE' : 'MOMO',
    );

    // Guard against a stale user id in localStorage pointing at a deleted user.
    const ownerId = userId
      ? (await prisma.user.findUnique({ where: { id: userId }, select: { id: true } }))?.id ?? null
      : null;

    const codes = Array.from({ length: quantity }, () => ticketCode());
    const perTicketPrice = money(pricePaid / quantity);

    const created = await prisma.$transaction(async (tx) => {
      if (tableMatch) {
        const number = Number(tableMatch[1]);

        const table = await tx.tableOption.findUnique({
          where: { eventId_number: { eventId: event.id, number } },
        });

        if (!table) throw notFound(`Table ${number} is not available at this event.`);
        if (table.isReserved) throw conflict(`Table ${number} is already reserved.`);

        await tx.tableOption.update({
          where: { id: table.id },
          data: { isReserved: true },
        });
      } else {
        const ticketType = event.ticketTypes.find(
          (type) => type.name === ticketTypeName,
        );

        if (!ticketType) throw notFound('That ticket type is not on sale.');

        const remaining = ticketType.capacity - ticketType.sold;

        if (remaining < quantity) {
          throw conflict(
            remaining <= 0
              ? `"${ticketType.name}" is sold out.`
              : `Only ${remaining} "${ticketType.name}" ticket(s) left.`,
          );
        }

        // Conditional update: if another booking took the last seats between
        // the read above and here, the count is 0 and we abort.
        const claimed = await tx.ticketType.updateMany({
          where: { id: ticketType.id, sold: { lte: ticketType.capacity - quantity } },
          data: { sold: { increment: quantity } },
        });

        if (claimed.count === 0) {
          throw conflict('Those seats were just taken. Please try again.');
        }
      }

      await tx.ticket.createMany({
        data: codes.map((code) => ({
          eventId: event.id,
          userId: ownerId,
          attendeeName,
          attendeeEmail,
          attendeePhone: attendeePhone || null,
          ticketType: ticketTypeName,
          ticketCode: code,
          pricePaid: perTicketPrice,
          deliveryMethod: 'QR',
          channel: 'Web',
          paymentRef,
          promoCodeUsed: asString(req.body?.promoCode) || null,
        })),
      });

      if (pricePaid > 0) {
        await tx.walletTransaction.create({
          data: {
            organizerId: event.organizerId,
            type: 'credit',
            amount: pricePaid,
            description: `${quantity}x ${ticketTypeName} — ${event.title}`,
            reference: paymentRef,
          },
        });
      }

      return tx.ticket.findMany({
        where: { ticketCode: { in: codes } },
        include: { event: { select: { title: true, date: true, location: true, imageUrl: true } } },
        orderBy: { createdAt: 'asc' },
      });
    });

    const primary = created[0];
    const origin = originOf(req);
    const link = verifyUrl(primary.ticketCode, origin);
    const qr = await qrDataUrl(link);

    const notifications = await deliverTicket({
      to: attendeeEmail,
      phone: attendeePhone || null,
      attendeeName,
      eventTitle: event.title,
      eventDate: formatEventDate(event.date),
      eventLocation: event.location,
      ticketType: ticketTypeName,
      ticketCode: primary.ticketCode,
      verifyLink: link,
      qrDataUrl: qr,
    });

    res.status(201).json({
      ...publicTicket(primary),
      primaryCode: primary.ticketCode,
      quantity: created.length,
      totalPaid: pricePaid,
      paymentReference: paymentRef,
      qrDataUrl: qr,
      verifyUrl: link,
      tickets: created.map(publicTicket),
      notifications,
    });
  }),
);

export default router;
