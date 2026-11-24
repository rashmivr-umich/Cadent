// Safety tests for demo email. Run: npm test
// No real email is sent: the network call is replaced with a fake that records what would be sent.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { sendDemoEmail, DemoEmailBlocked } from "./demo-email.mjs";

let sent;
beforeEach(() => {
  sent = [];
  process.env.DEMO_RECIPIENT = "test-inbox@example.com";
  process.env.RESEND_API_KEY = "fake-key-for-tests";
  globalThis.fetch = async (url, opts) => {
    sent.push(JSON.parse(opts.body));
    return { ok: true, json: async () => ({ id: "fake-id" }) };
  };
});

const draft = { subject: "Your SAM.gov renewal", body: "Hi, your registration expires soon.", leadName: "Some Company LLC" };

test("refuses when a caller tries to send to a company email", async () => {
  for (const key of ["to", "cc", "bcc", "replyTo", "recipient", "email"]) {
    await assert.rejects(sendDemoEmail({ ...draft, [key]: "ceo@realcompany.com" }), DemoEmailBlocked);
  }
  assert.equal(sent.length, 0, "nothing should be sent");
});

test("always sends only to DEMO_RECIPIENT", async () => {
  const r = await sendDemoEmail(draft);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].to, ["test-inbox@example.com"]);
  assert.equal(sent[0].cc, undefined);
  assert.equal(sent[0].bcc, undefined);
  assert.equal(r.sentTo, "test-inbox@example.com");
});

test("a company email inside the body is never used as a recipient", async () => {
  await sendDemoEmail({ ...draft, body: "Contact: ceo@realcompany.com" });
  assert.deepEqual(sent[0].to, ["test-inbox@example.com"]);
});

test("sends nothing if DEMO_RECIPIENT is missing", async () => {
  delete process.env.DEMO_RECIPIENT;
  await assert.rejects(sendDemoEmail(draft), DemoEmailBlocked);
  assert.equal(sent.length, 0);
});

test("sends nothing if DEMO_RECIPIENT is blank or not one valid email", async () => {
  for (const bad of ["", "   ", "not-an-email", "a@x.com,ceo@realcompany.com", "a@x.com; b@y.com"]) {
    process.env.DEMO_RECIPIENT = bad;
    await assert.rejects(sendDemoEmail(draft), DemoEmailBlocked, `should block: "${bad}"`);
  }
  assert.equal(sent.length, 0);
});

test("sends nothing if the email key is missing", async () => {
  delete process.env.RESEND_API_KEY;
  await assert.rejects(sendDemoEmail(draft), DemoEmailBlocked);
  assert.equal(sent.length, 0);
});

test("email is clearly labeled as demo", async () => {
  await sendDemoEmail(draft);
  assert.match(sent[0].subject, /^\[DEMO\]/);
  assert.match(sent[0].text, /DEMO MODE/);
});
