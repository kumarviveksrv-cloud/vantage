/* Virorah Vantage: wait-time notice for AI tools.
 * Watches #loading-view. While it is visible it shows "usually 60 to 90 seconds",
 * an elapsed timer and an estimated progress bar, and asks the browser to confirm
 * before the tab is refreshed or closed. The leave-guard is released as soon as the
 * server responds, so the app's own redirects (for example the trial gate) are never blocked.
 */
(function () {
  var EST = 90, t0 = 0, timer = 0, box = null, guarding = false;
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
    if (s > EST + 15) {
      box.querySelector('.vw-head').textContent = 'Taking a little longer than usual';
      box.querySelector('.vw-msg').textContent = 'Your case is still being worked on. Please keep this tab open.';
    }
  }
  function start(view) {
    if (timer) return;
    injectCss();
    var host = view.querySelector('.loading-state') || view;
    box = document.createElement('div'); box.className = 'vw-box'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
    box.innerHTML = '<div class="vw-head">This usually takes 60 to 90 seconds</div><div class="vw-bar"><i></i></div>' +
      '<div class="vw-line"><span class="vw-msg">Please keep this tab open. Refreshing or closing it can lose this run.</span><span class="vw-time">0:00</span></div>';
    host.appendChild(box);
    t0 = Date.now(); timer = setInterval(tick, 1000); tick();
    window.addEventListener('beforeunload', guard); guarding = true;
  }
  function release() { if (guarding) { window.removeEventListener('beforeunload', guard); guarding = false; } }
  function stop() { clearInterval(timer); timer = 0; release(); if (box) { box.remove(); box = null; } }
  function visible(v) { return v.style.display !== 'none' && getComputedStyle(v).display !== 'none'; }

  /* once the server answers, the run is safe: stop asking the browser to block navigation */
  var viewEl = null;
  if (typeof window.fetch === 'function') {
    var orig = window.fetch;
    window.fetch = function (input, init) {
      var p = orig.apply(this, arguments);
      try {
        var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
        if (guarding && method === 'POST' && viewEl && visible(viewEl)) { p.then(release, release); }
      } catch (e) {}
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
