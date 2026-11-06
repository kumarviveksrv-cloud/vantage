// Retention Advisor arithmetic (v73): figures computed in code, cards overwritten after the model replies.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'situation-room-api.worker.js'), 'utf8');
const m0 = src.indexOf('const REPLACEMENT_COST_MULTIPLIER'), m1 = src.indexOf('const DEFAULT_REPLACEMENT_MULTIPLIER');
const e0 = src.indexOf('function engineLakh'), e1 = src.indexOf('function r2(');
const a = src.indexOf('// RETENTION_MODEL_START'), b = src.indexOf('// RETENTION_MODEL_END');
const lib = new Function(src.slice(m0, m1) + ';' + src.slice(e0, e1) + ';' + src.slice(a, b) + ';return {computeRetentionModel, retentionFixedBlock, retentionApply, retentionStrayFigures};')();
let fails = 0; const ok = (c, msg) => { if (!c) { fails++; console.log('FAIL', msg); } };
const near = (x, y) => Math.abs(x - y) < 0.005;

// R1: 18L current, 24L offer, 3y, Medium
const r1 = lib.computeRetentionModel({ currentCTC: 1800000, offerCTC: 2400000, tenureYears: 3, roleCriticality: 'Medium' });
ok(near(r1.replLo, 27.72) && near(r1.replHi, 36.72), 'R1 replacement 27.72-36.72: ' + r1.replLo + ' ' + r1.replHi);
ok(near(r1.options.partial.inc, 3) && near(r1.options.full.inc, 6) && near(r1.options.exceed.inc, 8.4), 'R1 increments');
ok(near(r1.options.partial.ctc, 21) && near(r1.options.full.ctc, 24) && near(r1.options.exceed.ctc, 26.4), 'R1 option CTCs');
ok(near(r1.ceilLo, 13.86) && near(r1.ceilHi, 18.36), 'R1 ceiling 13.86-18.36');
ok(r1.options.partial.monthsLo === 111 && r1.options.partial.monthsHi === 147, 'R1 partial months 111-147: ' + r1.options.partial.monthsLo + ' ' + r1.options.partial.monthsHi);
ok(near(r1.premiumPct, 33.3), 'R1 premium');

// R2: High criticality, 9 month ramp, 1.5-2.2x
const r2 = lib.computeRetentionModel({ currentCTC: 1800000, offerCTC: 2400000, tenureYears: 3, roleCriticality: 'High' });
ok(near(r2.replLo, 44.82) && near(r2.replHi, 57.42), 'R2 replacement 44.82-57.42: ' + r2.replLo + ' ' + r2.replHi);
ok(near(r2.ceilLo, 22.41) && near(r2.ceilHi, 28.71), 'R2 ceiling');

// R3: offer below current
const r3 = lib.computeRetentionModel({ currentCTC: 1800000, offerCTC: 1600000, tenureYears: 3, roleCriticality: 'Medium' });
ok(r3.noPremium === true && r3.options.full.inc === 0 && r3.options.full.monthsLo === null, 'R3 no premium, no negative cost');
ok(/not above current CTC/.test(lib.retentionFixedBlock('counter_offer', r3)), 'R3 block says no premium');

// Bad input and defaults
ok(lib.computeRetentionModel({ currentCTC: 'abc' }) === null && lib.computeRetentionModel(null) === null, 'bad input ignored');
const r4 = lib.computeRetentionModel({ currentCTC: 1800000, offerCTC: 2400000, tenureYears: 3, roleCriticality: 'Bogus' });
ok(r4.crit === 'Medium', 'unknown criticality defaults to Medium');

// Apply: overwrites the model's wrong numbers
const wrong = { flow: 'counter_offer', employeeProfile: { currentCTC: 1800000 }, financialModel: { replacementCost: { total: 'Rs.27.72L', breakdown: [] }, retentionCost: {}, breakEvenCeiling: 'Rs.6L per year' }, recommendation: { primary: 'Partial Match', figure: 'Rs.22L' }, humac: { range: 'Rs.22L – Rs.24L' }, scenarios: {}, communication: {} };
lib.retentionApply(wrong, 'counter_offer', r1);
ok(wrong.financialModel.replacementCost.total === 'Rs.27.72L – Rs.36.72L', 'total is a range: ' + wrong.financialModel.replacementCost.total);
ok(/^Rs\.13\.86L – Rs\.18\.36L a year/.test(wrong.financialModel.breakEvenCeiling) && /below the ceiling/.test(wrong.financialModel.breakEvenCeiling), 'ceiling replaced: ' + wrong.financialModel.breakEvenCeiling);
ok(wrong.recommendation.figure === 'Rs.21L', 'partial figure follows the formula: ' + wrong.recommendation.figure);
ok(wrong.humac.range === 'Rs.27.72L – Rs.36.72L', 'humac range is the replacement range');
ok(wrong.financialModel.retentionCost.partialMatch.annualIncrement === 'Rs.3L/yr' && wrong.financialModel.retentionCost.fullMatch.figure === 'Rs.24L', 'option cards');
ok(wrong.employeeProfile.offerPremiumPct === 33.3, 'premium set');
const wm = { recommendation: { primary: 'Walk Away', figure: 'n/a' }, financialModel: {}, humac: {} };
lib.retentionApply(wm, 'counter_offer', r1); ok(wm.recommendation.figure === 'n/a', 'walk away figure untouched');

// Proactive
const pro = lib.computeRetentionModel({ currentCTC: 1800000, tenureYears: 3, roleCriticality: 'Medium' });
const pr = { financialModel: { costOfLosingThem: { total: 'Rs.30L' }, proactiveInterventionCost: { salaryAdjustment: 'Rs.2L annual increment (10%)', breakEvenMonths: 9 } }, humac: {} };
lib.retentionApply(pr, 'proactive', pro);
ok(pr.financialModel.costOfLosingThem.total === 'Rs.27.72L – Rs.36.72L', 'proactive range');
ok(pr.financialModel.proactiveInterventionCost.salaryAdjustment === 'Rs.1.8L annual increment (10%)' && pr.financialModel.proactiveInterventionCost.breakEvenMonths === Math.round((185 + 245) / 2), 'proactive intervention recomputed: ' + JSON.stringify(pr.financialModel.proactiveInterventionCost));

// Stray figures
const good = { recommendation: { rationale: 'Match at Rs.21L adds Rs.3L a year against replacement of Rs.27.72L to Rs.36.72L.' }, scenarios: { a: 'Two years cost Rs.6L.' } };
ok(lib.retentionStrayFigures(good, 'counter_offer', r1).length === 0, 'calculated figures are not stray: ' + JSON.stringify(lib.retentionStrayFigures(good, 'counter_offer', r1)));
const bad = { recommendation: { rationale: 'Partial match at Rs.22L, a Rs.4L increment, saves Rs.24.22L.' } };
const strays = lib.retentionStrayFigures(bad, 'counter_offer', r1);
ok(strays.length === 3, 'three stray figures found: ' + JSON.stringify(strays));
ok(lib.retentionStrayFigures({ financialModel: { x: 'Rs.99L' } }, 'counter_offer', r1).length === 0, 'structured cards are not scanned');

if (fails) { console.log(fails + ' FAILED'); process.exit(1); } else { console.log('RETENTION TESTS PASSED'); }
