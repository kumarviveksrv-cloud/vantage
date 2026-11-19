// Airtable read guard: a rate limit or outage on a READ must throw, never look like "no such record".
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'situation-room-api.worker.js'), 'utf8');
const a = src.indexOf('async function getFromAirtable'), b = src.indexOf('async function updateAirtable');
const hd = src.indexOf('function isHighDemandError');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
ok(a > 0 && b > a && hd > 0, 'source markers found');

const body = src.slice(a, b); // includes airtableReadGuard, which sits between the read helpers
ok(/function airtableReadGuard/.test(body), 'guard sits inside the sliced block');
function build(status, json) {
  const fetchMock = async () => ({ status, ok: status >= 200 && status < 300, json: async () => json, text: async () => JSON.stringify(json) });
  const code = body + ';return {getFromAirtable, listFromAirtable, getAirtableRecordById};';
  return new Function('fetch', 'AIRTABLE_BASE_ID', 'AIRTABLE_API_KEY', 'AT_TIMEOUT_MS', code)(fetchMock, 'appX', 'keyX', 5000);
}
const isBusy = new Function(src.slice(hd, src.indexOf('}', src.indexOf('.test(', hd)) + 1) + ';return isHighDemandError;')();

(async () => {
  for (const st of [429, 500, 503]) {
    const t = build(st, {});
    for (const [name, fn] of [['get', () => t.getFromAirtable('Users', '{a}="b"')], ['list', () => t.listFromAirtable('Users', '{a}="b"', 5)], ['byId', () => t.getAirtableRecordById('Users', 'rec1')]]) {
      let threw = null; try { await fn(); } catch (e) { threw = e; }
      ok(threw && /Airtable read error: /.test(threw.message) && isBusy(threw.message), name + ' throws a busy-type error on ' + st);
    }
  }
  let t = build(404, {});
  ok(await t.getFromAirtable('Users', 'x') === null, '404 get still returns null');
  ok((await t.listFromAirtable('Users', 'x')).length === 0, '404 list still returns []');
  ok(await t.getAirtableRecordById('Users', 'r') === null, '404 byId still returns null');
  t = build(422, {});
  ok(await t.getFromAirtable('Usage', 'x') === null, '422 (table or field missing) still returns null');
  t = build(200, { records: [{ id: 'rec1', fields: { a: 1 } }] });
  ok((await t.getFromAirtable('Users', 'x')).id === 'rec1', '200 get returns the record');
  ok((await t.listFromAirtable('Users', 'x')).length === 1, '200 list returns records');
  t = build(200, { records: [] });
  ok(await t.getFromAirtable('Users', 'x') === null, '200 with no match is null (a genuinely new user)');

  ok(isBusy('Airtable read error: 429') && isBusy('Airtable read error: 502'), 'busy matcher covers 429 and 5xx reads');
  ok(!isBusy('Airtable read error: 404'), 'busy matcher ignores other statuses');
  ok(/Airtable read error/.test(src.slice(src.indexOf('async function checkUsage'), src.indexOf('async function incrementUsage'))), 'checkUsage rethrows a busy Airtable');
  ok(/High demand \(outer\)/.test(src), 'run() answers a busy Airtable with a 503');
  console.log(fails ? fails + ' FAILED' : 'airtable read guard: all passed');
  process.exit(fails ? 1 : 0);
})();
