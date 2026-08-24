import { Router } from 'express';

import { prisma } from '../_lib/prisma';
import {
  publicEvent,
  publicTicket,
  publicTransaction,
} from '../_lib/serialize';
import { asString, money, notFound, route } from '../_lib/http';
import { requireOrganizerAccess } from '../_lib/auth';

const router = Router();

/**
 * Escrow balance = credited sales − debits − money held by pending
 * withdrawal requests.
 *
 * Settled payouts are not subtracted here: marking a withdrawal `paid` writes
 * its own `debit` transaction, so it is already inside `debited`.
 */
export const walletSummary = async (organizerId: string) => {
  const [ledger, withdrawals] = await Promise.all([
    prisma.walletTransaction.groupBy({
      by: ['type'],
      where: { organizerId },
      _sum: { amount: true },
    }),
    prisma.withdrawal.groupBy({
      by: ['status'],
      where: { organizerId },
      _sum: { amount: true },
    }),
  ]);

  const ledgerTotal = (type: string) =>
    ledger.find((row) => row.type === type)?._sum.amount ?? 0;

  const withdrawalTotal = (status: string) =>
    withdrawals.find((row) => row.status === status)?._sum.amount ?? 0;

  const credited = ledgerTotal('credit');
  const debited = ledgerTotal('debit');
  const pendingWithdrawals = withdrawalTotal('pending');

  return {
    balance: Math.max(0, money(credited - debited - pendingWithdrawals)),
    pendingBalance: money(pendingWithdrawals),
    pendingWithdrawals: money(pendingWithdrawals),
    lifetimeEarnings: money(credited),
    lifetimePaidOut: money(withdrawalTotal('paid')),
    riskLevel: 'low' as const,
    withdrawalsDisabled: false,
  };
};

/** GET /api/organizer/wallet/:organizerId */
router.get(
  '/wallet/:organizerId',
  route(async (req, res) => {
    const organizerId = asString(req.params.organizerId);
    await requireOrganizerAccess(req, organizerId);

    res.json(await walletSummary(organizerId));
  }),
);

/** GET /api/organizer/transactions/:organizerId */
router.get(
  '/transactions/:organizerId',
  route(async (req, res) => {
    const organizerId = asString(req.params.organizerId);
    await requireOrganizerAccess(req, organizerId);

    const transactions = await prisma.walletTransaction.findMany({
      where: { organizerId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(transactions.map(publicTransaction));
  }),
);

/** GET /api/organizer/events/:organizerId — every event, drafts included. */
router.get(
  '/events/:organizerId',
  route(async (req, res) => {
    const organizerId = asString(req.params.organizerId);
    await requireOrganizerAccess(req, organizerId);

    const events = await prisma.event.findMany({
      where: { organizerId },
      include: {
        organizer: { select: { id: true, name: true } },
        ticketTypes: { orderBy: { position: 'asc' } },
        tableOptions: { orderBy: { number: 'asc' } },
      },
      orderBy: { date: 'desc' },
    });

    res.json(events.map(publicEvent));
  }),
);

/** GET /api/organizer/analytics/:eventId */
router.get(
  '/analytics/:eventId',
  route(async (req, res) => {
    const eventId = asString(req.params.eventId);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { ticketTypes: { orderBy: { position: 'asc' } } },
    });

    if (!event) throw notFound('That event does not exist.');

    await requireOrganizerAccess(req, event.organizerId);

    const tickets = await prisma.ticket.findMany({
      where: { eventId },
      include: { event: { select: { title: true, date: true, location: true, imageUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const live = tickets.filter((ticket) => ticket.status !== 'Refunded' && ticket.status !== 'Cancelled');
    const scanned = tickets.filter((ticket) => ticket.status === 'Scanned' || ticket.status === 'Used');

    const revenue = money(
      live.reduce((total, ticket) => total + ticket.pricePaid, 0),
    );

    const capacity = event.ticketTypes.reduce(
      (total, type) => total + type.capacity,
      0,
    );

    const percent = (part: number, whole: number) =>
      whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;

    const byType = event.ticketTypes.map((type) => {
      const sold = live.filter((ticket) => ticket.ticketType === type.name);

      return {
        name: type.name,
        price: type.price,
        capacity: type.capacity,
        sold: sold.length,
        revenue: money(sold.reduce((total, ticket) => total + ticket.pricePaid, 0)),
      };
    });

    res.json({
      eventId: event.id,
      eventTitle: event.title,
      ticketsSold: live.length,
      ticketsScanned: scanned.length,
      ticketsRefunded: tickets.length - live.length,
      capacity,
      revenue,
      attendanceRate: percent(scanned.length, live.length),
      conversionRate: percent(live.length, event.viewCount || live.length),
      sellThroughRate: percent(live.length, capacity),
      viewCount: event.viewCount,
      byTicketType: byType,
      recentTickets: tickets.slice(0, 100).map(publicTicket),
    });
  }),
);

export default router;
