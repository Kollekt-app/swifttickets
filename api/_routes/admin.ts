import { Router } from 'express';

import { prisma } from '../_lib/prisma';
import { publicUser, publicWithdrawal } from '../_lib/serialize';
import { asString, badRequest, notFound, route } from '../_lib/http';
import { requireRole } from '../_lib/auth';

const router = Router();

const ROLES = ['Admin', 'Organizer', 'Customer'];

// Every route below is admin-only.
router.use((req, _res, next) => {
  requireRole(req, 'Admin').then(() => next(), next);
});

/** GET /api/admin/users */
router.get(
  '/users',
  route(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    res.json(users.map(publicUser));
  }),
);

/** POST /api/admin/users/:uid/role */
router.post(
  '/users/:uid/role',
  route(async (req, res) => {
    const role = asString(req.body?.role);

    if (!ROLES.includes(role)) throw badRequest('Unknown role.');

    const target = await prisma.user.findUnique({ where: { id: req.params.uid } });
    if (!target) throw notFound('That user does not exist.');

    if (target.role === 'Admin' && role !== 'Admin') {
      const admins = await prisma.user.count({ where: { role: 'Admin' } });

      if (admins <= 1) {
        throw badRequest('You cannot remove the last remaining admin.');
      }
    }

    const user = await prisma.user.update({
      where: { id: target.id },
      data: { role: role as any },
    });

    res.json({ ok: true, user: publicUser(user) });
  }),
);

/** GET /api/admin/payouts/pending */
router.get(
  '/payouts/pending',
  route(async (_req, res) => {
    const withdrawals = await prisma.withdrawal.findMany({
      where: { status: 'pending' },
      include: { organizer: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    res.json(withdrawals.map(publicWithdrawal));
  }),
);

/**
 * POST /api/admin/payouts/process — settle or reject a withdrawal.
 * Rejecting releases the held amount back into the organizer's balance.
 */
router.post(
  '/payouts/process',
  route(async (req, res) => {
    const withdrawalId = asString(req.body?.withdrawalId);
    const status = asString(req.body?.status);

    if (!withdrawalId) throw badRequest('Missing withdrawal id.');
    if (status !== 'paid' && status !== 'failed') {
      throw badRequest('Status must be "paid" or "failed".');
    }

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) throw notFound('That withdrawal does not exist.');

    if (withdrawal.status !== 'pending') {
      throw badRequest(`This withdrawal was already marked ${withdrawal.status}.`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const record = await tx.withdrawal.update({
        where: { id: withdrawal.id },
        data: { status, processedAt: new Date() },
        include: { organizer: { select: { name: true } } },
      });

      if (status === 'paid') {
        await tx.walletTransaction.create({
          data: {
            organizerId: withdrawal.organizerId,
            type: 'debit',
            amount: withdrawal.amount,
            description: `Payout via ${withdrawal.provider}`,
            reference: `PAYOUT-${withdrawal.id}`,
          },
        });
      }

      return record;
    });

    res.json({ ok: true, withdrawal: publicWithdrawal(updated) });
  }),
);

/** GET /api/admin/stats — platform overview. */
router.get(
  '/stats',
  route(async (_req, res) => {
    const [users, events, tickets, revenue, pendingPayouts] = await Promise.all([
      prisma.user.count(),
      prisma.event.count(),
      prisma.ticket.count({ where: { status: { notIn: ['Refunded', 'Cancelled'] } } }),
      prisma.ticket.aggregate({
        where: { status: { notIn: ['Refunded', 'Cancelled'] } },
        _sum: { pricePaid: true },
      }),
      prisma.withdrawal.count({ where: { status: 'pending' } }),
    ]);

    res.json({
      users,
      events,
      tickets,
      grossRevenue: revenue._sum.pricePaid ?? 0,
      pendingPayouts,
    });
  }),
);

export default router;
