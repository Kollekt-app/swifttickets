import { badRequest } from './http';
import { transactionId } from './codes';

/**
 * Card authorisation.
 *
 * Swift runs in demo mode unless `STRIPE_SECRET_KEY` is set. Demo mode does
 * full client-side-style validation (Luhn, expiry, CVC) and approves the card,
 * which is enough to exercise the whole booking flow end to end.
 *
 * Note on going fully live: Stripe only accepts raw PAN data from merchants
 * with PCI-DSS approval, so the production path is Stripe Elements on the
 * client plus a PaymentIntent confirmation here. `confirmPaymentIntent` below
 * is that path; it is used as soon as a `paymentMethodId` reaches the server.
 */

export const isStripeLive = () => Boolean(process.env.STRIPE_SECRET_KEY?.trim());

const luhn = (digits: string): boolean => {
  let sum = 0;
  let double = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let value = Number(digits[index]);

    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }

    sum += value;
    double = !double;
  }

  return digits.length >= 12 && sum % 10 === 0;
};

export interface CardInput {
  amount: number;
  cardNumber?: string;
  expMonth?: string;
  expYear?: string;
  cvc?: string;
  cardHolderName?: string;
  paymentMethodId?: string;
  description?: string;
  receiptEmail?: string;
}

export interface AuthorizationResult {
  transactionId: string;
  amount: number;
  brand: string;
  last4: string;
  mode: 'live' | 'demo';
  status: 'succeeded';
}

const brandOf = (digits: string): string => {
  if (/^4/.test(digits)) return 'Visa';
  if (/^5[1-5]/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'American Express';
  if (/^6/.test(digits)) return 'Discover';
  return 'Card';
};

const confirmPaymentIntent = async (
  input: CardInput,
): Promise<AuthorizationResult> => {
  const body = new URLSearchParams({
    amount: String(Math.round(input.amount * 100)),
    currency: (process.env.STRIPE_CURRENCY || 'usd').toLowerCase(),
    payment_method: input.paymentMethodId as string,
    confirm: 'true',
    'automatic_payment_methods[enabled]': 'true',
    'automatic_payment_methods[allow_redirects]': 'never',
  });

  if (input.description) body.set('description', input.description);
  if (input.receiptEmail) body.set('receipt_email', input.receiptEmail);

  const response = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const payload = (await response.json()) as any;

  if (!response.ok || payload?.status !== 'succeeded') {
    throw badRequest(
      payload?.error?.message || 'The card was declined. Please try another card.',
    );
  }

  const card = payload.charges?.data?.[0]?.payment_method_details?.card;

  return {
    transactionId: payload.id,
    amount: payload.amount / 100,
    brand: card?.brand ? String(card.brand) : 'Card',
    last4: card?.last4 ?? '****',
    mode: 'live',
    status: 'succeeded',
  };
};

export const authorizeCard = async (
  input: CardInput,
): Promise<AuthorizationResult> => {
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    throw badRequest('Invalid payment amount.');
  }

  if (input.paymentMethodId && isStripeLive()) {
    return confirmPaymentIntent(input);
  }

  const digits = (input.cardNumber || '').replace(/\D/g, '');

  if (!luhn(digits)) {
    throw badRequest('That card number is not valid.');
  }

  if (!/^\d{3,4}$/.test((input.cvc || '').trim())) {
    throw badRequest('Enter the 3 or 4 digit security code.');
  }

  const month = Number(input.expMonth);
  const rawYear = Number(input.expYear);

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw badRequest('Enter a valid expiry month.');
  }

  const year = rawYear < 100 ? 2000 + rawYear : rawYear;
  const expiry = new Date(year, month, 0, 23, 59, 59);

  if (!Number.isFinite(expiry.getTime()) || expiry.getTime() < Date.now()) {
    throw badRequest('That card has expired.');
  }

  return {
    transactionId: transactionId(),
    amount: input.amount,
    brand: brandOf(digits),
    last4: digits.slice(-4),
    mode: 'demo',
    status: 'succeeded',
  };
};
