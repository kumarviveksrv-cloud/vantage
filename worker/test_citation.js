// Policy Advisor citation + figure checker: every section number, Act and rupee figure is compared with the statute text actually supplied.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'situation-room-api.worker.js'), 'utf8');
const a = src.indexOf('// ── CITATION CHECKER START'), b = src.indexOf('// ── CITATION CHECKER END');
const { policyCitationCheck, citeBuildIndex, policyScrub, policyExposureOverride } = new Function(src.slice(a, b) + ';return {policyCitationCheck, citeBuildIndex, policyScrub, policyExposureOverride};')();
const L = (f) => fs.readFileSync(path.join(__dirname, '..', 'legal', f), 'utf8');
const parts = [
  { key: 'wages-code-2019', text: L('wages-code-2019.txt') },
  { key: 'ir-code-2020', text: L('ir-code-2020.txt') },
  { key: 'extracts/registers-returns-savings', text: L('extracts/registers-returns-savings.txt') }
];
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const idx = citeBuildIndex(parts);
ok(idx.sections.wages && idx.sections.wages['17'] && idx.sections.wages['54'], 'wages sections indexed');
ok(idx.sections.ir && idx.sections.ir['2'] && idx.sections.ir['39'], 'ir sections indexed');
ok(idx.sections.osh && idx.sections.osh['143'], 'osh s.143 indexed from extract: ' + Object.keys(idx.sections.osh || {}));
ok(!idx.sections.wages['999'], 'no invented wages section');

let r = policyCitationCheck('Section 17 of the Code on Wages sets the time limit. Section 54 gives the penalty.', parts, '');
ok(r.flags.length === 0 && /all were found/.test(r.note), 'valid citations pass: ' + JSON.stringify(r.flags));

r = policyCitationCheck('Section 999 of the Code on Wages covers this.', parts, '');
ok(r.flags.length === 1 && r.text.includes('[outside the supplied text]') && /could not be matched/.test(r.note), 'invented wages section flagged');

r = policyCitationCheck('Section 143(3) of the OSH Code names the rules.', parts, '');
ok(r.flags.length === 0, 'OSH s.143 passes via extract: ' + JSON.stringify(r.flags));

r = policyCitationCheck('See section 10 of the Industrial Disputes Act, 1947.', parts, '');
ok(r.flags.length === 1 && /not supplied/.test(r.flags[0].reason), 'outside Act flagged');

r = policyCitationCheck('Section 2(zr) of the Industrial Relations Code defines worker.', parts, '');
ok(r.flags.length === 0, 'IR s.2 passes: ' + JSON.stringify(r.flags));

r = policyCitationCheck('Section 4 of the Maternity Benefit Act 1961 applies.', parts, '');
ok(r.flags.length === 1, 'Maternity Benefit Act not supplied flagged');

r = policyCitationCheck('Under the Code on Wages, deductions are limited by section 18. Section 18(1) lists them.', parts, '');
ok(r.flags.length === 0, 'carry-forward Act across sentences: ' + JSON.stringify(r.flags));

r = policyCitationCheck('Fine up to fifty thousand rupees applies. The back pay is ₹1,23,456 in total.', parts, '');
ok(r.flags.some(f => f.kind === 'figure' && /1,23,456/.test(f.item)), 'invented rupee figure flagged');

r = policyCitationCheck('Back pay is ₹2.4 lakh as you entered.', parts, 'shortfall of 2.4 lakh');
ok(r.flags.length === 0, 'figure that came from the user passes: ' + JSON.stringify(r.flags));

r = policyCitationCheck('The penalty is up to ₹50,000.', parts, '');
ok(r.flags.length === 0, 'statute figure passes (fifty thousand rupees in Wages s.54): ' + JSON.stringify(r.flags));

r = policyCitationCheck('No citations here, just advice.', parts, '');
ok(r.flags.length === 0 && r.text === 'No citations here, just advice.' && r.note === '', 'no citations: text untouched');

r = policyCitationCheck('Section 17 of the Code on Wages applies.', [], '');
ok(r.flags.length === 1, 'no supplied text: citation unverified');

let sc = policyScrub('The remedy is a claim for damages or, more commonly, withholding of the relieving letter pending negotiation. Note the MERIDIAN policy says 12 months.');
ok(sc.removed && !/relieving/.test(sc.text) && /claim for damages/.test(sc.text) && /MERIDIAN policy/.test(sc.text), 'clause removed, rest kept: ' + sc.text);
sc = policyScrub('Step 4. Withholding her experience certificate gives you leverage. Pay dues on time.');
ok(sc.removed && !/experience certificate/.test(sc.text) && /Pay dues/.test(sc.text), 'positive suggestion sentence dropped: ' + sc.text);
sc = policyScrub('Do not withhold the relieving letter as leverage over an employee who is leaving.');
ok(!sc.removed && /Do not withhold/.test(sc.text), 'negated advice kept: ' + sc.text);
sc = policyScrub('Withholding documents is a separate matter from notice enforcement.');
ok(!sc.removed, 'separate-matter wording kept');
ok(/DEDUCTION_FINE_QUESTION = /.test(src) && /exposurePay = PAY_SHORTFALL_QUESTION\.test\([^;]*\|\| DEDUCTION_FINE_QUESTION/.test(src), 'deduction questions get the system fine figure');

sc = policyScrub('A fine extending to \u20B950,000 per instance. Repeat: \u20B91,00,000 per offence, or both.');
ok(!/per instance|per offence/.test(sc.text) && sc.text.includes('\u20B950,000.') , 'per-instance wording stripped: ' + sc.text);
let eo = policyExposureOverride('Answer text.\n\n\u{1F4B0} COMPLIANCE EXPOSURE: \u20B91.2L\nBasis: invented arithmetic \u20B91,20,000.', { range: 'Fine up to \u20B950,000, plus back-pay', basis: 'System basis.' });
ok(eo.replaced && !/1\.2L|1,20,000|invented/.test(eo.text) && /Fine up to \u20B950,000/.test(eo.text) && /^Answer text\./.test(eo.text), 'model own exposure block replaced: ' + eo.text);
ok(!policyExposureOverride('No exposure block here.', { range: 'x', basis: 'y' }).replaced, 'no block, nothing replaced');
ok(/policyExposureOverride\(policyText, exposureFinal\)/.test(src), 'override wired in handler');

sc = policyScrub('fine up to Rs 50,000 per instance. Then Rs 1 lakh per offence.');
ok(!/per instance|per offence/.test(sc.text), 'Rs wording stripped: ' + sc.text);
sc = policyScrub('\u20B950,000 (per contravention, up to) and Rs. 50,000 per contravention.');
ok(!/contravention/.test(sc.text) && /50,000/.test(sc.text), 'per contravention stripped: ' + sc.text);
ok(/policyCitationCheck\(policyText, policyActLoad\.parts/.test(src) && /tool === 'policy'/.test(src), 'wired into policy handler');
console.log(fails ? fails + ' FAILED' : 'citation checker: all passed');
process.exit(fails ? 1 : 0);
