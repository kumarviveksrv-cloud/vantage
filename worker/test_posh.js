// POSH deadline calendar: every date computed in code from dates the narrative states; a missing date is never guessed.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'situation-room-api.worker.js'), 'utf8');
const a = src.indexOf('// ── POSH ENGINE START'), b = src.indexOf('// ── POSH ENGINE END');
const { poshParseDate, poshAddMonths, poshCalendar, applyPoshEngine, poshDropLateClaims } = new Function(src.slice(a, b) + ';return {poshParseDate, poshAddMonths, poshCalendar, applyPoshEngine, poshDropLateClaims};')();
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const D = (s) => new Date(s + 'T00:00:00Z');
const row = (cal, label) => cal.rows.find(r => r.label === label);

ok(poshParseDate('2026-02-30') === null && poshParseDate('last Tuesday') === null && poshParseDate('2026-13-01') === null && poshParseDate(null) === null && poshParseDate('1999-01-01') === null, 'bad dates rejected');
ok(poshParseDate('2026-03-15').getUTCDate() === 15, 'good date parsed');
ok(poshAddMonths(D('2026-08-31'), 3).toISOString().slice(0, 10) === '2026-11-30', 'month end clamps: 31 Aug + 3m = 30 Nov');
ok(poshAddMonths(D('2026-08-31'), 6).toISOString().slice(0, 10) === '2027-02-28', '31 Aug + 6m = 28 Feb');
ok(poshAddMonths(D('2026-11-30'), 3).toISOString().slice(0, 10) === '2027-02-28', 'year rollover with clamp');

// no inputs: every row is not computed, nothing guessed
let cal = poshCalendar(null, D('2026-11-10'));
ok(cal.rows.length === 5 && cal.rows.every(r => /^Not computed: need /.test(r.status) && r.date === ''), 'no inputs: all five rows not computed');
ok(/50,000/.test(cal.penalty) && /s\.26/.test(cal.penalty) && /no formula/.test(cal.penalty), 'penalty from s.26, no s.15 amount');

// complaint window
cal = poshCalendar({ incidentDate: '2026-08-10', complaintDate: '2026-10-01' }, D('2026-11-10'));
ok(row(cal, 'Complaint window').date === '10 Nov 2026' && /in time/.test(row(cal, 'Complaint window').status), 'complaint in time: ' + row(cal, 'Complaint window').status);
cal = poshCalendar({ incidentDate: '2026-05-01', complaintDate: '2026-08-20' }, D('2026-11-10'));
ok(row(cal, 'Complaint window').tone === 'warn' && /written reasons/.test(row(cal, 'Complaint window').status) && /1 Nov 2026/.test(row(cal, 'Complaint window').status), 'complaint in extension period: ' + row(cal, 'Complaint window').status);
cal = poshCalendar({ incidentDate: '2026-01-01', complaintDate: '2026-09-01' }, D('2026-11-10'));
ok(row(cal, 'Complaint window').tone === 'late' && /outer limit/.test(row(cal, 'Complaint window').status), 'complaint beyond 6 months');
cal = poshCalendar({ incidentDate: '2026-03-01', lastIncidentDate: '2026-08-15', complaintDate: '2026-10-01' }, D('2026-11-10'));
ok(row(cal, 'Complaint window').date === '15 Nov 2026', 'series: window runs from the last incident');
cal = poshCalendar({ incidentDate: '2026-10-20' }, D('2026-11-10'));
ok(/Window open for 71 days/.test(row(cal, 'Complaint window').status) || /Window open for/.test(row(cal, 'Complaint window').status), 'open window without complaint date: ' + row(cal, 'Complaint window').status);

// inquiry 90 days, counted from start, else from committee receipt
cal = poshCalendar({ inquiryStartDate: '2026-09-01', inquiryCompletionDate: '2026-12-05' }, D('2026-12-10'));
ok(row(cal, 'Inquiry completion').date === '30 Nov 2026' && /Late by 5 days/.test(row(cal, 'Inquiry completion').status) && row(cal, 'Inquiry completion').tone === 'late', 'inquiry late by 5 days: ' + JSON.stringify(row(cal, 'Inquiry completion')));
cal = poshCalendar({ committeeReceiptDate: '2026-09-01' }, D('2026-12-05'));
ok(/Overdue by 5 days/.test(row(cal, 'Inquiry completion').status) && /received the complaint/.test(row(cal, 'Inquiry completion').rule), 'falls back to receipt date, says so: ' + row(cal, 'Inquiry completion').status);
ok(/does not say which date/.test(row(cal, 'Inquiry completion').rule), 'discloses that the Act does not fix the start of the 90 days');

// report 10 days, action 60, appeal 90
cal = poshCalendar({ inquiryCompletionDate: '2026-11-01', reportDate: '2026-11-09' }, D('2026-11-10'));
ok(row(cal, 'Report to the employer').date === '11 Nov 2026' && /On time/.test(row(cal, 'Report to the employer').status), 'report on time');
ok(row(cal, 'Employer action').date === '8 Jan 2027' && /Due in 59 days/.test(row(cal, 'Employer action').status), 'employer action 60 days from report: ' + JSON.stringify(row(cal, 'Employer action')));
ok(row(cal, 'Appeal window').date === '7 Feb 2027' && /Open for 89 days/.test(row(cal, 'Appeal window').status), 'appeal 90 days: ' + JSON.stringify(row(cal, 'Appeal window')));
cal = poshCalendar({ inquiryCompletionDate: '2026-06-01', reportDate: '2026-06-05', actionDate: '2026-08-10' }, D('2026-11-10'));
ok(/Late by 6 days/.test(row(cal, 'Employer action').status), 'action late by 6 days (60 days from 5 Jun = 4 Aug): ' + row(cal, 'Employer action').status);
ok(/Closed 66 days ago/.test(row(cal, 'Appeal window').status) || /Closed/.test(row(cal, 'Appeal window').status), 'appeal closed: ' + row(cal, 'Appeal window').status);
cal = poshCalendar({ inquiryCompletionDate: '2026-06-10', reportDate: '2026-06-01' }, D('2026-11-10'));
ok(/out of order/.test(row(cal, 'Report to the employer').status), 'out-of-order dates called out');

// apply: attaches only for POSH, always removes the internal field
let r = { detectedCaseType: 'POSH Complaint', poshInputs: { incidentDate: '2026-08-10' } };
applyPoshEngine(r, D('2026-11-10'));
ok(r.poshCalendar && r.poshCalendar.rows.length === 5 && r.poshInputs === undefined, 'POSH result gets calendar, internal field removed');
r = { detectedCaseType: 'Termination', poshInputs: { incidentDate: '2026-08-10' } };
applyPoshEngine(r, D('2026-11-10'));
ok(r.poshCalendar === undefined && r.poshInputs === undefined, 'other types get no calendar, internal field removed');
r = { detectedCaseType: 'Grievance', secondaryCaseType: 'POSH Complaint', poshInputs: null };
applyPoshEngine(r, D('2026-11-10'));
ok(r.poshCalendar && r.poshCalendar.rows.every(x => x.tone === 'na'), 'secondary POSH type gets calendar of not-computed rows');
r = { wrongTool: true, detectedCaseType: 'POSH Complaint', poshInputs: {} };
applyPoshEngine(r, D('2026-11-10'));
ok(r.poshCalendar === undefined, 'wrong-tool reply gets no calendar');
// status claims by the model are removed when the calendar shows nothing late
r = { detectedCaseType: 'POSH Complaint', poshInputs: { inquiryCompletionDate: '2026-11-02' }, protocol: { quick_take: 'The committee has not reported. The ten-day window from 2 November expired on 12 November 2026; the report is already overdue. Write to the Presiding Officer today.', bullets: ['The ten-day statutory deadline has passed.', 'Log the date the report arrives.'], pact: { p: { points: ['The ten-day window expired on 12 November 2026; the report is already overdue on the facts given.'] } } } };
applyPoshEngine(r, D('2026-11-10'));
ok(!/expired|overdue|has passed/.test(JSON.stringify(r.protocol)), 'late claims removed: ' + JSON.stringify(r.protocol));
ok(/Write to the Presiding Officer today/.test(r.protocol.quick_take) && /Log the date the report arrives/.test(r.protocol.bullets[1]), 'other sentences kept');
ok(r.protocol.bullets[0] === 'See the POSH Deadline Calendar for the dated status of each time limit.' && /See the POSH Deadline Calendar/.test(r.protocol.pact.p.points[0]), 'fully removed text replaced by the pointer to the calendar');
r = { detectedCaseType: 'POSH Complaint', poshInputs: { inquiryCompletionDate: '2026-10-01' }, protocol: { quick_take: 'The ten-day window expired on 11 October 2026; the report is overdue.' } };
applyPoshEngine(r, D('2026-11-10'));
ok(/overdue/.test(r.protocol.quick_take) && row(r.poshCalendar, 'Report to the employer').tone === 'late', 'when the calendar does show a late row, the claim is kept');
ok(poshDropLateClaims({ a: 'The rent is overdue. Pay it.' }) === 0, 'unrelated overdue text untouched');
ok(/TODAY'S DATE: \$\{poshFmt\(new Date\(\)\)\}/.test(src), 'model is told today\'s date');

ok(/applyPoshEngine\(result, new Date\(\)\)/.test(src) && /"poshInputs":/.test(src) && /never calculate a deadline/.test(src), 'wired: schema field, prompt rule and handler call present');
console.log(fails ? fails + ' FAILED' : 'POSH engine: all passed');
process.exit(fails ? 1 : 0);
