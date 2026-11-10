// Business Case attrition engine: inputs checked against the user's text, arithmetic in code, figure checker flags unsupported rupee figures.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'situation-room-api.worker.js'), 'utf8');
const sl = (a, b) => src.slice(src.indexOf(a), src.indexOf(b));
const code = src.slice(src.indexOf('const REPLACEMENT_COST_MULTIPLIER'), src.indexOf('const DEFAULT_REPLACEMENT_MULTIPLIER')) + sl('function parseMultiplierRange', '// Every component for one CTC figure') + sl('// ── BOND ENGINE START', 'function bondFixText') + sl('// ── BUSINESS CASE ENGINE START', '// ── BUSINESS CASE ENGINE END');
const { bcRead, bcCalc, bcLines, bcFigureCheck, applyBusinessCaseEngine, bondAmountsIn } = new Function(code + ';return {bcRead, bcCalc, bcLines, bcFigureCheck, applyBusinessCaseEngine, bondAmountsIn};')();
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const TXT = 'We lost 40 employees out of a headcount of 250 in the last 12 months. Average CTC is ₹8L. We are considering a retention programme with a budget of ₹15L.';
ok(bondAmountsIn('8 LPA and 2.5 lakh per annum').join() === '800000,250000', 'LPA parsed: ' + bondAmountsIn('8 LPA and 2.5 lakh per annum'));
const IN = { model: 'attrition', exits: 40, headcount: 250, avgCtc: 800000, periodMonths: 12, rampMonths: null, roleTier: 'default', programmeBudget: 1500000 };
let T = bcRead(IN, TXT);
ok(T.exits === 40 && T.headcount === 250 && T.ctc === 800000 && T.months === 12 && T.ramp === null && T.budget === 1500000, 'inputs read: ' + JSON.stringify(T));
let c = bcCalc(T);
ok(Math.abs(c.total[0] - 336) < 0.01 && Math.abs(c.total[1] - 576) < 0.01, 'total 40 x (6.4+2) to (10.4+4) = 336 to 576L: ' + c.total);
ok(Math.abs(c.rate - 16) < 0.001, 'rate 16 percent');
ok(Math.abs(c.breakEven[0] - 15 / 14.4) < 0.001 && Math.abs(c.breakEven[1] - 15 / 8.4) < 0.001, 'break-even exits');
ok(bcLines(c).some(l => /3\.36Cr to Rs\.5\.76Cr/.test(l)) && bcLines(c).some(l => /assumed planning range/.test(l)), 'lines carry total and flag assumed ramp');
// fabricated inputs rejected
T = bcRead({ model: 'attrition', exits: 55, headcount: 250, avgCtc: 800000 }, TXT); ok(T.exits === null && bcCalc(T) === null, 'exits not in text: no computation');
T = bcRead({ model: 'attrition', exits: 40, avgCtc: 900000 }, TXT); ok(T.ctc === null && bcCalc(T) === null, 'CTC not in text: no computation');
ok(bcCalc(bcRead({ model: 'other', exits: 40, avgCtc: 800000 }, TXT)) === null, 'non-attrition model: no computation');
// tier and ramp and period
T = bcRead({ model: 'attrition', exits: 40, headcount: 250, avgCtc: 800000, roleTier: 'senior', rampMonths: 4, periodMonths: 6 }, TXT + ' Ramp is 4 months. Data covers 6 months.'.replace('Data covers 6 months', 'Data covers 6 months'));
c = bcCalc(T); ok(c.annualExits === 80 && c.mult[0] === 1.5 && c.ramp[0] === 4 && Math.abs(c.total[0] - 80 * (8 * 1.5 + 8 / 12 * 4)) < 0.01, 'senior tier, stated ramp, 6 months annualised: ' + JSON.stringify(c.total));
// apply
function mk() { return { headline: 'Attrition is costing Rs.1.2Cr a year', revenueAtRisk: { figure: 'Rs.1.2Cr', basis: 'x', confidence: 'Low' }, signal: { situation: { narrative: 'Cost is Rs.7Cr.' }, impact: { narrative: 'n', financialImpact: 'Rs.1.2Cr', breakdown: ['a'] }, narrative: { cfoVersion: 'The exposure is Rs.9Cr and the budget is Rs.15L.' } }, humac: { range: 'Rs.1Cr – Rs.2Cr' }, bcInputs: IN }; }
let r = mk(); ok(applyBusinessCaseEngine(r, TXT) === true && r.bcInputs === undefined, 'applied, input removed');
ok(r.revenueAtRisk.figure === 'Rs.3.36Cr to Rs.5.76Cr' && r.signal.impact.financialImpact === r.revenueAtRisk.figure && /Computed by the system/.test(r.revenueAtRisk.basis), 'revenue at risk overwritten: ' + r.revenueAtRisk.figure);
ok(r.headline === 'Attrition is costing Rs.3.36Cr to Rs.5.76Cr a year', 'headline figure replaced: ' + r.headline);
ok(r.humac.range === 'Rs.3.36Cr – Rs.5.76Cr', 'humac range: ' + r.humac.range);
ok(r.signal.impact.breakdown.length >= 6, 'breakdown rebuilt');
ok(r.bcCheck.engine === true && r.bcCheck.ok === false && r.bcCheck.flagged.some(f => /9Cr/i.test(f)) && !r.bcCheck.flagged.some(f => /15L/i.test(f)), 'flags Rs.9Cr, not the user budget: ' + JSON.stringify(r.bcCheck));
ok(r.bcCheck.flagged.some(f => /7Cr/i.test(f)), 'flags 7Cr in situation narrative: ' + JSON.stringify(r.bcCheck.flagged));
// headline already inside the range is kept
r = mk(); r.headline = 'Attrition costs Rs.4Cr a year'; applyBusinessCaseEngine(r, TXT); ok(r.headline === 'Attrition costs Rs.4Cr a year', 'in-range headline kept');
// clean narrative gives ok
r = mk(); r.signal.situation.narrative = 'We lost 40 of 250.'; r.signal.narrative.cfoVersion = 'Budget Rs.15L against Rs.4Cr at risk.'; r.headline = 'Rs.3.36Cr to Rs.5.76Cr at risk';
applyBusinessCaseEngine(r, TXT); ok(r.bcCheck.ok === true && /comes from your data/.test(r.bcCheck.note), 'clean analysis passes: ' + JSON.stringify(r.bcCheck));
// v105: user-supplied budget in headline survives; legitimate derived arithmetic is not flagged
r = mk(); r.headline = 'A Rs.15L retention programme against Rs.3.36Cr to Rs.5.76Cr at risk'; applyBusinessCaseEngine(r, TXT); ok(/Rs\.15L/.test(r.headline) && !/Rs\.3\.36Cr to Rs\.5\.76Cr to/.test(r.headline), 'budget kept in headline: ' + r.headline);
r = mk(); r.headline = 'Rs.15L budget'; r.signal.situation.narrative = 'Cohort payroll Rs.3.2Cr; avoiding 10 exits saves Rs.1.44Cr to Rs.1.04Cr'.replace('Rs.1.44Cr to Rs.1.04Cr', 'Rs.84L to Rs.1.44Cr'); r.signal.narrative.cfoVersion = 'Preventing 8 exits saves Rs.64L to Rs.1.15Cr.';
applyBusinessCaseEngine(r, TXT); ok(r.bcCheck.ok === true, 'cohort payroll and k-multiples allowed: ' + JSON.stringify(r.bcCheck.flagged));
r = mk(); r.signal.situation.narrative = 'Assume Rs.37L at 50 percent productivity.'; r.signal.narrative.cfoVersion = 'x'; applyBusinessCaseEngine(r, TXT); ok(r.bcCheck.flagged.some(f => /37L/i.test(f)), 'model own assumption still flagged');
// v106: model's wrong Rs.1.04Cr to Rs.1.69Cr is now flagged; range headline replaced whole; prompt block carries system figures
r = mk(); r.headline = 'A 16% attrition rate is costing Rs.1.04Cr–1.69Cr annually, the Rs.15L programme costs less'; r.signal.situation.narrative = 'It sits at Rs.1.04Cr–1.69Cr when annualised.'; r.signal.narrative.cfoVersion = 'x';
applyBusinessCaseEngine(r, TXT); ok(r.headline === 'A 16% attrition rate is costing Rs.3.36Cr to Rs.5.76Cr annually, the Rs.15L programme costs less', 'range headline replaced whole: ' + r.headline);
ok(r.bcCheck.ok === false && r.bcCheck.flagged.some(f => /1\.04Cr/.test(f)), 'wrong Rs.1.04Cr flagged: ' + JSON.stringify(r.bcCheck.flagged));
r = mk(); r.headline = 'Rs.15L'; r.signal.situation.narrative = 'Preventing 8 exits saves Rs.67L to Rs.1.15Cr.'; r.signal.narrative.cfoVersion = 'x'; applyBusinessCaseEngine(r, TXT); ok(r.bcCheck.ok === true, 'k stated in same sentence allowed: ' + JSON.stringify(r.bcCheck.flagged));
const { bcPromptBlock } = new Function(code + ';return {bcPromptBlock};')();
const pb = bcPromptBlock(bcCalc(bcRead(IN, TXT))); ok(/Rs\.3\.36Cr to Rs\.5\.76Cr/.test(pb) && /Never annualise/.test(pb) && /1 to 1\.8 exits/.test(pb), 'prompt block: ' + pb);
r = mk(); r.headline = 'Rs.15L'; r.signal.situation.narrative = 'Preventing even two exits returns Rs.16.8L to Rs.28.8L in avoided cost.'; r.signal.narrative.cfoVersion = 'x'; applyBusinessCaseEngine(r, TXT); ok(r.bcCheck.ok === true, 'count written as a word allowed: ' + JSON.stringify(r.bcCheck.flagged));
// v109: stakeholder flow
const { applyBusinessCaseStakeholder } = new Function(code + ';return {applyBusinessCaseStakeholder};')();
let st = { stack: { dataAnchor: { figure: 'Rs.2,56,00,000' }, riskMirror: { revenueAtRisk: 'Rs.3,36,00,000', revenueAtRiskBasis: 'x' }, credibility: { statement: 'Saves Rs.96,00,000 to Rs.1,04,00,000 if 12 to 13 exits are avoided.' } }, bcInputs: IN };
ok(applyBusinessCaseStakeholder(st, TXT) === true && st.bcInputs === undefined, 'stakeholder applied');
ok(st.stack.dataAnchor.figure === 'Rs.3.36Cr to Rs.5.76Cr' && st.stack.riskMirror.revenueAtRisk === 'Rs.3.36Cr to Rs.5.76Cr' && /Computed by the system/.test(st.stack.riskMirror.revenueAtRiskBasis), 'stakeholder anchors overwritten: ' + st.stack.dataAnchor.figure);
ok(st.bcCheck.ok === false && st.bcCheck.flagged.some(f => /96,00,000/.test(f)), 'salary-as-cost figure flagged: ' + JSON.stringify(st.bcCheck.flagged));
st = { stack: { dataAnchor: { figure: 'x' }, riskMirror: { revenueAtRisk: 'x' }, credibility: { statement: 'Each exit costs Rs.8.4L to Rs.14.4L.' } }, bcInputs: IN };
applyBusinessCaseStakeholder(st, TXT); ok(st.bcCheck.ok === true, 'clean stakeholder passes: ' + JSON.stringify(st.bcCheck.flagged));
ok(applyBusinessCaseStakeholder({ wrongTool: true, stack: {} }, TXT) === false, 'stakeholder wrong tool untouched');
// v110: monthly salary multiples and budget fractions allowed
r = mk(); r.headline = 'Rs.15L'; r.signal.situation.narrative = 'One month of salary is about Rs.67K, a two-month ramp is Rs.1.33L per exit, and a phased first tranche is Rs.7.5 lakh.'; r.signal.narrative.cfoVersion = 'x'; applyBusinessCaseEngine(r, TXT); ok(r.bcCheck.ok === true, 'monthly salary and budget half allowed: ' + JSON.stringify(r.bcCheck.flagged));
// no engine: model figures untouched, check still runs against the user text, note says not system-checked
r = mk(); r.bcInputs = { model: 'attrition', exits: 99, avgCtc: 1 }; ok(applyBusinessCaseEngine(r, TXT) === false && r.revenueAtRisk.figure === 'Rs.1.2Cr' && r.bcCheck.engine === false && /not system-checked/.test(r.bcCheck.note), 'engine off: model figure kept, honestly labelled');
r = { wrongTool: true }; ok(applyBusinessCaseEngine(r, TXT) === false && r.bcCheck === undefined, 'wrong tool untouched');
console.log(fails ? fails + ' FAILED' : 'business case: all passed');
process.exit(fails ? 1 : 0);
