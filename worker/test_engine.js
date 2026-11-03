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
console.log(fails === 0 ? '\nALL PASSED' : '\nFAILURES: ' + fails);
process.exit(fails ? 1 : 0);
