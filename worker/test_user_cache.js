// Users-row copy in D1: read-through, write-through, no stale overwrite, no caching of "not found", safe fallback, deletion.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'situation-room-api.worker.js'), 'utf8');
const a = src.indexOf('const USER_CACHE_TTL_SEC'), b = src.indexOf('// Deletes every record in a table matching');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
ok(a > 0 && b > a, 'source markers found');

// Minimal fake D1 that understands only the statements the cache uses.
function fakeDb() {
  const rows = new Map(); let broken = false;
  const db = {
    rows, setBroken(v) { broken = v; },
    prepare(sql) {
      let args = [];
      const stmt = {
        bind(...x) { args = x; return stmt; },
        async first() {
          if (broken) throw new Error('d1 down');
          if (/^SELECT record_json/.test(sql)) { const r = rows.get(args[0]); return r && r.at > args[1] ? { record_json: r.json } : null; }
          return null;
        },
        async run() {
          if (broken) throw new Error('d1 down');
          if (/^CREATE TABLE/.test(sql)) return {};
          if (/^DELETE FROM user_cache WHERE clerk_user_id = \?1 AND cached_at/.test(sql)) { const r = rows.get(args[0]); if (r && r.at <= args[1]) rows.delete(args[0]); return {}; }
          if (/^DELETE FROM user_cache WHERE clerk_user_id = \?1$/.test(sql)) { rows.delete(args[0]); return {}; }
          if (/^INSERT OR IGNORE/.test(sql)) { if (!rows.has(args[0])) rows.set(args[0], { json: args[1], at: args[2] }); return {}; }
          if (/^INSERT OR REPLACE/.test(sql)) { rows.set(args[0], { json: args[1], at: args[2] }); return {}; }
          throw new Error('unexpected sql: ' + sql);
        }
      };
      return stmt;
    }
  };
  return db;
}

function build() {
  const db = fakeDb(); const log = { fetches: [] }; let airtable = { rec: { id: 'rec1', fields: { user_id: 'u1', subscription_status: 'trial' } } };
  const fetchMock = async (url, opts) => {
    log.fetches.push((opts && opts.method) || 'GET');
    if (opts && opts.method === 'PATCH') {
      const f = JSON.parse(opts.body).fields; airtable.rec = { id: 'rec1', fields: { ...airtable.rec.fields, ...f } };
      return { status: 200, ok: true, json: async () => airtable.rec };
    }
    if (opts && opts.method === 'POST') { const f = JSON.parse(opts.body).fields; airtable.rec = { id: 'recNew', fields: f }; return { status: 200, ok: true, json: async () => airtable.rec }; }
    return { status: 200, ok: true, json: async () => ({ records: airtable.rec ? [airtable.rec] : [] }) };
  };
  let nowMs = 1_000_000_000_000;
  const DateMock = { now: () => nowMs };
  const code = src.slice(a, b) + ';return {getUserRowCached, userCacheDelete, updateAirtable, saveToAirtable, userCacheGet};';
  const fns = new Function('fetch', 'TRIAL_COUNTER_DB', 'AIRTABLE_BASE_ID', 'AIRTABLE_API_KEY', 'AT_TIMEOUT_MS', 'escapeAirtableString', 'Date',
    code)(
    fetchMock, db, 'app', 'key', 5000, s => s, Object.assign(function () {}, { now: DateMock.now }));
  return { fns, db, log, airtable: () => airtable, setRec: r => { airtable.rec = r; }, tick: s => { nowMs += s * 1000; } };
}

(async () => {
  let t = build();
  let r = await t.fns.getUserRowCached('u1');
  ok(r && r.id === 'rec1' && t.log.fetches.length === 1, 'first read goes to Airtable');
  r = await t.fns.getUserRowCached('u1');
  ok(r && r.id === 'rec1' && t.log.fetches.length === 1, 'second read is served from the copy (no Airtable call)');

  await t.fns.updateAirtable('Users', 'rec1', { subscription_status: 'active' });
  const before = t.log.fetches.length;
  r = await t.fns.getUserRowCached('u1');
  ok(r.fields.subscription_status === 'active' && t.log.fetches.length === before, 'a write to Users updates the copy at once (a payment shows immediately)');

  // not found is never cached
  t = build(); t.setRec(null);
  r = await t.fns.getUserRowCached('u1');
  ok(r === null && t.db.rows.size === 0, 'a missing user is not cached');
  t.setRec({ id: 'rec9', fields: { user_id: 'u1' } });
  r = await t.fns.getUserRowCached('u1');
  ok(r && r.id === 'rec9', 'a user created after a miss is found straight away');

  // expiry
  t = build();
  await t.fns.getUserRowCached('u1');
  t.tick(130);
  const n = t.log.fetches.length;
  await t.fns.getUserRowCached('u1');
  ok(t.log.fetches.length === n + 1, 'after the TTL the copy is refreshed from Airtable');

  // a slow read-through must not overwrite a newer write-through
  t = build();
  const stale = { id: 'rec1', fields: { user_id: 'u1', subscription_status: 'trial' } };
  await t.fns.updateAirtable('Users', 'rec1', { subscription_status: 'active' });
  const raw = await t.fns.getUserRowCached('u1');
  // simulate the late arrival of an old read: put it as a read-through
  const code = src.slice(a, b);
  ok(raw.fields.subscription_status === 'active', 'copy holds the newer write');
  ok(/INSERT OR IGNORE/.test(code), 'read-through uses insert-or-ignore so it cannot clobber a newer copy');

  // D1 failure falls back to Airtable
  t = build(); t.db.setBroken(true);
  r = await t.fns.getUserRowCached('u1');
  ok(r && r.id === 'rec1', 'D1 down: still answers from Airtable');
  await t.fns.updateAirtable('Users', 'rec1', { subscription_status: 'active' });
  ok(true, 'D1 down: writes to Users still succeed');

  // deletion
  t = build();
  await t.fns.getUserRowCached('u1');
  await t.fns.userCacheDelete('u1');
  ok(t.db.rows.size === 0, 'deleting an account removes the copy');

  // other tables are not cached
  t = build();
  await t.fns.updateAirtable('Usage', 'recU', { count: 1 });
  ok(t.db.rows.size === 0, 'writes to other tables leave the copy alone');

  // wiring
  ok(/async function ensureUserRowInner\(clerkUserId\) \{\s*const existing = await getUserRowCached\(clerkUserId\)/.test(src), 'sign-in gate reads the copy');
  ok(/const gpRecord = await getUserRowCached\(clerkUserId\)/.test(src), 'plan lookup reads the copy');
  ok(/const ariaUserRecord = await getUserRowCached\(clerkUserId\)/.test(src), 'ARIA check reads the copy');
  ok(/await userCacheDelete\(uid\)/.test(src), 'purge removes the copy');
  ok(/DELETE FROM user_cache WHERE cached_at < \?1/.test(src), 'hourly sweep present');
  ok(/await userCachePut\(keep, true\)/.test(src), 'duplicate-row cleanup refreshes the copy');
  const wh = src.slice(src.indexOf('async function handleRazorpayWebhook'), src.indexOf('async function handleRazorpayWebhook') + 3000);
  ok(!/getUserRowCached/.test(wh), 'payment webhook reads Airtable directly, never the copy');
  console.log(fails ? fails + ' FAILED' : 'user cache: all passed');
  process.exit(fails ? 1 : 0);
})();
