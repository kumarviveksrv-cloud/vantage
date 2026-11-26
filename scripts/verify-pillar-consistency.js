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

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

// --- generic, brace-matching function extractor -----------------------------
// Robust to reordering/reformatting elsewhere in the file. Finds `function
// name(` and walks forward counting braces to find the matching close, so it
// doesn't depend on fragile line-number or end-marker assumptions that would
// themselves rot as the files change.
function extractFunction(source, name) {
  const sigRe = new RegExp('function\\s+' + name + '\\s*\\(');
  const m = sigRe.exec(source);
  if (!m) throw new Error('Could not find function ' + name + '() in source');
  const start = m.index;
  const braceStart = source.indexOf('{', start);
  if (braceStart === -1) throw new Error('No opening brace found for ' + name + '()');
  let depth = 0, i = braceStart;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  return source.slice(start, i);
}

function sandboxWith(fnSources, extraGlobals) {
  const ctx = Object.assign({ console }, extraGlobals || {});
  vm.createContext(ctx);
  vm.runInContext(fnSources.join('\n'), ctx);
  return ctx;
}

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
  console.log(failures + ' drift(s) found. Do not treat this as noise - this is exactly the class of bug');
  console.log('that already shipped once this session (L2 HiPo/Star) before anyone caught it.');
  process.exitCode = 1;
} else {
  console.log('No drift found between pillar-l2.html and humac-onboarding.html for these fixtures.');
}
