// Usage counters in D1, run against a real SQLite engine (node:sqlite) so the actual SQL is exercised.
const fs = require('fs'), path = require('path');
const { DatabaseSync } = require('node:sqlite');
const src = fs.readFileSync(path.join(__dirname, 'situation-room-api.worker.js'), 'utf8');
const a = src.indexOf('const USAGE_LIMITS'), b = src.indexOf('function queueUsage');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
ok(a > 0 && b > a, 'source markers found');

function shim(sqlite) {
  return {
    prepare(sql) {
      let args = [];
      const st = sqlite.prepare(sql);
      const o = {
        bind(...x) { args = x; return o; },
        async first() { const r = st.get(...args); return r === undefined ? null : r; },
        async run() { return st.run(...args); },
      };
      return o;
    }
  };
}
function build(opts = {}) {
  const sqlite = new DatabaseSync(':memory:');
  const db = opts.noDb ? null : shim(sqlite);
  const calls = { atGet: 0, atSave: 0, atUpdate: 0 };
  const code = src.slice(a, b) + ';return {checkUsage, incrementUsage, d1UsageSweep, USAGE_LIMITS, usageTableInit};';
  const fns = new Function('TRIAL_COUNTER_DB', 'escapeAirtableString', 'getFromAirtable', 'updateAirtable', 'saveToAirtable', code)(
    opts.brokenDb ? { prepare() { throw new Error('d1 down'); } } : db,
    s => s,
    async () => { calls.atGet++; return null; },
    async () => { calls.atUpdate++; return {}; },
    async () => { calls.atSave++; return {}; });
  return { fns, sqlite, calls };
}

(async () => {
  let t = build();
  let c = await t.fns.checkUsage('u1', 'notify', false);
  ok(c.allowed && c.count === 0 && c.store === 'd1', 'fresh user: allowed, count 0, served from D1');
  for (let i = 0; i < 3; i++) { c = await t.fns.checkUsage('u1', 'notify', false); await t.fns.incrementUsage('u1', 'notify', c); }
  c = await t.fns.checkUsage('u1', 'notify', false);
  ok(!c.allowed && c.count === 3 && c.limit === 3 && /Resets tomorrow/.test(c.resetInfo), 'limit of 3 enforced after 3 counted uses');
  const other = await t.fns.checkUsage('u2', 'notify', false);
  ok(other.allowed && other.count === 0, 'another person is unaffected');
  const otherTool = await t.fns.checkUsage('u1', 'pact', false);
  ok(otherTool.allowed && otherTool.count === 0, 'another tool is counted separately');
  ok(t.calls.atGet === 0 && t.calls.atSave === 0 && t.calls.atUpdate === 0, 'no Airtable calls at all on the D1 path');

  // atomic increments from the same stale check
  t = build();
  const stale = await t.fns.checkUsage('u1', 'pact', false);
  await Promise.all([1, 2, 3, 4].map(() => t.fns.incrementUsage('u1', 'pact', stale)));
  c = await t.fns.checkUsage('u1', 'pact', false);
  ok(c.count === 4, 'four increments from the same stale check count as 4 (the old read-then-write undercounted): ' + c.count);

  // an unallowed check never increments
  t = build();
  await t.fns.incrementUsage('u1', 'pact', { allowed: false });
  ok((await t.fns.checkUsage('u1', 'pact', false)).count === 0, 'blocked call is not counted');

  // monthly tool and unknown tool and debrief free load
  ok((await t.fns.checkUsage('u1', 'get_debrief', false)).allowed, 'initial debrief load is free');
  ok((await t.fns.checkUsage('u1', 'nope', false)).allowed, 'unknown tool is allowed');
  c = await t.fns.checkUsage('u1', 'get_debrief', true);
  ok(c.allowed && /^\d{4}-\d{2}$/.test(c.period), 'regeneration uses a monthly period: ' + c.period);

  // sweep keeps the current rows, drops the old ones
  t = build(); await t.fns.usageTableInit();
  const ins = t.sqlite.prepare('INSERT INTO usage_counts (clerk_user_id, tool, period, used) VALUES (?, ?, ?, 1)');
  const day = n => new Date(Date.now() - n * 86400000).toISOString().split('T')[0];
  ins.run('u', 'pact', day(0)); ins.run('u', 'pact', day(10)); ins.run('u', 'pact', day(45)); ins.run('u', 'pact', day(90));
  ins.run('u', 'get_debrief', day(0).substring(0, 7)); ins.run('u', 'get_debrief', day(120).substring(0, 7));
  await t.fns.d1UsageSweep();
  const left = t.sqlite.prepare('SELECT period FROM usage_counts ORDER BY period').all().map(r => r.period);
  ok(left.includes(day(0)) && left.includes(day(10)) && !left.includes(day(45)) && !left.includes(day(90)), 'sweep removes daily rows older than 40 days only');
  ok(left.includes(day(0).substring(0, 7)) && !left.includes(day(120).substring(0, 7)), 'sweep keeps the current month row and drops old months');

  // D1 broken -> Airtable path still works
  t = build({ brokenDb: true });
  c = await t.fns.checkUsage('u1', 'pact', false);
  ok(c.allowed && c.store !== 'd1' && t.calls.atGet === 1, 'D1 down: falls back to the Airtable check');
  await t.fns.incrementUsage('u1', 'pact', c);
  ok(t.calls.atSave === 1, 'D1 down: the count is written to Airtable as before');

  // No D1 binding at all
  t = build({ noDb: true });
  c = await t.fns.checkUsage('u1', 'pact', false);
  ok(c.allowed && t.calls.atGet === 1, 'no D1 binding: Airtable path');

  // wiring
  ok(/DELETE FROM usage_counts WHERE clerk_user_id = \?1/.test(src), 'account deletion purges the counters');
  ok(/await d1UsageSweep\(\)/.test(src), 'sweep is scheduled');
  console.log(fails ? fails + ' FAILED' : 'usage d1: all passed');
  process.exit(fails ? 1 : 0);
})();
