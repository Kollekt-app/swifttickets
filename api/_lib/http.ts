import type { NextFunction, Request, Response } from 'express';

export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, message, details);

export const unauthorized = (message = 'You must be signed in.') =>
  new HttpError(401, message);

export const forbidden = (message = 'You do not have access to this resource.') =>
  new HttpError(403, message);

export const notFound = (message = 'Not found.') => new HttpError(404, message);

export const conflict = (message: string) => new HttpError(409, message);

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

/** Forwards rejected promises to the Express error handler. */
export const route =
  (handler: AsyncHandler) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

export const asString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const asNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const asBoolean = (value: unknown): boolean =>
  value === true || value === 'true' || value === 1 || value === '1';

/** Rounds to cents so repeated float maths never leaks 0.1 + 0.2 artefacts. */
export const money = (value: number): number =>
  Math.round((Number(value) || 0) * 100) / 100;

/** Public origin of the deployment, used to build ticket verification links. */
export const originOf = (req: Request): string => {
  const configured = process.env.PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');

  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const host =
    (req.headers['x-forwarded-host'] as string) ||
    req.headers.host ||
    'localhost:3000';

  return `${proto.split(',')[0]}://${host}`;
};
