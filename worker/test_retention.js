// Retention Advisor arithmetic (v73): figures computed in code, cards overwritten after the model replies.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'situation-room-api.worker.js'), 'utf8');
const m0 = src.indexOf('const REPLACEMENT_COST_MULTIPLIER'), m1 = src.indexOf('const DEFAULT_REPLACEMENT_MULTIPLIER');
const e0 = src.indexOf('function engineLakh'), e1 = src.indexOf('function r2(');
const a = src.indexOf('// RETENTION_MODEL_START'), b = src.indexOf('// RETENTION_MODEL_END');
const lib = new Function(src.slice(m0, m1) + ';' + src.slice(e0, e1) + ';' + src.slice(a, b) + ';return {computeRetentionModel, retentionFixedBlock, retentionApply, retentionStrayFigures, retentionIssues, retentionScrub};')();
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
ok(pr.financialModel.proactiveInterventionCost.salaryAdjustment === 'Rs.1.8L annual increment (10%)' && pr.financialModel.proactiveInterventionCost.breakEvenMonths === 'more than 120', 'proactive intervention recomputed and capped: ' + JSON.stringify(pr.financialModel.proactiveInterventionCost));

// Stray figures
const good = { recommendation: { rationale: 'Match at Rs.21L adds Rs.3L a year against replacement of Rs.27.72L to Rs.36.72L.' }, scenarios: { a: 'Two years cost Rs.6L.' } };
ok(lib.retentionStrayFigures(good, 'counter_offer', r1).length === 0, 'calculated figures are not stray: ' + JSON.stringify(lib.retentionStrayFigures(good, 'counter_offer', r1)));
const bad = { recommendation: { rationale: 'Partial match at Rs.22L, a Rs.4L increment, saves Rs.24.22L.' } };
const strays = lib.retentionStrayFigures(bad, 'counter_offer', r1);
ok(strays.length === 3, 'three stray figures found: ' + JSON.stringify(strays));
ok(lib.retentionStrayFigures({ financialModel: { x: 'Rs.99L' } }, 'counter_offer', r1).length === 0, 'structured cards are not scanned');


// v74: R3 no-premium override
const r3res = { employeeProfile: { flightRisk: 'Low' }, recommendation: { primary: 'Walk Away', figure: 'Not applicable, the offer is lower' }, scenarios: { scenarioA: { label: 'Walk Away, Employee Accepts Competing Offer' }, scenarioB: { label: 'Hold Position, No Counter-Offer Increment' } }, financialModel: {}, humac: {} };
lib.retentionApply(r3res, 'counter_offer', r3);
ok(r3res.recommendation.primary === 'Hold Position' && r3res.recommendation.figure === 'No match needed', 'R3 recommendation forced to Hold Position: ' + r3res.recommendation.primary + ' / ' + r3res.recommendation.figure);
ok(/^Hold/.test(r3res.scenarios.scenarioA.label) && /^Walk/.test(r3res.scenarios.scenarioB.label), 'R3 scenarios swapped so Hold is A');
ok(r3res.employeeProfile.flightRisk === 'Medium', 'R3 flight risk floored at Medium');
ok(r3res.financialModel.retentionCost.fullMatch.breakEvenMonths === 0, 'R3 no negative or phantom payback');
// v74: label normalisation
const lab = { recommendation: { primary: 'Match', figure: 'x' }, financialModel: {}, humac: {} };
lib.retentionApply(lab, 'counter_offer', r1);
ok(lab.recommendation.primary === 'Full Match' && lab.recommendation.figure === 'Rs.24L', 'Match becomes Full Match with 24L: ' + lab.recommendation.primary + ' ' + lab.recommendation.figure);
const lab2 = { recommendation: { primary: 'Full Match', figure: 'x' }, financialModel: {}, humac: {} };
lib.retentionApply(lab2, 'counter_offer', r1);
ok(lab2.recommendation.figure === 'Rs.24L', 'Full Match figure follows the formula');
const lab3 = { recommendation: { primary: 'Partial Match', figure: 'x' }, financialModel: {}, humac: {} };
lib.retentionApply(lab3, 'counter_offer', r1);
ok(lab3.recommendation.figure === 'Rs.21L', 'Partial Match figure 21L');
// v74: months to years
const yr = { recommendation: { rationale: 'The organisation would need to retain this employee for fewer than 8 years before the match pays for itself. A 3 year tenure and two years of cost are fine, as is a 10 years horizon.' } };
const ys = lib.retentionStrayFigures(yr, 'counter_offer', r1);
ok(ys.length === 1 && /8 years/.test(ys[0]), 'only the 8 years claim is flagged: ' + JSON.stringify(ys));
// v74: absurd payback
const proLong = lib.computeRetentionModel({ currentCTC: 1800000, tenureYears: 3, roleCriticality: 'Medium' });
const blk = lib.retentionFixedBlock('proactive', proLong);
ok(/Intervention at 5%: Rs\.90K a year; the cumulative extra cost stays below replacement cost for more than 10 years/.test(blk), 'long payback is shown as more than 10 years: ' + blk.split('\n').filter(l => /at 5%/.test(l))[0]);
const prl = { financialModel: { costOfLosingThem: { total: 'x' }, proactiveInterventionCost: { salaryAdjustment: 'Rs.0.9L annual increment (5%)', breakEvenMonths: 430 } }, humac: {} };
lib.retentionApply(prl, 'proactive', proLong);
ok(prl.financialModel.proactiveInterventionCost.breakEvenMonths === 'more than 120', 'proactive 5% shows more than 120 months');
const blk10 = lib.retentionFixedBlock('proactive', proLong);
ok(/Intervention at 10%: Rs\.1\.8L a year; the cumulative extra cost stays below replacement cost for more than 10 years/.test(blk10), '10% also capped: ' + blk10.split('\n').filter(l => /at 10%/.test(l))[0]);


// v75: overclaims, month ranges, personal-account monitoring
const iss = (txt, sig) => lib.retentionIssues({ recommendation: { rationale: txt } }, 'proactive', pro, sig || '');
ok(iss('The signals are consistent with disengagement. A 5% raise may reduce the risk.').length === 0, 'clean text has no issues: ' + JSON.stringify(iss('The signals are consistent with disengagement. A 5% raise may reduce the risk.')));
ok(iss('Acting now eliminates the risk of losing a Band B performer entirely.').length === 1, 'eliminates ... entirely flagged');
ok(iss('The offer is below current CTC, which tells us this is not about money.').length === 2, 'tells us + not about money flagged: ' + JSON.stringify(iss('The offer is below current CTC, which tells us this is not about money.')));
ok(iss('Non-financial drivers may resurface within 12 to 18 months.').length === 1, '12 to 18 months flagged');
ok(iss('The 6-12 month re-attrition risk is high.').length === 1, '6-12 month flagged');
ok(iss('Watch for LinkedIn profile updates.').length === 1, 'LinkedIn flagged when the user did not mention it');
ok(iss('The signal you gave, LinkedIn activity, is noted.', 'LinkedIn activity is up').length === 0, 'LinkedIn allowed when the user raised it');
ok(iss('This employee has been genuinely engaged and we can genuinely fix it.').length === 0, 'plain genuinely is not flagged');
ok(iss('The match may keep payback inside about 111 months.').length === 0, 'a single payback figure is fine');
const rngOk = lib.retentionIssues({ recommendation: { rationale: 'Cumulative extra cost stays below replacement for about 111 to 147 months.' } }, 'counter_offer', r1, '');
ok(rngOk.length === 0, 'calculated month range allowed: ' + JSON.stringify(rngOk));
const sc = { scenarios: { scenarioB: { watchSignals: ['LinkedIn profile updated or marked Open to Work', 'Reduced participation in project planning', 'Recruiter contact confirmed through any channel'] } } };
lib.retentionScrub(sc, 'quiet in meetings');
ok(sc.scenarios.scenarioB.watchSignals.length === 1 && /participation/.test(sc.scenarios.scenarioB.watchSignals[0]), 'scrub keeps only workplace signals: ' + JSON.stringify(sc.scenarios.scenarioB.watchSignals));
const sc2 = { scenarios: { scenarioB: { watchSignals: ['LinkedIn profile updated'] } } };
lib.retentionScrub(sc2, '');
ok(sc2.scenarios.scenarioB.watchSignals.length === 1 && !/LinkedIn/i.test(sc2.scenarios.scenarioB.watchSignals[0]), 'scrub never leaves the list empty');
const sc3 = { scenarios: { scenarioB: { watchSignals: ['LinkedIn activity up'] } } };
lib.retentionScrub(sc3, 'LinkedIn activity up');
ok(sc3.scenarios.scenarioB.watchSignals[0] === 'LinkedIn activity up', 'scrub respects the user own LinkedIn signal');
// no-premium ceiling card
const r3b = { recommendation: { primary: 'Walk Away', figure: 'x' }, financialModel: {}, humac: {} };
lib.retentionApply(r3b, 'counter_offer', r3);
ok(/^Not applicable/.test(r3b.financialModel.breakEvenCeiling), 'no-premium ceiling is Not applicable: ' + r3b.financialModel.breakEvenCeiling);

if (fails) { console.log(fails + ' FAILED'); process.exit(1); } else { console.log('RETENTION TESTS PASSED'); }
