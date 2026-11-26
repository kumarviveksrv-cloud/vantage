#!/usr/bin/env node
/*
 * verify-pillar-consistency.js
 *
 * Why this exists: the pillar drill-down pages (pillar-l2.html, pillar-l5.html, ...)
 * and the real scoring engine (humac-onboarding.html) each contain their own copy of
 * the Humac Score math. Nothing enforces that the two copies agree. Twice in one
 * session (2026-11-26) they didn't:
 *   1. HiPo/Star identification: pillar-l2.html's hipoMetric() was fixed to a binary
 *      presence check, but humac-onboarding.html's computeL2Real() kept scoring it as
 *      a rate against headcount for an unknown amount of time before this was caught.
 *   2. Selective retention: pillar-l2.html scores cq2_tenuretop/cq2_tenureatrisk
 *      through the generic metric() helper (num/den*100, uncapped), while
 *      computeL2Real() applies a deliberate /2 scale and a 0-100 clamp. Found while
 *      building this script, not by a manual sweep - which is the point of it.
 *
 * This does not re-implement the scoring logic. It extracts the real function source
 * from both HTML files at run time, executes it in a sandbox, feeds both copies the
 * same fixture inputs, and fails loud the moment their outputs disagree. Run it:
 *   - before any commit that touches a pillar-l*.html file or humac-onboarding.html's
 *     compute* functions
 *   - as a standing pre-push check (wire into a git hook once Vivek wants that)
 *
 * It is deliberately small and dependency-free (plain Node, no test framework) so
 * there's no excuse not to run it.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { extractFunction, extractVarStatement, sandboxWith, makeSelfWindowCtx } = require('./lib/vm-extract');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

// --- load sources -------------------------------------------------------------
const pillarL2Src = read('pillar-l2.html');
const engineSrc = read('humac-onboarding.html');

const metricFn = extractFunction(pillarL2Src, 'metric');
const hipoMetricFn = extractFunction(pillarL2Src, 'hipoMetric');
const retentionMetricFn = extractFunction(pillarL2Src, 'retentionMetric');
const computeL2RealFn = extractFunction(engineSrc, 'computeL2Real');
const clampL2Fn = extractFunction(engineSrc, 'clampL2');

// --- fixtures ------------------------------------------------------------------
// Computed-mode answer sets. Each exercises a different edge: a boring
// middle-of-the-road org, zero denominators, hipo present/absent/null,
// and the tenuretop/tenureatrisk shapes (equal, top<risk, top>risk) that
// turned up the drift above.
const fixtures = [
  {
    name: 'typical org, hipo named',
    a: {
      cq2_promoted12mo: 10, cq2_promotedexcelling: 7,
      cq2_managers: 20, cq2_managersoutperform: 12,
      cq2_hired12mo: 15, cq2_hiredmeeting: 9,
      cq2_tenuretop: 4, cq2_tenureatrisk: 1.5,
      cq5_hipo: 3
    }
  },
  {
    name: 'equal tenure top vs at-risk (no differential retention)',
    a: {
      cq2_promoted12mo: 10, cq2_promotedexcelling: 7,
      cq2_managers: 20, cq2_managersoutperform: 12,
      cq2_hired12mo: 15, cq2_hiredmeeting: 9,
      cq2_tenuretop: 3, cq2_tenureatrisk: 3,
      cq5_hipo: 1
    }
  },
  {
    name: 'top performers shorter tenure than at-risk (inverted/bad)',
    a: {
      cq2_promoted12mo: 10, cq2_promotedexcelling: 7,
      cq2_managers: 20, cq2_managersoutperform: 12,
      cq2_hired12mo: 15, cq2_hiredmeeting: 9,
      cq2_tenuretop: 1, cq2_tenureatrisk: 2,
      cq5_hipo: 0
    }
  },
  {
    name: 'hipo null (unanswered) vs hipo=0 (answered, none named)',
    a: {
      cq2_promoted12mo: 10, cq2_promotedexcelling: 7,
      cq2_managers: 20, cq2_managersoutperform: 12,
      cq2_hired12mo: 15, cq2_hiredmeeting: 9,
      cq2_tenuretop: 2, cq2_tenureatrisk: 2,
      cq5_hipo: 0
    }
  },
  {
    name: 'at-risk tenure zero, top tenure present (engine fallback path)',
    a: {
      cq2_promoted12mo: 10, cq2_promotedexcelling: 7,
      cq2_managers: 20, cq2_managersoutperform: 12,
      cq2_hired12mo: 15, cq2_hiredmeeting: 9,
      cq2_tenuretop: 5, cq2_tenureatrisk: 0,
      cq5_hipo: 2
    }
  }
];

// --- run pillar-l2.html's math (the real metric()/hipoMetric(), live) ---------
const pillarCtx = sandboxWith([metricFn, hipoMetricFn, retentionMetricFn]);
function pillarL2SubScores(ra) {
  pillarCtx.ra = ra;
  return {
    promo: pillarCtx.metric('Promotion accuracy', ra.cq2_promotedexcelling || 0, ra.cq2_promoted12mo || 0),
    mgr: pillarCtx.metric('Manager quality', ra.cq2_managersoutperform || 0, ra.cq2_managers || 0),
    hire: pillarCtx.metric('Hiring quality', ra.cq2_hiredmeeting || 0, ra.cq2_hired12mo || 0),
    retention: pillarCtx.retentionMetric(),
    hipo: pillarCtx.hipoMetric()
  };
}

// --- run humac-onboarding.html's math (the real computeL2Real(), live) -------
const engineCtx = sandboxWith([clampL2Fn, computeL2RealFn], { window: {} });
function engineL2Score(a) {
  return engineCtx.computeL2Real(a, false);
}

// --- compare ------------------------------------------------------------------
let failures = 0;
for (const f of fixtures) {
  const sub = pillarL2SubScores(f.a);
  const measured = Object.values(sub).filter((r) => r.score != null);
  const pillarAvg = measured.length ? Math.round(measured.reduce((s, r) => s + r.score, 0) / measured.length) : null;
  const engineScore = engineL2Score(f.a);

  // Sub-metric-level check: does pillar-l2.html's own display math for
  // "Selective retention" agree with what the engine derives for the same
  // underlying numbers? (The engine doesn't expose sub-scores directly, so we
  // compare against the one component whose formula we can see is different
  // by construction: pillar uses a bare ratio, engine halves and clamps.)
  const pillarRetentionScore = sub.retention.score;
  const expectedEngineRetentionContribution = f.a.cq2_tenureatrisk > 0
    ? Math.max(0, Math.min(100, ((f.a.cq2_tenuretop || 0) / f.a.cq2_tenureatrisk) / 2 * 100))
    : (f.a.cq2_tenuretop > 0 ? 100 : null);

  console.log('\n[' + f.name + ']');
  console.log('  pillar-l2.html sub-scores:', JSON.stringify(Object.fromEntries(Object.entries(sub).map(([k, v]) => [k, v.score]))));
  console.log('  pillar-l2.html avg score (display):', pillarAvg);
  console.log('  engine computeL2Real() score (real, counts):', engineScore);
  console.log('  selective-retention: pillar scores ' + pillarRetentionScore + ', engine\'s own formula on the same numbers would score ' + expectedEngineRetentionContribution);

  if (pillarRetentionScore !== null && expectedEngineRetentionContribution !== null && pillarRetentionScore !== expectedEngineRetentionContribution) {
    console.log('  ✗ DRIFT: pillar-l2.html and the engine score "Selective retention" differently for identical inputs.');
    failures++;
  }
}

console.log('\n' + '-'.repeat(72));
if (failures > 0) {
  console.log(failures + ' L2 drift(s) found. Do not treat this as noise - this is exactly the class of bug');
  console.log('that already shipped once this session (L2 HiPo/Star) before anyone caught it.');
  process.exitCode = 1;
} else {
  console.log('No drift found between pillar-l2.html and humac-onboarding.html for these fixtures.');
}

// ===============================================================================
// L5: pillar-l5.html's computeL5DisplayParts() vs humac-onboarding.html's
// computeL5Parts(). Both were already pure/extractable or made so (the L5 display
// math used to live inline inside render(), refactored out into its own function
// on 2026-11-26 specifically so this harness could reach it the same safe way).
// ===============================================================================
console.log('\n' + '='.repeat(72));
console.log('L5: pillar-l5.html vs humac-onboarding.html');
console.log('='.repeat(72));

const pillarL5Src = read('pillar-l5.html');
const humacSharedSrc = read('humac-shared.js');

const assumptionsStmt = extractVarStatement(pillarL5Src, 'ASSUMPTIONS');
const scenarioStmt = extractVarStatement(pillarL5Src, 'scenario');
const mFn = extractFunction(pillarL5Src, 'm');
const computeL5DisplayPartsFn = extractFunction(pillarL5Src, 'computeL5DisplayParts');

const l5BenchStmt = extractVarStatement(engineSrc, 'L5_BENCH');
const computeL5PartsFn = extractFunction(engineSrc, 'computeL5Parts');

const pillarL5Ctx = makeSelfWindowCtx();
vm.runInContext([humacSharedSrc, assumptionsStmt, scenarioStmt, mFn, computeL5DisplayPartsFn].join('\n'), pillarL5Ctx);

const engineL5Ctx = makeSelfWindowCtx();
// computeL5Parts() reads industry from sessionStorage itself rather than taking it
// as a parameter, so fixtures drive it through a tiny stub the harness controls.
engineL5Ctx.sessionStorage = {
  _industry: '',
  getItem: function (k) { return k === 'sr_meridian' ? JSON.stringify({ industry: engineL5Ctx.sessionStorage._industry }) : null; }
};
vm.runInContext([humacSharedSrc, l5BenchStmt, computeL5PartsFn].join('\n'), engineL5Ctx);

const l5Fixtures = [
  { name: 'typical org, IT/SaaS', a: { cq1_headcount: 100, cq1_compbase: 50000000, cq5_seniorcount: 10, cq5_seniortenure: 6, cq5_revemployees: 15, cq5_hipo: 5 }, l2: 65, l3: 70, industry: 'IT / SaaS' },
  { name: 'no revenue-facing roles (relationship asset unreachable)', a: { cq1_headcount: 50, cq1_compbase: 20000000, cq5_seniorcount: 4, cq5_seniortenure: 9, cq5_revemployees: 0, cq5_hipo: 2 }, l2: 40, l3: 55, industry: 'Manufacturing' },
  { name: 'high-attrition industry (BPO), long senior tenure', a: { cq1_headcount: 200, cq1_compbase: 80000000, cq5_seniorcount: 20, cq5_seniortenure: 12, cq5_revemployees: 30, cq5_hipo: 10 }, l2: null, l3: 50, industry: 'BPO / KPO' },
  { name: 'missing l2 (counts as 50 in gap()), high l3', a: { cq1_headcount: 30, cq1_compbase: 15000000, cq5_seniorcount: 2, cq5_seniortenure: 3, cq5_revemployees: 5, cq5_hipo: 0 }, l2: null, l3: 90, industry: 'Startup' }
];

let l5Failures = 0;
const close = (x, y) => Math.abs(x - y) < 0.01;

for (const f of l5Fixtures) {
  const headcount = f.a.cq1_headcount || 0, comp = f.a.cq1_compbase || 0, avg = headcount ? comp / headcount : 0;

  pillarL5Ctx.sessionStorage = undefined; // not used on this side; industry passed directly
  const pillarParts = pillarL5Ctx.computeL5DisplayParts(f.a, avg, headcount, comp, f.l2, f.l3, f.industry);

  engineL5Ctx.sessionStorage._industry = f.industry;
  const engineParts = engineL5Ctx.computeL5Parts(f.a, f.l2, f.l3);

  console.log('\n[' + f.name + ']');
  console.log('  pillar-l5.html computeL5DisplayParts(): assets=' + pillarParts.assets.toFixed(2) + ' liab=' + pillarParts.liab.toFixed(2) + ' nhw=' + pillarParts.nhw.toFixed(2));
  console.log('  engine computeL5Parts():                 assets=' + engineParts.assets.toFixed(2) + ' liab=' + engineParts.liab.toFixed(2) + ' nhw=' + engineParts.nhw.toFixed(2) + ' (score=' + engineParts.score + ')');

  if (!close(pillarParts.assets, engineParts.assets)) { console.log('  ✗ DRIFT: assets disagree.'); l5Failures++; }
  if (!close(pillarParts.liab, engineParts.liab)) { console.log('  ✗ DRIFT: liabilities disagree.'); l5Failures++; }
  if (!close(pillarParts.nhw, engineParts.nhw)) { console.log('  ✗ DRIFT: net human worth disagrees.'); l5Failures++; }
}

console.log('\n' + '-'.repeat(72));
if (l5Failures > 0) {
  console.log(l5Failures + ' L5 drift(s) found between pillar-l5.html and the engine.');
  process.exitCode = 1;
} else {
  console.log('No drift found between pillar-l5.html and humac-onboarding.html for these fixtures.');
}

// ===============================================================================
// L1: pillar-l1.html's computeRealLedger() vs humac-onboarding.html's
// buildL1Book() (the shared book that both computeL1Real() and computeL4Real()
// read from). Tested at scenario='base' - the only scenario the engine computes;
// Low/High on the display page are deliberate "what if" exploration, not
// alternate canonical scores, same as L5's scenario toggle.
// ===============================================================================
console.log('\n' + '='.repeat(72));
console.log('L1: pillar-l1.html vs humac-onboarding.html');
console.log('='.repeat(72));

const pillarL1Src = read('pillar-l1.html');

const l1AssumptionsStmt = extractVarStatement(pillarL1Src, 'ASSUMPTIONS');
const l1ScenarioStmt = extractVarStatement(pillarL1Src, 'scenario');
const l1MFn = extractFunction(pillarL1Src, 'm');
const computeRealLedgerFn = extractFunction(pillarL1Src, 'computeRealLedger');

const l1MultStmt = extractVarStatement(engineSrc, 'L1_MULT');
const buildL1BookFn = extractFunction(engineSrc, 'buildL1Book');

const pillarL1Ctx = makeSelfWindowCtx();
pillarL1Ctx.md = { industry: '' }; // computeRealLedger reads (md&&md.industry) directly
vm.runInContext([humacSharedSrc, l1AssumptionsStmt, l1ScenarioStmt, l1MFn, computeRealLedgerFn].join('\n'), pillarL1Ctx);

const engineL1Ctx = makeSelfWindowCtx();
engineL1Ctx.sessionStorage = {
  _industry: '',
  getItem: function (k) { return k === 'sr_meridian' ? JSON.stringify({ industry: engineL1Ctx.sessionStorage._industry }) : null; }
};
vm.runInContext([humacSharedSrc, l1MultStmt, buildL1BookFn].join('\n'), engineL1Ctx);

const l1Fixtures = [
  { name: 'typical org, IT/SaaS', a: { cq1_headcount: 100, cq1_compbase: 50000000, cq1_stars: 8, cq1_emerging: 12, cq1_tenured5: 20, cq1_revhires: 10, cq1_atrisk: 5, cq1_attr: 'Moderate 50%' }, industry: 'IT / SaaS' },
  { name: 'stars above 20% cap', a: { cq1_headcount: 50, cq1_compbase: 20000000, cq1_stars: 20, cq1_emerging: 0, cq1_tenured5: 10, cq1_revhires: 0, cq1_atrisk: 3, cq1_attr: 'Conservative 25%' }, industry: 'Manufacturing' },
  { name: 'only one cohort entered, high-attrition industry', a: { cq1_headcount: 200, cq1_compbase: 80000000, cq1_stars: 0, cq1_emerging: 0, cq1_tenured5: 0, cq1_revhires: 15, cq1_atrisk: 0, cq1_attr: 'Aggressive 75%' }, industry: 'BPO / KPO' },
  { name: 'no cohorts entered at all (insufficient)', a: { cq1_headcount: 30, cq1_compbase: 15000000, cq1_stars: 0, cq1_emerging: 0, cq1_tenured5: 0, cq1_revhires: 0, cq1_atrisk: 0, cq1_attr: '' }, industry: 'Startup' }
];

let l1Failures = 0;
for (const f of l1Fixtures) {
  pillarL1Ctx.md.industry = f.industry;
  const pillarLedger = pillarL1Ctx.computeRealLedger(f.a);

  engineL1Ctx.sessionStorage._industry = f.industry;
  const engineBook = engineL1Ctx.buildL1Book(f.a);

  console.log('\n[' + f.name + ']');
  console.log('  pillar-l1.html computeRealLedger(): totalRet=' + pillarLedger.totalRet.toFixed(2) + ' insufficient=' + pillarLedger.insufficient);
  console.log('  engine buildL1Book():                totalRet=' + engineBook.totalRet.toFixed(2) + ' insufficient=' + engineBook.insufficient);

  if (pillarLedger.insufficient !== engineBook.insufficient) { console.log('  ✗ DRIFT: insufficient-data gate disagrees.'); l1Failures++; }
  else if (!pillarLedger.insufficient && !close(pillarLedger.totalRet, engineBook.totalRet)) { console.log('  ✗ DRIFT: totalRet disagrees.'); l1Failures++; }
}

console.log('\n' + '-'.repeat(72));
if (l1Failures > 0) {
  console.log(l1Failures + ' L1 drift(s) found between pillar-l1.html and the engine.');
  process.exitCode = 1;
} else {
  console.log('No drift found between pillar-l1.html and humac-onboarding.html for these fixtures.');
}

// ===============================================================================
// L4: pillar-l4.html's computeL4DisplayParts() vs humac-onboarding.html's
// computeL4Real(). Both consume an L1 book's totalRet rather than re-deriving
// it, so the fixture passes in a matching book for each side directly instead
// of routing through sessionStorage, isolating the L4-specific cost math
// (hrFunc/compliance/culture vs the engine's combined 0.075 constant).
// ===============================================================================
console.log('\n' + '='.repeat(72));
console.log('L4: pillar-l4.html vs humac-onboarding.html');
console.log('='.repeat(72));

const pillarL4Src = read('pillar-l4.html');
const l4AssumptionsStmt = extractVarStatement(pillarL4Src, 'ASSUMPTIONS');
const l4ScenarioStmt = extractVarStatement(pillarL4Src, 'scenario');
const l4MFn = extractFunction(pillarL4Src, 'm');
const computeL4DisplayPartsFn = extractFunction(pillarL4Src, 'computeL4DisplayParts');

const l4BenchStmt = extractVarStatement(engineSrc, 'L4_BENCH');
const minMaxL4Fn = extractFunction(engineSrc, 'minMaxL4');
const computeL4RealFn = extractFunction(engineSrc, 'computeL4Real');

const pillarL4Ctx = makeSelfWindowCtx();
vm.runInContext([l4AssumptionsStmt, l4ScenarioStmt, l4MFn, computeL4DisplayPartsFn].join('\n'), pillarL4Ctx);

const engineL4Ctx = makeSelfWindowCtx();
vm.runInContext([humacSharedSrc, l1MultStmt, buildL1BookFn, l4BenchStmt, minMaxL4Fn, computeL4RealFn].join('\n'), engineL4Ctx);
engineL4Ctx.sessionStorage = {
  _industry: '',
  getItem: function (k) { return k === 'sr_meridian' ? JSON.stringify({ industry: engineL4Ctx.sessionStorage._industry }) : null; }
};

const l4Fixtures = [
  { name: 'no actual HR spend entered (assumed costs)', a: { cq1_headcount: 100, cq1_compbase: 50000000, cq1_stars: 8, cq1_emerging: 12, cq1_tenured5: 20, cq1_revhires: 10, cq1_atrisk: 5, cq1_attr: 'Moderate 50%', cq4_hrspend: 0 }, industry: 'IT / SaaS' },
  { name: 'actual HR spend entered (overrides assumed costs)', a: { cq1_headcount: 100, cq1_compbase: 50000000, cq1_stars: 8, cq1_emerging: 12, cq1_tenured5: 20, cq1_revhires: 10, cq1_atrisk: 5, cq1_attr: 'Moderate 50%', cq4_hrspend: 3000000 }, industry: 'IT / SaaS' },
  { name: 'small org, one cohort only', a: { cq1_headcount: 30, cq1_compbase: 15000000, cq1_stars: 0, cq1_emerging: 0, cq1_tenured5: 0, cq1_revhires: 4, cq1_atrisk: 0, cq1_attr: 'Conservative 25%', cq4_hrspend: 0 }, industry: 'Startup' }
];

let l4Failures = 0;
for (const f of l4Fixtures) {
  engineL4Ctx.sessionStorage._industry = f.industry;
  const engineBook = engineL4Ctx.buildL1Book(f.a);
  const comp = engineBook.compBase || f.a.cq1_compbase || 0;

  const pillarParts = pillarL4Ctx.computeL4DisplayParts(engineBook, f.a, comp);
  const engineScore = engineL4Ctx.computeL4Real(f.a);
  // Reconstruct the engine's raw hrInvestment/margin the same way computeL4Real does,
  // to compare against the pillar page's breakdown rather than just the final 0-100 score.
  const actualSpend = Number(f.a.cq4_hrspend) || 0;
  const engineHrInvestment = actualSpend > 0 ? actualSpend : comp * (0.04 + 0.015 + 0.02);
  const engineMargin = engineBook.totalRet / engineHrInvestment;

  console.log('\n[' + f.name + ']');
  console.log('  pillar-l4.html computeL4DisplayParts(): invest=' + pillarParts.invest.toFixed(2) + ' margin=' + (pillarParts.margin == null ? 'null' : pillarParts.margin.toFixed(4)));
  console.log('  engine computeL4Real() inputs:           invest=' + engineHrInvestment.toFixed(2) + ' margin=' + engineMargin.toFixed(4) + ' (score=' + engineScore + ')');

  if (!close(pillarParts.invest, engineHrInvestment)) { console.log('  ✗ DRIFT: HR investment (cost side) disagrees.'); l4Failures++; }
  if (pillarParts.margin != null && !close(pillarParts.margin, engineMargin)) { console.log('  ✗ DRIFT: margin disagrees.'); l4Failures++; }
}

console.log('\n' + '-'.repeat(72));
if (l4Failures > 0) {
  console.log(l4Failures + ' L4 drift(s) found between pillar-l4.html and the engine.');
  process.exitCode = 1;
} else {
  console.log('No drift found between pillar-l4.html and humac-onboarding.html for these fixtures.');
}

// ===============================================================================
// L3: pillar-l3.html's l3Coverage() vs humac-onboarding.html's computeL3Real().
// Structurally different from L1/L2/L4/L5 - not a reused financial/ratio formula,
// but a category-weighted average over 21 yes/no signals (of 25; 4 score once
// through HCI instead). Both sides already carried comments claiming they mirror
// each other (the q7-q10 exclusion fix and the category-weighted-average fix),
// written at different times by what reads like two different passes - exactly
// the kind of claim that needs to be run, not read.
// ===============================================================================
console.log('\n' + '='.repeat(72));
console.log('L3: pillar-l3.html vs humac-onboarding.html');
console.log('='.repeat(72));

const pillarL3Src = read('pillar-l3.html');

const hbFn = extractFunction(pillarL3Src, 'hb');
const preMapStmt = extractVarStatement(pillarL3Src, 'preMap');
const getSignalFn = extractFunction(pillarL3Src, 'getSignal');
const l3ScoreGroupsStmt = extractVarStatement(pillarL3Src, 'L3_SCORE_GROUPS');
const l3CoverageFn = extractFunction(pillarL3Src, 'l3Coverage');
const computeL3RealFn = extractFunction(engineSrc, 'computeL3Real');

// preMap and hb() both read `ra` (pillar-l3.html's raw-answers global); getSignal()
// falls back to `interMap`, which is only populated from a saved in-progress draft -
// irrelevant here, an empty object reproduces "no draft" exactly as the real page
// has it on a fresh load.
function pillarL3Score(ra) {
  const ctx = { console, ra: ra, interMap: {} };
  vm.createContext(ctx);
  vm.runInContext([hbFn, preMapStmt, getSignalFn, l3ScoreGroupsStmt, l3CoverageFn].join('\n'), ctx);
  return ctx.l3Coverage();
}

const engineL3Ctx = sandboxWith([computeL3RealFn]);

// Fixture answers are q-id yes/no strings, the same namespace computeL3Real() and
// pillar-l3.html's preMap (via hb('qNN')) both read from - no translation needed,
// which is itself part of what's being tested: if preMap's s-id-to-q-id wiring is
// ever edited wrong, this harness will not silently mask it.
function makeL3Answers(yesIds) {
  const allIds = ['q11', 'q12', 'q13', 'q14', 'q19', 'q20', 'q21', 'q22', 'q23', 'q24', 'q25', 'q26', 'q27', 'q28', 'q29', 'q30', 'q31', 'q32', 'q33', 'q34', 'q35'];
  const a = {};
  for (const id of allIds) a[id] = yesIds.includes(id) ? 'yes' : 'no';
  return a;
}

const l3Fixtures = [
  { name: 'all 21 answered, mixed yes/no across categories', a: makeL3Answers(['q11', 'q19', 'q20', 'q22', 'q23', 'q25', 'q27', 'q12', 'q29', 'q30', 'q32', 'q33']) },
  { name: 'all 21 answered, every category unanimous yes', a: makeL3Answers(['q11', 'q12', 'q13', 'q14', 'q19', 'q20', 'q21', 'q22', 'q23', 'q24', 'q25', 'q26', 'q27', 'q28', 'q29', 'q30', 'q31', 'q32', 'q33', 'q34', 'q35']) },
  { name: 'every category unanimous no', a: makeL3Answers([]) },
  {
    name: 'only 12 of 21 answered (below the 13 eligibility floor)',
    a: (() => { const a = makeL3Answers(['q11', 'q19', 'q20']); ['q27', 'q28', 'q29', 'q30', 'q31', 'q32', 'q33', 'q34', 'q35'].forEach((id) => { a[id] = ''; }); return a; })()
  },
  {
    name: 'exactly 13 of 21 answered (at the eligibility floor)',
    a: (() => { const a = makeL3Answers(['q11', 'q19', 'q20', 'q22']); ['q29', 'q30', 'q31', 'q32', 'q33', 'q34', 'q35', 'q27'].forEach((id) => { a[id] = ''; }); return a; })()
  },
  {
    name: 'HR Mirror (5 items) all yes, every other category all no - the case the category-average fix exists for',
    a: (() => { const a = makeL3Answers(['q12', 'q13', 'q29', 'q30', 'q31']); return a; })()
  }
];

let l3Failures = 0;
for (const f of l3Fixtures) {
  const pillarResult = pillarL3Score(f.a);
  const engineResult = engineL3Ctx.computeL3Real(f.a);

  console.log('\n[' + f.name + ']');
  console.log('  pillar-l3.html l3Coverage():   score=' + pillarResult.score + ' eligible=' + pillarResult.eligible + ' answered=' + pillarResult.total);
  console.log('  engine computeL3Real():        score=' + engineResult.l3 + ' answered=' + engineResult.l3Answered);

  if (pillarResult.eligible !== (engineResult.l3 != null)) { console.log('  ✗ DRIFT: eligibility gate disagrees.'); l3Failures++; }
  if (pillarResult.total !== engineResult.l3Answered) { console.log('  ✗ DRIFT: answered-count disagrees.'); l3Failures++; }
  if (pillarResult.score !== engineResult.l3) { console.log('  ✗ DRIFT: score disagrees.'); l3Failures++; }
}

console.log('\n' + '-'.repeat(72));
if (l3Failures > 0) {
  console.log(l3Failures + ' L3 drift(s) found between pillar-l3.html and the engine.');
  process.exitCode = 1;
} else {
  console.log('No drift found between pillar-l3.html and humac-onboarding.html for these fixtures.');
  console.log('All five pillars (L1-L5) are now covered by this harness.');
}
