/**
 * Ticket delivery. Both channels are optional: when the provider credentials
 * are absent the dispatch is recorded as "skipped" so a booking never fails
 * because notifications are not configured yet.
 */

export interface EmailDelivery {
  recipient: string;
  subject: string;
  htmlContent: string;
  simulated: boolean;
  messageId?: string;
  error?: string;
}

export interface SmsDelivery {
  recipient: string;
  messageText: string;
  simulated: boolean;
  sid?: string;
  error?: string;
}

export interface DeliveryReport {
  email: EmailDelivery;
  sms: SmsDelivery;
}

interface TicketEmailInput {
  to: string;
  attendeeName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  ticketType: string;
  ticketCode: string;
  verifyLink: string;
  qrDataUrl: string;
}

const emailHtml = (input: TicketEmailInput): string => `
<div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0a0a0a;color:#ffffff;padding:32px">
  <div style="max-width:520px;margin:0 auto;background:#111111;border:1px solid rgba(255,255,255,0.1);border-radius:24px;overflow:hidden">
    <div style="background:#ea580c;padding:20px 28px;font-weight:800;letter-spacing:2px;text-transform:uppercase;font-size:12px">
      Swift Tickets
    </div>
    <div style="padding:28px">
      <h1 style="margin:0 0 8px;font-size:24px;line-height:1.2">${input.eventTitle}</h1>
      <p style="margin:0 0 24px;color:rgba(255,255,255,0.6);font-size:14px">
        ${input.eventDate} &middot; ${input.eventLocation}
      </p>

      <div style="background:#ffffff;border-radius:16px;padding:16px;text-align:center">
        <img src="${input.qrDataUrl}" alt="Ticket QR code" width="220" height="220" style="display:block;margin:0 auto" />
      </div>

      <p style="margin:24px 0 4px;color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:2px">Ticket code</p>
      <p style="margin:0 0 24px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:20px;font-weight:700;color:#fb923c">
        ${input.ticketCode}
      </p>

      <p style="margin:0 0 4px;color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:2px">Holder</p>
      <p style="margin:0 0 24px;font-size:15px">${input.attendeeName} &middot; ${input.ticketType}</p>

      <a href="${input.verifyLink}" style="display:inline-block;background:#ea580c;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:999px;font-weight:800;font-size:12px;letter-spacing:2px;text-transform:uppercase">
        Verify this ticket
      </a>

      <p style="margin:24px 0 0;color:rgba(255,255,255,0.3);font-size:12px;line-height:1.6">
        Show this QR code at the gate. Do not share it &mdash; anyone holding the
        code can be admitted in your place.
      </p>
    </div>
  </div>
</div>`;

const sendEmail = async (
  input: TicketEmailInput,
): Promise<EmailDelivery> => {
  const subject = `Your ticket for ${input.eventTitle}`;
  const htmlContent = emailHtml(input);
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.NOTIFICATION_FROM_EMAIL?.trim();

  const base = { recipient: input.to, subject, htmlContent };

  if (!apiKey || !from) return { ...base, simulated: true };

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject,
        html: htmlContent,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as any;

    if (!response.ok) {
      return {
        ...base,
        simulated: true,
        error: payload?.message || `Resend responded ${response.status}`,
      };
    }

    return { ...base, simulated: false, messageId: payload?.id };
  } catch (error) {
    return { ...base, simulated: true, error: (error as Error).message };
  }
};

const sendSms = async (
  to: string,
  messageText: string,
): Promise<SmsDelivery> => {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();

  const base = { recipient: to, messageText };

  if (!sid || !token || !from || !to) return { ...base, simulated: true };

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: from, Body: messageText }),
      },
    );

    const payload = (await response.json().catch(() => ({}))) as any;

    if (!response.ok) {
      return {
        ...base,
        simulated: true,
        error: payload?.message || `Twilio responded ${response.status}`,
      };
    }

    return { ...base, simulated: false, sid: payload?.sid };
  } catch (error) {
    return { ...base, simulated: true, error: (error as Error).message };
  }
};

/**
 * Sends the ticket over both channels. Failures are reported, never thrown —
 * a booking that is already paid for must not be rolled back because an SMS
 * gateway is down.
 */
export const deliverTicket = async (
  input: TicketEmailInput & { phone?: string | null },
): Promise<DeliveryReport> => {
  const messageText = [
    `SWIFT TICKETS: ${input.ticketCode}`,
    `${input.eventTitle} - ${input.eventDate}`,
    `Verify: ${input.verifyLink}`,
  ].join('\n');

  const [email, sms] = await Promise.all([
    sendEmail(input),
    sendSms(input.phone || '', messageText),
  ]);

  return { email, sms };
};
