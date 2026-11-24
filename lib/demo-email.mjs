// The ONLY way Cadent sends email. It can only ever send to DEMO_RECIPIENT.
//
// Safety locks (each one alone stops an email reaching a real company):
//  1. There is no "to" input. Passing to/cc/bcc/replyTo/recipient throws.
//  2. The recipient is read only from the DEMO_RECIPIENT setting.
//  3. If DEMO_RECIPIENT is missing or not a single valid email, nothing sends.
//  4. Right before sending, the recipient list must be exactly [DEMO_RECIPIENT].
//  5. Resend (the sender) with its test address only delivers to the Resend
//     account owner's own email, so even a code bug could not reach a company.

const SEND_URL = "https://api.resend.com/emails";
const FROM = "Cadent Demo <onboarding@resend.dev>";
const FORBIDDEN_KEYS = ["to", "cc", "bcc", "replyTo", "reply_to", "recipient", "recipients", "email"];

export class DemoEmailBlocked extends Error {}

function demoRecipient() {
  const r = (process.env.DEMO_RECIPIENT || "").trim();
  if (!r) throw new DemoEmailBlocked("DEMO_RECIPIENT is not set. Nothing was sent.");
  if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(r)) {
    throw new DemoEmailBlocked("DEMO_RECIPIENT is not a single valid email address. Nothing was sent.");
  }
  return r;
}

/**
 * Send an approved draft to the demo inbox.
 * @param {{subject: string, body: string, leadName?: string}} msg
 * @returns {Promise<{sentTo: string, sentAt: string, id: string}>}
 */
export async function sendDemoEmail(msg) {
  // Lock 1: callers cannot choose a recipient.
  for (const k of Object.keys(msg || {})) {
    if (FORBIDDEN_KEYS.includes(k)) {
      throw new DemoEmailBlocked(`"${k}" is not allowed. Demo emails only go to DEMO_RECIPIENT. Nothing was sent.`);
    }
  }
  const { subject, body, leadName } = msg || {};
  if (!subject || !body) throw new DemoEmailBlocked("Subject and body are required. Nothing was sent.");

  // Locks 2 + 3
  const recipient = demoRecipient();
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new DemoEmailBlocked("RESEND_API_KEY is not set. Nothing was sent.");

  const payload = {
    from: FROM,
    to: [recipient],
    subject: `[DEMO] ${subject}`,
    text:
      `DEMO MODE: this email was sent to the Cadent test inbox, not to ${leadName || "the company"}.\n` +
      `----------------------------------------------------------------\n\n${body}`,
  };

  // Lock 4: final check on the exact thing being sent.
  if (payload.to.length !== 1 || payload.to[0] !== demoRecipient() || payload.cc || payload.bcc) {
    throw new DemoEmailBlocked("Final recipient check failed. Nothing was sent.");
  }

  const res = await fetch(SEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Email service error ${res.status}: ${data.message || "unknown"}`);
  return { sentTo: recipient, sentAt: new Date().toISOString(), id: data.id };
}
