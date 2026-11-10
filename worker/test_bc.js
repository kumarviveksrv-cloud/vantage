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
// no engine: model figures untouched, check still runs against the user text, note says not system-checked
r = mk(); r.bcInputs = { model: 'attrition', exits: 99, avgCtc: 1 }; ok(applyBusinessCaseEngine(r, TXT) === false && r.revenueAtRisk.figure === 'Rs.1.2Cr' && r.bcCheck.engine === false && /not system-checked/.test(r.bcCheck.note), 'engine off: model figure kept, honestly labelled');
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
ok(es.bcCheck.ok === true && es.bcCheck.claimsRemoved === 3 && es.stack.narrativeBridge.story === 'Not stated.', 'quarter and month slices allowed, three claims removed: ' + JSON.stringify(es.bcCheck) + ' | ' + es.stack.narrativeBridge.story);
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
// generic stakeholder with no engine: unsupported figures removed, note accurate
let gs = { openingLine: 'x', stack: { dataAnchor: { figure: 'Rs.42L' }, riskMirror: { revenueAtRisk: 'Rs.1.2Cr', revenueAtRiskBasis: 'b' }, credibility: { statement: 'The budget is Rs.8L. A similar firm lost Rs.90L last year.' } } };
PX.applyBusinessCaseStakeholder(gs, 'We want Rs.8L for a hiring programme.');
ok(gs.stack.dataAnchor.figure === 'Not computed' && gs.stack.riskMirror.revenueAtRisk === 'Not computed' && gs.stack.credibility.statement === 'The budget is Rs.8L.', 'no-engine: unsupported figures removed, user figure kept: ' + JSON.stringify(gs.stack));
ok(gs.bcCheck.stripped === 1 && /no calculation for this kind of analysis/.test(gs.bcCheck.note) && !/attrition figures/.test(gs.bcCheck.note), 'no-engine note accurate: ' + gs.bcCheck.note);
console.log(fails ? fails + ' FAILED' : 'business case: all passed');
process.exit(fails ? 1 : 0);
