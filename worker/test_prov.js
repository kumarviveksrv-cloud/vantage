// Provenance filter: a sentence survives only with a valid source tag.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'situation-room-api.worker.js'), 'utf8');
const sl = (a, b) => src.slice(src.indexOf(a), src.indexOf(b));
const tb = fs.readFileSync(path.join(__dirname, 'test_bc.js'), 'utf8').split('\n')[4];
const code = eval(tb.replace(/^const code = /, '').replace(/;\s*$/, ''));
const { bcProvFilter } = new Function(code + ';return {bcProvFilter};')();
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
if (fails) { console.log(fails + ' FAILED'); process.exit(1); } else { console.log('PROVENANCE TESTS PASSED'); }
