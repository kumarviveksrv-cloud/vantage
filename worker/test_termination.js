// Termination engine: wage base, service counting, statutory amounts computed in code; missing inputs never guessed.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'situation-room-api.worker.js'), 'utf8');
const fa = src.indexOf('function normaliseFinancial'), fb = src.indexOf('// DETERMINISTIC FINANCIAL ENGINE (v17)');
const pa = src.indexOf('// ── POSH ENGINE START'), pb = src.indexOf('// ── POSH ENGINE END');
const ta = src.indexOf('// ── TERMINATION ENGINE START'), tb = src.indexOf('// ── TERMINATION ENGINE END');
const { termWage, termService, termItems, applyTerminationFinancial, termParseRupees, applyTerminationText, termScrubDeadlines } = new Function(src.slice(fa, fb) + src.slice(pa, pb) + src.slice(ta, tb) + ';return {termWage, termService, termItems, applyTerminationFinancial, termParseRupees, applyTerminationText, termScrubDeadlines};')();
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const D = (s) => new Date(s + 'T00:00:00Z');
const item = (its, l) => its.find(i => i.label.indexOf(l) === 0);

ok(termParseRupees('85,000') === 85000 && termParseRupees('') === null && termParseRupees('abc') === null && termParseRupees('50') === null && termParseRupees(null) === null, 'rupee parsing');

// wage base
let w = termWage(12, 100000, 60000); ok(w.lo === 60000 && w.hi === 60000 && w.point, 'basic above half of gross: ' + JSON.stringify(w));
w = termWage(12, 100000, 30000); ok(w.lo === 50000 && w.hi === 50000, 'basic below half: wages floor at 50% of gross');
w = termWage(12, 100000, null); ok(w.lo === 50000 && w.hi === 100000 && !w.point, 'gross only gives a range');
w = termWage(12, null, null); ok(w.lo === 50000 && w.hi === 100000 && w.basis === 'assumed', 'CTC only: 12L -> 1L/month, range 50K to 1L, assumed');
w = termWage(12, null, 40000); ok(w.lo === 40000 && w.hi === 100000, 'basic only: range basic to CTC/12');

// service counting
let s = termService({ joiningDate: '2020-01-15', endDate: '2026-11-10' }, D('2026-11-10'));
ok(s.completed === 6 && s.months === 81 && s.partOverSix === true && s.years === 7, 'joined Jan 2020 to Nov 2026: 6y 9m -> 7 yrs: ' + JSON.stringify(s));
s = termService({ joiningDate: '2020-05-10', endDate: '2026-11-10' }, D('2026-11-10'));
ok(s.completed === 6 && s.partOverSix === false && s.years === 6, 'exactly 6 months extra does not round up: ' + JSON.stringify(s));
s = termService({ joiningDate: '2020-05-10', endDate: '2026-11-11' }, D('2026-11-30'));
ok(s.years === 7, 'six months and a day rounds up');
s = termService({ joiningDate: '2021-03-31', endDate: '2026-03-30' }, D('2026-11-10'));
ok(s.completed === 4 && s.months === 59, 'one day short of five years: ' + JSON.stringify(s));
s = termService({ joiningDate: '2024-01-01' }, D('2026-11-10'));
ok(s.months === 34 && /to today/.test(s.source), 'no end date counts to today and says so');
s = termService({ serviceMonths: 56 }, D('2026-11-10'));
ok(s.completed === 4 && s.partOverSix && s.years === 5, 'serviceMonths used');
ok(termService({}, D('2026-11-10')) === null && termService(null, D('2026-11-10')) === null && termService({ joiningDate: 'garbage' }, D('2026-11-10')) === null, 'no service data: null, not guessed');
ok(termService({ joiningDate: '2027-01-01', endDate: '2026-11-10' }, D('2026-11-10')) === null, 'end before joining: null');

// items: retrenchment, worker, 12L CTC with gross 100000, basic 60000, 7 years
let svc = termService({ joiningDate: '2020-01-15', endDate: '2026-11-10' }, D('2026-11-10'));
let b = termItems(12, 100000, 60000, 'retrenchment', 'worker', svc).items;
let comp = item(b, 'Retrenchment compensation');
ok(comp && comp.low === 2.42 && comp.high === 2.42, '60000/26*15*7 = 242307.69 -> Rs 2.42L, got ' + (comp && comp.low));

let nt = item(b, 'Notice or pay in lieu');
ok(nt && nt.low === 0.6 && nt.high === 0.6, 'notice = one month of wages 60000 = 0.6L');
let gr = item(b, 'Gratuity');
ok(gr && gr.label === 'Gratuity, only if s.53(1) covers this exit' && /not listed/.test(gr.workings) && gr.low === 2.42 && /26/.test(gr.workings) && /ceiling/.test(gr.workings) && !/s\.53\(6\)/.test(gr.workings), 'gratuity same arithmetic, ceiling flagged, no forfeiture note for retrenchment');
ok(item(b, 'Back wages').low === 1.8 && item(b, 'Back wages').high === 7.2, 'back wages 3 to 12 months of 60000');
ok(item(b, 'Defence').low === 1 && item(b, 'Defence').high === 3, 'defence 1 to 3 lakh');
ok(/s\.70\(c\)/.test(item(b, 'What the range').workings) && /sections 77 to 82/.test(item(b, 'What the range').workings), 'notice to Government and Chapter X flagged');
ok(item(b, 'Service counted').workings.indexOf('7 years') > -1, 'service item states the years used');

// managerial: no s.70 amounts
b = termItems(12, 100000, 60000, 'retrenchment', 'managerial', svc).items;
ok(!item(b, 'Retrenchment compensation') && !item(b, 'Notice or pay') && /not computed/.test(item(b, 'What the range').workings), 'managerial: s.70 not computed, said so');
// unclear: computed but conditioned
b = termItems(12, 100000, 60000, 'retrenchment', 'unclear', svc).items;
ok(/applies if the employee is a worker/.test(item(b, 'Retrenchment compensation').workings), 'unclear status: condition stated');
// under 12 months
let s8 = termService({ serviceMonths: 8 }, D('2026-11-10'));
b = termItems(12, null, null, 'retrenchment', 'worker', s8).items;
ok(!item(b, 'Retrenchment compensation') && !item(b, 'Gratuity') && /at least one year/.test(item(b, 'What the range').workings) && /five years/.test(item(b, 'What the range').workings), 'under one year: nothing statutory computed');
// no service
b = termItems(12, null, null, 'retrenchment', 'worker', null).items;
ok(!item(b, 'Retrenchment compensation') && /not stated/.test(item(b, 'What the range').workings), 'no service: not computed');
ok(!item(b, 'Service counted'), 'no service item when not known');
// misconduct: gratuity forfeiture note, no s.70
let s6 = termService({ serviceMonths: 72 }, D('2026-11-10'));
b = termItems(12, 100000, 60000, 'misconduct', 'worker', s6).items;
ok(!item(b, 'Notice or pay') && !item(b, 'Retrenchment') && /s\.53\(6\)/.test(item(b, 'Gratuity').workings), 'misconduct: forfeiture note, no retrenchment items');
// probation under 5 years: no gratuity
b = termItems(12, null, null, 'probation', 'worker', termService({ serviceMonths: 4 }, D('2026-11-10'))).items;
ok(!item(b, 'Gratuity') && !item(b, 'Notice'), 'probation short service: only exposure');

// full path through applyTerminationFinancial
function mk(extra) { return Object.assign({ detectedCaseType: 'Retrenchment', terminationInputs: { scenario: 'retrenchment', workerStatus: 'worker', joiningDate: '2020-01-15', endDate: '2026-11-10' }, protocol: { financial: { items: [{ label: 'x', kind: 'assumption', workings: 'y' }] } } }, extra || {}); }
let r = mk(); let applied = applyTerminationFinancial(r, { lakh: 12 }, '100000', '60000', D('2026-11-10'));
ok(applied === true && r.terminationInputs === undefined, 'applied and internal field removed');
ok(r.protocol.financial.range && /Rs\.2\.8L/.test(r.protocol.financial.range) , 'range = back wages + defence low: ' + r.protocol.financial.range);
ok(Array.isArray(r.protocol.financial.breakdown) && r.protocol.financial.breakdown.length >= 5, 'breakdown built');
ok(r.protocol.financial.confidence === 'Medium', 'confidence Medium when wages supplied and service known');
r = mk(); applyTerminationFinancial(r, { lakh: 12 }, null, null, D('2026-11-10'));
ok(r.protocol.financial.confidence === 'Low', 'confidence Low when wage base is assumed');
r = mk({ detectedCaseType: 'Disciplinary' }); ok(applyTerminationFinancial(r, { lakh: 12 }, null, null, D('2026-11-10')) === false && r.terminationInputs === undefined, 'other case types untouched but internal field removed');
r = mk({ terminationInputs: { scenario: 'other' } }); ok(applyTerminationFinancial(r, { lakh: 12 }, null, null, D('2026-11-10')) === false, 'scenario other: model financial left alone');
r = mk(); ok(applyTerminationFinancial(r, null, null, null, D('2026-11-10')) === false, 'no CTC: not applied');
r = mk({ wrongTool: true }); ok(applyTerminationFinancial(r, { lakh: 12 }, null, null, D('2026-11-10')) === false, 'wrong tool: not applied');
r = mk({ detectedCaseType: 'Redundancy', terminationInputs: null }); ok(applyTerminationFinancial(r, { lakh: 12 }, null, null, D('2026-11-10')) === true && /not stated/.test(r.protocol.financial.breakdown.join(' ')), 'redundancy with no inputs: defaults to retrenchment, service not computed');


// invented deadlines removed, narrative dates kept
const NARR = 'Ramesh joined on 15 January 2020 and we plan to end his employment on 30 November 2026.';
let rt = { detectedCaseType: 'Retrenchment', protocol: { recommendation: 'Proceed on 30 November 2026 but finance must confirm the compensation figure by 15 November 2026. File notice before 30 November 2026.', immediate_actions: ['Serve notice no later than 12 Nov 2026.', 'Pay on 30 Nov 2026.'], legalRows: [{ ref: 'IR Code s.70(a)', verdict: 'not_yet', point: 'Requires notice by 20 November 2026.' }, { ref: 'IR Code s.71', verdict: 'unclear', point: 'Depends on others.' }, { ref: 'IR Code s.72', verdict: 'not_yet', point: 'x' }, { ref: 'IR Code s.70(c)', verdict: 'not_yet', point: 'y' }] } };
applyTerminationText(rt, NARR);
ok(!/15 November/.test(rt.protocol.recommendation) && /before 30 November 2026/.test(rt.protocol.recommendation) && /Proceed on 30 November 2026/.test(rt.protocol.recommendation), 'invented deadline removed, narrative deadline kept: ' + rt.protocol.recommendation);
ok(!/12 Nov/.test(rt.protocol.immediate_actions[0]) && /30 Nov 2026/.test(rt.protocol.immediate_actions[1]), 'actions scrubbed: ' + JSON.stringify(rt.protocol.immediate_actions));
ok(!/20 November/.test(rt.protocol.legalRows[0].point), 'legal row point scrubbed');
ok(rt.protocol.legalRows.filter(r => r.verdict === 'live').map(r => r.ref).join() === 'IR Code s.70(a),IR Code s.70(c)', 'unperformed s.70 duties set to live and sorted first: ' + JSON.stringify(rt.protocol.legalRows.map(r => r.ref + ':' + r.verdict)));
ok(rt.protocol.legalRows.find(r => r.ref === 'IR Code s.72').verdict === 'not_yet', 's.72 left alone');
let rm = { detectedCaseType: 'Termination', terminationInputs: { scenario: 'misconduct' }, protocol: { legalRows: [{ ref: 'IR Code s.70(a)', verdict: 'not_yet', point: 'z' }] } };
applyTerminationText(rm, NARR); ok(rm.protocol.legalRows[0].verdict === 'not_yet', 'verdict untouched outside retrenchment');
let rd = { detectedCaseType: 'Disciplinary', protocol: { recommendation: 'Act by 15 November 2026.' } };
ok(applyTerminationText(rd, NARR) === false && /15 November/.test(rd.protocol.recommendation), 'other case types untouched');

// s.70 scope: unclear/factory-reasoned rows corrected, s.65 row dropped in retrenchment
let rs = { detectedCaseType: 'Retrenchment', protocol: { legalRows: [{ ref: 'IR Code s.70', verdict: 'unclear', point: 'Depends on whether the insurance establishment is a factory, mine or plantation.' }, { ref: 'IR Code s.65', verdict: 'unclear', point: 'Depends on factory definition.' }, { ref: 'IR Code s.2(zr)', verdict: 'unclear', point: 'Depends on duties.' }] } };
applyTerminationText(rs, NARR);
ok(rs.protocol.legalRows.length === 2 && rs.protocol.legalRows[0].ref === 'IR Code s.70' && rs.protocol.legalRows[0].verdict === 'live' && !/factory, mine/.test(rs.protocol.legalRows[0].point) && /any industry/.test(rs.protocol.legalRows[0].point), 's.70 live with scope sentence, s.65 dropped: ' + JSON.stringify(rs.protocol.legalRows));

console.log(fails ? fails + ' FAILED' : 'termination: all passed');
process.exit(fails ? 1 : 0);
