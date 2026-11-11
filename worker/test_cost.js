// v165: per-call Claude cost log, run against a real SQLite engine (same dialect as D1)
const fs = require('fs'), vm = require('vm');
process.removeAllListeners('warning');
const { DatabaseSync } = require('node:sqlite');
let src = fs.readFileSync(__dirname + '/situation-room-api.worker.js', 'utf8').replace(/\r\n/g, '\n').replace('export default {', 'globalThis.__worker = {');
vm.runInThisContext(src, { filename: 'worker.js' });
let fails = 0, n = 0; const check = (nm, ok, x) => { n++; if (!ok) { fails++; console.log('FAIL ' + nm + (x ? ' | ' + x : '')); } };
const R = (c) => vm.runInThisContext(c);
const near = (a, b) => Math.abs(a - b) < 1e-9;
(async () => {
  check('sonnet cost', near(R("claudeCostUsd('claude-sonnet-4-6', {input_tokens:1000, output_tokens:2000})"), 0.033));
  check('haiku cost', near(R("claudeCostUsd('claude-haiku-4-5-20251001', {input_tokens:1000, output_tokens:1000})"), 0.006));
  check('cache write 1.25x, read 0.1x', near(R("claudeCostUsd('claude-sonnet-4-6', {cache_creation_input_tokens:1000000, cache_read_input_tokens:1000000})"), 3.75 + 0.3));
  check('missing usage is zero', R("claudeCostUsd('x', undefined)") === 0);
  const db = new DatabaseSync(':memory:');
  const wrap = (sql) => ({ _a: [], bind(...a) { this._a = a; return this; }, run: async function () { db.prepare(sql).run(...this._a); return {}; } });
  globalThis.TRIAL_COUNTER_DB = { prepare: wrap }; R('TRIAL_COUNTER_DB = globalThis.TRIAL_COUNTER_DB; _costTableReady = false;');
  await R("recordClaudeCost('claude-sonnet-4-6', 8000, {input_tokens:1000, output_tokens:2000})");
  await R("recordClaudeCost('claude-sonnet-4-6', 8000, {input_tokens:500, output_tokens:1000, cache_creation_input_tokens:200})");
  await R("recordClaudeCost('claude-haiku-4-5-20251001', 4000, {input_tokens:300, output_tokens:100})");
  const rows = db.prepare('SELECT * FROM claude_cost_daily ORDER BY max_tokens').all();
  check('two kinds, two rows', rows.length === 2, JSON.stringify(rows));
  const main = rows.find(r => r.max_tokens === 8000);
  check('main row accumulates', main.calls === 2 && main.in_tokens === 1500 && main.out_tokens === 3000 && main.cache_write === 200, JSON.stringify(main));
  check('main cost sum', near(main.cost_usd, 0.033 + (500 * 3 + 1000 * 15 + 200 * 3.75) / 1e6));
  check('day is UTC date', /^\d{4}-\d{2}-\d{2}$/.test(main.day));
  // failures never reach the run
  R("TRIAL_COUNTER_DB = { prepare() { throw new Error('boom'); } }; _costTableReady = true; globalThis.__t = 'ok';");
  let threw = false; try { R("queueClaudeCost('m', 1, {input_tokens:1})"); } catch (e) { threw = true; }
  await new Promise(r => setTimeout(r, 20));
  check('failing database never throws into the run', !threw);
  R('TRIAL_COUNTER_DB = undefined;');
  let threw2 = false; try { R("queueClaudeCost('m', 1, {input_tokens:1})"); } catch (e) { threw2 = true; }
  check('no database, no throw', !threw2);
  check('wired into claudeStreamCall', /queueClaudeCost\(body\.model, body\.max_tokens, usage\);/.test(src));
  console.log(fails ? fails + ' FAILED of ' + n : 'PASSED ' + n);
  process.exit(fails ? 1 : 0);
})();
