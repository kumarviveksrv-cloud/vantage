// Provenance filter: a sentence survives only with a valid source tag.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'situation-room-api.worker.js'), 'utf8');
const sl = (a, b) => src.slice(src.indexOf(a), src.indexOf(b));
const tb = fs.readFileSync(path.join(__dirname, 'test_bc.js'), 'utf8').split('\n')[4];
const code = eval(tb.replace(/^const code = /, '').replace(/;\s*$/, ''));
const { bcProvFilter, applyBusinessCaseStakeholder } = new Function(code + ';return {bcProvFilter, applyBusinessCaseStakeholder};')();
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const USER = 'We lost 40 employees out of 250 last year. Average CTC is ₹8L. We want a retention programme with a budget of ₹15L.';
const PROFILE = 'Industry: Insurance. Size: 250 employees. Location: Haryana.';
const mk = () => ({ openingLine: 'We lost 40 employees out of 250 last year. The finance team has not approved any retention spend. Studies show attrition is costly.', stack: { credibility: { statement: 'Our headcount is 250 in Insurance.' } }, provenance: { openingLine: [{ s: 'We lost 40 employees out of 250', t: 'user', q: 'We lost 40 employees out of 250' }, { s: 'The finance team has not approved', t: 'advice', q: '' }, { s: 'Studies show attrition is costly', t: 'user', q: 'Studies show' }], 'stack.credibility.statement': [{ s: 'Our headcount is 250', t: 'profile', q: '250 employees' }] } });
let r = mk(); let o = bcProvFilter(r, USER, PROFILE, [], false);
ok(o.applied && o.removed === 2, 'two sentences removed: ' + JSON.stringify(o));
ok(r.openingLine === 'We lost 40 employees out of 250 last year.', 'kept the sourced sentence: ' + r.openingLine);
ok(r.stack.credibility.statement === 'Our headcount is 250 in Insurance.', 'profile-sourced kept');
ok(r.provenance === undefined, 'provenance removed from output');
// no provenance: not applied, nothing touched
r = { openingLine: 'Anything goes here.' }; o = bcProvFilter(r, USER, PROFILE, [], false);
ok(!o.applied && r.openingLine === 'Anything goes here.', 'no provenance leaves text alone');
// untagged sentence removed, all removed gives Not stated.
r = { openingLine: 'An untagged claim about the market.', provenance: { openingLine: [] } }; o = bcProvFilter(r, USER, PROFILE, [], false);
ok(r.openingLine === 'Not stated.' && o.removed === 1, 'untagged removed, Not stated: ' + r.openingLine);
// figure tag with an invented rupee number fails; with a computed number passes
r = { openingLine: 'The cost is Rs.9Cr a year.', provenance: { openingLine: [{ s: 'The cost is Rs.9Cr', t: 'figure', q: 'total' }] } }; bcProvFilter(r, USER, PROFILE, [], false);
ok(r.openingLine === 'Not stated.', 'invented figure removed: ' + r.openingLine);
r = { openingLine: 'The cost is Rs.3.36Cr a year.', provenance: { openingLine: [{ s: 'The cost is Rs.3.36Cr', t: 'figure', q: 'total' }] } }; bcProvFilter(r, USER, PROFILE, [336], false);
ok(r.openingLine === 'The cost is Rs.3.36Cr a year.', 'computed figure kept: ' + r.openingLine);
// user quote must be literal
r = { openingLine: 'Leaders told you the budget is frozen.', provenance: { openingLine: [{ s: 'Leaders told you the budget', t: 'user', q: 'budget is frozen' }] } }; bcProvFilter(r, USER, PROFILE, [], false);
ok(r.openingLine === 'Not stated.', 'quote not in input removed');
// advice with a duration not in input fails; plain advice passes
r = { openingLine: 'Review the exits within 45 days. Start with exit interviews.', provenance: { openingLine: [{ s: 'Review the exits within 45 days', t: 'advice', q: '' }, { s: 'Start with exit interviews', t: 'advice', q: '' }] } }; bcProvFilter(r, USER, PROFILE, [], false);
ok(r.openingLine === 'Start with exit interviews.', 'invented duration removed, plain advice kept: ' + r.openingLine);
// false user tag: quote exists but the sentence claims much more than the quote
r = { openingLine: 'HR has already done the sourcing work and both candidates are evaluated, vetted and ready to start.', provenance: { openingLine: [{ s: 'HR has already done the sourcing', t: 'user', q: 'We lost 40 employees' }] } }; bcProvFilter(r, USER, PROFILE, [], true);
ok(r.openingLine === 'Not stated.', 'user tag with unsupported content removed: ' + r.openingLine);
// declarative advice about the world is removed, imperative or ask forms kept
r = { openingLine: 'The most likely outcome is that analysts will leave. I need approval to proceed. Approve the hires this quarter.', provenance: { openingLine: [{ s: 'The most likely outcome is that analysts', t: 'advice', q: '' }, { s: 'I need approval to proceed', t: 'advice', q: '' }, { s: 'Approve the hires this quarter', t: 'advice', q: '' }] } }; bcProvFilter(r, USER, PROFILE, [], true);
ok(r.openingLine === 'I need approval to proceed.' || r.openingLine === 'I need approval to proceed. Approve the hires this quarter.', 'declarative advice removed: ' + r.openingLine);
// wired through the stakeholder wrapper on the no-engine path
const SIT = 'We want to hire two analysts for the claims team. The vacancy is slowing claims. I need approval from the CFO.';
const w = { stack: { credibility: { statement: 'The claims team needs two analysts.', evidence: 'Studies show analyst gaps cost money.', deliveryNote: 'Say it plainly.' }, dataAnchor: { headline: 'h', figure: 'Not computed', context: 'The vacancy is slowing claims.' }, riskMirror: { scenario: 's', revenueAtRisk: 'Not computed', revenueAtRiskBasis: 'b', timeline: 't', probability: '' }, decisionRunway: { ask: 'Approve two analysts.', deadline: 'd', alternatives: ['a'], successMetric: 'm' } }, openingLine: 'I need approval from the CFO.', closingLine: 'Thank you.', stakeholderProfile: 'CFO.', humac: {}, provenance: { 'stack.credibility.statement': [{ s: 'The claims team needs two analysts', t: 'user', q: 'hire two analysts for the claims team' }], 'stack.credibility.evidence': [{ s: 'Studies show analyst gaps cost money', t: 'advice', q: '' }], 'stack.dataAnchor.context': [{ s: 'The vacancy is slowing claims', t: 'user', q: 'The vacancy is slowing claims' }], openingLine: [{ s: 'I need approval from the CFO', t: 'user', q: 'I need approval from the CFO' }] } };
applyBusinessCaseStakeholder(w, SIT, PROFILE);
ok(w.provenance === undefined, 'provenance not shipped');
ok(/^Not stated|Evidence|evidence/.test(w.stack.credibility.evidence) && !/Studies show/.test(w.stack.credibility.evidence), 'unsupported studies sentence removed on the wire: ' + w.stack.credibility.evidence);
ok(/not computed/.test(w.stack.dataAnchor.context) && w.openingLine === "I need approval from the CFO.", "sourced sentences kept: " + w.stack.dataAnchor.context + " | " + w.openingLine);
// a half of a per-hire amount is not allowed as a cost, but is allowed in a phasing sentence
r = { stack: { dataAnchor: { headline: 'h', figure: 'Rs.7L', context: 'c' }, credibility: {}, riskMirror: {}, decisionRunway: {} }, humac: {} };
applyBusinessCaseStakeholder(r, 'Hire two analysts at Rs.14L each. I need approval.', PROFILE);
ok(r.stack.dataAnchor.figure === 'Not computed', 'half of a salary is not a figure: ' + r.stack.dataAnchor.figure);
if (fails) { console.log(fails + ' FAILED'); process.exit(1); } else { console.log('PROVENANCE TESTS PASSED'); }
