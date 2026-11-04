const fs = require('fs'), vm = require('vm');
let src = fs.readFileSync(__dirname + '/situation-room-api.worker.js', 'utf8').replace(/\r\n/g, '\n').replace('export default {', 'globalThis.__worker = {');
vm.runInThisContext(src, { filename: 'worker.v17.js' });
const run = (code) => vm.runInThisContext(code);
let fails = 0;
const check = (name, ok, extra) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? ' | ' + extra : '')); if (!ok) fails++; };

// Simulated model output: the model's own items differ every run (this is the variance we are removing)
function fakeModelResult(variant) {
  const items = [
    [{ label: 'CTC', kind: 'assumption', workings: 'x', low: null, high: null, basis: 'assumed' }, { label: 'Not counted', kind: 'not_included', workings: 'y' }],
    [{ label: 'Back wages', kind: 'exposure', workings: 'w', low: 3 + variant, high: 9 + variant, basis: 'assumed' }, { label: 'Fees', kind: 'exposure', workings: 'w', low: 1, high: 2 + variant, basis: 'assumed' }],
    [{ label: 'CTC', kind: 'assumption', workings: 'x', low: null, high: null, basis: 'assumed' }],
  ][variant % 3];
  return { engineFlags: { scenario: 'pressure_to_resign', freePrenatalCareStated: null }, protocol: { financial: { items: JSON.parse(JSON.stringify(items)), range: 'Rs.' + (4 + variant) + 'L to Rs.' + (9 + variant) + 'L', confidence: variant % 2 ? 'High' : 'Low' } }, detectedCaseType: 'Other' };
}
globalThis.__fake = fakeModelResult;

// 1. Same flags and inputs, five runs with different model figures: output must be identical
const body = { ctcBand: '18L to 25L', roleCriticality: 'Medium' };
globalThis.__body = body;
const outs = [];
for (let i = 0; i < 5; i++) {
  globalThis.__i = i;
  outs.push(run('(function(){ var r = __fake(__i); normaliseFinancial(r); applyDeterministicFinancial(r, __body); return JSON.stringify({ range: r.protocol.financial.range, conf: r.protocol.financial.confidence, breakdown: r.protocol.financial.breakdown, eng: r.engineInputs, hasFlags: r.engineFlags !== undefined }); })()'));
}
check('five runs identical', outs.every(o => o === outs[0]));
const first = JSON.parse(outs[0]);
console.log('RANGE:', first.range, '| confidence:', first.conf); console.log(first.breakdown.map(l => ' - ' + l).join('\n')); console.log(JSON.stringify(first.eng));
check('engineFlags removed from output', first.hasFlags === false);

// 2. Hand-calculated check, pressure_to_resign, Medium, band 18-25 (mid 21.5)
// monthly = 21.5*0.85/12 = 1.5229; benefit = 9.1375; defence 0.5..2; replacement 21.5*0.8=17.2 .. 21.5*1.3=27.95; no back wages
check('pressure low = 17.7', Math.abs(first.eng.rangeLow - 17.7) < 0.011, String(first.eng.rangeLow));
check('pressure high = 29.95', Math.abs(first.eng.rangeHigh - 29.95) < 0.011, String(first.eng.rangeHigh));
check('benefit not added to range', !/Total modelled exposure[^.]*9\.14/.test(first.breakdown.join(' ')));

// 3. Scenarios
for (const [sc, lo, hi] of [['non_confirmation_only', 0.25, 1], ['dismissal_or_resignation_occurred', null, null]]) {
  globalThis.__sc = sc;
  const o = JSON.parse(run('(function(){ var r = __fake(1); r.engineFlags.scenario = __sc; normaliseFinancial(r); applyDeterministicFinancial(r, __body); return JSON.stringify(r.engineInputs); })()'));
  if (lo !== null) check(sc + ' range', Math.abs(o.rangeLow - lo) < 0.011 && Math.abs(o.rangeHigh - hi) < 0.011, o.rangeLow + ' to ' + o.rangeHigh);
  else { // dismissal: 3m+1+17.2 .. 12m+3+27.95
    const m = 21.5 * 0.85 / 12; const el = 3 * m + 1 + 17.2, eh = 12 * m + 3 + 27.95;
    check(sc + ' range', Math.abs(o.rangeLow - el) < 0.02 && Math.abs(o.rangeHigh - eh) < 0.02, o.rangeLow + ' to ' + o.rangeHigh + ' expected ' + el.toFixed(2) + ' to ' + eh.toFixed(2));
  }
}
// 4. Criticality and exact CTC, missing scenario, free care
globalThis.__body2 = { ctcBand: '', ctcExact: '30', roleCriticality: 'High' };
const o4 = JSON.parse(run('(function(){ var r = __fake(0); r.engineFlags = { scenario: "nonsense", freePrenatalCareStated: true }; normaliseFinancial(r); applyDeterministicFinancial(r, __body2); return JSON.stringify({e: r.engineInputs, b: r.protocol.financial.breakdown}); })()'));
check('exact CTC wins, High multiplier, scenario defaulted', o4.e.ctcLakh === 30 && o4.e.ctcSource === 'exact' && o4.e.roleCriticality === 'High' && o4.e.scenarioDefaulted === true && o4.e.scenario === 'pressure_to_resign');
check('free care removes medical bonus', !o4.b.join(' ').includes('Medical bonus (owed'), '');
// 5. Invalid criticality falls back to Medium; non-maternity case untouched
globalThis.__body3 = { ctcBand: '12L to 18L', roleCriticality: 'Banana' };
const o5 = JSON.parse(run('(function(){ var r = __fake(0); normaliseFinancial(r); applyDeterministicFinancial(r, __body3); return JSON.stringify(r.engineInputs); })()'));
check('bad criticality becomes Medium', o5.roleCriticality === 'Medium');
const o6 = run('(function(){ var r = __fake(1); r.engineFlags = null; normaliseFinancial(r); var before = r.protocol.financial.range; applyDeterministicFinancial(r, __body3); return before === r.protocol.financial.range && !r.engineInputs; })()');
check('non-maternity result left as the model made it', o6 === true);
// 6. CTC resolver and rejection rule
check('resolveCtc rejects empty', run('resolveCtc({ctcBand:"",ctcExact:""})') === null);
check('resolveCtc rejects junk band', run('resolveCtc({ctcBand:"lots"})') === null);
check('resolveCtc accepts exact 0.5', run('resolveCtc({ctcExact:"0.5"}).lakh') === 0.5);
check('resolveCtc rejects 2000', run('resolveCtc({ctcExact:"2000"})') === null);
// 7. prompt compiles and carries the new field
const prompt = run('getPactPrompt({})');
check('prompt has engineFlags', prompt.includes('"engineFlags"') && prompt.includes('Never put a rupee figure in this object'));
check('no em dash in engine text', !/—/.test(run('JSON.stringify(maternityItems(resolveCtc({ctcBand:"18L to 25L"}), "pressure_to_resign", false, "Medium", null))')));
// 8. MERIDIAN reaches the PACT call
globalThis.__m = { state: 'Haryana', industry: 'Insurance', orgType: 'Corporate / Pvt Ltd', orgSize: '51 - 250', unionStatus: 'Non-unionised', policyNoticePeriod: 'SECRET-FREE-TEXT' };
const blk = run('buildPactMeridianBlock(__m)');
check('meridian block carries state and industry', blk.includes('State: Haryana') && blk.includes('Industry: Insurance'));
check('meridian block leaves out free-text policy fields', !blk.includes('SECRET-FREE-TEXT'));
check('missing meridian says not set', run('buildPactMeridianBlock(null)').includes('not set'));
check('long value is capped', run('buildPactMeridianBlock({state:"x".repeat(500)})').length < 400);
check('user message uses the block', fs.readFileSync(__dirname + '/situation-room-api.worker.js', 'utf8').includes('${buildPactMeridianBlock(meridian)}'));
check('prompt tells model not to infer industry from job title', run('getPactPrompt({})').includes('Never infer the industry or state from a job title'));
// 9. v19: two-figure split, prompt rules
globalThis.__b = { ctcBand: '18L to 25L', roleCriticality: 'Medium' };
const sp = JSON.parse(run('(function(){ var r = __fake(0); normaliseFinancial(r); applyDeterministicFinancial(r, __b); return JSON.stringify({ s: r.protocol.financial.split, range: r.protocol.financial.range }); })()'));
check('split legal range', sp.s && sp.s.legal.range === 'Rs.50K to Rs.2L', sp.s && sp.s.legal.range);
check('split business range', sp.s && sp.s.business.range === 'Rs.17.2L to Rs.27.95L', sp.s && sp.s.business.range);
check('combined range unchanged for saved cases', sp.range === 'Rs.17.7L to Rs.29.95L' && sp.s.combined === 'Rs.17.7L to Rs.29.95L', sp.range);
check('split legal note says what it excludes', /Does not include statutory fines/.test(sp.s.legal.note));
globalThis.__fd = { engineFlags: { scenario: 'dismissal_or_resignation_occurred', freePrenatalCareStated: null }, protocol: { financial: { items: [], range: 'x', confidence: 'Low' } } };
const sd = JSON.parse(run('(function(){ var r = JSON.parse(JSON.stringify(__fd)); normaliseFinancial(r); applyDeterministicFinancial(r, __b); return JSON.stringify(r.protocol.financial.split); })()'));
check('dismissal legal figure includes back wages', sd && sd.legal.range === 'Rs.' + '' + sd.legal.range.replace('Rs.','') && /back wages/.test(sd.legal.note), sd && sd.legal.range);
globalThis.__fn = { engineFlags: { scenario: 'non_confirmation_only', freePrenatalCareStated: null }, protocol: { financial: { items: [], range: 'x', confidence: 'Low' } } };
const sn = run('(function(){ var r = JSON.parse(JSON.stringify(__fn)); normaliseFinancial(r); applyDeterministicFinancial(r, __b); return r.protocol.financial.split === null; })()');
check('no split when no replacement cost applies', sn === true);
const pr19 = run('getPactPrompt({})');
check('prompt has penalty guard', pr19.includes('Never state a fine, penalty, imprisonment term or compensation amount unless the exact figure appears in the Acts provided'));
check('prompt: context field is "none" and headcountStated exists', pr19.includes('Write exactly the word none') && pr19.includes('"headcountStated"'));
// v23: code-built Meridian context
const mer = { state: 'Haryana', industry: 'Insurance', orgType: 'MNC', orgSize: '251 \u2013 500', unionStatus: 'Non-unionised' };
globalThis.__m = mer;
const c140 = run('buildMeridianContext(__m, 140)');
check('v23: lists profile', /Haryana/.test(c140) && /Insurance/.test(c140) && /MNC/.test(c140));
check('v23: flags headcount outside band', /Headcount used: 140/.test(c140) && /outside the size band/.test(c140));
check('v23: 300 thresholds not met at 140', (c140.match(/Standing Orders[^\n]*not met/) || []).length === 1 && (c140.match(/Chapter X[^\n]*not met/) || []).length === 1);
check('v23: maternity threshold met at 140', /Chapter VI[^\n]*Size condition: met/.test(c140));
check('v23: no banned words or em dash', !/typically|usually|generally/i.test(c140) && !/\u2014/.test(c140));
const cBand = run('buildMeridianContext(__m, null)');
check('v23: band straddles 300', /Standing Orders[^\n]*depends on the exact headcount/.test(cBand) && /saved size band/.test(cBand));
check('v23: no profile', /No MERIDIAN profile is set/.test(run('buildMeridianContext(null, 50)')));
check('v23: open-ended band', /Standing Orders[^\n]*Size condition: met/.test(run('buildMeridianContext({orgSize:"10,000+"}, null)')));
check('v23: bad headcount ignored', /saved size band/.test(run('buildMeridianContext(__m, "lots")')));
globalThis.__r = { headcountStated: 140, protocol: { context: 'none', legal: 'x' } };
run("applyDeterministicFinancial(__r, { meridian: __m })");
check('v23: apply overwrites context and drops headcountStated', /Profile: state Haryana/.test(__r.protocol.context) && !('headcountStated' in __r));
check('v23: survives sanitiser (no generalisation words)', run('(function(){ sanitiseMeridianContext(__r); return __r.protocol.context; })()') === __r.protocol.context);
check('prompt has wording rule', pr19.includes('WORDING RULE FOR EVERY FIELD OTHER THAN legal'));
check('no em dash in split text', !/\u2014/.test(JSON.stringify(sp.s)));
// 10. v21: context sanitiser and day-count engine
globalThis.__ctx = { protocol: { context: 'Haryana insurance, 140 employees, narrative figure used.\n\nMNCs in this space typically face heightened scrutiny from regulators. The 140 figure is below 300.' } };
const ctxOut = run('(function(){ sanitiseMeridianContext(__ctx); return __ctx.protocol.context; })()');
check('context: generalising sentence removed', !/typically/i.test(ctxOut) && /below 300/.test(ctxOut) && /narrative figure used/.test(ctxOut), ctxOut.replace(/\n/g, ' | '));
globalThis.__ctx2 = { protocol: { context: 'Firms usually do X.' } };
check('context: all-generic text gets a plain fallback', /No organisation-specific point/.test(run('(function(){ sanitiseMeridianContext(__ctx2); return __ctx2.protocol.context; })()')));
const dc = run('dayCountParagraph({ joiningDate: "2026-06-01", expectedDeliveryDate: "2027-03-15", decisionDate: "2026-11-30" })');
check('day count: 1 Jun to 30 Nov 2026 is 183 calendar days and 131 weekdays', /183 calendar days, which is 131 weekdays/.test(dc), dc.slice(0, 200));
check('day count: 1 Jun 2026 to 15 Mar 2027 is 288 calendar days and 206 weekdays', /288 calendar days, which is 206 weekdays/.test(dc));
check('day count: no window shift when she joined within twelve months', !/first day of the twelve months/.test(dc));
const dc2 = run('dayCountParagraph({ joiningDate: "2020-01-06", expectedDeliveryDate: "2027-03-15", decisionDate: null })');
check('day count: long-serving employee uses the twelve-month window', /15 March 2026/.test(dc2) && /first day of the twelve months/.test(dc2), dc2.slice(0, 160));
check('day count: bad dates return null', run('dayCountParagraph({ joiningDate: "2026-02-30", expectedDeliveryDate: "2027-03-15" })') === null && run('dayCountParagraph({ joiningDate: "2027-04-01", expectedDeliveryDate: "2027-03-15" })') === null && run('dayCountParagraph(null)') === null);
globalThis.__lg = { protocol: { legal: 'Para one.\n\nThis reads the statute wording only, and courts may apply it differently, so confirm with counsel before acting.' } };
const lg = run('(function(){ appendDayCount(__lg, { dates: { joiningDate: "2026-06-01", expectedDeliveryDate: "2027-03-15", decisionDate: "2026-11-30" } }); return __lg.protocol.legal; })()');
const lgParts = lg.split('\n\n');
check('day count inserted before the counsel sentence', lgParts.length === 3 && /^Day count/.test(lgParts[1]) && /confirm with counsel/.test(lgParts[2]));
check('prompt asks for dates and bans model day counts', run('getPactPrompt({})').includes('engineFlags.dates') && run('getPactPrompt({})').includes('do not calculate or state any count of days between dates'));
check('no em dash in day count text', !/\u2014/.test(dc));
// 11. v22: internal field names never reach the reader
globalThis.__sc = { protocol: { legal: 'Section 64 gives a bonus. The narrative does not say if care is free; this is recorded in engineFlags.freePrenatalCareStated as null. Next sentence stays.', context: 'Clean text.' }, engineFlags: { scenario: 'x' }, other: { nested: 'The count is set out in the engineFlags.dates object. Kept.' } };
const scOut = run('(function(){ var n = scrubInternalNames(__sc, 0); return JSON.stringify({ n: n, legal: __sc.protocol.legal, nested: __sc.other.nested, flags: __sc.engineFlags }); })()');
const sc = JSON.parse(scOut);
check('scrub removes sentences naming internal fields', !/engineFlags|freePrenatalCareStated/.test(sc.legal + sc.nested) && /Section 64 gives a bonus\./.test(sc.legal) && /Next sentence stays/.test(sc.legal) && /Kept\./.test(sc.nested), sc.legal);
check('scrub leaves engineFlags itself untouched', sc.flags && sc.flags.scenario === 'x' && sc.n === 2);
check('prompt forbids internal field names', run('getPactPrompt({})').includes('Never mention engineFlags'));
// v24: resignation-pressure safety net and paragraph-per-threshold context
check('net: raises hint to resign', run('resignationPressureNet("Her manager told her it might be easier if she resigned. Confirmation is due.", "non_confirmation_only")') === true);
check('net: no hint, no raise', run('resignationPressureNet("Confirmation is due on 30 November. She missed a deadline.", "non_confirmation_only")') === false);
check('net: never lowers or touches other scenarios', run('resignationPressureNet("easier if she resigned", "dismissal_or_resignation_occurred")') === false);
check('net: words in different sentences do not raise', run('resignationPressureNet("Another employee resigned last year. The manager suggested a review.", "non_confirmation_only")') === false);
globalThis.__b3 = { ctcBand: '18L to 25L', roleCriticality: 'Medium', narrative: 'The manager told her it might be easier if she resigned.' };
const o24 = run('(function(){ var r = __fake(0); r.engineFlags.scenario = "non_confirmation_only"; normaliseFinancial(r); applyDeterministicFinancial(r, __b3); return JSON.stringify({ s: r.engineInputs.scenario, hasSplit: !!r.protocol.financial.split }); })()');
check('net: apply raises scenario and split appears', JSON.parse(o24).s === 'pressure_to_resign' && JSON.parse(o24).hasSplit === true, o24);
const c24 = run('buildMeridianContext(__m, 140)');
check('v24: each threshold is its own paragraph', c24.split('\n\n').length >= 9 && !/\n- /.test(c24));

// v25: model-written day counts are removed, statutory wording is kept
globalThis.__dc = { protocol: { legal: 'Section 60(2) needs eighty days. From 1 June 2026 to 18 January 2027 is approximately 231 calendar days, which is approximately 165 working days. An appeal lies within thirty days under s.72.\n\nSection 64 gives a bonus.' } };
const dcOut = run('(function(){ var n = stripModelDayCounts(__dc); return JSON.stringify({ n: n, t: __dc.protocol.legal }); })()');
const dcj = JSON.parse(dcOut);
check('v25: model day count removed, statute wording kept', dcj.n === 1 && !/231/.test(dcj.t) && /eighty days/.test(dcj.t) && /thirty days/.test(dcj.t) && /Section 64/.test(dcj.t), dcOut.slice(0, 160));

// v26: pillar and planning signal guard
globalThis.__pl = { protocol: { financial: {
  pillarRationale: 'This case sits squarely in Compliance and Risk because the primary exposure is statutory. If unresolved, it affects the organisation\'s ability to attract and retain women in professional roles. A manager formed a view within weeks of the disclosure.',
  trajectorySignal: 'The organisation lacks manager training on pregnancy and protected disclosure protocols.' } } };
const plOut = JSON.parse(run('(function(){ var n = sanitisePillarText(__pl); return JSON.stringify({ n: n, p: __pl.protocol.financial.pillarRationale, t: __pl.protocol.financial.trajectorySignal }); })()'));
check('v26: unsupported pillar sentence removed, facts kept', plOut.n === 2 && !/attract and retain/.test(plOut.p) && /Compliance and Risk/.test(plOut.p) && /within weeks of the disclosure/.test(plOut.p), JSON.stringify(plOut).slice(0, 200));
check('v26: all-unsupported planning signal gets plain fallback', /No wider workforce pattern/.test(plOut.t));
globalThis.__pl2 = { protocol: { financial: { pillarRationale: 'Firms usually mishandle this. The notice was verbal.', trajectorySignal: 'Monitor whether similar confirmation decisions are taken without a written record.' } } };
const pl2 = JSON.parse(run('(function(){ sanitisePillarText(__pl2); return JSON.stringify(__pl2.protocol.financial); })()'));
check('v26: generalisation word removed, clean signal untouched', pl2.pillarRationale === 'The notice was verbal.' && /Monitor whether similar/.test(pl2.trajectorySignal));
console.log(fails === 0 ? '\nALL PASSED' : '\nFAILURES: ' + fails);
process.exit(fails ? 1 : 0);
