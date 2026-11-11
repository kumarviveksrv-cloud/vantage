// claudeStreamCall: CPU-light stream reading must return exactly the same text, stop reason and usage as per-event parsing
const fs = require('fs'), vm = require('vm');
let src = fs.readFileSync(__dirname + '/situation-room-api.worker.js', 'utf8').replace(/\r\n/g, '\n').replace('export default {', 'globalThis.__worker = {');
vm.runInThisContext(src, { filename: 'worker.js' });
let fails = 0, n = 0; const ok = (c, m, x) => { n++; if (!c) { fails++; console.log('FAIL ' + m + (x ? ' | ' + x : '')); } };
const enc = new TextEncoder();
const ev = (name, obj) => 'event: ' + name + '\ndata: ' + JSON.stringify(obj) + '\n\n';
const delta = (t) => ev('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: t } });
function streamOf(str, sizes, eol) {
  const bytes = enc.encode(eol ? str.replace(/\n/g, '\r\n') : str); const chunks = []; let i = 0, k = 0;
  while (i < bytes.length) { const sz = sizes[k++ % sizes.length]; chunks.push(bytes.slice(i, i + sz)); i += sz; }
  return new ReadableStream({ start(c) { chunks.forEach(x => c.enqueue(x)); c.close(); } });
}
globalThis.__setFetch = (body) => { globalThis.fetch = async () => ({ ok: true, status: 200, body, text: async () => '' }); };
const call = async (stream, onChunk) => { globalThis.__setFetch(stream); return vm.runInThisContext('claudeStreamCall')({ model: 'm', messages: [] }, {}, 20000, onChunk); };
const pieces = ['{"a":', ' "quote \\" and slash \\\\ ', 'newline\nline2', ' tab\t', ' unicode é ₹ 日本', ' emoji 😀 ', '"}', '', ' end'];
const expected = pieces.join('');
const head = ev('message_start', { type: 'message_start', message: { usage: { input_tokens: 123 } } }) + ev('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } });
const tail = ev('content_block_stop', { type: 'content_block_stop', index: 0 }) + ev('message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 77 } }) + ev('message_stop', { type: 'message_stop' });
const full = head + pieces.map(delta).join('') + tail;
(async () => {
  for (const sizes of [[7], [1], [50, 3, 200], [4096]]) {
    for (const eol of [false, true]) {
      const r = await call(streamOf(full, sizes, eol));
      ok(r.content[0].text === expected, 'text identical, chunk sizes ' + sizes + (eol ? ' CRLF' : ''), JSON.stringify(r.content[0].text).slice(0, 80));
      ok(r.stop_reason === 'end_turn' && r.usage.input_tokens === 123 && r.usage.output_tokens === 77, 'stop and usage, sizes ' + sizes + (eol ? ' CRLF' : ''), JSON.stringify(r.usage));
    }
  }
  // large realistic stream
  let big = '', exp = ''; for (let i = 0; i < 3000; i++) { const t = 'word' + i + ' "q" \\n é '; big += delta(t); exp += t; }
  const rb = await call(streamOf(head + big + tail, [613], false)); ok(rb.content[0].text === exp, 'large stream identical');
  // delta with a different key order falls back to per-event parse
  const odd = ev('content_block_delta', { type: 'content_block_delta', index: 0, delta: { text: 'reordered "ok"', type: 'text_delta' } });
  const ro = await call(streamOf(head + delta('A ') + odd + delta(' B') + tail, [20], false)); ok(ro.content[0].text === 'A reordered "ok" B', 'reordered keys still read', JSON.stringify(ro.content[0].text));
  // error event
  let threw = ''; try { await call(streamOf(head + delta('x') + ev('error', { type: 'error', error: { type: 'overloaded_error', message: 'busy' } }), [30], false)); } catch (e) { threw = e.message; }
  ok(/overloaded_error/.test(threw), 'error event still throws', threw);
  // progress callback receives growing counts, ends non-zero
  const seen = []; await call(streamOf(head + big + tail, [613], false), (c) => seen.push(c)); ok(seen.length >= 1 && seen[seen.length - 1] > 1000, 'progress callback fires', JSON.stringify(seen.slice(-2)));
  // empty answer
  const re = await call(streamOf(head + tail, [10], false)); ok(re.content[0].text === '', 'empty text ok');
  console.log(fails ? 'STREAM TESTS FAILED (' + fails + ' of ' + n + ')' : 'STREAM TESTS PASSED (' + n + ' checks)'); process.exit(fails ? 1 : 0);
})();
