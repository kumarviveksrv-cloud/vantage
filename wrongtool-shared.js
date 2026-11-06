/* Virorah Vantage: shared "wrong tool" banner with question carry-over.
 * show({reason, suggestedTool, secondTool, twoParts, text}) draws the banner. With twoParts it says the question has two
 * parts and offers both tools. Clicking a tool stores the typed text for one page load and opens that tool,
 * where it is put back into the main box. Storage use is wrapped in try/catch: without it the link still opens the tool. */
(function () {
  var URLS = {
    'Employee Case Advisor': 'employee-case-advisor.html',
    'The Business Case': 'business-case.html',
    'Policy Advisor': 'policy-advisor.html',
    'Retention Advisor': 'retention-advisor.html',
    'Difficult Conversations': 'aria.html'
  };
  var BOX_FOR_PAGE = { 'policy-advisor.html': 'query', 'employee-case-advisor.html': 'narrative', 'business-case.html': 'context' };
  var KEY = 'vantage_handoff';
  /* The model may name a tool loosely ("Vantage Policy Advisor", "the Retention Advisor"). Map it to a known tool name. */
  function canon(name) {
    var n = String(name || '').toLowerCase().replace(/^\s*(the|vantage)\s+/g, '').replace(/^\s*(the|vantage)\s+/g, '').replace(/\s+/g, ' ').trim();
    if (n === 'aria' || n === 'difficult conversation') { return 'Difficult Conversations'; }
    var keys = Object.keys(URLS);
    for (var i = 0; i < keys.length; i++) { var k = keys[i].toLowerCase().replace(/^the\s+/, ''); if (n === k || n.indexOf(k) >= 0 || k.indexOf(n) >= 0 && n.length > 3) { return keys[i]; } }
    return name;
  }

  function go(tool, text) {
    tool = canon(tool);
    var file = URLS[tool] || 'dashboard.html';
    var here = (location.pathname.split('/').pop() || ''); if (here && here.indexOf('.') < 0) { here += '.html'; }
    if (file === here && BOX_FOR_PAGE[file] && typeof window.startNew === 'function') {
      /* Already on the target tool: reset it in place and fill the box, instead of reloading the same page. */
      try {
        window.startNew();
        var box = document.getElementById(BOX_FOR_PAGE[file]);
        if (box) { box.value = String(text || '').slice(0, 3000); try { box.dispatchEvent(new Event('input', { bubbles: true })); } catch (e2) {} try { box.focus(); box.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e3) {} }
        var b = document.getElementById('vantage-wrongtool-shared'); if (b && b.parentNode) { b.parentNode.removeChild(b); }
        return;
      } catch (e) {}
    }
    try { if (text && BOX_FOR_PAGE[file]) { sessionStorage.setItem(KEY, JSON.stringify({ to: file, text: String(text).slice(0, 3000) })); } } catch (e) {}
    window.location.href = file;
  }
  function btn(tool, text) {
    var a = document.createElement('a');
    a.href = URLS[canon(tool)] || 'dashboard.html';
    a.textContent = 'Open ' + canon(tool) + ' →';
    a.style.cssText = "display:inline-block;margin:10px 8px 0 0;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.06em;color:#c4b5fd;background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.35);border-radius:6px;padding:5px 12px;cursor:pointer;text-decoration:none";
    a.addEventListener('click', function (e) { e.preventDefault(); go(tool, text); });
    return a;
  }
  function show(o) {
    o = o || {};
    var old = document.getElementById('vantage-wrongtool-shared');
    if (old && old.parentNode) { old.parentNode.removeChild(old); }
    var legacy = document.getElementById('vantage-wrongtool');
    if (legacy) { legacy.style.display = 'none'; }
    var two = !!(o.twoParts && o.secondTool && o.suggestedTool);
    var box = document.createElement('div');
    box.id = 'vantage-wrongtool-shared';
    box.setAttribute('role', 'status');
    box.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:999;background:#11102a;border:1px solid rgba(99,102,241,0.35);border-left:3px solid #6366f1;border-radius:10px;padding:16px 20px;max-width:480px;width:calc(100% - 48px);box-shadow:0 8px 32px rgba(0,0,0,0.5)';
    var row = document.createElement('div'); row.style.cssText = 'display:flex;align-items:flex-start;gap:12px';
    var icon = document.createElement('span'); icon.textContent = '🧭'; icon.style.cssText = 'font-size:16px;flex-shrink:0;margin-top:1px';
    var col = document.createElement('div'); col.style.flex = '1';
    var msg = document.createElement('div'); msg.style.cssText = 'font-family:"DM Sans",sans-serif;font-size:13px;color:rgba(244,243,255,.85);line-height:1.55';
    var base = o.reason || ('This looks like it belongs in ' + (o.suggestedTool || 'a different tool') + '.');
    msg.textContent = two ? ('This has two parts. ' + base + ' Each gets a better answer in its own tool. Redirects like this are free, up to 10 a day.') : (base + ' Redirects like this are free, up to 10 a day.');
    col.appendChild(msg);
    if (o.suggestedTool) { col.appendChild(btn(o.suggestedTool, o.text)); }
    if (two) { col.appendChild(btn(o.secondTool, o.text)); }
    var x = document.createElement('button'); x.textContent = '✕'; x.setAttribute('aria-label', 'Close');
    x.style.cssText = 'background:none;border:none;color:rgba(244,243,255,.3);cursor:pointer;font-size:16px;padding:0;line-height:1;flex-shrink:0';
    x.addEventListener('click', function () { if (box.parentNode) { box.parentNode.removeChild(box); } });
    row.appendChild(icon); row.appendChild(col); row.appendChild(x); box.appendChild(row);
    document.body.appendChild(box);
  }
  function prefill() {
    try {
      var raw = sessionStorage.getItem(KEY); if (!raw) { return; }
      var h = JSON.parse(raw);
      var here = (location.pathname.split('/').pop() || ''); if (here && here.indexOf('.') < 0) { here += '.html'; }
      if (!h || h.to !== here) { return; }
      var el = document.getElementById(BOX_FOR_PAGE[here]);
      if (!el) { return; }
      sessionStorage.removeItem(KEY);
      if (!el.value) { el.value = h.text || ''; try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {} }
    } catch (e) {}
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', prefill); } else { prefill(); }
  window.VantageWrongTool = { show: show };
})();
