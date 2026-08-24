import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';

import { prisma } from './prisma';
import { forbidden, unauthorized } from './http';

export const SESSION_COOKIE = 'swift_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const serializeCookie = (
  name: string,
  value: string,
  maxAge: number,
): string =>
  [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
    process.env.NODE_ENV === 'production' ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');

const parseCookies = (header: string): Record<string, string> => {
  const out: Record<string, string> = {};

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;

    const key = part.slice(0, separator).trim();
    if (!key) continue;

    try {
      out[key] = decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      out[key] = part.slice(separator + 1).trim();
    }
  }

  return out;
};

const secret = (): string => {
  const configured = process.env.SESSION_SECRET?.trim();

  if (configured) return configured;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SESSION_SECRET is not set. Add it to your environment variables.',
    );
  }

  return 'swift-tickets-development-secret';
};

export interface SessionPayload {
  sub: string;
  role: string;
}

export const hashPassword = (plain: string) => bcrypt.hash(plain, 10);

export const verifyPassword = (plain: string, hash: string) =>
  bcrypt.compare(plain, hash);

export const signSession = (payload: SessionPayload): string =>
  jwt.sign(payload, secret(), { expiresIn: SESSION_MAX_AGE_SECONDS });

export const setSessionCookie = (res: Response, token: string) => {
  res.append(
    'Set-Cookie',
    serializeCookie(SESSION_COOKIE, token, SESSION_MAX_AGE_SECONDS),
  );
};

export const clearSessionCookie = (res: Response) => {
  res.append('Set-Cookie', serializeCookie(SESSION_COOKIE, '', 0));
};

const readToken = (req: Request): string | null => {
  const header = req.headers.authorization;

  if (header?.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }

  const parsed = parseCookies(req.headers.cookie || '');
  return parsed[SESSION_COOKIE] || null;
};

export const readSession = (req: Request): SessionPayload | null => {
  const token = readToken(req);
  if (!token) return null;

  try {
    return jwt.verify(token, secret()) as SessionPayload;
  } catch {
    return null;
  }
};

/**
 * Populates `req.session` when a valid token is present. Never rejects — routes
 * that require a user call `requireUser`.
 */
export const attachSession = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  (req as Request & { session?: SessionPayload | null }).session =
    readSession(req);
  next();
};

export const currentSession = (req: Request): SessionPayload | null =>
  (req as Request & { session?: SessionPayload | null }).session ?? null;

export const requireUser = async (req: Request) => {
  const session = currentSession(req);
  if (!session?.sub) throw unauthorized();

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) throw unauthorized('Your session is no longer valid.');

  return user;
};

export const requireRole = async (req: Request, ...roles: string[]) => {
  const user = await requireUser(req);

  if (!roles.includes(user.role)) {
    throw forbidden(`This action requires the ${roles.join(' or ')} role.`);
  }

  return user;
};

/**
 * Confirms the caller owns `organizerId`. Admins may act on anyone's behalf.
 */
export const requireOrganizerAccess = async (
  req: Request,
  organizerId: string,
) => {
  const user = await requireUser(req);

  if (user.role === 'Admin') return user;

  if (user.id !== organizerId) {
    throw forbidden('You can only access your own organizer data.');
  }

  return user;
};
