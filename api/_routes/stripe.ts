import { Router } from 'express';

import { asNumber, asString, route } from '../_lib/http';
import { authorizeCard, isStripeLive } from '../_lib/payments';

const router = Router();

/** POST /api/stripe/process-payment — card authorisation for the checkout. */
router.post(
  '/process-payment',
  route(async (req, res) => {
    const result = await authorizeCard({
      amount: asNumber(req.body?.amount),
      cardNumber: asString(req.body?.cardNumber),
      expMonth: asString(req.body?.expMonth),
      expYear: asString(req.body?.expYear),
      cvc: asString(req.body?.cvc),
      cardHolderName: asString(req.body?.cardHolderName),
      paymentMethodId: asString(req.body?.paymentMethodId) || undefined,
      receiptEmail: asString(req.body?.attendeeEmail) || undefined,
      description: asString(req.body?.eventTitle)
        ? `Swift Tickets — ${asString(req.body.eventTitle)}`
        : 'Swift Tickets purchase',
    });

    res.json({ ok: true, ...result, live: isStripeLive() });
  }),
);

export default router;
