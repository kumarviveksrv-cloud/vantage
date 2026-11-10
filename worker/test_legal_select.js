// Checks Policy Advisor Act selection and that each extract file holds the sections it promises.
const fs = require('fs'), path = require('path');
const s = fs.readFileSync(path.join(__dirname, 'situation-room-api.worker.js'), 'utf8');
const k = s.slice(s.indexOf('const LEGAL_ACT_KEYS'), s.indexOf('};', s.indexOf('const LEGAL_ACT_KEYS')) + 2);
const f = s.slice(s.indexOf('function selectActsForPolicy'), s.indexOf('// ── LOAD MULTIPLE ACTS'));
const sel = new Function(k + f + ';return selectActsForPolicy;')();
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
ok(sel('uniform allowance included in OT calculation under new wage code').includes('extracts/hours-overtime-leave'), 'OT question loads hours extract');
ok(sel('uniform allowance included in OT calculation under new wage code').includes('wages-code-2019'), 'OT question loads wages code');
ok(sel('Labour licence Central for construction company Shram Suvidha').includes('extracts/contract-labour-licensing'), 'licence question');
ok(sel('Form 15 accident register Uttarakhand factories').includes('extracts/registers-returns-savings'), 'register question');
ok(sel('Can we terminate?','Active flags: Contractual worker').includes('extracts/contract-labour-licensing'), 'contractual worker flag loads contract labour extract');
ok(!sel('How do I handle a notice period dispute?').some(a => a.startsWith('extracts/')), 'unrelated question loads no extract');
ok(sel('An employee has an offer from another company and her contract has a 90-day notice period. Can we make her serve all 90 days, and can we deduct from her final settlement if she leaves earlier?').includes('wages-code-2019'), 'deduction from final settlement loads the Wages Code');
ok(sel('Can we withhold the last salary until she returns the laptop?').includes('wages-code-2019'), 'withholding loads the Wages Code');
ok(sel('Can we recover notice pay from an employee who resigns?').includes('wages-code-2019'), 'notice pay recovery loads the Wages Code');
const need = { 'hours-overtime-leave': ['14. Wages for overtime work', '27. Extra wages for overtime', '25. Daily and weekly working hours'],
  'contract-labour-licensing': ['47. Licensing of contractors', '45. Applicability of this Part', '79. Approval and licensing of factories'],
  'registers-returns-savings': ['50. Records, returns and notices', '69. Repeal and savings', '143. Repeal and Savings', '33. Maintenance of registers', '35. Powers of Inspector-cum-Facilitators'] };
for (const n in need) { const t = fs.readFileSync(path.join(__dirname, '..', 'legal', 'extracts', n + '.txt'), 'utf8'); need[n].forEach(h => ok(t.includes(h), n + ' has ' + h)); ok(!/STATEMENT OF OBJECTS|THE FIRST SCHEDULE/.test(t), n + ' has no schedule bleed'); }
// verbatim: every non-empty extract line must exist in a full text
const full = ['osh-code-2020.txt', 'code-on-wages-2019.txt'].map(x => fs.readFileSync(path.join(__dirname, '..', 'legal', 'full', x), 'utf8')).join('\n');
for (const n in need) { fs.readFileSync(path.join(__dirname, '..', 'legal', 'extracts', n + '.txt'), 'utf8').split('\n').forEach(l => { if (l.trim() && !/^(VERBATIM EXTRACT|=== )/.test(l)) ok(full.includes(l), 'not verbatim: ' + l.slice(0, 60)); }); }
console.log(fails ? fails + ' FAILED' : 'LEGAL SELECT TESTS PASSED');
process.exit(fails ? 1 : 0);
