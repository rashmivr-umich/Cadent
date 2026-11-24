// Sends ONE test email through the demo sender, to DEMO_RECIPIENT only.
// Usage: node --env-file=.env scripts/send-test-email.mjs
import { sendDemoEmail } from "../lib/demo-email.mjs";

const r = await sendDemoEmail({
  subject: "Cadent test email",
  body: "If you can read this, demo email sending works. It can only ever reach this inbox.",
  leadName: "a test company",
});
const masked = r.sentTo.replace(/^(.).*(@.*)$/, "$1***$2");
console.log(`Sent to ${masked} at ${r.sentAt} (id ${r.id}).`);
