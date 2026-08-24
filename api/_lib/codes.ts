import { randomBytes, randomUUID } from 'node:crypto';
import QRCode from 'qrcode';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1

const block = (length: number): string => {
  const bytes = randomBytes(length);
  let out = '';

  for (let index = 0; index < length; index += 1) {
    out += ALPHABET[bytes[index] % ALPHABET.length];
  }

  return out;
};

/** Human-readable, unambiguous ticket code: SWIFT-8X92K-1024 */
export const ticketCode = (): string => `SWIFT-${block(5)}-${block(4)}`;

export const reference = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}-${block(4)}`;

export const transactionId = (): string => `txn_${randomUUID().replace(/-/g, '')}`;

/**
 * The public verification URL is what gets encoded, so scanning a ticket with
 * any phone camera lands on the verify page.
 */
export const verifyUrl = (code: string, origin: string): string =>
  `${origin.replace(/\/$/, '')}/verify-ticket?code=${encodeURIComponent(code)}`;

export const qrDataUrl = (payload: string): Promise<string> =>
  QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 512,
    color: { dark: '#000000', light: '#ffffff' },
  });
