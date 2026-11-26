#!/usr/bin/env node
/*
 * verify-pillar-render.js
 *
 * Why this exists: verify-pillar-consistency.js proves the pillar pages'
 * scoring functions agree with the engine's. It does that by calling those
 * functions in isolation. It never calls a pillar page's render() - so on
 * 2026-11-26, computeL4DisplayParts() in pillar-l4.html was extracted from
 * render() and passed every consistency check, while render() itself still
 * referenced a local variable (actualSpend) that the extraction forgot to
 * return. Every "is the score right" check was green. The page was blank
 * the moment anyone with a real, unblocked score clicked into L4 - a plain
 * ReferenceError, thrown mid-render, that left #main-wrap exactly as empty
 * as it started.
 *
 * Same day, same gap, two more instances: pillar-l1.html, pillar-l5.html,
 * and humac-onboarding.html itself all load <script src="humac-shared.js">
 * AFTER their own inline <script>, but that inline script calls HumacShared.*
 * synchronously, on first paint, for any real computed-mode user. Classic
 * script tags run in document order, so this was a guaranteed
 * ReferenceError on a cold load, not a maybe - and on humac-onboarding.html
 * specifically it broke exactly the screen a user lands on after finishing
 * a pillar deep-dive and clicking "Humac Score" to get back to their
 * summary: renderScoreReveal() threw partway through, leaving
 * #score-reveal empty with no questionnaire to fall back to either.
 *
 * This script closes that gap the only way that actually proves it closed:
 * it loads each page for real, in a DOM (jsdom), with realistic
 * sessionStorage state, and checks that the page's own script runs to
 * completion without throwing and that the relevant content area actually
 * fills in. Not a syntax check (parses but doesn't run) and not a unit test
 * of one extracted function (runs but isn't the real page) - the actual
 * script, actually executing, the way a browser would run it.
 *
 * Two fixtures per page:
 *   - "empty": nothing filled in yet (pillar pages) / no saved score yet
 *     (humac-onboarding.html). Expected to show a gate/insufficient message
 *     or the fresh questionnaire, not throw.
 *   - "populated": a complete, realistic computed-mode org, L1 book
 *     included. This is the branch that was actually broken three separate
 *     times today - the one a real user with a real score hits by clicking
 *     into a pillar, or back out to their summary.
 *
 * Requires jsdom (package.json devDependency - run `npm install` once per
 * clone before this will work; verify-pillar-consistency.js has no such
 * requirement and still runs standalone).
 */
'use strict';
const fs = require('fs');
const path = require('path');
let JSDOM, ResourceLoader;
try {
  ({ JSDOM, ResourceLoader } = require('jsdom'));
} catch (e) {
  console.log('[verify-pillar-render] jsdom is not installed. Run `npm install` once in this repo, then re-run.');
  console.log('[verify-pillar-render] Skipping render checks for this push (the consistency and syntax checks above still ran).');
  process.exit(0);
}

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

// A single, realistic, fully-computed-mode organisation that exercises
// every field every pillar page's own recompute touches. Merged from the
// per-pillar fixtures already proven correct in verify-pillar-consistency.js,
// so this isn't inventing a new shape of data, it's the same shape, combined.
const L3_YES_IDS = ['q11', 'q19', 'q20', 'q22', 'q23', 'q25', 'q27', 'q12', 'q29', 'q30', 'q32', 'q33'];
const L3_ALL_IDS = ['q11', 'q12', 'q13', 'q14', 'q19', 'q20', 'q21', 'q22', 'q23', 'q24', 'q25', 'q26', 'q27', 'q28', 'q29', 'q30', 'q31', 'q32', 'q33', 'q34', 'q35'];
const populatedAnswers = Object.assign(
  {
    cq1_headcount: 100, cq1_compbase: 50000000,
    cq1_stars: 8, cq1_emerging: 12, cq1_tenured5: 20, cq1_revhires: 10, cq1_atrisk: 5, cq1_attr: 'Moderate 50%',
    cq5_hipo: 5, cq5_seniorcount: 10, cq5_seniortenure: 6, cq5_revemployees: 15,
    cq2_promoted12mo: 10, cq2_promotedexcelling: 7,
    cq2_managers: 20, cq2_managersoutperform: 12,
    cq2_hired12mo: 15, cq2_hiredmeeting: 9,
    cq2_tenuretop: 4, cq2_tenureatrisk: 1.5,
    cq4_hrspend: 2700000, cq4_revhires24: 18,
    q17: 4.2
  },
  L3_ALL_IDS.reduce((a, id) => { a[id] = L3_YES_IDS.includes(id) ? 'yes' : 'no'; return a; }, {})
);

const fixtures = [
  { name: 'empty (fresh user, nothing filled in yet)', rawAnswers: {}, withL1Book: false },
  { name: 'populated (complete, computed-mode org - the branch that was actually broken)', rawAnswers: populatedAnswers, withL1Book: true }
];

// The same, real buildL1Book() the engine uses, so the "populated" fixture's
// vantage_l1_book is internally consistent rather than a guessed number.
const engineSrc = read('humac-onboarding.html');
const { extractFunction, extractVarStatement, makeSelfWindowCtx } = require('./lib/vm-extract');
const vm = require('vm');
const humacSharedSrc = read('humac-shared.js');
const l1MultStmt = extractVarStatement(engineSrc, 'L1_MULT');
const buildL1BookFn = extractFunction(engineSrc, 'buildL1Book');
const l1Ctx = makeSelfWindowCtx();
l1Ctx.sessionStorage = { _industry: 'IT / SaaS', getItem(k) { return k === 'sr_meridian' ? JSON.stringify({ industry: this._industry }) : null; } };
vm.runInContext([humacSharedSrc, l1MultStmt, buildL1BookFn].join('\n'), l1Ctx);
const l1Book = l1Ctx.buildL1Book(populatedAnswers);

// pillar-l1.html and pillar-l5.html load <script src="humac-shared.js">. jsdom
// does not fetch that over the network by default (there is no live server in
// this harness, by design, same as why the consistency harness reads source
// from disk instead of over HTTP). Without this, whether HumacShared ends up
// defined is a race that depends on exact timing, not a real signal - it was
// this undefined-ness that looked like a pillar-l5.html bug on the first run
// of this script and wasn't one.
//
// Deliberately narrow, not "resolve anything local from disk": every pillar
// page also loads clerk-auth.js, which expects a real Clerk/browser runtime
// and throws when it actually executes here - that's a harness-environment
// gap unrelated to anything this script exists to catch, and letting it run
// would turn every single fixture into a false failure. humac-shared.js is
// the one external script these pages' own compute logic actually depends
// on, so it's the only one resolved from disk; everything else external
// (clerk-auth.js, vantage-theme.css, fonts, favicon, manifest) resolves to
// nothing, same as if there were simply no network - which is what these
// pages see today without this loader at all.
class LocalResourceLoader extends ResourceLoader {
  fetch(url) {
    try {
      const u = new URL(url);
      if (/\/humac-shared\.js$/.test(u.pathname)) {
        return Promise.resolve(fs.readFileSync(path.join(ROOT, 'humac-shared.js')));
      }
    } catch (e) { /* fall through */ }
    return Promise.resolve(Buffer.from(''));
  }
}

// Pillar pages all check one container (#main-wrap). humac-onboarding.html
// is different: with no saved score it shows the questionnaire
// (#block-container), with one it shows the summary (#score-reveal) - two
// different elements depending on the fixture, not one.
const PAGE_CONFIGS = [
  { file: 'pillar-l1.html', resultId: () => 'main-wrap' },
  { file: 'pillar-l2.html', resultId: () => 'main-wrap' },
  { file: 'pillar-l3.html', resultId: () => 'main-wrap' },
  { file: 'pillar-l4.html', resultId: () => 'main-wrap' },
  { file: 'pillar-l5.html', resultId: () => 'main-wrap' },
  { file: 'humac-onboarding.html', resultId: (fixture) => fixture.withL1Book ? 'score-reveal' : 'block-container' }
];

// jsdom logs a (non-fatal) "Not implemented: window.scrollTo" to its virtual
// console whenever a page calls scrollIntoView/scrollTo, which
// humac-onboarding.html's renderScoreReveal() does on a real error banner -
// real browsers implement this fine, jsdom just doesn't, and it was never
// routed through window.onerror so it never affected pass/fail. Silencing it
// here so it doesn't read as a hook failure in the push output when it isn't
// one.
const { VirtualConsole } = require('jsdom');
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (e) => {
  if (!/Not implemented: window\.scrollTo/.test(e.message)) console.error(e);
});

async function run() {
  let failures = 0;

  for (const { file: page, resultId } of PAGE_CONFIGS) {
    const html = read(page);
    for (const fixture of fixtures) {
      const hd = {
        rawAnswers: fixture.rawAnswers,
        l1: 70, l2: 65, l3: 70, l4: 60, l5: 50,
        hci: 1.0, confidence: 'computed', timestamp: Date.now(),
        // humac-onboarding.html's own reveal checks hd.humac/hd.band directly
        // (applyCheckinMode/renderScoreReveal), separately from the l1..l5
        // breakdown the pillar pages use.
        humac: fixture.withL1Book ? 65 : null, band: 'Value Active',
        // pillar-l1.html/pillar-l2.html/humac-onboarding.html gate their real
        // compute() calls on these per-block mode flags, not on hd.confidence -
        // missing them here was a fixture gap that gave pillar-l1.html a false
        // pass on the first run of this script: with no l1Mode, it silently
        // fell back to 'estimate' and never touched computeRealLedger() (or
        // HumacShared) at all, hiding exactly the class of bug this script
        // exists to catch. Set them to 'computed' on the populated fixture so
        // it actually exercises the path a real computed-mode user (which is
        // what Vivek's own org is) takes.
        l1Mode: fixture.withL1Book ? 'computed' : 'estimate',
        l2Mode: fixture.withL1Book ? 'computed' : 'estimate',
        l4Mode: fixture.withL1Book ? 'computed' : 'estimate',
        l5Mode: fixture.withL1Book ? 'computed' : 'estimate'
      };
      const errors = [];
      let dom;
      try {
        dom = new JSDOM(html, {
          runScripts: 'dangerously',
          resources: new LocalResourceLoader(),
          virtualConsole,
          // Real origin, not a file:// URL, so relative links/fetches behave the
          // way they do in production rather than throwing on their own.
          url: 'https://vantage.virorah.com/' + page,
          beforeParse(window) {
            window.sessionStorage.setItem('sr_access', 'true');
            window.sessionStorage.setItem('vantage_humac', JSON.stringify(hd));
            window.sessionStorage.setItem('sr_meridian', JSON.stringify({ industry: 'IT / SaaS', state: 'Karnataka' }));
            if (fixture.withL1Book) window.sessionStorage.setItem('vantage_l1_book', JSON.stringify(l1Book));
            window.clerkSignOut = function () {};
            window.onerror = function (msg, src, line, col, err) {
              errors.push((err && err.stack) || msg + ' (line ' + line + ')');
              return true; // prevent jsdom's default "Unhandled error" console noise; we collect it ourselves
            };
          }
        });
        // <script> tags with no src run synchronously as the HTML is parsed, but
        // pillar-l1.html/pillar-l5.html also have a <script src="humac-shared.js">,
        // which - even resolved locally via LocalResourceLoader above instead of
        // over the network - is still fetched asynchronously, same as a real
        // browser. jsdom correctly pauses the parser for it, but "pauses" means
        // "yields to the event loop", not "blocks this synchronous function", so
        // without this wait the inline render() script could run before the
        // external one has, on exactly the two pages that need it. Wait for the
        // document to finish loading (with a timeout as a safety net, in case a
        // page's load event never fires for some unrelated reason) before reading
        // the result.
        await Promise.race([
          new Promise((resolve) => dom.window.addEventListener('load', resolve)),
          new Promise((resolve) => setTimeout(resolve, 2000))
        ]);
      } catch (e) {
        errors.push(e.stack || String(e));
      }

      const targetId = resultId(fixture);
      const wrap = dom && dom.window.document.getElementById(targetId);
      const content = wrap ? wrap.innerHTML.trim() : '';
      const ok = errors.length === 0 && content.length > 50;

      if (!ok) {
        failures++;
        console.log('  ✗ ' + page + ' [' + fixture.name + ']');
        if (errors.length) errors.forEach((e) => console.log('      ' + e.split('\n')[0]));
        else console.log('      #' + targetId + ' stayed empty (' + content.length + ' chars) - no error thrown, but nothing rendered either.');
      } else {
        console.log('  ✓ ' + page + ' [' + fixture.name + '] - #' + targetId + ': ' + content.length + ' chars rendered, no errors');
      }
      if (dom) dom.window.close();
    }
  }

  console.log('');
  if (failures > 0) {
    console.log('[verify-pillar-render] ' + failures + ' page/fixture combination(s) failed to render.');
    process.exitCode = 1;
  } else {
    console.log('[verify-pillar-render] All five pillar pages and humac-onboarding.html render cleanly, empty and populated.');
  }
}

run();
