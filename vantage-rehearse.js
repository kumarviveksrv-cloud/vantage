/* Virorah Vantage: "Rehearse this" handoff from a tool result into ARIA's Rehearse mode.
 *
 * On a tool page:   VantageRehearse.attach(el, {source, role, scenario, objective})   adds a button to el
 *                   VantageRehearse.go({...})                                           goes straight to ARIA
 * On aria.html:     VantageRehearse.consume()   opens Rehearse setup pre-filled (once), never auto-starts.
 *
 * Uses its own sessionStorage key. It does not touch sr_aria_context.
 * Only generated, summarised text is passed (no raw case narrative, no names, no pay figures).
 * role must match one of ARIA's Rehearse roles exactly, or be '' to leave the choice to the person.
 */
(function () {
  var KEY = 'vantage_rehearse_handoff', MAX_AGE = 2 * 60 * 60 * 1000;

  function clean(t) { return String(t == null ? '' : t).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(); }
  function clip(t, n) { t = clean(t); return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t; }
  function lead(t, max) {
    t = clean(t); if (!t) return '';
    var parts = t.match(/.*?[.!?](?=\s|$)|.+$/g) || [t], out = '';
    for (var i = 0; i < parts.length; i++) {
      var cand = (out ? out + ' ' : '') + parts[i].trim();
      if (out && cand.length > max) break;
      out = cand;
      if (out.length >= 80) break;
    }
    return clip(out, max);
  }

  function go(h) {
    var p = { role: h.role || '', scenario: clip(h.scenario, 600), objective: clip(h.objective, 240), source: h.source || '', ts: Date.now() };
    try { sessionStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {}
    window.location.href = (typeof BASE !== 'undefined' ? BASE : '') + 'aria.html';
  }

  function injectCss() {
    if (document.getElementById('vr-css')) return;
    var s = document.createElement('style'); s.id = 'vr-css';
    s.textContent =
      '.vr-wrap{margin-top:14px}' +
      '.vr-btn{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:9px 16px;border-radius:8px;background:rgba(255,77,109,0.08);border:1px solid rgba(255,77,109,0.35);color:#ffb3c0;font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.05em;cursor:pointer;transition:all .15s}' +
      '.vr-btn:hover{background:rgba(255,77,109,0.16);color:#fff}' +
      '.vr-note{margin-top:6px;font-size:11px;color:rgba(165,180,252,0.6);line-height:1.5}' +
      '@media print{.vr-wrap{display:none !important}}';
    document.head.appendChild(s);
  }

  function attach(parent, opts) {
    if (!parent) return null;
    injectCss();
    var wrap = document.createElement('div'); wrap.className = 'vr-wrap';
    var b = document.createElement('button'); b.type = 'button'; b.className = 'vr-btn';
    b.textContent = 'Rehearse this with ARIA →';
    b.addEventListener('click', function (e) { e.stopPropagation(); go(opts); });
    var n = document.createElement('div'); n.className = 'vr-note'; n.textContent = 'Opens ARIA with this set up for you. You can edit it before you start.';
    wrap.appendChild(b); wrap.appendChild(n); parent.appendChild(wrap);
    return wrap;
  }

  function consume() {
    var raw = null;
    try { raw = sessionStorage.getItem(KEY); if (raw) sessionStorage.removeItem(KEY); } catch (e) { return false; }
    if (!raw) return false;
    var h; try { h = JSON.parse(raw); } catch (e) { return false; }
    if (!h || !h.ts || Date.now() - h.ts > MAX_AGE || typeof window.chooseARIA !== 'function') return false;
    window.chooseARIA('rehearse');
    var s = document.getElementById('rh-scenario'), o = document.getElementById('rh-objective');
    if (s) s.value = h.scenario || '';
    if (o) o.value = h.objective || '';
    if (h.role && typeof window.rhSelectRole === 'function') {
      var btns = document.querySelectorAll('.rh-role');
      for (var i = 0; i < btns.length; i++) {
        if ((btns[i].getAttribute('onclick') || '').indexOf("'" + h.role + "'") > -1) { window.rhSelectRole(btns[i], h.role); break; }
      }
    }
    if (typeof window.rhCheckStart === 'function') window.rhCheckStart();
    if (s && s.parentNode && !document.getElementById('vr-note')) {
      var n = document.createElement('div'); n.id = 'vr-note';
      n.style.cssText = 'margin:0 0 10px;padding:10px 12px;border-radius:8px;background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.3);font-size:12px;line-height:1.5;color:#c4b5fd';
      n.textContent = 'Set up from ' + (h.source || 'your result') + '. Check it, change anything, then start.' + (h.role ? '' : ' Choose who you are speaking with.');
      s.parentNode.insertBefore(n, s);
    }
    return true;
  }

  window.VantageRehearse = { go: go, attach: attach, consume: consume, lead: lead, clip: clip };
})();
