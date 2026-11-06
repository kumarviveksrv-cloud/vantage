/* Virorah Vantage: wait-time notice for AI tools.
 * Watches #loading-view. While it is visible it shows "usually 60 to 90 seconds" (set per page with data-range and data-est),
 * an elapsed timer and an estimated progress bar, and asks the browser to confirm
 * before the tab is refreshed or closed. The leave-guard is released as soon as the
 * server responds, so the app's own redirects (for example the trial gate) are never blocked.
 *
 * Live progress: watched Worker POSTs ask for ?stream=1. When the Worker streams, this file reads the
 * progress events (stage, words written), shows them in the box, and finally hands the page an ordinary
 * Response holding the normal JSON, so no page code changes. If the Worker does not stream (older
 * deploy, or any other server), the plain JSON response is passed through untouched.
 */
(function () {
  /* Per-page range: <script src="vantage-wait.js" data-range="90 to 120" data-est="120">. Default is 60 to 90. */
  var me = document.currentScript, RANGE = (me && me.getAttribute('data-range')) || '60 to 90';
  var EST = parseInt((me && me.getAttribute('data-est')) || '90', 10) || 90, t0 = 0, timer = 0, box = null, guarding = false, live = false;
  function guard(e) { e.preventDefault(); e.returnValue = ''; return ''; }
  function fmt(s) { return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }

  function injectCss() {
    if (document.getElementById('vw-css')) return;
    var s = document.createElement('style'); s.id = 'vw-css';
    s.textContent =
      '.vw-box{max-width:460px;margin:26px auto 0;padding:16px 20px;border-radius:12px;background:rgba(99,102,241,0.07);border:1px solid rgba(99,102,241,0.24);text-align:left}' +
      '.vw-head{font-family:"DM Sans",sans-serif;font-size:14px;font-weight:600;color:#f4f3ff;margin-bottom:10px}' +
      '.vw-bar{height:4px;border-radius:2px;background:rgba(99,102,241,0.16);overflow:hidden}' +
      '.vw-bar i{display:block;height:100%;width:0;border-radius:2px;background:linear-gradient(90deg,#6366f1,#7c3aed);transition:width 1s linear}' +
      '.vw-line{display:flex;justify-content:space-between;gap:14px;margin-top:10px;font-family:"JetBrains Mono",monospace;font-size:10px;line-height:1.6;letter-spacing:.03em;color:rgba(165,180,252,0.8)}' +
      '.vw-time{flex-shrink:0;color:#c4b5fd}';
    document.head.appendChild(s);
  }
  function tick() {
    if (!box) return;
    var s = Math.floor((Date.now() - t0) / 1000);
    box.querySelector('.vw-time').textContent = fmt(s);
    var pct = s <= EST ? (s / EST) * 92 : 92 + Math.min(6, (s - EST) / 30);
    box.querySelector('.vw-bar i').style.width = pct + '%';
    if (s > EST + 15 && !live) {
      box.querySelector('.vw-head').textContent = 'Taking a little longer than usual';
      box.querySelector('.vw-msg').textContent = 'Your case is still being worked on. Please keep this tab open.';
    }
  }
  function start(view) {
    if (timer) return;
    injectCss();
    var host = view.querySelector('.loading-state') || view;
    box = document.createElement('div'); box.className = 'vw-box'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
    box.innerHTML = '<div class="vw-head">This usually takes ' + RANGE + ' seconds</div><div class="vw-bar"><i></i></div>' +
      '<div class="vw-line"><span class="vw-msg">Please keep this tab open. Refreshing or closing it can lose this run.</span><span class="vw-time">0:00</span></div>';
    host.appendChild(box);
    t0 = Date.now(); timer = setInterval(tick, 1000); tick();
    window.addEventListener('beforeunload', guard); guarding = true;
  }
  function release() { if (guarding) { window.removeEventListener('beforeunload', guard); guarding = false; } }
  function stop() { clearInterval(timer); timer = 0; live = false; release(); if (box) { box.remove(); box = null; } }
  function visible(v) { return v.style.display !== 'none' && getComputedStyle(v).display !== 'none'; }


  /* ---- live progress (Worker streaming) ---- */
  var STAGES = {
    anonymise: 'Step 1 of 2: removing names and identifying details',
    analyse: 'Step 2 of 2: writing your analysis',
    retry: 'Double-checking the structure of the result'
  };
  var stageText = '';
  function showMsg(txt) { if (box) { var m = box.querySelector('.vw-msg'); if (m) m.textContent = txt; } }
  function onStage(name) {
    if (!STAGES[name]) return;
    live = true; stageText = STAGES[name];
    if (box) { box.querySelector('.vw-head').textContent = 'Working on your case. Usually ' + RANGE + ' seconds'; }
    showMsg(stageText);
  }
  function onGen(chars) {
    if (!chars) return;
    live = true;
    var words = Math.max(1, Math.round(chars / 6));
    showMsg((stageText || 'Writing your analysis') + ' (about ' + words + ' words so far)');
  }
  var IDLE_MS = 45000, TOTAL_MS = 240000;
  function lostResponse() {
    return new Response(JSON.stringify({ success: false, error: 'The connection dropped before your result arrived. Please try again.' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }
  /* reads the SSE body; resolves with an ordinary JSON Response built from the final "result" event */
  function readEvents(resp, arm) {
    var reader = resp.body.getReader(), dec = new TextDecoder(), buf = '';
    function handle(block) {
      var ev = 'message', data = '';
      block.split('\n').forEach(function (ln) {
        if (ln.indexOf('event:') === 0) ev = ln.slice(6).trim();
        else if (ln.indexOf('data:') === 0) data += ln.slice(5).trim();
      });
      if (!data) return null;
      var d; try { d = JSON.parse(data); } catch (e) { return null; }
      if (ev === 'stage') onStage(d.stage);
      else if (ev === 'gen') onGen(d.chars);
      else if (ev === 'result') return new Response(d.body, { status: d.status || 200, headers: { 'Content-Type': 'application/json' } });
      return null;
    }
    function pump() {
      return reader.read().then(function (step) {
        if (step.done) return lostResponse();
        arm();
        buf += dec.decode(step.value, { stream: true });
        buf = buf.replace(/\r\n/g, '\n');
        var idx, out = null;
        while ((idx = buf.indexOf('\n\n')) !== -1) {
          var block = buf.slice(0, idx); buf = buf.slice(idx + 2);
          out = handle(block) || out;
        }
        return out || pump();
      });
    }
    return pump();
  }
  function streamed(self, input, init, url) {
    var ctrl = new AbortController(), idleT = 0, totalT = 0;
    function clear() { clearTimeout(idleT); clearTimeout(totalT); }
    function arm() { clearTimeout(idleT); idleT = setTimeout(function () { ctrl.abort(); }, window.__vwIdleMs || IDLE_MS); }
    totalT = setTimeout(function () { ctrl.abort(); }, window.__vwLimitMs || TOTAL_MS);
    arm();
    var u = url + (url.indexOf('?') === -1 ? '?' : '&') + 'stream=1';
    return orig.call(self, u, Object.assign({}, init || {}, { signal: ctrl.signal })).then(function (resp) {
      var ct = (resp.headers && resp.headers.get('Content-Type')) || '';
      if (ct.indexOf('text/event-stream') === -1 || !resp.body || !resp.body.getReader) { clear(); release(); return resp; }
      return readEvents(resp, arm).then(function (r) { clear(); release(); return r; });
    }).catch(function (e) { clear(); release(); throw e; });
  }

  /* once the server answers, the run is safe: stop asking the browser to block navigation */
  var viewEl = null;
  var orig = window.fetch;
  if (typeof window.fetch === 'function') {
    var LIMIT_MS = 130000; /* Worker now caps itself near 115 s worst case; client gives up shortly after so the server error wins */
    window.fetch = function (input, init) {
      var args = arguments, watched = false, t = 0;
      try {
        var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
        var url = (typeof input === 'string') ? input : (input && input.url) || '';
        watched = guarding && method === 'POST' && viewEl && visible(viewEl);
        /* stream progress when the Worker supports it; the stuck-call timeout lives inside streamed() */
        if (watched && typeof input === 'string' && url.indexOf('workers.dev') !== -1 && typeof AbortController !== 'undefined' && !(init && init.signal) && window.ReadableStream) {
          return streamed(this, input, init, url);
        }
        /* fallback: give a stuck AI call a way out instead of an endless spinner */
        if (watched && url.indexOf('workers.dev') !== -1 && typeof AbortController !== 'undefined' && !(init && init.signal)) {
          var ctrl = new AbortController();
          t = setTimeout(function () { ctrl.abort(); }, window.__vwLimitMs || LIMIT_MS);
          args = [input, Object.assign({}, init || {}, { signal: ctrl.signal })];
        }
      } catch (e) {}
      var p = orig.apply(this, args);
      if (t) p.then(function () { clearTimeout(t); }, function () { clearTimeout(t); });
      if (watched) { p.then(release, release); }
      return p;
    };
  }

  function init() {
    viewEl = document.getElementById('loading-view'); if (!viewEl) return;
    var check = function () { if (visible(viewEl)) start(viewEl); else stop(); };
    new MutationObserver(check).observe(viewEl, { attributes: true, attributeFilter: ['style', 'class'] });
    check();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
