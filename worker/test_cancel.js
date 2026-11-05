// Cancel flow + renewal reminders (v54). Run: node worker/test_cancel.js
const fs = require('fs'), vm = require('vm');
const src = fs.readFileSync(__dirname + '/situation-room-api.worker.js', 'utf8').replace(/\r\n/g, '\n').replace('export default {', 'globalThis.__worker = {');
vm.runInThisContext(src, { filename: 'worker.js' });
let fails = 0;
const check = (name, ok) => { console.log((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) fails++; };
(async function () {
  const calls = [], updates = [], sent = [], log = [];
  let userFields = {};
  let sub = { id: 'sub_1', status: 'active', current_end: 1790000000, notes: { vantage_user_id: 'user_1' } };
  let cancelOk = true, updateThrows = false;
  globalThis.getFromAirtable = async () => ({ id: 'rec1', fields: userFields });
  globalThis.updateAirtable = async (t, id, f) => { if (updateThrows) throw new Error('boom'); updates.push(f); log.push('update'); };
  globalThis.sendResendEmail = async (m) => { sent.push(m); log.push('email'); };
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, method: (opts && opts.method) || 'GET', body: opts && opts.body });
    if (/\/cancel$/.test(url)) return { ok: cancelOk, status: cancelOk ? 200 : 400, json: async () => ({}), text: async () => 'bad' };
    return { ok: true, status: 200, json: async () => sub };
  };
  const env = { RAZORPAY_KEY_ID: 'rzp_live_x', RAZORPAY_KEY_SECRET: 'sec' };
  const reset = () => { calls.length = 0; updates.length = 0; sent.length = 0; log.length = 0; cancelOk = true; updateThrows = false; };
  const run = async () => { const r = await handleCancelSubscription('user_1', env); return { status: r.status, json: await r.json() }; };

  // 1. active subscription: cancelled at the end of the paid cycle
  reset(); userFields = { email: 'u@x.com', subscription_status: 'active', razorpay_subscription_id: 'sub_1', next_billing_date: 1790000000000 };
  let r = await run();
  const post = calls.find(c => c.method === 'POST');
  check('active: asks Razorpay to cancel at cycle end', post && JSON.parse(post.body).cancel_at_cycle_end === 1);
  check('active: only flags the row, status stays active', updates.length === 1 && updates[0].cancel_at_period_end === true && !('subscription_status' in updates[0]));
  check('active: success with the access-until date', r.status === 200 && r.json.success && r.json.data.immediate === false && r.json.data.accessUntil === 1790000000000);
  check('active: confirmation email to the user mentions access and no more charges', sent.length === 2 && sent[0].to === 'u@x.com' && /cancelled/.test(sent[0].subject) && /not be charged again/.test(sent[0].html) && /Full access until/.test(sent[0].html));
  check('active: founder gets an alert', sent[1].to === 'kumarvivek.srv@gmail.com');

  // 2. already cancelled: no second Razorpay call
  reset(); userFields = { email: 'u@x.com', subscription_status: 'active', razorpay_subscription_id: 'sub_1', next_billing_date: 1790000000000, cancel_at_period_end: true };
  r = await run();
  check('already scheduled: success, no Razorpay call, no email', r.json.success && r.json.data.already && calls.length === 0 && sent.length === 0);

  // 3. trial user / no subscription
  reset(); userFields = { email: 'u@x.com', subscription_status: 'trial' };
  r = await run();
  check('trial user: 400 and nothing touched', r.status === 400 && !r.json.success && calls.length === 0 && updates.length === 0);

  // 4. failed payment (halted): cancel immediately
  reset(); userFields = { email: 'u@x.com', subscription_status: 'past_due', razorpay_subscription_id: 'sub_1' }; sub = { ...sub, status: 'halted' };
  r = await run();
  const post4 = calls.find(c => c.method === 'POST');
  check('past_due: cancel immediately and mark cancelled', post4 && JSON.parse(post4.body).cancel_at_cycle_end === 0 && updates[0].subscription_status === 'cancelled' && r.json.data.immediate === true);
  sub = { ...sub, status: 'active' };

  // 5. Razorpay refuses
  reset(); cancelOk = false; userFields = { email: 'u@x.com', subscription_status: 'active', razorpay_subscription_id: 'sub_1', next_billing_date: 1790000000000 };
  r = await run();
  check('Razorpay refuses: 502, nothing recorded, no email, manual route offered', r.status === 502 && !r.json.success && updates.length === 0 && sent.length === 0 && /info@virorah\.com/.test(r.json.error));

  // 6. someone else's subscription
  reset(); sub = { ...sub, notes: { vantage_user_id: 'other' } }; userFields = { email: 'u@x.com', subscription_status: 'active', razorpay_subscription_id: 'sub_1' };
  r = await run();
  check('foreign subscription: 403 and no cancel call', r.status === 403 && !calls.some(c => c.method === 'POST'));
  sub = { ...sub, notes: { vantage_user_id: 'user_1' } };

  // 7. flag cannot be saved (field missing in Airtable): the user is still told it worked
  reset(); updateThrows = true; userFields = { email: 'u@x.com', subscription_status: 'active', razorpay_subscription_id: 'sub_1', next_billing_date: 1790000000000 };
  r = await run();
  check('cancelled at Razorpay but flag write fails: user still told, email still sent', r.json.success && sent.length >= 1);

  // 8. webhook interplay
  globalThis.verifyRazorpaySignature = async () => true;
  const fire = async (ev, fields) => {
    reset(); userFields = fields;
    const payload = { subscription: { entity: { id: 'sub_1', notes: { vantage_user_id: 'user_1' }, paid_count: 3, current_end: 1795000000 } } };
    const req = { text: async () => JSON.stringify({ event: ev, payload }), headers: { get: () => 'sig' } };
    return (await handleRazorpayWebhook(req, { RAZORPAY_WEBHOOK_SECRET: 'x' })).status;
  };
  const future = Date.now() + 5 * 86400000;
  await fire('subscription.cancelled', { email: 'u@x.com', subscription_status: 'active', cancel_at_period_end: true, next_billing_date: future });
  check('webhook: early cancelled event keeps access while the paid period runs', updates.length === 0);
  await fire('subscription.cancelled', { email: 'u@x.com', subscription_status: 'active', cancel_at_period_end: true, next_billing_date: Date.now() - 1000 });
  check('webhook: cancelled event after period end marks cancelled', updates.length === 1 && updates[0].subscription_status === 'cancelled');
  await fire('subscription.cancelled', { email: 'u@x.com', subscription_status: 'active', next_billing_date: future });
  check('webhook: a cancellation not requested through us still applies', updates.length === 1 && updates[0].subscription_status === 'cancelled');
  await fire('subscription.activated', { email: 'u@x.com', subscription_status: 'cancelled', cancel_at_period_end: true, next_billing_date: 1 });
  check('webhook: resubscribing clears the cancel flag', updates[0].subscription_status === 'active' && updates[0].cancel_at_period_end === false);
  await fire('subscription.charged', { email: 'u@x.com', subscription_status: 'active', next_billing_date: future });
  check('webhook: normal renewal does not write the flag field', !('cancel_at_period_end' in updates[0]));

  // 9. housekeeping: reminders and final cancellation
  const now = Date.UTC(2026, 10, 5, 12, 0, 0);
  const day = 86400000;
  let rows = [];
  globalThis.listFromAirtable = async () => rows;
  const mk = (id, extra) => ({ id, fields: { email: id + '@x.com', subscription_status: 'active', ...extra } });
  reset(); rows = [mk('a', { next_billing_date: now + 2 * day })];
  await runSubscriptionHousekeeping(now);
  check('reminder: sent when renewal is 2 days away', sent.length === 1 && sent[0].to === 'a@x.com' && /renews on/.test(sent[0].subject) && /billing\.html/.test(sent[0].html));
  check('reminder: marker is written BEFORE the email', log[0] === 'update' && log[1] === 'email' && updates[0].renewal_reminder_for === now + 2 * day);
  reset(); rows = [mk('b', { next_billing_date: now + 2 * day, renewal_reminder_for: now + 2 * day })];
  await runSubscriptionHousekeeping(now);
  check('reminder: not repeated once the marker matches', sent.length === 0 && updates.length === 0);
  reset(); rows = [mk('c', { next_billing_date: now + 10 * day })];
  await runSubscriptionHousekeeping(now);
  check('reminder: not sent 10 days out', sent.length === 0);
  reset(); rows = [mk('d', { next_billing_date: now + 2 * day, cancel_at_period_end: true })];
  await runSubscriptionHousekeeping(now);
  check('reminder: never sent to someone who cancelled', sent.length === 0 && updates.length === 0);
  reset(); rows = [mk('e', { next_billing_date: now + 2 * day })]; updateThrows = true;
  await runSubscriptionHousekeeping(now);
  check('reminder: if the marker cannot be saved, no email (no repeat storm)', sent.length === 0);
  reset(); rows = [mk('f', { next_billing_date: now - 1000, cancel_at_period_end: true })];
  await runSubscriptionHousekeeping(now);
  check('sweep: cancellation becomes final after the paid period', updates.length === 1 && updates[0].subscription_status === 'cancelled');
  reset(); rows = [mk('g', { next_billing_date: now + 1 * day, cancel_at_period_end: true })];
  await runSubscriptionHousekeeping(now);
  check('sweep: access kept until the period ends', updates.length === 0);
  reset(); rows = [mk('h', { next_billing_date: now + 2 * day, email: '' })];
  await runSubscriptionHousekeeping(now);
  check('reminder: no email address, nothing sent', sent.length === 0);

  console.log(fails ? 'CANCEL TESTS FAILED: ' + fails : 'CANCEL TESTS PASSED');
  process.exit(fails ? 1 : 0);
})();
