// Wrong-tool redirects: free (trial refund, no daily count) up to the bounce cap; JSON reply parsing for Policy.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'situation-room-api.worker.js'), 'utf8');
const a = src.indexOf('async function settleWrongTool'), b = src.indexOf('function usageLimitResponse');
const body = src.slice(a, b);
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
(async () => {
  const mk = (bounceAllowed) => { const log = [];
    const f = new Function('checkUsage', 'queueUsage', 'refundTrialCall', body + ';return {settleWrongTool, parseWrongToolReply};')(
      async (u, t) => bounceAllowed ? { allowed: true, count: 0, period: 'p' } : { allowed: false },
      (u, t) => log.push('queue:' + t), async () => log.push('refund'));
    return { f, log }; };
  let { f, log } = mk(true);
  ok(await f.settleWrongTool('u', 'policy', { allowed: true }, true) === true, 'free returns true');
  ok(log.join() === 'queue:wrong_tool,refund', 'free: bounce counted, trial refunded, tool not charged: ' + log.join());
  ({ f, log } = mk(true)); await f.settleWrongTool('u', 'pact', { allowed: true }, false);
  ok(log.join() === 'queue:wrong_tool', 'paid user: no refund call, tool not charged');
  ({ f, log } = mk(false));
  ok(await f.settleWrongTool('u', 'policy', { allowed: true }, true) === false, 'over cap returns false');
  ok(log.join() === 'queue:policy', 'over cap: charged like a normal call, no refund');
  const p = f.parseWrongToolReply;
  ok(p('{"wrongTool": true, "suggestedTool": "Employee Case Advisor", "reason": "x"}').suggestedTool === 'Employee Case Advisor', 'parses plain JSON');
  ok(p('```json\n{"wrongTool": true, "suggestedTool": "A", "twoParts": true, "secondTool": "B", "reason": "x"}\n```').secondTool === 'B', 'parses fenced two-part JSON');
  ok(p('🧠 VANTAGE ASSESSMENT\nfoo {"wrongTool": true}') === null, 'normal answer is not a redirect');
  ok(p('{"wrongTool": false}') === null, 'false is not a redirect');
  ok(p('{bad json') === null, 'broken JSON is not a redirect');
  ok(/wrong_tool:\s+\{ limit: 10/.test(src), 'bounce cap defined');
  console.log(fails ? fails + ' FAILED' : 'WRONG TOOL TESTS PASSED'); process.exit(fails ? 1 : 0);
})();
