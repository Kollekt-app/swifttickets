import { Router } from 'express';

import { prisma } from '../_lib/prisma';
import { publicUser } from '../_lib/serialize';
import {
  badRequest,
  conflict,
  route,
  asString,
  unauthorized,
} from '../_lib/http';
import {
  clearSessionCookie,
  hashPassword,
  requireUser,
  setSessionCookie,
  signSession,
  verifyPassword,
} from '../_lib/auth';

const router = Router();

const normalizeEmail = (value: unknown) => asString(value).toLowerCase();

const normalizePhone = (value: unknown) => {
  const raw = asString(value);
  if (!raw) return null;
  const compact = raw.replace(/[^\d+]/g, '');
  return compact || null;
};

/**
 * The very first account to register becomes the Admin. Every later account is
 * a Customer or an Organizer; Admin can only be granted from the admin panel.
 */
const resolveRole = async (requested: unknown): Promise<'Admin' | 'Organizer' | 'Customer'> => {
  const total = await prisma.user.count();
  if (total === 0) return 'Admin';

  return asString(requested) === 'Organizer' ? 'Organizer' : 'Customer';
};

router.post(
  '/register',
  route(async (req, res) => {
    const name = asString(req.body?.name);
    const email = normalizeEmail(req.body?.email);
    const phone = normalizePhone(req.body?.phone);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!name) throw badRequest('Please enter your name.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw badRequest('Please enter a valid email address.');
    }
    if (password.length < 6) {
      throw badRequest('Password must be at least 6 characters.');
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw conflict('An account already exists with that email. Try signing in.');
    }

    const role = await resolveRole(req.body?.role);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        role,
        passwordHash: await hashPassword(password),
        plan: asString(req.body?.plan) || null,
      },
    });

    setSessionCookie(res, signSession({ sub: user.id, role: user.role }));

    res.status(201).json({ user: publicUser(user) });
  }),
);

router.post(
  '/login',
  route(async (req, res) => {
    const identifier = asString(req.body?.identifier);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!identifier) throw badRequest('Please enter your email or phone number.');
    if (!password) throw badRequest('Please enter your password.');

    const user = identifier.includes('@')
      ? await prisma.user.findUnique({
          where: { email: identifier.toLowerCase() },
        })
      : await prisma.user.findFirst({
          where: { phone: normalizePhone(identifier) ?? identifier },
        });

    // Same message either way so the endpoint cannot be used to discover
    // which emails have accounts.
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw unauthorized('Incorrect email/phone or password.');
    }

    setSessionCookie(res, signSession({ sub: user.id, role: user.role }));

    res.json({ user: publicUser(user) });
  }),
);

router.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get(
  '/me',
  route(async (req, res) => {
    const user = await requireUser(req);
    res.json({ user: publicUser(user) });
  }),
);

export default router;
