// Pregnancy range note (v50). Run: node worker/test_range_note.js
const fs = require('fs'), vm = require('vm');
const src = fs.readFileSync(__dirname + '/situation-room-api.worker.js', 'utf8').replace(/\r\n/g, '\n').replace('export default {', 'globalThis.__worker = {');
vm.runInThisContext(src, { filename: 'worker.js' });
let fails = 0;
const check = (n, ok) => { console.log((ok ? 'PASS ' : 'FAIL ') + n); if (!ok) fails++; };
const mk = (sc) => ({ engineFlags: { scenario: sc, freePrenatalCareStated: null }, protocol: { financial: { items: [{ label: 'CTC', kind: 'assumption', workings: 'x', low: null, high: null, basis: 'assumed' }], range: 'x', confidence: 'Low' } }, detectedCaseType: 'Other' });
globalThis.__mk = mk;
for (const sc of ['non_confirmation_only', 'pressure_to_resign', 'dismissal_or_resignation_occurred']) {
  globalThis.__sc = sc;
  const f = JSON.parse(vm.runInThisContext('(function(){ var r = __mk(__sc); normaliseFinancial(r); applyDeterministicFinancial(r, { ctcBand: "9L to 12L", roleCriticality: "Low", narrative: "x" }); return JSON.stringify(r.protocol.financial); })()'));
  check(sc + ': note present, mentions pregnancy and orders beyond the range', typeof f.rangeNote === 'string' && /pregnancy/.test(f.rangeNote) && /beyond this range/.test(f.rangeNote));
  check(sc + ': no section numbers in the note', !/s\.\d|section/i.test(f.rangeNote));
}
console.log(fails ? 'FAILURES: ' + fails : 'RANGE NOTE TESTS PASSED');
process.exit(fails ? 1 : 0);
