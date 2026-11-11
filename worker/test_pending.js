// A1: pending-charge marker and recovery, run against a real SQLite engine (same SQL dialect as D1)
const fs = require('fs'), vm = require('vm');
process.removeAllListeners('warning');
const { DatabaseSync } = require('node:sqlite');
let src = fs.readFileSync(__dirname + '/situation-room-api.worker.js', 'utf8').replace(/\r\n/g, '\n').replace('export default {', 'globalThis.__worker = {');
vm.runInThisContext(src, { filename: 'worker.js' });
let fails = 0, n = 0;
const check = (name, ok, extra) => { n++; if (!ok) { fails++; console.log('FAIL ' + name + (extra ? ' | ' + extra : '')); } };

function makeDb(withPending) {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE trial_counters (clerk_user_id TEXT PRIMARY KEY, trial_calls_used INTEGER NOT NULL DEFAULT 0, updated_at TEXT' + (withPending ? ', pending_n INTEGER NOT NULL DEFAULT 0, pending_at TEXT' : '') + ')');
  const wrap = (sql) => ({ _a: [], bind(...a) { this._a = a; return this; }, first: async function () { return db.prepare(sql).get(...this._a) || null; }, run: async function () { db.prepare(sql).run(...this._a); return {}; } });
  return { db, d1: { prepare: wrap } };
}
const row = (db, u) => db.prepare('SELECT * FROM trial_counters WHERE clerk_user_id=?').get(u);
const R = (code) => vm.runInThisContext(code);

(async () => {
  // Airtable mirror calls are stubbed
  R('globalThis.__at = []; updateAirtable = async function (t, id, f) { __at.push([t, id, f]); };');

  // 1. charge sets the marker
  let { db, d1 } = makeDb(true); globalThis.TRIAL_COUNTER_DB = d1; R('TRIAL_COUNTER_DB = globalThis.TRIAL_COUNTER_DB');
  let r = await R("chargeTrialCallAtomic('u1', 10)");
  check('charge allowed', r.allowed && r.used === 1);
  check('charge sets pending', row(db, 'u1').pending_n === 1 && row(db, 'u1').pending_at);
  await R("chargeTrialCallAtomic('u1', 10)");
  check('two charges, pending 2', row(db, 'u1').pending_n === 2 && row(db, 'u1').trial_calls_used === 2);

  // 2. settle clears one at a time, and clears the timestamp at zero
  await R("settleTrialCharge('u1')");
  check('settle one', row(db, 'u1').pending_n === 1 && row(db, 'u1').pending_at);
  await R("settleTrialCharge('u1')");
  check('settle to zero clears time', row(db, 'u1').pending_n === 0 && row(db, 'u1').pending_at === null);
  await R("settleTrialCharge('u1')");
  check('settle never goes negative', row(db, 'u1').pending_n === 0 && row(db, 'u1').trial_calls_used === 2);

  // 3. recovery: not before the threshold, yes after it
  await R("chargeTrialCallAtomic('u1', 10)"); // used 3, pending 1 (a killed request: never settled)
  let rec = await R("recoverStaleTrialCharges('u1', 'recA')");
  check('no recovery when fresh', rec === null && row(db, 'u1').trial_calls_used === 3 && row(db, 'u1').pending_n === 1);
  db.exec("UPDATE trial_counters SET pending_at = datetime('now','-5 minutes') WHERE clerk_user_id='u1'");
  rec = await R("recoverStaleTrialCharges('u1', 'recA')");
  check('no recovery at 5 minutes', rec === null && row(db, 'u1').trial_calls_used === 3);
  db.exec("UPDATE trial_counters SET pending_at = datetime('now','-7 minutes') WHERE clerk_user_id='u1'");
  rec = await R("recoverStaleTrialCharges('u1', 'recA')");
  check('recovery at 7 minutes', rec === 2 && row(db, 'u1').trial_calls_used === 2 && row(db, 'u1').pending_n === 0 && row(db, 'u1').pending_at === null, JSON.stringify(row(db, 'u1')));
  check('airtable mirrored', R('__at').length === 1 && R('__at')[0][1] === 'recA' && R('__at')[0][2].trial_calls_used === 2);
  rec = await R("recoverStaleTrialCharges('u1', 'recA')");
  check('second recovery is a no-op', rec === null && row(db, 'u1').trial_calls_used === 2);

  // 4. recovery never takes the count below zero, and leaves other users alone
  await R("chargeTrialCallAtomic('u2', 10)"); await R("chargeTrialCallAtomic('u3', 10)");
  db.exec("UPDATE trial_counters SET pending_at = datetime('now','-9 minutes'), trial_calls_used = 0 WHERE clerk_user_id='u2'");
  await R("recoverStaleTrialCharges('u2', 'recB')");
  check('floor at zero', row(db, 'u2').trial_calls_used === 0);
  check('other user untouched', row(db, 'u3').trial_calls_used === 1 && row(db, 'u3').pending_n === 1);

  // 5. cap still enforced with the marker, and a refused charge does not add pending
  ({ db, d1 } = makeDb(true)); globalThis.TRIAL_COUNTER_DB = d1; R('TRIAL_COUNTER_DB = globalThis.TRIAL_COUNTER_DB');
  for (let i = 0; i < 10; i++) await R("chargeTrialCallAtomic('c', 10)");
  r = await R("chargeTrialCallAtomic('c', 10)");
  check('11th call refused', r.allowed === false && r.used === 10);
  check('refused call adds no pending', row(db, 'c').pending_n === 10 && row(db, 'c').trial_calls_used === 10);

  // 6. old refund path still works and coexists: refund lowers used, settle lowers pending
  await R("refundTrialCallAtomic('c')"); await R("settleTrialCharge('c')");
  check('refund plus settle', row(db, 'c').trial_calls_used === 9 && row(db, 'c').pending_n === 9);

  // 7. columns missing: charge falls back, recovery and settle are silent no-ops
  ({ db, d1 } = makeDb(false)); globalThis.TRIAL_COUNTER_DB = d1; R('TRIAL_COUNTER_DB = globalThis.TRIAL_COUNTER_DB');
  const errs = []; const oe = console.error; console.error = (...a) => errs.push(a.join(' '));
  r = await R("chargeTrialCallAtomic('m', 10)");
  check('fallback charge works', r.allowed && r.used === 1 && row(db, 'm').trial_calls_used === 1);
  rec = await R("recoverStaleTrialCharges('m', 'recM')");
  await R("settleTrialCharge('m')");
  console.error = oe;
  check('missing columns do not throw', rec === null && errs.length === 2);
  r = await R("chargeTrialCallAtomic('m', 10)");
  check('fallback second charge', r.used === 2);

  console.log(fails ? 'PENDING TESTS FAILED (' + fails + ' of ' + n + ')' : 'PENDING TESTS PASSED (' + n + ' checks)');
  process.exit(fails ? 1 : 0);
})();
