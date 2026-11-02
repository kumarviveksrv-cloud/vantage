/* Virorah Vantage: Spatial Mode (Sprint 1)
 * Floating glass panels + webcam hand tracking (MediaPipe Hands, client-side).
 * Gestures (index finger only): hold your fingertip on a panel = grab, move = drag,
 * hold still = drop (or expand/collapse if you didn't move). Mouse/touch works as fallback.
 * Usage: SpatialMode.open(panels) where panels = [{id,title,tag,level,html}]
 */
(function () {
  var MP_HANDS = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js';
  var MP_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/';
  
  var css = '\
#sm-root{position:fixed;inset:0;z-index:2000;background:radial-gradient(ellipse at 50% 30%,#0d0b1e 0%,#050410 70%);overflow:hidden;font-family:"DM Sans",sans-serif;color:#f4f3ff;animation:fadeIn .3s ease}\
#sm-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scaleX(-1);opacity:.12;filter:grayscale(1) contrast(1.1)}\
#sm-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(99,102,241,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.06) 1px,transparent 1px);background-size:56px 56px;pointer-events:none}\
#sm-bar{position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 20px;z-index:30;background:linear-gradient(180deg,rgba(5,4,16,.9),transparent)}\
#sm-title{font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#a5b4fc}\
#sm-status{font-family:"JetBrains Mono",monospace;font-size:10px;color:rgba(244,243,255,.55);letter-spacing:.04em}\
#sm-status b{color:#c4b5fd;font-weight:600}\
.sm-btn{padding:8px 16px;border-radius:8px;border:1px solid rgba(99,102,241,.4);background:rgba(99,102,241,.1);color:#c7d2fe;font-family:"DM Sans",sans-serif;font-size:12px;cursor:pointer}\
.sm-btn:hover{background:rgba(99,102,241,.22)}\
.sm-btn.primary{background:linear-gradient(135deg,#6366f1,#7c3aed);color:#fff;border:none;font-weight:700}\
.sm-panel{position:absolute;width:300px;max-height:60vh;overflow:hidden;border-radius:16px;padding:16px 18px;background:rgba(13,11,30,.62);backdrop-filter:blur(18px) saturate(1.4);-webkit-backdrop-filter:blur(18px) saturate(1.4);border:1px solid rgba(99,102,241,.28);box-shadow:0 18px 50px rgba(0,0,0,.55),inset 0 1px 0 rgba(165,180,252,.15);cursor:grab;touch-action:none;user-select:none;transition:box-shadow .2s,border-color .2s,width .25s,transform .2s}\
.sm-panel.hover{border-color:rgba(165,180,252,.7)}\
.sm-panel.held{cursor:grabbing;border-color:#a5b4fc;box-shadow:0 28px 70px rgba(99,102,241,.35),inset 0 1px 0 rgba(165,180,252,.3);transform:scale(1.02)}\
.sm-panel.open{width:440px;max-height:78vh;overflow-y:auto}\
.sm-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px}\
.sm-label{font-family:"JetBrains Mono",monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#a5b4fc}\
.sm-tag{font-family:"JetBrains Mono",monospace;font-size:9px;padding:2px 8px;border-radius:4px;border:1px solid rgba(99,102,241,.3);background:rgba(99,102,241,.12);color:#a5b4fc;white-space:nowrap}\
.sm-tag.critical{color:#FF4D6D;background:rgba(255,77,109,.14);border-color:rgba(255,77,109,.3)}\
.sm-tag.high{color:#FFB547;background:rgba(255,181,71,.14);border-color:rgba(255,181,71,.3)}\
.sm-body{font-size:12px;line-height:1.65;color:rgba(244,243,255,.72)}\
.sm-body p{margin:0 0 8px}\
.sm-big{font-family:"Space Grotesk",sans-serif;font-size:26px;font-weight:700;color:#f4f3ff;margin-bottom:6px}\
.sm-clamp{display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;overflow:hidden}\
.sm-panel.open .sm-clamp{-webkit-line-clamp:unset;display:block}\
.sm-pt{display:flex;gap:7px;margin-bottom:5px}.sm-pt:before{content:"";width:4px;height:4px;border-radius:50%;background:#6366f1;margin-top:7px;flex-shrink:0}\
#sm-cursor{--p:0;position:absolute;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:2px solid #a5b4fc;background:conic-gradient(rgba(196,181,253,.85) calc(var(--p)*1turn),rgba(99,102,241,.16) 0);pointer-events:none;z-index:40;display:none;box-shadow:0 0 18px rgba(99,102,241,.6)}\
#sm-cursor.held-cur{border-color:#fff;box-shadow:0 0 24px rgba(196,181,253,.9)}\
#sm-hint{position:absolute;bottom:18px;left:50%;transform:translateX(-50%);z-index:30;font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.05em;color:rgba(165,180,252,.7);background:rgba(13,11,30,.7);border:1px solid rgba(99,102,241,.2);border-radius:20px;padding:8px 16px;text-align:center;max-width:92vw}\
@media(max-width:768px){.sm-panel{width:240px}.sm-panel.open{width:88vw}#sm-title{display:none}}';

  var st = { root: null, video: null, cursor: null, hands: null, running: false, stream: null, raf: 0,
             panels: [], z: 10, held: null, hover: null, pinching: false, tracking: false, moved: false, lastSeen: 0 };

  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function injectCss() {
    if (document.getElementById('sm-css')) return;
    var s = document.createElement('style'); s.id = 'sm-css'; s.textContent = css; document.head.appendChild(s);
  }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      if (document.querySelector('script[data-sm="' + src + '"]')) return res();
      var s = document.createElement('script'); s.src = src; s.crossOrigin = 'anonymous'; s.setAttribute('data-sm', src);
      s.onload = res; s.onerror = function () { rej(new Error('load failed')); }; document.head.appendChild(s);
    });
  }
  function setStatus(html) { var el = document.getElementById('sm-status'); if (el) el.innerHTML = html; }

  /* ---------- panels ---------- */
  function layout(list) {
    var W = window.innerWidth, H = window.innerHeight, n = list.length;
    var cols = W < 768 ? 1 : Math.min(4, Math.ceil(Math.sqrt(n * 1.6)));
    var pw = W < 768 ? 240 : 300, gx = (W - cols * pw) / (cols + 1);
    list.forEach(function (p, i) {
      var c = i % cols, r = Math.floor(i / cols);
      var jitter = ((i * 37) % 24) - 12;
      p.el.style.left = (gx + c * (pw + gx)) + 'px';
      p.el.style.top = (84 + r * 230 + jitter) + 'px';
      if (W < 768) { p.el.style.left = ((W - pw) / 2 + jitter) + 'px'; p.el.style.top = (84 + i * 70) + 'px'; }
    });
  }
  function build(panels) {
    panels.forEach(function (d) {
      var el = document.createElement('div');
      el.className = 'sm-panel'; el.setAttribute('data-id', d.id); el.style.zIndex = ++st.z;
      el.innerHTML = '<div class="sm-head"><span class="sm-label">' + esc(d.title) + '</span>' +
        (d.tag ? '<span class="sm-tag ' + esc((d.level || '').toLowerCase()) + '">' + esc(d.tag) + '</span>' : '') +
        '</div><div class="sm-body">' + d.html + '</div>';
      st.root.appendChild(el);
      var p = { id: d.id, el: el };
      st.panels.push(p);
      /* mouse / touch fallback */
      el.addEventListener('pointerdown', function (e) {
        e.preventDefault(); st.moved = false;
        var r = el.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top;
        grab(p);
        function mv(ev) { st.moved = true; place(p, ev.clientX - ox, ev.clientY - oy); }
        function up() { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); release(p); }
        window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
      });
    });
    layout(st.panels);
  }
  function grab(p) { p.el.style.zIndex = ++st.z; p.el.classList.add('held'); st.held = p; st.moved = false; }
  function release(p) {
    p.el.classList.remove('held'); st.held = null;
    if (!st.moved) { p.el.classList.toggle('open'); } /* quick pinch / click = expand */
  }
  function place(p, x, y) {
    var W = window.innerWidth, H = window.innerHeight;
    p.el.style.left = Math.max(0, Math.min(W - 120, x)) + 'px';
    p.el.style.top = Math.max(56, Math.min(H - 80, y)) + 'px';
  }
  function panelAt(x, y) {
    for (var i = st.panels.length - 1, best = null; i >= 0; i--) {
      var r = st.panels[i].el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        if (!best || +st.panels[i].el.style.zIndex > +best.el.style.zIndex) best = st.panels[i];
      }
    }
    return best;
  }

  /* ---------- hand tracking (index finger only) ---------- */
  var DWELL_GRAB = 700, DWELL_DROP = 800, STILL_PX = 28, ACTIVE = 0.7; /* ACTIVE: central share of camera frame mapped to the full screen */
  var grabOff = { x: 0, y: 0 };
  var dwell = { panel: null, t0: 0, ax: 0, ay: 0 };
  var fl = { x: null, y: null };

  /* One Euro filter: heavy smoothing when slow (kills jitter), light when fast (keeps it responsive) */
  function LP() { this.y = null; }
  LP.prototype.f = function (v, a) { this.y = this.y == null ? v : a * v + (1 - a) * this.y; return this.y; };
  function OneEuro(minCut, beta, dCut) { this.minCut = minCut; this.beta = beta; this.dCut = dCut; this.x = new LP(); this.dx = new LP(); this.t = null; this.px = null; }
  OneEuro.prototype.alpha = function (cut, dt) { var tau = 1 / (2 * Math.PI * cut); return 1 / (1 + tau / dt); };
  OneEuro.prototype.filter = function (v, t) {
    if (this.t == null) { this.t = t; this.px = v; return this.x.f(v, 1); }
    var dt = Math.max((t - this.t) / 1000, 1e-3); this.t = t;
    var d = (v - this.px) / dt; this.px = v;
    var ed = this.dx.f(d, this.alpha(this.dCut, dt));
    return this.x.f(v, this.alpha(this.minCut + this.beta * Math.abs(ed), dt));
  };
  OneEuro.prototype.reset = function () { this.t = null; this.x.y = null; this.dx.y = null; };
  var fx = new OneEuro(0.5, 10, 1), fy = new OneEuro(0.5, 10, 1);

  function setRing(p) { if (st.cursor) st.cursor.style.setProperty('--p', Math.max(0, Math.min(1, p))); }
  function resetDwell(panel, px, py, now) { dwell.panel = panel; dwell.t0 = now; dwell.ax = px; dwell.ay = py; setRing(0); }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

  function onResults(res) {
    var lm = res.multiHandLandmarks && res.multiHandLandmarks[0];
    var cur = st.cursor, now = performance.now();
    if (!cur) return;
    if (!lm) {
      if (now - st.lastSeen > 500) {
        cur.style.display = 'none'; fx.reset(); fy.reset(); setRing(0);
        if (st.held) { st.moved = true; release(st.held); }
        dwell.panel = null;
        setStatus('Hand tracking: <b>point with your index finger</b>');
      }
      return;
    }
    st.lastSeen = now;
    var W = window.innerWidth, H = window.innerHeight;
    var m = (1 - ACTIVE) / 2;
    var nx = clamp01(((1 - lm[8].x) - m) / ACTIVE), ny = clamp01((lm[8].y - m) / ACTIVE); /* index fingertip, mirrored */
    var px = fx.filter(nx, now) * W, py = fy.filter(ny, now) * H;
    cur.style.display = 'block'; cur.style.left = px + 'px'; cur.style.top = py + 'px';
    cur.classList.toggle('held-cur', !!st.held);

    if (st.cool && now < st.cool) { setRing(0); return; }

    if (!st.held) {
      var h = panelAt(px, py);
      if (h !== st.hover) { if (st.hover) st.hover.el.classList.remove('hover'); if (h) h.el.classList.add('hover'); st.hover = h; }
      if (!h) { dwell.panel = null; setRing(0); setStatus('Hand tracking: <b>live</b>'); return; }
      if (h !== dwell.panel || Math.hypot(px - dwell.ax, py - dwell.ay) > STILL_PX) resetDwell(h, px, py, now);
      var p = (now - dwell.t0) / DWELL_GRAB; setRing(p);
      setStatus('Hand tracking: <b>hold to grab</b>');
      if (p >= 1) {
        var r = h.el.getBoundingClientRect(); grabOff.x = px - r.left; grabOff.y = py - r.top;
        grab(h); st.startX = px; st.startY = py; resetDwell(h, px, py, now);
      }
    } else {
      if (!st.moved && Math.hypot(px - st.startX, py - st.startY) > 40) st.moved = true;
      if (st.moved) place(st.held, px - grabOff.x, py - grabOff.y);
      if (Math.hypot(px - dwell.ax, py - dwell.ay) > STILL_PX) { dwell.ax = px; dwell.ay = py; dwell.t0 = now; }
      var q = (now - dwell.t0) / DWELL_DROP; setRing(q);
      setStatus('Hand tracking: <b>' + (st.moved ? 'hold still to drop' : 'hold still to expand') + '</b>');
      if (q >= 1) { var done = st.held; release(done); dwell.panel = null; st.cool = now + 900; setRing(0); }
    }
  }

  function startTracking() {
    setStatus('Starting camera…');
    return navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false })
      .then(function (stream) {
        st.stream = stream; st.video.srcObject = stream;
        return st.video.play();
      })
      .then(function () { setStatus('Loading hand model…'); return loadScript(MP_HANDS); })
      .then(function () {
        st.hands = new window.Hands({ locateFile: function (f) { return MP_BASE + f; } });
        st.hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.5 });
        st.hands.onResults(onResults);
        st.running = true; st.tracking = true;
        var busy = false;
        (function loop() {
          if (!st.running) return;
          if (!busy && st.video.readyState >= 2) {
            busy = true;
            st.hands.send({ image: st.video }).catch(function () {}).then(function () { busy = false; });
          }
          st.raf = requestAnimationFrame(loop);
        })();
        setStatus('Hand tracking: <b>point with your index finger</b>');
        document.getElementById('sm-hint').textContent = 'Point at a panel and hold to grab · move to drag · hold still to drop (or expand) · Esc to exit';
      })
      .catch(function (e) {
        st.tracking = false;
        var denied = e && (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError');
        setStatus(denied ? 'Camera blocked. <b>Mouse mode</b>' : 'Tracking unavailable. <b>Mouse mode</b>');
        document.getElementById('sm-hint').textContent = 'Drag panels with your mouse · click to expand · Esc to exit';
      });
  }

  /* ---------- open / close ---------- */
  function open(panels) {
    if (st.root) return;
    injectCss();
    var root = document.createElement('div'); root.id = 'sm-root';
    root.innerHTML = '<video id="sm-video" playsinline muted></video><div id="sm-grid"></div>' +
      '<div id="sm-bar"><div><div id="sm-title">Spatial Mode · Employee Case Advisor</div><div id="sm-status">Initialising…</div></div>' +
      '<div style="display:flex;gap:8px"><button class="sm-btn" id="sm-reset">Reset layout</button><button class="sm-btn primary" id="sm-exit">Exit Spatial Mode</button></div></div>' +
      '<div id="sm-cursor"></div><div id="sm-hint">Starting…</div>';
    document.body.appendChild(root);
    st.root = root; st.video = root.querySelector('#sm-video'); st.cursor = root.querySelector('#sm-cursor');
    st.panels = []; st.held = null; st.hover = null; st.cool = 0; dwell.panel = null; fx.reset(); fy.reset();
    build(panels);
    root.querySelector('#sm-exit').onclick = close;
    root.querySelector('#sm-reset').onclick = function () { st.panels.forEach(function (p) { p.el.classList.remove('open'); }); layout(st.panels); };
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) startTracking();
    else { setStatus('No camera API. <b>Mouse mode</b>'); document.getElementById('sm-hint').textContent = 'Drag panels with your mouse · click to expand · Esc to exit'; }
  }
  function onKey(e) { if (e.key === 'Escape') close(); }
  function onResize() { layout(st.panels); }
  function close() {
    st.running = false; cancelAnimationFrame(st.raf);
    if (st.stream) st.stream.getTracks().forEach(function (t) { t.stop(); });
    try { if (st.hands) st.hands.close(); } catch (e) {}
    st.hands = null; st.stream = null;
    document.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize);
    if (st.root) st.root.remove();
    st.root = null; st.panels = [];
  }

  window.SpatialMode = { open: open, close: close, esc: esc, _feed: onResults };
})();
