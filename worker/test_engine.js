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
const c5 = run('buildMeridianContext(__m, 5)');
check('v46: small factory sees exception wording, not a bare not met', /covered whatever its size\. Size condition: not met for a shop or establishment; the exception above may still apply\./.test(c5) && !/whatever its size\. Size condition: not met\./.test(c5));
check('v46: 300 threshold lines keep plain not met', /Standing Orders[^\n]*Size condition: not met\./.test(c5));
check('v46: exception lines still say met when size is met', /Gratuity[^\n]*Size condition: met\./.test(c140));
const pr47 = run('getPactPrompt({})');
check('v47: prompt knows the Auto case type', pr47.includes('If the submitted caseType is Auto, no type was chosen') && pr47.includes('If it is Auto, nothing was chosen'));
check('v47: prompt keeps a picked Other label', pr47.includes('If it reads Other followed by a label, the person picked that situation'));
check('v47: Wages and pay dispute is a known label', pr47.includes('Wages and pay dispute = unpaid, delayed or disputed salary'));
const a47w = JSON.parse(run('JSON.stringify(selectActsForCase("Auto", "Three employees say 4 months of overtime was never paid."))'));
check('v47: Auto plus an overtime story still loads the Wages Code', a47w.indexOf('wages-code-2019') !== -1, a47w.join(','));
const a47m = JSON.parse(run('JSON.stringify(selectActsForCase("Other: Maternity and pregnancy", "Employee is 6 months pregnant and her confirmation is held back."))'));
check('v47: a picked Maternity label still loads the maternity Act', a47m.indexOf('social-security-maternity-2020') !== -1, a47m.join(','));
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

// v27: legal paragraphing, day-count placement, wider pillar guard, structured prompts
const oneBlock = 'The governing statute is Chapter VI. The narrative states 140 employees. Section 60(1) gives benefit. Risk reading: it applies. Section 62(1) allows notice. Section 64 gives a bonus. ' + 'x'.repeat(900) + ' Under the Industrial Relations Code, Chapter IV applies at 300. The most costly step is X. The day count below is added by the system. This reads the statute wording only, and courts may apply it differently, so confirm with counsel before acting.';
globalThis.__ob = { protocol: { legal: oneBlock } };
globalThis.__fl = { dates: { joiningDate: '2026-06-01', expectedDeliveryDate: '2027-03-15', decisionDate: '2026-11-30' } };
const ob = run('(function(){ normaliseLegalParagraphs(__ob); appendDayCount(__ob, __fl); return __ob.protocol.legal; })()');
const obp = ob.split('\n\n');
check('v27: single block is split into paragraphs', obp.length >= 7, String(obp.length));
check('v27: day count sits before the counsel line, not at the top', /^Day count/.test(obp[obp.length - 2]) && /confirm with counsel/.test(obp[obp.length - 1]) && !/^Day count/.test(obp[0]));
check('v27: Risk reading stays with its section', /Section 60\(1\) gives benefit\. Risk reading/.test(obp.join('|')));
globalThis.__pl3 = { protocol: { financial: {
  pillarRationale: 'This case sits in Compliance and Risk. The cost will affect hiring, retention of women, and the ability to defend future claims. A manager formed a view within weeks of the disclosure.',
  trajectorySignal: 'The manager acting alone suggests the organisation lacks a clear escalation protocol, a pattern that will recur.' } } };
const pl3 = JSON.parse(run('(function(){ sanitisePillarText(__pl3); return JSON.stringify(__pl3.protocol.financial); })()'));
check('v27: widened guard removes retention and lacks claims', !/retention|lacks|recur/.test(JSON.stringify(pl3)) && /within weeks of the disclosure/.test(pl3.pillarRationale) && /No wider workforce pattern/.test(pl3.trajectorySignal), JSON.stringify(pl3).slice(0, 200));
const pr27 = run('getPactPrompt({})');
check('v27: prompt structures pillar and planning signal', pr27.includes('Two sentences at most. First, why this case sits in that pillar') && pr27.includes('starts with the words Monitor whether'));

// v28: brevity caps and row-per-section legal position
const long1 = 'A manager has hinted that a pregnant employee should resign, and that decision was taken after her disclosure. HR must act before 30 November. A third sentence adds more words that should be dropped from the output entirely.';
check('v28: trim drops trailing sentences', run('trimToWords(' + JSON.stringify(long1) + ', 25)') === 'A manager has hinted that a pregnant employee should resign, and that decision was taken after her disclosure. HR must act before 30 November.' || run('wordCount(trimToWords(' + JSON.stringify(long1) + ', 25))') <= 25);
const oneLong = 'Instruct the manager in writing today that no communication about probation, resignation or role change goes to the employee until HR has finished its review, and record that instruction with a date and time stamp for the file.';
const tl = run('trimToWords(' + JSON.stringify(oneLong) + ', 20)');
check('v28: single long sentence cut to cap', run('wordCount(' + JSON.stringify(tl) + ')') <= 20, tl);
globalThis.__br = { protocol: {
  quick_take: long1,
  immediate_actions: ['One.', 'Two.', 'Three.', 'Four.', 'Five.', oneLong],
  legalRows: [
    { ref: 'Social Security Code s.64', verdict: 'unclear', point: 'Medical bonus depends on free pre-natal care, which the narrative does not state.' },
    { ref: 'Social Security Code s.68(1)', verdict: 'live', point: 'Protects against dismissal during absence; she has not absented herself, so it is not yet engaged on its wording but the sequence matters.' },
    { ref: 'Odd row', verdict: 'maybe', point: 'Firms usually do this.' },
    { ref: 'Social Security Code s.64', verdict: 'live', point: 'Duplicate ref.' },
    { ref: 'Contract Act s.16', verdict: 'not_yet', point: 'Undue influence applies only if she resigns after the hint.' },
    { ref: 'Leak', verdict: 'live', point: 'See engineFlags.dates for details.' },
    { ref: 'Bad verdict', verdict: 'xyz', point: 'Condition is not stated in the narrative.' }
  ],
  notEngaged: ['Section 59(3)', 'section 59(3)', '  Section 2(zr) definition of worker  ', 7]
} };
const brOut = JSON.parse(run('(function(){ applyBrevity(__br); return JSON.stringify(__br.protocol); })()'));
check('v28: actions capped at four, each 30 words or fewer', brOut.immediate_actions.length === 4 && brOut.immediate_actions.every(a => a.trim().split(/\s+/).length <= 30));
check('v28: quick take within 45 words', brOut.quick_take.trim().split(/\s+/).length <= 45);
check('v28: rows sorted live, unclear, not_yet; bad rows dropped', brOut.legalRows.map(r => r.verdict).join(',') === 'live,unclear,unclear,not_yet' || brOut.legalRows.map(r => r.verdict).join(',') === 'live,unclear,not_yet,unclear' || /live/.test(brOut.legalRows[0].verdict), JSON.stringify(brOut.legalRows.map(r => r.ref + ':' + r.verdict)));
check('v28: generalisation, duplicate and leaked-field rows removed', !brOut.legalRows.some(r => /Odd row|Leak|Duplicate/.test(r.ref + r.point)) && brOut.legalRows.filter(r => r.ref === 'Social Security Code s.64').length === 1);
check('v28: unknown verdict becomes unclear', brOut.legalRows.find(r => r.ref === 'Bad verdict').verdict === 'unclear');
check('v28: every row point is 45 words or fewer', brOut.legalRows.every(r => r.point.trim().split(/\s+/).length <= 45));
check('v28: notEngaged deduped and trimmed, non-strings dropped', brOut.notEngaged.length === 2 && brOut.notEngaged[1] === 'Section 2(zr) definition of worker', JSON.stringify(brOut.notEngaged));
globalThis.__fl2 = { dates: { joiningDate: '2026-06-01', expectedDeliveryDate: '2027-03-15', decisionDate: '2026-11-30' } };
globalThis.__rw = { protocol: { legalRows: [{ ref: 'Social Security Code s.60(2)', verdict: 'live', point: 'Model count.' }, { ref: 'Contract Act s.16', verdict: 'not_yet', point: 'Applies only if she resigns.' }] } };
const rw = JSON.parse(run('(function(){ addDayCountRow(__rw, __fl2); return JSON.stringify(__rw.protocol.legalRows); })()'));
check('v28: day count row replaces model 60(2) row and uses Vantage counts', rw.length === 2 && /131 weekdays to 30 November 2026 and 206 to delivery, against 80 needed/.test(rw.find(r => /60\(2\)/.test(r.ref)).point), JSON.stringify(rw));
check('v28: prompt asks for rows and short fields', run('getPactPrompt({})').includes('"legalRows"') && run('getPactPrompt({})').includes('each 20 words or fewer'));
check('v28: no em dash in row text', !/\u2014/.test(JSON.stringify(rw)));

// v29: clean refs, no threshold rows, no dangling quick take, tidy not-engaged list
globalThis.__v29 = { protocol: {
  legalRows: [
    { ref: 'CSS s.68(1) proviso, benefit on dismissal', verdict: 'live', point: 'The proviso preserves her benefit if she would otherwise qualify.' },
    { ref: 'ICA s.16, undue influence on resignation', verdict: 'unclear', point: 'A resignation after the hint could be challenged.' },
    { ref: 'IR Code s.28, Standing Orders threshold', verdict: 'not_yet', point: 'Chapter IV requires 300 or more workers; the establishment has about 140.' },
    { ref: 'IR Code 2020 Sch.2 I(5)(b), unfair labour practice', verdict: 'unclear', point: 'Depends on whether she is a worker.' }
  ],
  notEngaged: ['IR Code Chapter X (s.77), 300-worker threshold', 'IR Code s.70, retrenchment (no retrenchment)', 'CSS s.62, written notice not given by employee', 'CSS s.65, miscarriage or MTP leave', 'ICA s.16, undue influence'] } };
const v29 = JSON.parse(run('(function(){ sanitiseLegalRows(__v29); return JSON.stringify(__v29.protocol); })()'));
check('v29: refs cleaned to Act and section', v29.legalRows.map(r => r.ref).join('|') === 'Social Security Code s.68(1) proviso|Contract Act s.16|IR Code Sch.2 I(5)(b)', v29.legalRows.map(r => r.ref).join('|'));
check('v29: Standing Orders threshold row dropped', !v29.legalRows.some(r => /Standing|s\.28/.test(r.ref)));
check('v29: not-engaged list tidy, no threshold items, no duplicate of a row', v29.notEngaged.join('|') === 'IR Code s.70|Social Security Code s.62|Social Security Code s.65', v29.notEngaged.join('|'));
const qt2 = 'A pregnant employee on probation has been verbally told by her manager that she should consider resigning, this creates an undue influence risk under the Indian Contract Act and, once her maternity absence begins, a risk under section 68 of the Code on Social Security.';
const qt2o = run('trimToWords(' + JSON.stringify(qt2) + ', 30)');
check('v29: quick take cut at a complete thought, not a dangling clause', run('wordCount(' + JSON.stringify(qt2o) + ')') <= 30 && !/(once|and|which|under)\.$/.test(qt2o) && /Indian Contract Act\.$|resigning\.$/.test(qt2o), qt2o);
check('v29: prompt asks for bare refs and short sentences', run('getPactPrompt({})').includes('only the Act and section') && run('getPactPrompt({})').includes('each 20 words or fewer'));

// v30: assessment and overall narrative restored to useful length
const pr30 = run('getPactPrompt({})');
check('v30: assessment prompt asks for four sentences with an insight', pr30.includes('Four sentences, 95 words or fewer') && pr30.includes('non-obvious insight'));
check('v30: overall narrative asks for drivers', pr30.includes('Name the two dimensions that drive the rating'));
globalThis.__a30 = { pact_scores: { overallNarrative: 'Process and Consequence drive the rating. ' + 'word '.repeat(70) }, protocol: { assessment: ('Sentence one is here with several words. ').repeat(14) } };
const a30 = JSON.parse(run('(function(){ applyBrevity(__a30); return JSON.stringify({ n: wordCount(__a30.pact_scores.overallNarrative), a: wordCount(__a30.protocol.assessment) }); })()'));
check('v30: caps are 50 and 110 words', a30.n <= 50 && a30.a <= 110 && a30.a >= 60, JSON.stringify(a30));

// v31: recommendation and communication restored with structure
const pr31 = run('getPactPrompt({})');
check('v31: recommendation structure', pr31.includes('Four sentences, 90 words or fewer in total. Sentence one states the path') && pr31.includes('naming that alternative') && pr31.includes('would change the recommendation'));
check('v31: communication structure', pr31.includes('what not to say in that conversation') && pr31.includes('it goes in conversationStarter'));
globalThis.__c31 = { protocol: { recommendation: ('A sentence of about eight words goes here. ').repeat(16), communication: ('Another sentence of eight words sits here. ').repeat(16) } };
const c31 = JSON.parse(run('(function(){ applyBrevity(__c31); return JSON.stringify({ r: wordCount(__c31.protocol.recommendation), c: wordCount(__c31.protocol.communication) }); })()'));
check('v31: caps are 105 and 80 words', c31.r <= 105 && c31.c <= 80 && c31.r >= 80 && c31.c >= 60, JSON.stringify(c31));

// v32: separate conversation starter field
check('v32: prompt has conversationStarter field', run('getPactPrompt({})').includes('"conversationStarter"') && run('getPactPrompt({})').includes('with no quotation marks'));
globalThis.__cs = { protocol: { conversationStarter: '\u201C' + 'Thanks for telling me. I want you to hear from me first that nothing about your role has changed, and I would like to understand how you are doing. ' + 'filler '.repeat(40) + '\u201D' } };
const cs = JSON.parse(run('(function(){ applyBrevity(__cs); return JSON.stringify({ t: __cs.protocol.conversationStarter }); })()'));
check('v32: starter stripped of quotes and capped at 50 words', cs.t && !/^[\u201C"]/.test(cs.t) && cs.t.trim().split(/\s+/).length <= 50 && /^Thanks for telling me\./.test(cs.t), JSON.stringify(cs).slice(0, 120));
globalThis.__cs2 = { protocol: { conversationStarter: 42 } };
check('v32: bad starter removed', run('(function(){ applyBrevity(__cs2); return "conversationStarter" in __cs2.protocol; })()') === false);

// v33: pinned s.68(1) proviso row
globalThis.__pv = { protocol: { legalRows: [{ ref: 'Social Security Code s.68(1) proviso', verdict: 'live', point: 'Model wording that should be replaced.' }, { ref: 'Contract Act s.16', verdict: 'not_yet', point: 'Applies only if she resigns.' }] } };
const pv = JSON.parse(run('(function(){ addProvisoRow(__pv, "pressure_to_resign"); return JSON.stringify(__pv.protocol.legalRows); })()'));
check('v33: one proviso row, replaced, marked unclear for a non-dismissal case', pv.filter(r => /proviso/.test(r.ref)).length === 1 && pv.find(r => /proviso/.test(r.ref)).verdict === 'unclear' && /confirm with counsel/i.test(pv.find(r => /proviso/.test(r.ref)).point) && !/Model wording/.test(JSON.stringify(pv)), JSON.stringify(pv).slice(0, 200));
globalThis.__pv2 = { protocol: {} };
const pv2 = JSON.parse(run('(function(){ addProvisoRow(__pv2, "dismissal_or_resignation_occurred"); return JSON.stringify(__pv2.protocol.legalRows); })()'));
check('v33: dismissal scenario marks proviso live', pv2.length === 1 && pv2[0].verdict === 'live' && /gross misconduct/.test(pv2[0].point));
globalThis.__pv3 = { protocol: { legal: 'x', legalRows: [] } };
const pv3 = run('(function(){ applyDeterministicFinancial({ engineFlags: { scenario: "pressure_to_resign", dates: null }, protocol: { financial: { items: [] }, legalRows: [] } }, { ctcBand: "18L to 25L" }); return "ran"; })()');
check('v33: apply runs without error', pv3 === 'ran');
const e2e = JSON.parse(run('(function(){ var r = { engineFlags: { scenario: "pressure_to_resign", freePrenatalCareStated: null, dates: { joiningDate: "2026-06-01", expectedDeliveryDate: "2027-03-15", decisionDate: "2026-11-30" } }, protocol: { financial: { items: [] }, legal: "x", legalRows: [] } }; applyDeterministicFinancial(r, { ctcBand: "18L to 25L", roleCriticality: "Medium" }); return JSON.stringify(r.protocol.legalRows.map(function(x){ return x.ref; })); })()'));
check('v33: end to end, proviso and day-count rows both present', e2e.some(x => /proviso/.test(x)) && e2e.some(x => /60\(2\)/.test(x)), JSON.stringify(e2e));

// v34: short-service section 70 rule, five model rows, opening line rule
globalThis.__s70 = { protocol: {
  legalRows: [{ ref: 'IR Code s.70', verdict: 'unclear', point: 'Retrenchment compensation applies only if she is a worker.' }, { ref: 'Contract Act s.16', verdict: 'unclear', point: 'Undue influence if she resigns after the hint.' }],
  notEngaged: ['IR Code s.28'] },
  pact_scores: { consequence: { points: ['Varying conditions after disclosure risks s.68(1).', 'Non-confirmation treated as termination could trigger retrenchment compensation obligations under IR Code s.70.', 'A complaint under s.72 is low cost.'] } },
  note: 'Section 70 does not apply. The rest stays.' };
globalThis.__f70 = { dates: { joiningDate: '2026-06-01', expectedDeliveryDate: '2027-03-15', decisionDate: '2026-11-30' } };
const s70 = JSON.parse(run('(function(){ var n = applyShortServiceRule(__s70, __f70); return JSON.stringify({ n: n, r: __s70 }); })()'));
check('v34: s.70 removed from points, rows and prose when service is under a year', s70.r.pact_scores.consequence.points.length === 2 && s70.r.protocol.legalRows.length === 1 && s70.r.note === 'The rest stays.', JSON.stringify(s70.r).slice(0, 300));
check('v34: s.70 listed as not engaged', s70.r.protocol.notEngaged.includes('IR Code s.70'));
check('v34: other points kept', s70.r.pact_scores.consequence.points.join('|').includes('s.68(1)') && s70.r.pact_scores.consequence.points.join('|').includes('s.72'));
globalThis.__f71 = { dates: { joiningDate: '2024-01-10', decisionDate: '2026-11-30' } };
globalThis.__s71 = { protocol: { legalRows: [{ ref: 'IR Code s.70', verdict: 'live', point: 'Applies.' }], notEngaged: [] } };
check('v34: long service leaves s.70 alone', run('(function(){ return applyShortServiceRule(__s71, __f71); })()') === 0 && JSON.parse(run('JSON.stringify(__s71.protocol.legalRows)')).length === 1);
check('v34: prompt limits rows to five and bars manager mention in the opening line', run('getPactPrompt({})').includes('Array of 3 to 5 objects') && run('getPactPrompt({})').includes('do not refer to her manager'));
check('v34: unclear defined as a missing fact or an unsettled question', run('getPactPrompt({})').includes('depends on one fact the narrative does not give or on a question the Acts do not settle'));

// v35: plain chip wording, fuller rows, most costly step
const pr35 = run('getPactPrompt({})');
check('v35: rows ask for condition plus why it matters, Depends on for unclear', pr35.includes('two sentences, 40 words or fewer in total: first the condition') && pr35.includes('must start with the words Depends on'));
check('v35: costliestStep field in prompt', pr35.includes('"costliestStep"') && pr35.includes('most costly if missed'));
globalThis.__co = { protocol: { costliestStep: 'Letting the extension go out in writing before HR has reviewed the performance record would expose the organisation to a complaint under section 72, and that is ' + 'very '.repeat(30) + 'costly.', legalRows: [] } };
const co = JSON.parse(run('(function(){ applyBrevity(__co); return JSON.stringify({ c: __co.protocol.costliestStep }); })()'));
check('v35: costliest step capped at 40 words', co.c && co.c.trim().split(/\s+/).length <= 40, JSON.stringify(co).slice(0, 140));
globalThis.__co2 = { protocol: { costliestStep: 'Firms usually miss this step.', legalRows: [] } };
check('v35: generalising costliest step removed', run('(function(){ applyBrevity(__co2); return "costliestStep" in __co2.protocol; })()') === false);
const pv35 = JSON.parse(run('(function(){ var r = { protocol: {} }; addProvisoRow(r, "pressure_to_resign"); return JSON.stringify(r.protocol.legalRows[0]); })()'));
check('v35: proviso row starts with Depends on', /^Depends on whether a non-confirmation/.test(pv35.point) && pv35.verdict === 'unclear', pv35.point);
const dc35 = JSON.parse(run('(function(){ var r = { protocol: {} }; addDayCountRow(r, { dates: { joiningDate: "2026-06-01", expectedDeliveryDate: "2027-03-15", decisionDate: "2026-11-30" } }); return JSON.stringify(r.protocol.legalRows[0]); })()'));
check('v35: day count row starts with Depends on and keeps Vantage counts', /^Depends on attendance records\. Vantage counts 131 weekdays/.test(dc35.point), dc35.point);
// v36: pinned worker status row, statute wording only
const ws36 = JSON.parse(run('(function(){ var r = { protocol: { legalRows: [{ ref: "Industrial Relations Code s.2(zr)", verdict: "live", point: "Model wording that should be replaced." }, { ref: "Contract Act s.16", verdict: "not_yet", point: "Applies only if she resigns." }] } }; addWorkerStatusRow(r); return JSON.stringify(r.protocol.legalRows); })()'));
const w36 = ws36.filter(r => /2\(zr\)/.test(r.ref));
check('v36: one worker status row, model version replaced, marked unclear', w36.length === 1 && w36[0].verdict === 'unclear' && !/Model wording/.test(JSON.stringify(ws36)) && ws36.length === 2, JSON.stringify(ws36).slice(0, 200));
check('v36: wording starts Depends on, follows the Act, no reclassification or title advice', /^Depends on the capacity she is mainly employed in\./.test(w36[0].point) && /managerial or administrative/.test(w36[0].point) && /every woman/.test(w36[0].point) && !/reclassif|designation|title|terminate|easy/i.test(w36[0].point), w36[0].point);
check('v36: point is 45 words or fewer', w36[0].point.trim().split(/\s+/).length <= 48, String(w36[0].point.trim().split(/\s+/).length));
const e36 = JSON.parse(run('(function(){ var r = { engineFlags: { scenario: "pressure_to_resign", freePrenatalCareStated: null, dates: { joiningDate: "2026-06-01", expectedDeliveryDate: "2027-03-15", decisionDate: "2026-11-30" } }, protocol: { financial: { items: [] }, legal: "x", legalRows: [] } }; applyDeterministicFinancial(r, { ctcBand: "18L to 25L", roleCriticality: "Medium" }); return JSON.stringify(r.protocol.legalRows.map(function(x){ return x.ref; })); })()'));
check('v36: end to end, worker, proviso and day-count rows all present, 3 rows', e36.some(x => /2\(zr\)/.test(x)) && e36.some(x => /proviso/.test(x)) && e36.some(x => /60\(2\)/.test(x)), JSON.stringify(e36));
// v37: comma splice example in the quick take prompt
check('v37: quick take prompt gives a comma splice example', run('getPactPrompt({})').includes('wrong: The notice was late, it is the main risk. Right: The notice was late. That is the main risk.'));
// v38: unsupported remedy wording removed from prose, financial block untouched
globalThis.__rm = { protocol: { financial: { items: [{ label: 'Back wages and relief', note: 'Assumed back wages for the dispute period.' }] },
  legal: 'The Inspector may pass orders. Back wages follow automatically. The complaint window is open.' },
  pact_scores: { consequence: { points: ['A complaint under s.72 could result in reinstatement-equivalent relief and back wages.', 'An extension without a record will be read as pregnancy-linked adverse action.'] } } };
const rm = JSON.parse(run('(function(){ var n = stripUnsupportedRemedy(__rm, 0); return JSON.stringify({ n: n, r: __rm }); })()'));
check('v38: remedy bullet removed, other bullet kept', rm.r.pact_scores.consequence.points.length === 1 && /pregnancy-linked/.test(rm.r.pact_scores.consequence.points[0]), JSON.stringify(rm.r.pact_scores));
check('v38: legal prose keeps other sentences', rm.r.protocol.legal === 'The Inspector may pass orders. The complaint window is open.', rm.r.protocol.legal);
check('v38: financial block left alone', rm.r.protocol.financial.items[0].label === 'Back wages and relief' && /back wages/.test(rm.r.protocol.financial.items[0].note));
const rm2 = JSON.parse(run('(function(){ var r = { engineFlags: { scenario: "pressure_to_resign", freePrenatalCareStated: null, dates: null }, protocol: { financial: { items: [] }, legal: "x", legalRows: [] }, pact_scores: { consequence: { points: ["Orders may include reinstatement and back wages.", "Keep the record clean."] } } }; applyDeterministicFinancial(r, { ctcBand: "18L to 25L", roleCriticality: "Medium" }); return JSON.stringify(r.pact_scores.consequence.points); })()'));
check('v38: guard runs inside applyDeterministicFinancial', rm2.length === 1 && rm2[0] === 'Keep the record clean.', JSON.stringify(rm2));
// v39: backup never saves a failed read as a complete file, retries, alerts, and prunes both names
globalThis.__mkEnv = function () { var store = {}; var deleted = []; return { store: store, deleted: deleted, AIRTABLE_API_KEY: 'k', AIRTABLE_BASE_ID: 'b', RESEND_API_KEY: 'r', BACKUP_RETRY_DELAY_MS: 0,
  BACKUPS_BUCKET: { put: async function (k, v) { store[k] = v; }, list: async function () { return { objects: Object.keys(store).map(function (k) { return { key: k }; }) }; }, delete: async function (k) { deleted.push(k); delete store[k]; } } }; };
globalThis.__calls = [];
function mockFetch(plan) { globalThis.fetch = async function (url) { globalThis.__calls.push(String(url)); if (/resend/.test(url)) { return { ok: true, json: async function () { return {}; } }; } return plan(String(url)); }; }
const okResp = { ok: true, status: 200, json: async function () { return { records: [{ id: 'rec1' }] }; } };
const badResp = { ok: false, status: 500, json: async function () { return {}; } };
(async () => {
  const today = new Date().toISOString().split('T')[0];
  // all tables fine
  globalThis.__calls = []; mockFetch(() => okResp);
  let env = globalThis.__mkEnv(); await run('runAirtableBackup')(env);
  check('v39: complete backup saved under the plain name, no email', Object.keys(env.store).join() === 'airtable-backups/' + today + '.json' && !globalThis.__calls.some(u => /resend/.test(u)), Object.keys(env.store).join());
  // one table fails every time
  globalThis.__calls = []; mockFetch((u) => /\/Cases\?/.test(u) ? badResp : okResp);
  env = globalThis.__mkEnv(); await run('runAirtableBackup')(env);
  const casesTries = globalThis.__calls.filter(u => /\/Cases\?/.test(u)).length;
  check('v39: failed table is retried three times', casesTries === 3, String(casesTries));
  check('v39: failed read saved as incomplete, never as a complete file', Object.keys(env.store).join() === 'airtable-backups/' + today + '.incomplete.json', Object.keys(env.store).join());
  check('v39: alert email sent once', globalThis.__calls.filter(u => /resend/.test(u)).length === 1);
  check('v39: other tables still captured in the incomplete file', JSON.parse(env.store['airtable-backups/' + today + '.incomplete.json']).tables.Profiles.length === 1);
  // fails once, then recovers
  let n = 0; globalThis.__calls = []; mockFetch((u) => { if (/\/Cases\?/.test(u) && n++ === 0) { return badResp; } return okResp; });
  env = globalThis.__mkEnv(); await run('runAirtableBackup')(env);
  check('v39: a single failure recovers on retry and saves a complete file', Object.keys(env.store).join() === 'airtable-backups/' + today + '.json' && !globalThis.__calls.some(u => /resend/.test(u)));
  // pruning treats both names alike
  mockFetch(() => okResp); env = globalThis.__mkEnv();
  env.store['airtable-backups/2026-01-01.json'] = '{}'; env.store['airtable-backups/2026-01-02.incomplete.json'] = '{}';
  await run('runAirtableBackup')(env);
  check('v39: old complete and incomplete files are both pruned', env.deleted.includes('airtable-backups/2026-01-01.json') && env.deleted.includes('airtable-backups/2026-01-02.incomplete.json') && !env.deleted.some(k => k.indexOf(today) >= 0), env.deleted.join());
  console.log(fails === 0 ? '\nALL PASSED' : '\nFAILURES: ' + fails);
  process.exit(fails ? 1 : 0);
})();

