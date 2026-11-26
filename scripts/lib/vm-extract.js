/*
 * vm-extract.js — shared source-extraction helpers for the pillar-vs-engine
 * harness (verify-pillar-consistency.js) and the pillar-render harness
 * (verify-pillar-render.js). Pulled out on 2026-11-26 when the render
 * harness needed the exact same extraction logic the consistency harness
 * already had, so there'd be one copy to keep correct instead of two that
 * could drift from each other, the same class of problem this whole
 * project exists to catch in the product code.
 *
 * Nothing here is pillar-specific. It just extracts real source from an
 * HTML file's inline <script> and runs it in a Node `vm` sandbox.
 */
'use strict';
const vm = require('vm');

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

// Extracts a top-level `var NAME = <value>;` statement, bracket-depth aware so
// it handles a nested object literal (ASSUMPTIONS, L5_BENCH) as well as a
// plain scalar (scenario='base').
function extractVarStatement(source, name) {
  const re = new RegExp('var\\s+' + name + '\\s*=');
  const m = re.exec(source);
  if (!m) throw new Error('Could not find var ' + name + ' in source');
  const start = m.index;
  let i = start + m[0].length, depth = 0;
  for (; i < source.length; i++) {
    const c = source[i];
    if (c === '{' || c === '(' || c === '[') depth++;
    else if (c === '}' || c === ')' || c === ']') depth--;
    else if (c === ';' && depth === 0) { i++; break; }
  }
  return source.slice(start, i);
}

function sandboxWith(fnSources, extraGlobals) {
  const ctx = Object.assign({ console }, extraGlobals || {});
  vm.createContext(ctx);
  vm.runInContext(fnSources.join('\n'), ctx);
  return ctx;
}

// Both real functions reach for HumacShared as a bare global (they're loaded as
// plain <script> tags in the browser, where window.X === the global X). Give each
// sandbox a self-referencing `window` so `window.HumacShared = ...` inside
// humac-shared.js's IIFE lands as a bare global here too, exactly like in the browser.
function makeSelfWindowCtx() {
  const ctx = { console };
  ctx.window = ctx;
  vm.createContext(ctx);
  return ctx;
}

module.exports = { extractFunction, extractVarStatement, sandboxWith, makeSelfWindowCtx };
