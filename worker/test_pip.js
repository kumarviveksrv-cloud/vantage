// PIP engine: dates counted from stated dates only; cost from CTC; no statute is cited for PIP length or reviews.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'situation-room-api.worker.js'), 'utf8');
const sl = (a, b) => src.slice(src.indexOf(a), src.indexOf(b));
const mulStart = src.indexOf('const REPLACEMENT_COST_MULTIPLIER'), mulEnd = src.indexOf('const DEFAULT_REPLACEMENT_MULTIPLIER');
const code = src.slice(mulStart, mulEnd) + 'function r2(n) { return Math.round(n * 100) / 100; }\n' + src.slice(src.indexOf('function parseMultiplierRange'), src.indexOf('function engineLakh')) +
  src.slice(src.indexOf('function normaliseFinancial'), src.indexOf('// DETERMINISTIC FINANCIAL ENGINE (v17)')) +
  sl('// ── POSH ENGINE START', '// ── POSH ENGINE END') + sl('// ── TERMINATION ENGINE START', '// ── TERMINATION ENGINE END') + sl('// ── PIP ENGINE START', '// ── PIP ENGINE END');
const { pipCalendar, applyPipEngine, pipItems, applyPipFinancial } = new Function(code + ';return {pipCalendar, applyPipEngine, pipItems, applyPipFinancial};')();
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const D = (s) => new Date(s + 'T00:00:00Z');
const row = (c, l) => c.rows.find(r => r.label === l);

let c = pipCalendar(null, D('2026-11-10'));
ok(c.rows.length === 3 && c.rows.every(r => /^Not computed/.test(r.status)), 'no inputs: all not computed');
ok(/None of the Acts supplied/.test(c.penalty) && c.title === 'PIP Timeline', 'no statute claimed');
c = pipCalendar({ pipStartDate: '2026-10-01', pipLengthValue: 60, pipLengthUnit: 'days' }, D('2026-11-10'));
ok(row(c, 'Plan end date').date === '30 Nov 2026' && /Ends in 20 days/.test(row(c, 'Plan end date').status), 'start + 60 days = 30 Nov: ' + JSON.stringify(row(c, 'Plan end date')));
ok(/Length 60 days/.test(row(c, 'Plan length').status) && /day 40 of 60/.test(row(c, 'Plan length').status) && row(c, 'Plan length').tone === 'ok', 'length and day count: ' + row(c, 'Plan length').status);
c = pipCalendar({ pipStartDate: '2026-10-01', pipLengthValue: 2, pipLengthUnit: 'months' }, D('2026-11-10'));
ok(row(c, 'Plan end date').date === '1 Dec 2026', 'start + 2 months');
c = pipCalendar({ pipStartDate: '2026-10-01', pipLengthValue: 6, pipLengthUnit: 'weeks' }, D('2026-11-10'));
ok(row(c, 'Plan end date').date === '12 Nov 2026', 'start + 6 weeks = 12 Nov');
c = pipCalendar({ pipStartDate: '2026-10-01', pipLengthValue: 20, pipLengthUnit: 'days' }, D('2026-11-10'));
ok(/Ended 20 days ago/.test(row(c, 'Plan end date').status) && /shorter than the usual range/.test(row(c, 'Plan length').status) && row(c, 'Plan length').tone === 'warn', 'ended plan and short length');
c = pipCalendar({ pipStartDate: '2026-01-01', pipEndDate: '2026-12-31' }, D('2026-11-10'));
ok(/longer than the usual range/.test(row(c, 'Plan length').status), 'long plan flagged');
c = pipCalendar({ pipStartDate: '2026-10-01', pipEndDate: '2026-12-15', pipLengthValue: 60, pipLengthUnit: 'days' }, D('2026-11-10'));
ok(/differs from the end date you gave/.test(row(c, 'Plan end date').status), 'conflicting end dates flagged');
// reviews
c = pipCalendar({ pipStartDate: '2026-10-01', pipEndDate: '2026-12-01', reviewDates: ['2026-10-10', '2026-10-24'] }, D('2026-11-10'));
ok(/2 reviews given. Last review 17 days ago/.test(row(c, 'Reviews held').status) && row(c, 'Reviews held').tone === 'ok', 'reviews ok: ' + row(c, 'Reviews held').status);
c = pipCalendar({ pipStartDate: '2026-10-01', pipEndDate: '2026-12-01', reviewDates: ['2026-10-05'] }, D('2026-11-10'));
ok(row(c, 'Reviews held').tone === 'warn' && /36 days ago/.test(row(c, 'Reviews held').status) && /No review for more than 30 days/.test(row(c, 'Reviews held').status), 'stale review flagged: ' + row(c, 'Reviews held').status);
c = pipCalendar({ pipStartDate: '2026-10-01', pipEndDate: '2026-12-01', reviewDates: ['2026-09-01', 'bad', '2026-10-20'] }, D('2026-11-10'));
ok(/1 review given/.test(row(c, 'Reviews held').status), 'bad and pre-start dates dropped');
ok(/Longest gap/.test(pipCalendar({ pipStartDate: '2026-08-01', pipEndDate: '2026-12-01', reviewDates: ['2026-09-20', '2026-11-01'] }, D('2026-11-10')).rows[2].status), 'long gap reported');

// apply: only PIP, input deleted, deadline scrub
let r = { detectedCaseType: 'PIP', pipInputs: { pipStartDate: '2026-10-01', pipLengthValue: 60, pipLengthUnit: 'days' }, protocol: { recommendation: 'Review by 20 November 2026 and decide.' } };
applyPipEngine(r, D('2026-11-10'), 'PIP started 1 October 2026 for 60 days.');
ok(r.pipCalendar && r.pipInputs === undefined && !/20 November/.test(r.protocol.recommendation), 'calendar set, input removed, invented deadline scrubbed: ' + r.protocol.recommendation);
r = { detectedCaseType: 'Disciplinary', pipInputs: {}, protocol: {} }; applyPipEngine(r, D('2026-11-10'), ''); ok(!r.pipCalendar && r.pipInputs === undefined, 'other types: no calendar, input removed');
// cost
let it = pipItems({ lakh: 8, source: 'exact' }, 'Medium');
ok(it.find(i => i.label.indexOf('Replacement') === 0).low === 6.4 && it.find(i => i.label.indexOf('Replacement') === 0).high === 10.4, 'replacement 8L x 0.8-1.3 = 6.4 to 10.4');
r = { detectedCaseType: 'PIP', protocol: { financial: { items: [{ label: 'x', kind: 'assumption', workings: 'y' }] } } };
ok(applyPipFinancial(r, { lakh: 8, source: 'exact' }, 'Medium') && /Rs\.7\.4L to Rs\.13\.4L/.test(r.protocol.financial.range) && r.protocol.financial.confidence === 'Medium', 'range = 6.4+1 to 10.4+3: ' + r.protocol.financial.range);
r = { detectedCaseType: 'Disciplinary', protocol: { financial: { items: [] } } }; ok(applyPipFinancial(r, { lakh: 8, source: 'exact' }, 'Medium') === false, 'other types untouched');
console.log(fails ? fails + ' FAILED' : 'pip: all passed');
process.exit(fails ? 1 : 0);
