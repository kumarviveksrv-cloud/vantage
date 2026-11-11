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
// v111: thin input, no exits, no CTC, no rupee amounts: every rupee figure removed
const THIN = 'Attrition is high and leadership needs to act.';
r = { headline: 'The cost of high attrition is rarely below Rs. 1.5 Cr annually.', revenueAtRisk: { figure: 'Rs. 1.5 Cr - Rs. 4.2 Cr', basis: 'x', confidence: 'Low' }, signal: { situation: { narrative: 'We know the org is large. A 20 percent rate means about 60 exits. At Rs. 8L CTC that is Rs. 3.84 Cr in replacement cost. HR must pull the data.' }, impact: { narrative: 'n', financialImpact: 'Rs. 2.4 Cr', breakdown: ['Replacement cost: 60 x Rs. 8L = Rs. 3.84 Cr', 'Ramp gap not confirmed'] }, narrative: { cfoVersion: 'Directional modelling puts it at Rs. 3.84 Cr. The confirmed number needs HR data.' } }, humac: { range: 'Rs. 2.4 Cr - Rs. 7.8 Cr' }, bcInputs: { model: 'attrition', exits: null, avgCtc: null } };
ok(applyBusinessCaseEngine(r, THIN) === false, 'thin: no engine');
const flat = JSON.stringify(r);
ok(!/Rs\. ?\d/.test(flat.replace(/Not computed[^"]*/g, '')), 'thin: no rupee figure left: ' + flat.slice(0, 400));
ok(r.revenueAtRisk.figure === 'Not computed' && r.humac.range === 'Not computed' && r.signal.impact.financialImpact === 'Not computed', 'thin: cards say Not computed');
ok(/HR must pull the data/.test(r.signal.situation.narrative) && /confirmed number needs HR data/.test(r.signal.narrative.cfoVersion), 'thin: non-rupee sentences kept');
ok(r.signal.impact.breakdown.length === 1 && /Not computed/.test(r.signal.impact.breakdown[0]), 'thin: breakdown replaced');
ok(r.bcCheck.stripped >= 4 && /removed/.test(r.bcCheck.note) && /No rupee figure can be named/.test(r.headline), 'thin: note and headline: ' + r.bcCheck.note + ' | ' + r.headline);
r = { headline: 'Insufficient data to name the number, but the cost is rarely below Rs. 1.5 Cr annually. Here is what we need to make that case undeniable.', revenueAtRisk: {}, signal: { impact: {} }, bcInputs: null };
applyBusinessCaseEngine(r, THIN); ok(/^No rupee figure can be named yet/.test(r.headline) && !/Here is what we need/.test(r.headline), 'partly stripped headline fully replaced: ' + r.headline);
// no engine (v128): unsupported model figures are removed and marked Not computed
r = mk(); r.bcInputs = { model: 'attrition', exits: 99, avgCtc: 1 }; ok(applyBusinessCaseEngine(r, TXT) === false && r.revenueAtRisk.figure === 'Not computed' && r.bcCheck.engine === false && /not in your data were removed/.test(r.bcCheck.note), 'engine off (v128): unsupported model figure now marked Not computed, honestly labelled: ' + JSON.stringify(r.revenueAtRisk) + r.bcCheck.note);
r = { wrongTool: true }; ok(applyBusinessCaseEngine(r, TXT) === false && r.bcCheck === undefined, 'wrong tool untouched');
// v113: L&D programme engine (stakeholder flow)
const LD = new Function(code + ';return {ldCalc, ldPromptBlock, applyBusinessCaseStakeholder, bcFigureCheck};')();
const LDT = 'We plan to spend ₹25L on L&D for 200 employees, average CTC ₹7L. The CEO sees L&D as a cost, not an investment.';
const LDIN = { model: 'ld', ldSpend: 2500000, employees: 200, avgCtc: 700000, exits: null, headcount: null };
let l = LD.ldCalc(LDIN, LDT);
ok(l && l.spendL === 25 && Math.abs(l.payrollL - 1400) < 1e-9 && Math.abs(l.perHead - 12500) < 1e-9 && Math.abs(l.pct - 25 / 1400 * 100) < 1e-9, 'ld calc: ' + JSON.stringify(l));
ok(LD.ldCalc({ ...LDIN, ldSpend: 3000000 }, LDT) === null, 'ld spend not in text: no computation');
ok(LD.ldCalc({ ...LDIN, employees: 250 }, LDT) === null, 'ld employees not in text: no computation');
ok(LD.ldCalc({ ...LDIN, model: 'attrition' }, LDT) === null, 'ld needs model ld');
const blk = LD.ldPromptBlock(l);
ok(/1\.8 percent/.test(blk) && /Rs\.14Cr/.test(blk) && /Rs\.12,500/.test(blk) && /Rs\.25L to Rs\.50L/.test(blk) && /assumed planning range/.test(blk), 'ld prompt block: ' + blk);
let ls = { openingLine: 'The programme costs roughly Rs.1.4Cr a year in lost output.', stack: { dataAnchor: { figure: 'Rs.56,00,000' }, riskMirror: { revenueAtRisk: 'Rs.1,00,00,000', revenueAtRiskBasis: 'invented' }, credibility: { statement: 'A first tranche of Rs.12.5L, then Rs.8L pilot.' } }, bcInputs: LDIN };
ok(LD.applyBusinessCaseStakeholder(ls, LDT) === true && ls.bcInputs === undefined, 'ld stakeholder applied');
ok(/Break-even at a 1\.8 percent uplift on Rs\.14Cr payroll/.test(ls.stack.dataAnchor.figure), 'ld anchor: ' + ls.stack.dataAnchor.figure);
ok(ls.stack.riskMirror.revenueAtRisk === 'Not computed' && /Not computed/.test(ls.stack.riskMirror.revenueAtRiskBasis), 'ld risk mirror not computed');
ok(/pays for itself/.test(ls.openingLine) && !/1\.4Cr/.test(ls.openingLine), 'invented opening line replaced: ' + ls.openingLine);
ok(ls.bcCheck.ok === false && ls.bcCheck.flagged.some(f => /8L/.test(f)), 'ld invented pilot flagged: ' + JSON.stringify(ls.bcCheck.flagged));
ls = { openingLine: 'Rs.25L covers Rs.14Cr of payroll.', stack: { dataAnchor: { figure: 'x' }, riskMirror: { revenueAtRisk: 'x' }, credibility: { statement: 'Planning return Rs.25L to Rs.50L, about Rs.12,500 per head, half is Rs.12.5L.' } }, bcInputs: LDIN };
LD.applyBusinessCaseStakeholder(ls, LDT); ok(ls.bcCheck.ok === true && ls.openingLine === 'Rs.25L covers Rs.14Cr of payroll.', 'clean ld passes: ' + JSON.stringify(ls.bcCheck.flagged));
// v114: "rs" inside a word is not a rupee prefix
ok(bondAmountsIn('Rs.25L covers 200 employees; managers 5 and hours 8').join() === '2500000', 'rs inside words ignored: ' + bondAmountsIn('Rs.25L covers 200 employees; managers 5 and hours 8'));
ok(bondAmountsIn('(Rs.8L) and ₹15L and INR 2,00,000').join() === '800000,1500000,200000', 'real prefixes still parsed');
ls = { openingLine: 'Rs.25L covers 200 employees.', stack: { dataAnchor: { figure: 'x' }, riskMirror: { revenueAtRisk: 'x' }, credibility: { statement: 'Rs.25L covers 200 employees at Rs.12,500 per head.' } }, bcInputs: LDIN };
LD.applyBusinessCaseStakeholder(ls, LDT); ok(ls.bcCheck.ok === true, 'covers 200 not flagged: ' + JSON.stringify(ls.bcCheck.flagged));
// v115: L&D benchmark claims removed, likelihood badge cleared
ls = { openingLine: 'Rs.25L covers Rs.14Cr of payroll.', humac: { basis: 'Break-even lift is 1.8%. The 1x to 2x multiplier reflects the industry\'s own commonly cited training ROI target of 100 to 200% return. L&D ROI is widely acknowledged as poorly measured.' }, stack: { dataAnchor: { figure: 'x' }, riskMirror: { revenueAtRisk: 'x', probability: 'Medium, the financial logic is sound.' }, credibility: { statement: 'At Rs.12,500 per head this is a modest but credible investment, not an outlier spend. The break-even is 1.8 percent.' }, closing: ['Gallup says engagement pays. Agree the metric at approval.'] }, bcInputs: LDIN };
LD.applyBusinessCaseStakeholder(ls, LDT);
ok(ls.humac.basis === 'Break-even lift is 1.8%.' , 'benchmark sentences removed from humac basis: ' + ls.humac.basis);
ok(ls.stack.credibility.statement === 'The break-even is 1.8 percent.', 'modest/outlier judgement removed: ' + ls.stack.credibility.statement);
ok(ls.stack.closing[0] === 'Agree the metric at approval.', 'named body removed inside array: ' + ls.stack.closing[0]);
ok(ls.stack.riskMirror.probability === '', 'likelihood badge cleared');
ok(ls.bcCheck.ok === true && ls.bcCheck.claimsRemoved === 4 && /removed because the system cannot verify/.test(ls.bcCheck.note), 'note counts removals: ' + ls.bcCheck.claimsRemoved + ' ' + ls.bcCheck.note);
ls = { openingLine: 'x', stack: { dataAnchor: { figure: 'x' }, riskMirror: { revenueAtRisk: 'x' }, credibility: { statement: 'Typically programmes like this return 3x.' } }, bcInputs: LDIN };
LD.applyBusinessCaseStakeholder(ls, LDT); ok(/^Not stated/.test(ls.stack.credibility.statement), 'field fully made of a claim gets a Not stated line: ' + ls.stack.credibility.statement);
ok(/Do not cite any industry benchmark/.test(LD.ldPromptBlock(LD.ldCalc(LDIN, LDT))), 'prompt forbids benchmarks');
// v116: engagement (0.15) and manager effectiveness (0.08) engine, stakeholder flow
const ER = new Function(code + ';return {erCalc, erPromptBlock, applyBusinessCaseStakeholder};')();
const ET = 'We have 250 employees and our survey shows 60 are disengaged. Average CTC is ₹8L. We want ₹20L for an engagement programme.';
const EIN = { model: 'engagement', disengaged: 60, avgCtc: 800000, employees: 250, exits: null, headcount: 250 };
let e = ER.erCalc(EIN, ET);
ok(e && e.kind === 'engagement' && Math.abs(e.baseL - 480) < 1e-9 && Math.abs(e.dragL - 72) < 1e-9 && e.coef === 0.15, 'engagement: 60 x 8L x 0.15 = 72L: ' + JSON.stringify(e));
ok(ER.erCalc({ ...EIN, disengaged: 55 }, ET) === null, 'disengaged count not in text: no computation');
ok(ER.erCalc({ ...EIN, avgCtc: 900000 }, ET) === null, 'ctc not in text: no computation');
const MT = '12 managers are rated below average, each leads a team of 8, average CTC is ₹8L.';
const MIN = { model: 'manager', belowAvgManagers: 12, teamSize: 8, avgCtc: 800000 };
let m = ER.erCalc(MIN, MT);
ok(m && m.kind === 'manager' && Math.abs(m.baseL - 768) < 1e-9 && Math.abs(m.dragL - 61.44) < 1e-9 && m.coef === 0.08, 'manager: 12 x 8 x 8L x 0.08 = 61.44L: ' + JSON.stringify(m));
ok(ER.erCalc({ ...MIN, teamSize: 10 }, MT) === null, 'team size not in text: no computation');
ok(ER.erCalc({ model: 'attrition', disengaged: 60, avgCtc: 800000 }, ET) === null, 'other model: no er computation');
const eb = ER.erPromptBlock(e);
ok(/Rs\.72L/.test(eb) && /Rs\.4\.8Cr/.test(eb) && /assumed planning coefficient/.test(eb) && /Do not attribute the 15 percent to Gallup/.test(eb), 'er prompt block: ' + eb);
let es = { openingLine: 'Disengagement is costing about Rs.1.2Cr a year.', stack: { dataAnchor: { figure: 'x' }, riskMirror: { revenueAtRisk: 'x', probability: 'High, trend.' }, credibility: { statement: 'Gallup-derived inference: managers account for 70% of variance in team engagement across 2.7 million workers. The drag is Rs.72L.' }, narrativeBridge: { story: 'Attrition would add Rs.40L.' } }, bcInputs: EIN };
ok(ER.applyBusinessCaseStakeholder(es, ET) === true && es.bcInputs === undefined, 'er applied');
ok(/Rs\.72L a year of productivity drag at an assumed 15 percent/.test(es.stack.dataAnchor.figure) && es.stack.riskMirror.revenueAtRisk === 'Rs.72L a year', 'er anchors: ' + es.stack.dataAnchor.figure + ' | ' + es.stack.riskMirror.revenueAtRisk);
ok(/assumed planning coefficient/.test(es.stack.riskMirror.revenueAtRiskBasis) && es.stack.riskMirror.probability === '', 'basis labelled assumed, likelihood cleared');
ok(!/1\.2Cr/.test(es.openingLine) && /Rs\.72L/.test(es.openingLine), 'invented opening figure replaced: ' + es.openingLine);
ok(es.stack.credibility.statement === 'The drag is Rs.72L.', 'Gallup derivation removed: ' + es.stack.credibility.statement);
ok(es.bcCheck.ok === false && es.bcCheck.flagged.some(f => /40L/.test(f)), 'invented Rs.40L attrition flagged: ' + JSON.stringify(es.bcCheck.flagged));
es = { openingLine: 'x', stack: { dataAnchor: { figure: 'x' }, riskMirror: { revenueAtRisk: 'x' }, credibility: { statement: 'The drag is Rs.61.44L on Rs.7.68Cr of team payroll.' } }, bcInputs: MIN };
ER.applyBusinessCaseStakeholder(es, MT); ok(es.bcCheck.ok === true && es.stack.riskMirror.revenueAtRisk === 'Rs.61.44L a year', 'manager clean case passes: ' + JSON.stringify(es.bcCheck.flagged) + ' ' + es.stack.riskMirror.revenueAtRisk);
ok(/NO INVENTED FACTS RULE/.test(src) && (src.match(/NO INVENTED FACTS RULE/g) || []).length === 2, 'no-invented-facts rule in both prompts');
// v117: budget fractions allowed, per-field fallback, overstatement stripped
es = { openingLine: 'We have identified Rs.72L sitting on the table right now, not a projection, not a worst case.', stack: { dataAnchor: { figure: 'x' }, riskMirror: { revenueAtRisk: 'x' }, credibility: { statement: 'Phase Rs.10L now and Rs.10L later, or 60 percent as Rs.12L and 40 percent as Rs.8L.' }, riskMirrorExtra: { t: 'Twelve months of inaction costs the business at least Rs.72L in productivity alone.' }, decisionRunway: { deadline: 'This is typically a one-quarter decision.', ask: 'Approve Rs.20L.' } }, bcInputs: EIN };
ER.applyBusinessCaseStakeholder(es, ET);
ok(es.bcCheck.ok === true, 'half and 60/40 of the stated spend allowed: ' + JSON.stringify(es.bcCheck.flagged));
ok(es.stack.decisionRunway.deadline === 'Not stated: no decision date was given.', 'deadline fallback is about the date: ' + es.stack.decisionRunway.deadline);
ok(!/at least Rs\.72L/.test(es.stack.riskMirrorExtra.t) && !/not a projection/.test(es.openingLine), 'floor and not-a-projection claims removed: ' + es.stack.riskMirrorExtra.t + ' | ' + es.openingLine);
es = { openingLine: 'x', stack: { dataAnchor: { figure: 'x' }, riskMirror: { revenueAtRisk: 'x' }, credibility: { statement: 'Pilot at Rs.9L first.' } }, bcInputs: EIN };
ER.applyBusinessCaseStakeholder(es, ET); ok(es.bcCheck.ok === false && es.bcCheck.flagged.some(f => /9L/.test(f)), 'Rs.9L is not a fraction of the spend: flagged');
ok(/never call it a floor/.test(ER.erPromptBlock(e)) && /Never state numeric targets/.test(ER.erPromptBlock(e)), 'er prompt forbids floor claims and numeric targets');
// v118: quarterly and monthly slices of the system drag allowed; ranking and disclosure-avoidance claims stripped
es = { openingLine: 'x', stack: { dataAnchor: { figure: 'x' }, riskMirror: { revenueAtRisk: 'x' }, credibility: { statement: 'Every quarter without intervention is approximately Rs.18L, or Rs.6L a month.' }, narrativeBridge: { story: 'Fixing this is one of the highest-return interventions available. The group has no active programme in place. Rehearse your answer without retreating to the coefficient.' } }, bcInputs: EIN };
ER.applyBusinessCaseStakeholder(es, ET);
ok(es.bcCheck.ok === true && es.bcCheck.claimsRemoved === 3 && es.stack.narrativeBridge.story === 'The story is the situation you described in your input.', 'quarter and month slices allowed, three claims removed: ' + JSON.stringify(es.bcCheck) + ' | ' + es.stack.narrativeBridge.story);
es = { openingLine: 'x', stack: { dataAnchor: { figure: 'x' }, riskMirror: { revenueAtRisk: 'x' }, credibility: { statement: 'Every quarter costs Rs.19L.' } }, bcInputs: EIN };
ER.applyBusinessCaseStakeholder(es, ET); ok(es.bcCheck.ok === false && es.bcCheck.flagged.some(f => /19L/.test(f)), 'Rs.19L is not a slice of the drag: flagged');
ok(/hide, downplay or avoid saying/.test(ER.erPromptBlock(e)), 'prompt forbids coaching to avoid the disclosure');
// v119: fully stripped meridianCalibration becomes empty; model note about obeying the rule is cut from the ARIA line
es = { openingLine: 'x', humac: { pillarRationale: 'Maps to L3.', meridianCalibration: 'Attrition of 20 to 24 percent is the industry norm here.' }, aria: 'ARIA plays the CEO: \'Why Rs.20L on a planning figure?\' -- the rehearsal keeps the disclosure in place and coaches you to hold the argument.', stack: { dataAnchor: { figure: 'x' }, riskMirror: { revenueAtRisk: 'x' } }, bcInputs: EIN };
ER.applyBusinessCaseStakeholder(es, ET);
ok(es.humac.meridianCalibration === '' && es.humac.pillarRationale === 'Maps to L3.', 'stripped meridianCalibration is empty, not Not stated: ' + JSON.stringify(es.humac));
ok(es.aria === 'ARIA plays the CEO: \'Why Rs.20L on a planning figure?\'', 'rule-compliance note cut from ARIA line: ' + es.aria);
// v120: POSH compliance engine (stakeholder flow) built from the real BC6 output
const PX = new Function(code + ';return {applyBusinessCaseStakeholder, poshPromptBlock, bcFigureCheck};')();
const PT = 'Approve ₹3L to set up POSH compliance: an Internal Committee, training and the annual report. We have 180 employees in our Gurgaon office. We have no Internal Committee under the POSH Act and no annual POSH training. The CEO thinks nobody will check.';
function posh() { return { openingLine: 'The risk we are sitting on is that when they do, we will have no legal defence at all.', stack: {
  dataAnchor: { figure: 'Rs.50,000 statutory fine (first offence) + Rs.25L-Rs.50L estimated tribunal award exposure + Rs.10L-Rs.20L external legal defence cost = Rs.35L-Rs.70L', context: 'The Rs.50,000 statutory fine is the floor, not the ceiling. Tribunal awards in harassment cases in India have ranged from Rs.10L to Rs.50L in documented cases. The Rs.3L we are asking for today is less than 1% of the lower bound of that exposure range.', humacBasis: 'Probability of a complaint reaching formal escalation is estimated at 15-25%. Expected value: 20% probability x Rs.35L minimum exposure = Rs.7L expected cost.' },
  credibility: { statement: 'POSH compliance is a statutory obligation under the Act. Every organisation with 10 or more employees is legally required to constitute an Internal Committee. We have 180 employees at Location A alone.', evidence: 'Section 4 of the POSH Act mandates an IC. Section 21 mandates an annual report to the District Officer. Non-compliance is a named offence under Section 26, with a fine of up to Rs.50,000. The Ministry of Women and Child Development has been escalating enforcement, and IRDAI has issued advisories. Section 31 sets a further penalty.' },
  narrativeBridge: { story: 'In 2021, a mid-sized NBFC in Maharashtra faced a POSH complaint. The financial loss exceeded Rs.2 crore. The original complaint was settled for Rs.18L.', connection: 'x', emotionalHook: 'x' },
  riskMirror: { scenario: 'Statutory penalty compounding across Sections 4, 19 and 21 to Rs.1.5L on a repeat-violation basis. The Haryana District Officer has authority to inspect on receipt of any third-party information.', revenueAtRisk: 'Rs.35L-Rs.70L', revenueAtRiskBasis: 'invented', timeline: '12 months', probability: 'High, the organisation has zero procedural defence.' },
  decisionRunway: { ask: 'Approve Rs.3L.', deadline: 'I recommend completing this within the current quarter.', alternatives: ['Release Rs.1.5L immediately to constitute the IC.', 'Mandate the CHRO to identify an external member.'], successMetric: 'IC constituted within 30 days. Annual report submitted within 90 days. The target and measure will be agreed with you.' } },
  aria: 'ARIA plays the CEO pushing back.' }; }
let ps = posh();
ok(PX.applyBusinessCaseStakeholder(ps, PT) === true, 'posh applied');
const pj = JSON.stringify(ps);
ok(ps.stack.dataAnchor.figure === 'A fine of up to Rs.50,000 under POSH Act s.26(1); every other cost is not computed', 'anchor: ' + ps.stack.dataAnchor.figure);
ok(ps.stack.riskMirror.revenueAtRisk === 'Not computed' && ps.stack.riskMirror.probability === '' && /no formula for compensation/.test(ps.stack.riskMirror.revenueAtRiskBasis), 'risk mirror not computed, badge cleared');
ok(!/Rs\.(25L|35L|10L|2 crore|18L|1\.5L)/.test(pj.replace(/Release Rs\.1\.5L immediately[^"]*/, '')) , 'invented rupee figures gone: ' + (pj.match(/Rs\.[\d.,]+(?:L|Cr| crore)?/g) || []).join(' '));
ok(!/tribunal|documented cases|NBFC|IRDAI|Ministry of Women|15-25%|Expected value|floor|10 or more employees|Section 31|third-party|compounding|within 30 days|within 90 days|In 2021/i.test(pj), 'fabricated precedent, regulator, probability, threshold, section and timeline claims gone: ' + (pj.match(/tribunal|documented cases|NBFC|IRDAI|Ministry of Women|15-25%|Expected value|floor|10 or more employees|Section 31|third-party|compounding|within 30 days|within 90 days|In 2021/i) || []));
ok(/Section 4 of the POSH Act mandates an IC/.test(ps.stack.credibility.evidence) && /Section 21 mandates/.test(ps.stack.credibility.evidence) && /fine of up to Rs\.50,000/.test(ps.stack.credibility.evidence), 'real sections and the real maximum fine kept: ' + ps.stack.credibility.evidence);
ok(/Release Rs\.1\.5L immediately/.test(ps.stack.decisionRunway.alternatives[0]) && /agreed with you/.test(ps.stack.decisionRunway.successMetric), 'half of the stated spend kept, agreed-metric sentence kept');
ok(!/Location A/.test(pj) && /our office/.test(ps.stack.credibility.statement), 'Location A placeholder replaced: ' + ps.stack.credibility.statement);
ok(/The duty to constitute an Internal Complaints Committee/.test(ps.stack.narrativeBridge.story), 'emptied story gets the statute sentence: ' + ps.stack.narrativeBridge.story);
ok(ps.bcCheck.ok === true && ps.bcCheck.stripped >= 8 && /POSH Act text the system holds/.test(ps.bcCheck.note) && !/attrition/.test(ps.bcCheck.note), 'check note about POSH, no attrition wording: ' + ps.bcCheck.note);
ok(/s\.4\(1\)/.test(PX.poshPromptBlock()) && /never a floor/.test(PX.poshPromptBlock()) && /Never state a threshold of employees/.test(PX.poshPromptBlock()), 'posh prompt block');
ok(!/lower bound|exposure range/.test(pj) && ps.stack.dataAnchor.humacBasis !== 'Not stated.' && /POSH Act s\.4\(1\)/.test(ps.stack.riskMirror.scenario) && !/Not stated/.test(JSON.stringify(ps.stack.riskMirror)), 'dangling range sentence gone, emptied POSH fields get statute-grounded text: ' + ps.stack.dataAnchor.context + ' | ' + ps.stack.riskMirror.scenario + ' | ' + ps.stack.dataAnchor.humacBasis);
// v121: BC6 v120 residue: humac basis/pillar/category overrides, stricter claim stripping
let p2 = posh();
p2.openingLine = 'This exposure is quantifiable and sits on our books, and begins at Rs.50,000 in fines per violation.';
p2.humac = { pillar: 'L1', pillarRationale: 'Cost.', trajectorySignal: 'Rising.' };
p2.greenCategory = { primary: 'Cost Efficiency' };
p2.stack.dataAnchor.humacBasis = 'Attrition model per SHRM and Gallup: 14% of the cost of one exit, per Panopto and YouGov.';
p2.stack.credibility.evidence += ' The annual report falls due in January. Fines may each attract a further penalty.';
PX.applyBusinessCaseStakeholder(p2, PT);
const p2j = JSON.stringify(p2);
ok(p2.humac.pillar === 'L4' && p2.greenCategory.primary === 'Risk Mitigation', 'pillar L4 and Risk Mitigation forced');
ok(/^Not computed/.test(p2.stack.dataAnchor.humacBasis) && !/SHRM|Gallup|Panopto|YouGov|14%/.test(p2j), 'humacBasis overridden, research bodies gone: ' + p2.stack.dataAnchor.humacBasis);
ok(!/quantifiable|on our books|begins at|per violation|falls due|may each attract/i.test(p2j), 'claim phrases stripped: ' + (p2j.match(/quantifiable|on our books|begins at|per violation|falls due|may each attract/i) || []));
ok(/Internal Complaints Committee/.test(p2.openingLine), 'opening line fallback used: ' + p2.openingLine);
// v122: BC6 v121 residue
let p3 = posh();
p3.humac = { pillar: 'L1', pillarRationale: 'x', meridianCalibration: 'The HUMAC score of 49 makes the L1 framing accurate.' };
p3.stack.dataAnchor.context = 'Not stated.';
p3.stack.credibility.statement = 'No Committee exists at the Location A office. This is not triggered by a complaint.';
p3.stack.decisionRunway.ask = 'Approve Rs.3,00,000, all for the Location A office.';
p3.stack.riskMirror.scenario = 'An order under s.25 can open an inspection.';
PX.applyBusinessCaseStakeholder(p3, PT);
const p3j = JSON.stringify(p3);
ok(p3.greenCategory.primary === 'Risk Mitigation' && p3.humac.meridianCalibration === '' && !/L1 framing/.test(p3j), 'category forced even when absent, L1 text gone');
ok(!/the our office|our office office|Location A/.test(p3j) && /for our office\./.test(p3.stack.decisionRunway.ask), 'no "the our office": ' + p3.stack.decisionRunway.ask);
ok(p3.stack.dataAnchor.context !== 'Not stated.' && !/not triggered by a complaint/i.test(p3j) && /s\.25 can open an inspection/.test(p3.stack.riskMirror.scenario), 'orphan Not stated gone, trigger claim stripped, s.25 inspection sentence kept');
// v123: BC6 v122 residue
let p4 = posh();
p4.openingLine = 'I want to show you why the Rs.3L is the most expensive decision on your desk.';
p4.closingLine = 'I will have the one-pager on your desk by end of day. Let us reconnect Thursday.';
p4.stack.dataAnchor.context = 'The ceiling is Rs.50,000 per finding. Rs.3L closes the gap.';
p4.stakeholderProfile = 'The asymmetry is so lopsided that skipping compliance is riskier. The CEO is cautious.';
PX.applyBusinessCaseStakeholder(p4, PT);
const p4j = JSON.stringify(p4);
ok(!/per finding|most expensive|lopsided|Thursday|end of day/i.test(p4j), 'per-finding, comparative-cost and invented-day claims stripped: ' + (p4j.match(/per finding|most expensive|lopsided|Thursday|end of day/i) || []));
ok(/Internal Complaints Committee/.test(p4.openingLine) && /so the three statutory gaps can be closed/.test(p4.closingLine) && /Rs\.3L closes the gap/.test(p4.stack.dataAnchor.context), 'fallbacks used, user-figure sentence kept: ' + p4.closingLine + ' | ' + p4.stack.dataAnchor.context);
// v124: BC6 v123 residue
let p5 = posh();
p5.openingLine = 'We have an unmet duty. The cost of not meeting it is not capped.';
p5.stack.decisionRunway.deadline = 'I recommend this quarter. I will bring you a phased plan within five working days of approval.';
p5.closingLine = 'I will have the draft on your desk by end of this week. The gap closes when you sign.';
p5.stack.dataAnchor.context = 'What matters is what happens on a second finding.';
p5.stack.credibility.evidence = 'None of these are discretionary. Location A has 180 employees. This sits below the legal team radar.';
PX.applyBusinessCaseStakeholder(p5, PT);
const p5j = JSON.stringify(p5);
ok(!/not capped|within five|end of this week|legal team|second finding/i.test(p5j), 'v123 residue stripped: ' + (p5j.match(/not capped|within five|end of this week|legal team|second finding/i) || []));
ok(/on a repeat conviction/.test(p5.stack.dataAnchor.context) && /discretionary\. Our office has 180/.test(p5.stack.credibility.evidence) && /I recommend this quarter/.test(p5.stack.decisionRunway.deadline), 'repeat conviction wording, capitalised Our office, recommendation kept: ' + p5.stack.credibility.evidence + ' | ' + p5.stack.decisionRunway.deadline);
// v125: BC6 v124 residue, generic comparative-cost rule
let p6 = posh();
p6.stack.dataAnchor.context = 'The gap we are carrying costs more to defend than to close. The Rs.3L closes the gap.';
p6.stack.credibility.statement = 'As CHRO I bring decisions where the cost of delay is higher than the cost of action. We are in breach of both, and that is visible to anyone who asks.';
PX.applyBusinessCaseStakeholder(p6, PT);
const p6j = JSON.stringify(p6);
ok(!/costs more|cost of delay|cost of action|in breach of both|visible to anyone/i.test(p6j), 'comparative-cost and dangling both stripped: ' + (p6j.match(/costs more|cost of delay|cost of action|in breach of both|visible to anyone/i) || []));
ok(/Rs\.3L closes the gap/.test(p6.stack.dataAnchor.context), 'user-figure sentence kept: ' + p6.stack.dataAnchor.context);
// v126: BC6 v125 residue
let p7 = posh();
p7.openingLine = 'The one scenario that costs us nothing to prevent is the one we left open.';
p7.stakeholderProfile = 'The CEO listens. The ask of Rs.3L is modest relative to the organisation payroll and must be framed that way. Lead with exposure.';
p7.stack.credibility.statement = 'I am raising this to protect you personally as the accountable employer. The duty sits in s.4(1).';
p7.closingLine = 'I will send you the one-page plan today. Let us confirm the approval.';
p7.stack.dataAnchor.context = 'The ceiling for a first finding under s.26(1) is Rs.50,000.';
PX.applyBusinessCaseStakeholder(p7, PT);
const p7j = JSON.stringify(p7);
ok(!/costs us nothing|modest relative|protect you personally|I will send|first finding/i.test(p7j), 'v125 residue stripped: ' + (p7j.match(/costs us nothing|modest relative|protect you personally|I will send|first finding/i) || []));
ok(/first contravention under s\.26\(1\)/.test(p7.stack.dataAnchor.context) && /Lead with exposure/.test(p7.stakeholderProfile) && /The duty sits in s\.4\(1\)/.test(p7.stack.credibility.statement), 'neighbouring good sentences kept: ' + p7.stakeholderProfile);
// v127: BC7 wrong-tool pre-check and generic no-engine strip
const WT = new Function(code + ';return {bcIsIndividualCase, bcPctBad, applyBusinessCaseStakeholder};')();
ok(WT.bcIsIndividualCase('Ramesh has been absent without notice for 6 days. HR wants to terminate him next week. Need the CEO to sign off.', 'Approve terminating Ramesh for repeated absenteeism.') === true, 'live termination is an individual case');
ok(WT.bcIsIndividualCase('We have 180 employees and no Internal Committee.', 'Approve Rs.3L to set up POSH compliance.') === false, 'POSH is not an individual case');
ok(WT.bcIsIndividualCase('Our attrition is high and we want a retention programme.', 'Approve Rs.20L for a retention programme.') === false, 'attrition programme is not');
ok(WT.bcIsIndividualCase('We want the CEO to approve a new termination policy for the company.', 'Approve the policy.') === false, 'org-level termination policy is not');
ok(WT.bcPctBad('Attrition runs at 20-24%.', 'We want Rs.8L for hiring.') === true && WT.bcPctBad('We want a 20 percent uplift.', 'Target is 20 percent uplift') === false, 'percentages not in the text are flagged, user percentages are not');
let g2 = { openingLine: 'x', stack: { dataAnchor: { figure: 'Rs.9L', context: 'The range reflects uncertainty about the salary.', humacBasis: 'Replacement cost multiplier 0.8x to 1.3x from Gallup and SHRM; Panopto and YouGov say 42%.' }, riskMirror: { revenueAtRisk: 'x', revenueAtRiskBasis: 'y', scenario: 'A 25-35% probability of a claim. The team is stretched.' }, credibility: { statement: 'Gallup finds disengagement is costly. Our team is stretched.' } } };
WT.applyBusinessCaseStakeholder(g2, 'We want Rs.8L for a hiring programme.');
const g2j = JSON.stringify(g2);
ok(!/Gallup|SHRM|Panopto|YouGov|25-35|multiplier/i.test(g2j) && /^Not computed/.test(g2.stack.dataAnchor.humacBasis) && /not computed because the input/.test(g2.stack.dataAnchor.context) && /team is stretched/.test(g2j), 'generic no-engine: research and percentages stripped, basis and context replaced: ' + g2j.slice(0, 400));
// v128: process-ask exemption, headline orphan, general-flow strip
ok(WT.bcIsIndividualCase('We are about to terminate a senior engineer. He has been absent for six days. I want legal to review the process first.', 'Agree to loop in legal before the termination proceeds.') === false, 'the form example (loop in legal before termination) is not redirected');
ok(WT.bcIsIndividualCase('Ramesh has been absent for 6 days. HR wants to terminate him.', 'Approve terminating Ramesh for repeated absenteeism.') === true, 'direct termination approval still redirected');
let g3 = { openingLine: 'x', stack: { dataAnchor: { figure: 'Rs.9L', headline: 'Not stated.', context: 'c', humacBasis: 'Attrition multiplier 0.8x per Gallup' }, riskMirror: { revenueAtRisk: 'x', revenueAtRiskBasis: 'y' }, credibility: { statement: 'The team is stretched.' } } };
WT.applyBusinessCaseStakeholder(g3, 'We want Rs.8L for a hiring programme.');
ok(g3.stack.dataAnchor.headline !== 'Not stated.' && /No calculation applies/.test(g3.stack.dataAnchor.headline), 'orphan headline replaced: ' + g3.stack.dataAnchor.headline);
const GE = new Function(code + ';return {applyBusinessCaseEngine};')();
let ge = { headline: 'Three joiners lost: the cost of repeating this is Rs.7.2L to Rs.19.5L against a one-time fix of Rs.8L.', signal: { impact: { financialImpact: 'Rs.7.2L-Rs.19.5L', breakdown: ['Replacement cost Rs.6L per Gallup', 'Productivity gap is large'] } }, revenueAtRisk: { figure: 'Rs.7.2L-Rs.19.5L', basis: 'assumed', confidence: 'Medium' }, humac: { range: 'Rs.7.2L - Rs.19.5L' } };
GE.applyBusinessCaseEngine(ge, 'Three new joiners left within 90 days. Approve Rs.8L to redesign onboarding.');
const gej = JSON.stringify(ge);
ok(!/7\.2L|19\.5L|Gallup/.test(gej) && ge.revenueAtRisk.figure === 'Not computed' && ge.signal.impact.financialImpact === 'Not computed' && ge.humac.range === 'Not computed' && /Productivity gap is large/.test(gej) && /Rs\.8L/.test(ge.headline || '') === false || /No rupee figure beyond/.test(ge.headline), 'general flow strips model estimates, keeps neutral text: ' + gej.slice(0, 500));
ok(ge.bcCheck.stripped >= 1 && /figures or research claims/.test(ge.bcCheck.note), 'general flow note: ' + ge.bcCheck.note);
// v129: BC14, the Business Case financial-model prompt carries no research attributions
const fmBlock = src.slice(src.indexOf('function getBusinessCaseFinancialModels'), src.indexOf('function getBusinessCaseFinancialModels') + 6000);
const fmEnd = fmBlock.indexOf('`;\n}') > 0 ? fmBlock.slice(0, fmBlock.indexOf('`;\n}')) : fmBlock.slice(0, fmBlock.indexOf('`;\r\n}'));
ok(!/Panopto|YouGov|LSA Global|derivable|well-grounded|commonly-cited|2\.7 million|research-grounded/i.test(fmEnd) && /assumed planning/.test(fmEnd), 'financial-model prompt has no research attributions: ' + (fmEnd.match(/Panopto|YouGov|LSA Global|derivable|well-grounded|commonly-cited|2\.7 million|research-grounded/i) || []));
// generic stakeholder with no engine: unsupported figures removed, note accurate
let gs = { openingLine: 'x', stack: { dataAnchor: { figure: 'Rs.42L' }, riskMirror: { revenueAtRisk: 'Rs.1.2Cr', revenueAtRiskBasis: 'b' }, credibility: { statement: 'The budget is Rs.8L. A similar firm lost Rs.90L last year.' } } };
PX.applyBusinessCaseStakeholder(gs, 'We want Rs.8L for a hiring programme.');
ok(gs.stack.dataAnchor.figure === 'Not computed' && gs.stack.riskMirror.revenueAtRisk === 'Not computed' && gs.stack.credibility.statement === 'The budget is Rs.8L.', 'no-engine: unsupported figures removed, user figure kept: ' + JSON.stringify(gs.stack));
ok(gs.bcCheck.stripped === 1 && /no calculation for this kind of analysis/.test(gs.bcCheck.note) && !/attrition figures/.test(gs.bcCheck.note), 'no-engine note accurate: ' + gs.bcCheck.note);
// v130: attrition engine strips invented org facts and wrong-direction benchmark claims (both flows)
const AT = new Function(code + ';return {applyBusinessCaseStakeholder, applyBusinessCaseEngine};')();
const ATT = 'We have 120 employees. 18 people left in the last 12 months. Average CTC is 9 lakh per year.';
const mkA = () => ({ bcInputs: { model: 'attrition', exits: 18, headcount: 120, avgCtc: 900000, periodMonths: 12 }, openingLine: 'Eighteen people walked out, and not one rupee of that cost appeared on any budget line you approved.', closingLine: 'Please approve.', stack: { dataAnchor: { figure: 'x', headline: 'h', context: 'At 15% attrition on 120 employees, this organisation is running above the midpoint of the 20-24% insurance sector benchmark. None of it was budgeted, all of it real.', humacBasis: 'b' }, riskMirror: { revenueAtRisk: 'x', revenueAtRiskBasis: 'y', scenario: 'The organisation will absorb another 18 or more exits. These exits were preventable. The team is stretched.' }, credibility: { statement: 'None of it was consolidated and presented to Finance as a single figure. HR owns the data.' } } });
let a1 = mkA(); AT.applyBusinessCaseStakeholder(a1, ATT);
const a1j = JSON.stringify(a1);
ok(!/budget line|None of it|running above the midpoint|preventable|consolidated|or more exits/i.test(a1j) && /another 18 exits/.test(a1j) && /team is stretched/.test(a1j) && /HR owns the data/.test(a1j), 'stakeholder attrition claims stripped, good text kept: ' + a1j.slice(0, 700));
ok(/Rs\.1\.7Cr to Rs\.2\.92Cr/.test(a1.openingLine) && !/Not stated/.test(a1.openingLine), 'opening line fallback uses computed range: ' + a1.openingLine);
let a2 = mkA(); a2.stack.dataAnchor.context = 'At 15% attrition we sit below the 20-24% benchmark. The cost is real.'; AT.applyBusinessCaseStakeholder(a2, ATT);
ok(/below the 20-24% benchmark/.test(a2.stack.dataAnchor.context), 'correct-direction benchmark sentence kept: ' + a2.stack.dataAnchor.context);
ok(a1.bcCheck.stripped >= 3 && /did not give/.test(a1.bcCheck.note), 'note records removals: ' + a1.bcCheck.note);
let a3 = { bcInputs: { model: 'attrition', exits: 18, headcount: 120, avgCtc: 900000, periodMonths: 12 }, headline: 'Exits cost money.', signal: { impact: { financialImpact: 'x', breakdown: ['x'] }, summary: 'None of it was budgeted. Exits are rising.' }, revenueAtRisk: { figure: 'x', basis: 'y', confidence: 'Low' }, humac: { range: 'x' } };
AT.applyBusinessCaseEngine(a3, ATT);
ok(!/budgeted/.test(JSON.stringify(a3.signal)) && /Exits are rising/.test(JSON.stringify(a3.signal)), 'general flow strips invented org fact: ' + JSON.stringify(a3).slice(0, 400));
// v130: exits derived from a stated attrition percentage and headcount (exact integers only)
const TD = 'Our engineering team has 200 employees. Attrition has been 18 percent over the last 12 months. Average CTC is Rs.12 lakh.';
let td = bcRead({ model: 'attrition', headcount: 200, attritionPct: 18, avgCtc: 1200000, periodMonths: 12 }, TD);
ok(td.exits === 36 && td.derivedFromPct === 18, 'exits derived 18% of 200 = 36: ' + JSON.stringify(td));
let tdc = bcCalc(td);
ok(Math.abs(tdc.total[0] - 453.6) < 0.01 && Math.abs(tdc.total[1] - 777.6) < 0.01 && Math.abs(tdc.rate - 18) < 0.001, '36 x (9.6+3) to (15.6+6) = 453.6 to 777.6L: ' + tdc.total);
ok(bcLines(tdc).some(l => /Exits derived from your data: 18 percent of 200 = 36 exits/.test(l)), 'derivation shown');
ok(bcRead({ model: 'attrition', headcount: 175, attritionPct: 18, avgCtc: 1200000 }, 'We have 175 employees, attrition 18 percent, CTC Rs.12 lakh.').exits === null, 'non-integer derivation (31.5) not used');
ok(bcRead({ model: 'attrition', headcount: 200, attritionPct: 22, avgCtc: 1200000 }, TD).exits === null, 'percentage not in the text is rejected');
// v130b: unverified sector percentage gets a caveat, "confirmed cost" becomes modelled
let a4 = mkA(); a4.stack.dataAnchor.context = 'Attrition is held at the 20-24% sector benchmark as the ceiling. The annual cost is a confirmed annual cost.'; a4.stack.riskMirror.scenario = 'Your stated 18 percent stays. The 18-20% band is yours.'; AT.applyBusinessCaseStakeholder(a4, ATT + ' We think 18-20% is where it settles.');
ok(/20-24% sector benchmark as the ceiling \(a directional estimate from your profile/.test(a4.stack.dataAnchor.context) && /modelled annual cost/.test(a4.stack.dataAnchor.context) && !/confirmed/.test(a4.stack.dataAnchor.context), 'benchmark caveated, confirmed softened: ' + a4.stack.dataAnchor.context);
ok(!/directional estimate/.test(a4.stack.riskMirror.scenario), 'user-given percentage band not caveated: ' + a4.stack.riskMirror.scenario);
// v131b: promises by a stated time are removed on every stakeholder engine, closing line gets a safe fallback
let a5 = mkA(); a5.closingLine = 'I will send you the summary by end of day.'; a5.stack.credibility.statement = 'HR owns the data. I will share the model by end of day.';
AT.applyBusinessCaseStakeholder(a5, ATT);
ok(!/by end of day/.test(JSON.stringify(a5.stack)) && /HR owns the data/.test(a5.stack.credibility.statement) && !/Not stated/.test(a5.closingLine) && !/end of day/.test(a5.closingLine), 'promises removed, closing fallback: ' + a5.closingLine + ' | ' + a5.stack.credibility.statement);
// v132: unsupported worsening predictions removed, trend signal reset when the user gave no trend
let a6 = mkA(); a6.stack.riskMirror.scenario = 'The direction of travel is toward a more expensive problem, not a self-correcting one. The team is stretched.'; a6.humac = { range: 'x', trajectorySignal: 'negative, because it is more likely to worsen than to self-correct.' };
AT.applyBusinessCaseStakeholder(a6, ATT);
ok(!/self-correct|more expensive problem/.test(JSON.stringify(a6.stack)) && /team is stretched/.test(a6.stack.riskMirror.scenario) && /^neutral: no trend data/.test(a6.humac.trajectorySignal), 'predictions stripped, trajectory neutralised: ' + a6.stack.riskMirror.scenario + ' | ' + a6.humac.trajectorySignal);
let a7 = mkA(); a7.humac = { range: 'x', trajectorySignal: 'negative, because attrition is rising as you said.' };
AT.applyBusinessCaseStakeholder(a7, ATT + ' Attrition is rising every quarter.');
ok(/^negative/.test(a7.humac.trajectorySignal), 'user-supplied trend keeps the signal: ' + a7.humac.trajectorySignal);
// v132: no-engine path removes claims about a model that does not exist
let a8 = { openingLine: 'x', closingLine: 'I will send you a one-page model once you share it.', stack: { dataAnchor: { figure: 'Rs.8L' }, riskMirror: { revenueAtRisk: 'x', revenueAtRiskBasis: 'y' }, credibility: { statement: 'The vacancy cost model used here is built on the organisation\'s own revenue-per-employee ratio. Five roles are open.' } } };
PX.applyBusinessCaseStakeholder(a8, 'We have 5 open sales roles. Approve Rs.8L to hire.');
ok(!/vacancy cost model|revenue-per-employee/.test(JSON.stringify(a8.stack)) && /Five roles are open/.test(a8.stack.credibility.statement) && !/I will send/.test(a8.closingLine) && !/Not stated/.test(a8.closingLine), 'invented model claim and promise removed: ' + JSON.stringify(a8.stack.credibility) + ' | ' + a8.closingLine);
// v132: early-tenure cohort counted once, not annualised; Location placeholder fixed in general flow
const TW = 'Our HRBP says 4 of our 11 new joiners in the Gurgaon office resigned within 90 days. Average CTC is Rs.7 lakh.';
const twT = bcRead({ model: 'attrition', exits: 4, headcount: 11, avgCtc: 700000 }, TW);
ok(twT.tenureWindow === true && Math.abs(bcCalc(twT).total[0] - 29.4) < 0.01 && Math.abs(bcCalc(twT).total[1] - 50.4) < 0.01, 'tenure window flagged, total 4 x 7.35 to 12.6 = 29.4 to 50.4: ' + JSON.stringify(twT));
ok(bcLines(bcCalc(twT)).some(l => /counted once/.test(l)) && !bcLines(bcCalc(twT)).some(l => /over 12 months if nothing changes/.test(l)), 'lines say counted once');
ok(bcRead({ model: 'attrition', exits: 40, headcount: 250, avgCtc: 800000, periodMonths: 12 }, TXT).tenureWindow === false, 'a 12 month window is not a tenure window');
let a9 = { bcInputs: { model: 'attrition', exits: 4, headcount: 11, avgCtc: 700000 }, headline: 'At Location A office, annual cost is Rs.29.4L to Rs.50.4L.', signal: { impact: { financialImpact: 'x', breakdown: ['x'] }, situation: 'The industry benchmark is 20 to 24%. At Location A office, 4 resigned. If this continues at the same pace the annual cost is high.' }, revenueAtRisk: { figure: 'x', basis: 'y', confidence: 'Low' }, humac: { range: 'x' } };
AT.applyBusinessCaseEngine(a9, TW);
const a9s = JSON.stringify(a9.signal);
ok(!/benchmark|same pace|Location A/.test(a9s) && /our office, 4 resigned/.test(a9s) && /total cost is Rs\.29\.4L/.test(a9.headline) && !/Not stated/.test(a9.headline), 'tenure cohort text corrected: ' + a9s + ' | ' + a9.headline);
// v133: invented "no structured programme" and recurring-cost claims removed
let b1 = mkA(); b1.stack.credibility.statement = 'The organisation currently has no structured onboarding programme. Approving it keeps absorbing a cost that is already recurring. HR owns the data.';
AT.applyBusinessCaseStakeholder(b1, ATT);
ok(!/no structured|already recurring/.test(b1.stack.credibility.statement) && /HR owns the data/.test(b1.stack.credibility.statement), 'invented org facts removed: ' + b1.stack.credibility.statement);
// v134: mixed programme plus named-individual dismissal is redirected deterministically
const MX = new Function(code + ';return {bcMixedIndividual, bcIsIndividualCase};')();
ok(MX.bcMixedIndividual('We have 30 managers. Ravi manages a weak team and I think he should go.', 'Approve Rs.5L for a manager coaching programme, and also approve terminating Ravi, our worst manager.') === true, 'mixed ask redirected');
ok(MX.bcMixedIndividual('We have 30 managers.', 'Approve Rs.5L for a manager coaching programme.') === false, 'plain programme not redirected');
ok(MX.bcMixedIndividual('We want a new termination policy for the company.', 'Approve the policy.') === false, 'termination policy not redirected');
ok(MX.bcMixedIndividual('We will fire Monday the old process and start a programme.', 'Approve the programme.') === false, 'weekday after verb is not a name');
ok(MX.bcMixedIndividual('We are about to terminate a senior engineer. I want legal to review the process first.', 'Agree to loop in legal before the termination proceeds.') === false, 'process ask still exempt');
// v134: person placeholders do not leak
let b2 = mkA(); b2.stack.credibility.statement = 'Manager A is weak. The case of Employee B is separate. HR owns the data.';
AT.applyBusinessCaseStakeholder(b2, ATT);
ok(!/Manager A|Employee B/.test(b2.stack.credibility.statement) && /^The manager is weak/.test(b2.stack.credibility.statement) && /HR owns the data/.test(b2.stack.credibility.statement), 'person placeholders replaced: ' + b2.stack.credibility.statement);
// v135: no-engine path removes invented durations, payback and pipeline claims; user-given durations kept
let h1 = { openingLine: 'x', closingLine: 'Let us reconnect tomorrow morning before the week closes.', stack: { dataAnchor: { figure: 'Rs.8L' }, riskMirror: { revenueAtRisk: 'x', revenueAtRiskBasis: 'y', scenario: 'A delay of even ten days risks a full hiring restart that adds six to eight weeks. Five roles are open.' }, credibility: { statement: 'The Rs.8L spend is recoverable in the first month from a single hire. Offers go out at day 60. Targets are behind plan this quarter.' } } };
PX.applyBusinessCaseStakeholder(h1, 'We have 5 open sales roles. Approve Rs.8L. We have been hiring for 3 months and targets are behind plan.');
const h1j = JSON.stringify(h1.stack);
ok(!/ten days|six to eight|recoverable|day 60|restart/.test(h1j) && /Five roles are open/.test(h1j) && /Targets are behind plan/.test(h1j) && !/tomorrow|Not stated/.test(h1.closingLine), 'no-engine invented durations and payback removed: ' + h1j + ' | ' + h1.closingLine);
let h2 = { openingLine: 'x', closingLine: 'c', stack: { dataAnchor: { figure: 'Rs.8L' }, riskMirror: { revenueAtRisk: 'x', revenueAtRiskBasis: 'y' }, credibility: { statement: 'You said hiring has taken 3 months. That is long.' } } };
PX.applyBusinessCaseStakeholder(h2, 'We have 5 open sales roles. Approve Rs.8L. We have been hiring for 3 months and targets are behind plan.');
ok(/hiring has taken 3 months/.test(h2.stack.credibility.statement), 'user-given duration kept: ' + h2.stack.credibility.statement);
// v136: more invented org and sector claims in the attrition stakeholder path
let b3 = mkA(); b3.stack.credibility.statement = 'This is a cost that is not captured in any current budget line. Finance is currently not measuring it. Sales teams in insurance are a known flight-risk segment given commission portability. There is no active mechanism to hold the rate. HR owns the data.';
AT.applyBusinessCaseStakeholder(b3, ATT);
ok(!/budget line|not measuring|flight-risk|commission portability|no active mechanism/.test(b3.stack.credibility.statement) && /HR owns the data/.test(b3.stack.credibility.statement), 'more invented claims removed: ' + b3.stack.credibility.statement);
// v137: invented multiples removed in no-engine path; emptied fields get neutral text, not Not stated
let h3 = { openingLine: 'x', closingLine: 'c', stack: { credibility: { statement: 'ok one', evidence: 'The cost of inaction is 3x to 6x the cost of the ask.', deliveryNote: 'Not stated.' }, dataAnchor: { figure: 'Rs.8L', headline: 'h', context: 'c', humacBasis: 'b' }, narrativeBridge: { story: 'Vacancy cost exceeds the hiring cost within the first quarter.', connection: 'fine connection', emotionalHook: 'e' }, riskMirror: { scenario: 'The cost of inaction is high.', revenueAtRisk: 'x', revenueAtRiskBasis: 'y', timeline: 'Not stated.' }, decisionRunway: { ask: 'Approve Rs.8L', deadline: 'd', alternatives: ['Approve 5 roles over 6 weeks', 'Approve 2 roles now'], successMetric: 'Offers released within 45 days.' } } };
PX.applyBusinessCaseStakeholder(h3, 'We have 5 open sales roles. Approve Rs.8L. Targets are behind plan.');
const h3j = JSON.stringify(h3.stack);
ok(!/3x|exceeds the hiring|6 weeks|45 days/.test(h3j) && !/Not stated\.?"/.test(h3j.replace(/Not stated: no/g, '')) && /Approve 2 roles now/.test(h3j) && /agreed with the stakeholder/.test(h3.stack.decisionRunway.successMetric), 'multiples removed, no orphan Not stated: ' + h3j);
console.log(fails ? fails + ' FAILED' : 'business case: all passed');
process.exit(fails ? 1 : 0);
