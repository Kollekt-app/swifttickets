import { Router } from 'express';

import { prisma } from '../_lib/prisma';
import {
  publicCompetition,
  publicVoteTransaction,
} from '../_lib/serialize';
import {
  asBoolean,
  asNumber,
  asString,
  badRequest,
  conflict,
  forbidden,
  money,
  notFound,
  route,
} from '../_lib/http';
import { requireOrganizerAccess, requireUser } from '../_lib/auth';
import { reference } from '../_lib/codes';

const router = Router();

const withCandidates = {
  candidates: {
    orderBy: [{ voteCount: 'desc' as const }, { position: 'asc' as const }],
  },
};

const parseDate = (value: unknown, label: string): Date => {
  const parsed = new Date(asString(value));

  if (Number.isNaN(parsed.getTime())) {
    throw badRequest(`Please provide a valid ${label}.`);
  }

  return parsed;
};

/** GET /api/competitions — public list, live vote counts included. */
router.get(
  '/',
  route(async (_req, res) => {
    const competitions = await prisma.competition.findMany({
      where: { status: { not: 'Draft' } },
      include: withCandidates,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    res.json(competitions.map(publicCompetition));
  }),
);

/** POST /api/competitions — organizers launch a voting competition. */
router.post(
  '/',
  route(async (req, res) => {
    const user = await requireUser(req);

    if (user.role !== 'Organizer' && user.role !== 'Admin') {
      throw forbidden('Only organizers can create competitions.');
    }

    const title = asString(req.body?.title);
    if (!title) throw badRequest('Give the competition a title.');

    const startDate = parseDate(req.body?.startDate, 'start date');
    const endDate = parseDate(req.body?.endDate, 'end date');

    if (endDate < startDate) {
      throw badRequest('The end date cannot be before the start date.');
    }

    const votePrice = asNumber(req.body?.votePrice, 1);
    if (votePrice <= 0) throw badRequest('Vote price must be greater than zero.');

    const commissionRate = Math.min(
      1,
      Math.max(0, asNumber(req.body?.commissionRate, 0.1)),
    );

    const candidates = (
      Array.isArray(req.body?.candidates) ? req.body.candidates : []
    ).map((candidate: any, index: number) => ({
      contestantNumber:
        asString(candidate?.contestantNumber) ||
        `#${String(index + 1).padStart(2, '0')}`,
      name: asString(candidate?.name),
      description: asString(candidate?.description) || 'Contestant',
      imageUrl: asString(candidate?.imageUrl),
      position: index,
    }));

    if (candidates.some((candidate) => !candidate.name)) {
      throw badRequest('Every contestant needs a name.');
    }

    const competition = await prisma.competition.create({
      data: {
        title,
        description: asString(req.body?.description),
        imageUrl: asString(req.body?.imageUrl),
        organizerId: user.id,
        associatedEvent: asString(req.body?.associatedEvent) || null,
        category: asString(req.body?.category) || null,
        location: asString(req.body?.location) || null,
        votePrice,
        votePackages: Array.isArray(req.body?.votePackages)
          ? req.body.votePackages
          : undefined,
        commissionRate,
        showLiveLeaderboard: asBoolean(req.body?.showLiveLeaderboard),
        startDate,
        endDate,
        status: asString(req.body?.status) === 'Draft' ? 'Draft' : 'Active',
        ...(candidates.length ? { candidates: { create: candidates } } : {}),
      },
      include: withCandidates,
    });

    res.status(201).json(publicCompetition(competition));
  }),
);

/** POST /api/competitions/:id/candidates — add a contestant after launch. */
router.post(
  '/:id/candidates',
  route(async (req, res) => {
    const competition = await prisma.competition.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { candidates: true } } },
    });

    if (!competition) throw notFound('That competition does not exist.');

    await requireOrganizerAccess(req, competition.organizerId);

    const name = asString(req.body?.name);
    if (!name) throw badRequest('The contestant needs a name.');

    const count = competition._count.candidates;

    await prisma.candidate.create({
      data: {
        competitionId: competition.id,
        contestantNumber:
          asString(req.body?.contestantNumber) ||
          `#${String(count + 1).padStart(2, '0')}`,
        name,
        description: asString(req.body?.description) || 'Contestant candidate',
        imageUrl: asString(req.body?.imageUrl),
        position: count,
      },
    });

    const updated = await prisma.competition.findUnique({
      where: { id: competition.id },
      include: withCandidates,
    });

    res.status(201).json(publicCompetition(updated));
  }),
);

/**
 * POST /api/competitions/:id/votes
 *
 * Records a paid vote bundle: bumps the contestant's tally, files the
 * transaction and credits the organizer with their share.
 */
router.post(
  '/:id/votes',
  route(async (req, res) => {
    const competition = await prisma.competition.findUnique({
      where: { id: req.params.id },
      include: withCandidates,
    });

    if (!competition) throw notFound('That competition does not exist.');

    if (competition.status !== 'Active') {
      throw conflict('Voting is not open for this competition.');
    }

    if (new Date() > competition.endDate) {
      throw conflict('Voting has closed for this competition.');
    }

    const candidateId = asString(req.body?.candidateId);
    const candidate = competition.candidates.find(
      (entry) => entry.id === candidateId,
    );

    if (!candidate) throw notFound('That contestant is not in this competition.');

    const voteQuantity = Math.trunc(asNumber(req.body?.voteQuantity, 1));

    if (voteQuantity < 1 || voteQuantity > 10000) {
      throw badRequest('Choose between 1 and 10,000 votes.');
    }

    // The price is derived server-side; a tampered client total is ignored.
    const amountPaid = money(voteQuantity * competition.votePrice);
    const commissionAmount = money(amountPaid * competition.commissionRate);
    const organizerEarnings = money(amountPaid - commissionAmount);

    const paymentMethod = asString(req.body?.paymentMethod) || 'orange_money';
    const txRef = reference(`VOTE-${paymentMethod.toUpperCase()}`);

    const [, vote] = await prisma.$transaction([
      prisma.candidate.update({
        where: { id: candidate.id },
        data: { voteCount: { increment: voteQuantity } },
      }),
      prisma.voteTransaction.create({
        data: {
          competitionId: competition.id,
          candidateId: candidate.id,
          voterName: asString(req.body?.voterName) || 'Anonymous Voter',
          voterPhone: asString(req.body?.voterPhone),
          voteQuantity,
          amountPaid,
          commissionAmount,
          organizerEarnings,
          paymentMethod,
          reference: txRef,
        },
        include: {
          competition: { select: { title: true } },
          candidate: { select: { name: true, contestantNumber: true } },
        },
      }),
      prisma.walletTransaction.create({
        data: {
          organizerId: competition.organizerId,
          type: 'credit',
          amount: organizerEarnings,
          description: `${voteQuantity} vote(s) for ${candidate.name} — ${competition.title}`,
          reference: txRef,
        },
      }),
    ]);

    const updated = await prisma.competition.findUnique({
      where: { id: competition.id },
      include: withCandidates,
    });

    res.status(201).json({
      ok: true,
      transaction: publicVoteTransaction(vote),
      competition: publicCompetition(updated),
    });
  }),
);

/** GET /api/competitions/:id/transactions — organizer earnings ledger. */
router.get(
  '/:id/transactions',
  route(async (req, res) => {
    const competition = await prisma.competition.findUnique({
      where: { id: req.params.id },
      select: { organizerId: true },
    });

    if (!competition) throw notFound('That competition does not exist.');

    await requireOrganizerAccess(req, competition.organizerId);

    const votes = await prisma.voteTransaction.findMany({
      where: { competitionId: req.params.id },
      include: {
        competition: { select: { title: true } },
        candidate: { select: { name: true, contestantNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    res.json(votes.map(publicVoteTransaction));
  }),
);

/** DELETE /api/competitions/:id */
router.delete(
  '/:id',
  route(async (req, res) => {
    const competition = await prisma.competition.findUnique({
      where: { id: req.params.id },
      select: { organizerId: true },
    });

    if (!competition) throw notFound('That competition does not exist.');

    await requireOrganizerAccess(req, competition.organizerId);
    await prisma.competition.delete({ where: { id: req.params.id } });

    res.json({ ok: true });
  }),
);

export default router;
