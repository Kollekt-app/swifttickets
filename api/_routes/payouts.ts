import { Router } from 'express';

import { prisma } from '../_lib/prisma';
import { publicWithdrawal } from '../_lib/serialize';
import { asNumber, asString, badRequest, money, route } from '../_lib/http';
import { requireOrganizerAccess } from '../_lib/auth';
import { walletSummary } from './organizer';

const router = Router();

const PROVIDERS = ['orange_money', 'mtn_momo', 'bank', 'paypal'];

/** POST /api/payouts/request — organizer withdraws from escrow. */
router.post(
  '/request',
  route(async (req, res) => {
    const organizerId = asString(req.body?.organizerId);
    const amount = money(asNumber(req.body?.amount));
    const provider = asString(req.body?.provider) || 'orange_money';
    const phone = asString(req.body?.phone);

    if (!organizerId) throw badRequest('Missing organizer.');

    await requireOrganizerAccess(req, organizerId);

    if (!PROVIDERS.includes(provider)) {
      throw badRequest('Choose a supported payout provider.');
    }

    if (amount <= 0) throw badRequest('Enter an amount greater than zero.');

    if ((provider === 'orange_money' || provider === 'mtn_momo') && !phone) {
      throw badRequest('A mobile money number is required.');
    }

    const wallet = await walletSummary(organizerId);

    if (wallet.withdrawalsDisabled) {
      throw badRequest('Withdrawals are currently disabled for your account.');
    }

    if (amount > wallet.balance) {
      throw badRequest(
        `You can withdraw up to $${wallet.balance.toFixed(2)} right now.`,
      );
    }

    const withdrawal = await prisma.withdrawal.create({
      data: { organizerId, amount, provider, phone },
      include: { organizer: { select: { name: true } } },
    });

    res.status(201).json({
      ok: true,
      message: `Withdrawal of $${amount.toFixed(2)} requested. Settlement usually completes within 24 hours.`,
      withdrawal: publicWithdrawal(withdrawal),
      balance: (await walletSummary(organizerId)).balance,
    });
  }),
);

/** GET /api/payouts/:organizerId — an organizer's own payout history. */
router.get(
  '/:organizerId',
  route(async (req, res) => {
    const organizerId = asString(req.params.organizerId);
    await requireOrganizerAccess(req, organizerId);

    const withdrawals = await prisma.withdrawal.findMany({
      where: { organizerId },
      include: { organizer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json(withdrawals.map(publicWithdrawal));
  }),
);

export default router;
