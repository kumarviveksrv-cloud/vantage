// vantage-wait.js: one automatic retry only when the stream ends with no result
const fs = require('fs'), vm = require('vm');
const src = fs.readFileSync(__dirname + '/../vantage-wait.js', 'utf8');
let fails = 0, n = 0; const check = (nm, ok, x) => { n++; if (!ok) { fails++; console.log('FAIL ' + nm + (x ? ' | ' + x : '')); } };
const enc = new TextEncoder();
function sse(events) { return new Response(new ReadableStream({ start(c) { events.forEach(e => c.enqueue(enc.encode('event: ' + e[0] + '\ndata: ' + JSON.stringify(e[1]) + '\n\n'))); c.close(); } }), { status: 200, headers: { 'Content-Type': 'text/event-stream' } }); }
const good = () => sse([['ping', {}], ['result', { status: 200, body: JSON.stringify({ success: true }) }]]);
const cut = () => sse([['ping', {}], ['stage', { stage: 'analyse' }]]); // ends with no result
async function scenario(responses) {
  const calls = [];
  const el = () => ({ style: { display: 'block' }, className: '', appendChild() {}, remove() {}, setAttribute() {}, querySelector() { return el(); }, set innerHTML(v) {}, set textContent(v) {} });
  const view = el();
  const win = { fetch: async (u, i) => { calls.push(u); const r = responses.shift(); return typeof r === 'function' ? r() : r; }, addEventListener() {}, removeEventListener() {}, ReadableStream, __vwRetryMs: 5 };
  const doc = { currentScript: null, readyState: 'complete', getElementById: (id) => id === 'loading-view' ? view : null, createElement: () => el(), head: el() };
  const ctx = { window: win, document: doc, getComputedStyle: () => ({ display: 'block' }), MutationObserver: class { observe() {} }, setTimeout, clearTimeout, setInterval, clearInterval, Response, TextDecoder, AbortController, Object, Date, Math, parseInt, String, JSON, Promise, ReadableStream, console };
  vm.createContext(ctx); vm.runInContext(src, ctx);
  const r = await win.fetch('https://x.workers.dev/', { method: 'POST', body: '{}' });
  return { calls, status: r.status, body: await r.json() };
}
(async () => {
  let o = await scenario([good]);
  check('normal run: one call', o.calls.length === 1 && o.body.success === true);
  o = await scenario([cut, good]);
  check('cut stream then success: two calls, success', o.calls.length === 2 && o.body.success === true, JSON.stringify(o));
  check('retry also streams', o.calls.every(u => /stream=1/.test(u)));
  o = await scenario([cut, cut, good]);
  check('two cuts: stops after one retry, shows error', o.calls.length === 2 && o.status === 502 && o.body.success === false, JSON.stringify(o));
  o = await scenario([() => new Response(JSON.stringify({ success: false, error: 'busy' }), { status: 503, headers: { 'Content-Type': 'application/json' } }), good]);
  check('server error answer is not retried', o.calls.length === 1 && o.status === 503);
  console.log(fails ? 'WAIT RETRY TESTS FAILED' : 'WAIT RETRY TESTS PASSED (' + n + ' checks)'); process.exit(fails ? 1 : 0);
})();
