// Bond engine: terms read from the narrative and checked against it; arithmetic in code; missing terms never guessed.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'situation-room-api.worker.js'), 'utf8');
const fa = src.indexOf('function normaliseFinancial'), fb = src.indexOf('// DETERMINISTIC FINANCIAL ENGINE (v17)');
const pa = src.indexOf('// ── POSH ENGINE START'), pb = src.indexOf('// ── POSH ENGINE END');
const ta = src.indexOf('// ── TERMINATION ENGINE START'), tb = src.indexOf('// ── TERMINATION ENGINE END');
const ba = src.indexOf('// ── BOND ENGINE START'), bb = src.indexOf('// ── BOND ENGINE END');
const { bondAmountsIn, bondMoney, bondReadTerms, bondItems, applyBondFinancial, bondFixText } = new Function(src.slice(fa, fb) + src.slice(pa, pb) + src.slice(ta, tb) + src.slice(ba, bb) + ';return {bondAmountsIn, bondMoney, bondReadTerms, bondItems, applyBondFinancial, bondFixText};')();
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const item = (its, l) => its.find(i => i.label.indexOf(l) === 0);
const N1 = 'Employee left owing ₹1.5L under a training bond. He says the bond is unenforceable.';

ok(bondAmountsIn(N1).join() === '150000', 'amount ₹1.5L parsed: ' + bondAmountsIn(N1));
ok(bondAmountsIn('bond of Rs 2,00,000 and fees of INR 40000 and 3 lakh').join() === '200000,40000,300000', 'formats: ' + bondAmountsIn('bond of Rs 2,00,000 and fees of INR 40000 and 3 lakh'));
ok(bondMoney(150000, N1) === 150000 && bondMoney('1,50,000', N1) === 150000, 'figure present in narrative accepted');
ok(bondMoney(200000, N1) === null && bondMoney(null, N1) === null && bondMoney(50, N1) === null, 'figure not in narrative rejected');

const NARR = 'Employee joined as a fresher, signed a 3 year bond of ₹1.5L, completed 14 months and resigned. Training cost us ₹90,000.';
let T = bondReadTerms({ bondAmount: 150000, bondMonths: 36, monthsServed: 14, trainingCost: 90000, recovery: 'deduct_from_final_pay' }, NARR);
ok(T.amount === 150000 && T.period === 36 && T.served === 14 && T.cost === 90000 && T.route === 'deduct', 'terms read');
let it = bondItems(T);
let pr = item(it, 'Pro-rata');
ok(pr && pr.low === 0.92 && pr.high === 0.92, '150000 x 22/36 = 91667 -> 0.92L, got ' + (pr && pr.low));
ok(item(it, 'Outer limit').low === 1.5, 'ceiling is the bond amount');
ok(item(it, 'Cost of pursuing').low === 0.5 && item(it, 'Cost of pursuing').high === 2, 'pursuit assumption');
ok(item(it, 'If the amount is deducted').high === 0.5, 'fine exposure up to 0.5L when deduction planned');
ok(/Rs\.0/.test(item(it, 'What the range').workings) && /s\.18\(2\)/.test(item(it, 'What the range').workings) && /s\.27/.test(item(it, 'What the range').workings), 'wages s.18(2) Rs 0 and s.27 flagged');
ok(/90,000/.test(item(it, 'What the range').workings), 'training cost noted');

// no deduction plan: no fine item
T = bondReadTerms({ bondAmount: 150000, bondMonths: 36, monthsServed: 14, recovery: 'other' }, NARR);
it = bondItems(T); ok(!item(it, 'If the amount is deducted') && /not stated/.test(item(it, 'Bond terms').workings) && /cost was not stated/.test(item(it, 'What the range').workings), 'no deduction item, cost marked not stated');
// missing period: pro-rata not computed
T = bondReadTerms({ bondAmount: 150000 }, N1);
it = bondItems(T); ok(!item(it, 'Pro-rata') && /not computed/.test(item(it, 'What the range').workings) && item(it, 'Outer limit'), 'no period: pro-rata not computed, ceiling still shown');
// no amount: nothing computed
T = bondReadTerms({ bondAmount: 999999 }, N1);
it = bondItems(T); ok(!item(it, 'Outer limit') && !item(it, 'Pro-rata') && /bond amount was not stated/.test(item(it, 'What the range').workings), 'amount not in narrative: nothing computed');
// served in full
T = bondReadTerms({ bondAmount: 150000, bondMonths: 24, monthsServed: 24 }, N1);
it = bondItems(T); ok(!item(it, 'Pro-rata') && !item(it, 'Outer limit') && /served in full/.test(item(it, 'What the range').workings), 'bond period completed: nothing recoverable');

// full path
function mk(extra) { return Object.assign({ detectedCaseType: 'Other', bondInputs: { isBond: true, bondAmount: 150000, bondMonths: 36, monthsServed: 14, trainingCost: 90000, recovery: 'deduct_from_final_pay' }, protocol: { financial: { items: [{ label: 'x', kind: 'assumption', workings: 'y' }] } } }, extra || {}); }
let r = mk(); ok(applyBondFinancial(r, NARR) === true && r.bondInputs === undefined, 'applied, internal field removed');
ok(r.protocol.financial.range && /Rs\.50K to Rs\.2\.5L/.test(r.protocol.financial.range), 'range 0.5+0 to 2+0.5: ' + r.protocol.financial.range);
ok(r.protocol.financial.confidence === 'Medium', 'Medium confidence with terms complete');
r = mk({ bondInputs: { isBond: false } }); ok(applyBondFinancial(r, NARR) === false, 'not a bond: untouched');
r = mk({ detectedCaseType: 'Termination' }); ok(applyBondFinancial(r, NARR) === false && r.bondInputs === undefined, 'other case types untouched');
r = mk({ bondInputs: null }); ok(applyBondFinancial(r, NARR) === false, 'no inputs: untouched');
r = mk({ otherLabel: 'Probation issue' }); r.protocol.quick_take = 'The deduction must not proceed without consent or a court order.'; r.protocol.recommendation = 'Demand Rs 90,000, the defensible recovery ceiling.'; r.protocol.legalRows = [{ ref: 'Contract Act s.74', verdict: 'unclear', point: 'Training cost of 90,000 is the defensible ceiling.' }, { ref: 'Contract Act s.27', verdict: 'not_yet', point: 'Not engaged.' }];
applyBondFinancial(r, NARR);
ok(r.otherLabel === 'Recovery of dues or losses', 'label corrected');
ok(!/consent/.test(r.protocol.quick_take) && /must not proceed/.test(r.protocol.quick_take), 'consent escape removed: ' + r.protocol.quick_take);
ok(!/ceiling/.test(r.protocol.recommendation) && /easiest to defend/.test(r.protocol.recommendation), 'training cost no longer called a ceiling: ' + r.protocol.recommendation);
ok(r.protocol.legalRows[0].verdict === 'live' && /not exceeding that sum/.test(r.protocol.legalRows[0].point) && r.protocol.legalRows[1].verdict === 'not_yet', 's.74 row replaced with code text, s.27 untouched');
console.log(fails ? fails + ' FAILED' : 'bond: all passed');
process.exit(fails ? 1 : 0);
