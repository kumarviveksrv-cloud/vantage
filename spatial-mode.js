/* Virorah Vantage: Spatial Mode (Sprint 1)
 * Floating glass panels + webcam hand tracking (MediaPipe Hands, client-side).
 * Gestures (index finger only): hold your fingertip on a panel = grab, move = drag,
 * hold still = drop (or expand/collapse if you didn't move). Mouse/touch works as fallback.
 * Focus: enlarge one panel while the rest dim behind it. Compare: pick two panels, read them side by side.
 * Ask ARIA: share ONE panel's text with ARIA after an explicit consent step (sessionStorage hand-off, aria.html does the rest).
 * Quick compare: opts.presets = [{label, a, b, hint}] (panel ids) become one-click side-by-side comparisons; presets whose panels are missing are skipped.
 * Save + Then vs now: Save keeps the briefed panels on this device only (localStorage, per signed-in email, last 10, cleared on sign-out); Quick compare can then compare a saved panel with the same panel in the current analysis.
 * Hold time: Careful / Normal / Fast (button in the top bar while tracking, remembered on this device); default Normal.
 * Setup check: while tracking, a small card reads the camera image (brightness only, on device) and the hand size and says plainly what to fix: too dark, light behind you, show your palm, too far, too close.
 * Present: walk the brief full screen, one panel per slide, in tray order (keys, buttons, or hold a fingertip on Next/Back; the fingertip is a laser pointer).
 * Leadership Brief: drag panels into the tray to build an ordered briefing; export as PDF (print) or copy as text.
 * Usage: SpatialMode.open(panels, {tool,title,caseType,footer}) where panels = [{id,title,tag,level,html,summary}]
 */
(function () {
  /* Hand-tracking runtime: served from our own origin first (works on locked-down corporate
     networks); the public CDN is only a fallback if the local copy cannot be loaded. */
  var SELF = (document.currentScript && document.currentScript.src) ? document.currentScript.src.replace(/[^\/]*$/, '') : '';
  var MP_LOCAL = SELF + 'vendor/mediapipe-hands/';
  var MP_HANDS = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js';
  var MP_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/';
  var MP_BASE = MP_LOCAL;
  
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
.sm-panel{position:absolute;box-sizing:border-box;width:300px;overflow:hidden;border-radius:16px;padding:16px 18px;background:rgba(13,11,30,.62);backdrop-filter:blur(18px) saturate(1.4);-webkit-backdrop-filter:blur(18px) saturate(1.4);border:1px solid rgba(99,102,241,.28);box-shadow:0 18px 50px rgba(0,0,0,.55),inset 0 1px 0 rgba(165,180,252,.15);cursor:grab;touch-action:none;user-select:none;transition:box-shadow .2s,border-color .2s,width .25s,transform .2s}\
.sm-panel.hover{border-color:rgba(165,180,252,.7)}\
.sm-panel.held{cursor:grabbing;border-color:#a5b4fc;box-shadow:0 28px 70px rgba(99,102,241,.35),inset 0 1px 0 rgba(165,180,252,.3);transform:scale(1.02)}\
.sm-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px}\
.sm-label{font-family:"JetBrains Mono",monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#a5b4fc}\
.sm-tag{font-family:"JetBrains Mono",monospace;font-size:9px;padding:2px 8px;border-radius:4px;border:1px solid rgba(99,102,241,.3);background:rgba(99,102,241,.12);color:#a5b4fc;white-space:nowrap}\
.sm-tag.critical{color:#FF4D6D;background:rgba(255,77,109,.14);border-color:rgba(255,77,109,.3)}\
.sm-tag.high{color:#FFB547;background:rgba(255,181,71,.14);border-color:rgba(255,181,71,.3)}\
.sm-body{font-size:12px;line-height:1.65;color:rgba(244,243,255,.72)}\
.sm-body p{margin:0 0 8px}\
.sm-big{font-family:"Space Grotesk",sans-serif;font-size:26px;font-weight:700;color:#f4f3ff;margin-bottom:6px}\
.sm-clamp{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}\
.sm-panel .sm-clamp{-webkit-line-clamp:unset;display:block}\
.sm-scroll{max-height:clamp(100px,22vh,170px);overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none;-ms-overflow-style:none}\
.sm-scroll::-webkit-scrollbar{display:none}\
.sm-rail{position:absolute;right:5px;top:0;width:11px;border-radius:7px;background:rgba(99,102,241,.14);z-index:2;cursor:ns-resize;touch-action:none}\
.sm-rail.off{display:none}\
.sm-rail i{display:block;width:100%;min-height:30px;border-radius:7px;background:rgba(165,180,252,.5)}\
.sm-rail.live{background:rgba(124,58,237,.32)}\
.sm-rail.live i{background:#c4b5fd;box-shadow:0 0 10px rgba(196,181,253,.75)}\
.sm-panel.briefed .sm-scroll,.sm-panel.briefed .sm-rail{display:none}\
.sm-pt{display:flex;gap:7px;margin-bottom:5px}.sm-pt:before{content:"";width:4px;height:4px;border-radius:50%;background:#6366f1;margin-top:7px;flex-shrink:0}\
#sm-preview{display:none;position:absolute;left:16px;bottom:60px;width:224px;height:168px;border-radius:12px;border:2px solid rgba(255,181,71,.7);z-index:30;background:#000;opacity:.92;pointer-events:none}\
#sm-preview.ok{border-color:rgba(124,58,237,.95)}\
#sm-cursor{--p:0;position:absolute;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:2px solid #a5b4fc;background:conic-gradient(rgba(196,181,253,.85) calc(var(--p)*1turn),rgba(99,102,241,.16) 0);pointer-events:none;z-index:100002;display:none;box-shadow:0 0 18px rgba(99,102,241,.6)}\
#sm-cursor.held-cur{border-color:#fff;background:conic-gradient(#fb923c calc(var(--p)*1turn),rgba(255,255,255,.92) 0);box-shadow:0 0 26px rgba(255,255,255,.75)}\
#sm-cursor2{--p:0;position:absolute;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:2px solid #67e8f9;background:conic-gradient(rgba(103,232,249,.85) calc(var(--p)*1turn),rgba(34,211,238,.14) 0);pointer-events:none;z-index:100002;display:none;box-shadow:0 0 18px rgba(34,211,238,.55)}\
#sm-cursor2.held-cur{border-color:#fff;background:conic-gradient(#fb923c calc(var(--p)*1turn),rgba(255,255,255,.92) 0);box-shadow:0 0 26px rgba(255,255,255,.75)}\
.sm-panel.held::after{content:"HOLDING";position:absolute;right:22px;bottom:9px;z-index:3;font-family:"JetBrains Mono",monospace;font-size:8px;letter-spacing:.12em;font-weight:700;padding:3px 8px;border-radius:10px;background:#c4b5fd;color:#1a1033}\
#sm-hint{position:absolute;bottom:18px;left:50%;transform:translateX(-50%);z-index:30;font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.05em;color:rgba(165,180,252,.7);background:rgba(13,11,30,.7);border:1px solid rgba(99,102,241,.2);border-radius:20px;padding:8px 16px;text-align:center;max-width:92vw}\
#sm-tray{position:absolute;top:76px;right:16px;width:360px;bottom:64px;z-index:5;border-radius:18px;border:1.5px dashed rgba(124,58,237,.4);background:rgba(124,58,237,.05);transition:border-color .2s,background .2s}\
#sm-tray.over{border-color:#c4b5fd;background:rgba(124,58,237,.14)}\
#sm-tray-head{padding:12px 16px 0}\
#sm-tray-title{font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#c4b5fd}\
#sm-tray-sub{font-size:11px;color:rgba(244,243,255,.5);margin-top:3px;line-height:1.4}\
#sm-tray-foot{position:absolute;left:12px;right:12px;bottom:12px;display:flex;flex-direction:column;gap:6px}\
#sm-tray-btns{display:flex;gap:8px}\
#sm-mode{width:100%;padding:8px;font-size:11px}\
#sm-present{width:100%;padding:11px 8px}\
#sm-tray-btns .sm-btn{flex:1;padding:10px 8px}\
.sm-btn[disabled]{opacity:.35;cursor:default}\
.sm-btn.hover{background:rgba(99,102,241,.35);border-color:#a5b4fc}\
#sm-tray-msg{font-family:"JetBrains Mono",monospace;font-size:9px;color:rgba(196,181,253,.8);min-height:12px;letter-spacing:.04em}\
.sm-panel.snap{transition:left .28s ease,top .28s ease,width .25s,box-shadow .2s,border-color .2s}\
.sm-panel.briefed{box-sizing:border-box;width:332px;max-height:50px;padding:11px 14px;overflow:hidden;border-radius:12px;border-color:rgba(196,181,253,.45)}\
.sm-panel.briefed .sm-body{display:none}\
.sm-panel.briefed .sm-head{margin:0}\
.sm-num{display:none;font-family:"Space Grotesk",sans-serif;font-weight:700;font-size:13px;color:#c4b5fd;margin-right:8px}\
.sm-panel.briefed .sm-num{display:inline}\
.sm-acts{display:flex;gap:6px;margin:-2px 0 10px}\
.sm-act{font-family:"JetBrains Mono",monospace;font-size:9px;letter-spacing:.06em;text-transform:uppercase;padding:5px 10px;border-radius:6px;border:1px solid rgba(99,102,241,.35);background:rgba(99,102,241,.08);color:#c7d2fe;cursor:pointer}\
.sm-act:hover,.sm-act.hover{background:rgba(99,102,241,.3);border-color:#a5b4fc}\
.sm-act.on{background:rgba(124,58,237,.38);border-color:#c4b5fd;color:#fff}\
.sm-panel.briefed .sm-acts{display:none}\
.sm-panel.cmp-sel{border-color:#c4b5fd;box-shadow:0 0 0 1px rgba(196,181,253,.5),0 18px 50px rgba(124,58,237,.3)}\
#sm-cmp{position:absolute;inset:0;z-index:100000;background:rgba(5,4,16,.93);backdrop-filter:blur(6px);display:flex;flex-direction:column;padding:16px 24px 24px}\
.sm-cmp-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}\
.sm-cmp-title{font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#c4b5fd}\
.sm-cmp-cols{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}\
.sm-cmp-col{min-height:0;overflow-y:auto;border-radius:16px;padding:20px 24px;background:rgba(13,11,30,.85);border:1px solid rgba(99,102,241,.3)}\
.sm-cmp-col .sm-head{padding-bottom:12px;margin-bottom:14px;border-bottom:1px solid rgba(99,102,241,.18)}\
.sm-cmp-col .sm-body{font-size:14px;line-height:1.75;color:rgba(244,243,255,.86)}\
.sm-cmp-col .sm-body p{margin:0 0 12px}\
.sm-cmp-col .sm-clamp{display:block;-webkit-line-clamp:unset}\
#sm-qc-menu{position:absolute;z-index:99990;width:min(340px,92vw);padding:8px;border-radius:14px;background:#0d0b1e;border:1px solid rgba(196,181,253,.45);box-shadow:0 24px 70px rgba(124,58,237,.35);display:flex;flex-direction:column;gap:6px}\
.sm-qc-item{text-align:left;padding:12px 14px;border-radius:10px;border:1px solid rgba(99,102,241,.3);background:rgba(99,102,241,.08);color:#f4f3ff;cursor:pointer;font-family:"DM Sans",sans-serif;display:flex;flex-direction:column;gap:3px}\
.sm-qc-item b{font-size:13px}\
.sm-qc-item span{font-size:11px;color:rgba(244,243,255,.6)}\
.sm-qc-item:hover,.sm-qc-item.hover{background:rgba(99,102,241,.3);border-color:#a5b4fc}\
.sm-qc-cancel{padding:9px;text-align:center}\
#sm-qc-head{font-family:"JetBrains Mono",monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#c4b5fd;padding:8px 4px 2px}\
.sm-qc-row{display:flex;gap:6px;align-items:stretch}.sm-qc-row .sm-qc-item{flex:1;min-width:0}\
.sm-qc-del{padding:6px 10px;font-size:11px}\
.sm-chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}\
.sm-chip{padding:8px 12px;border-radius:8px;border:1px solid rgba(99,102,241,.35);background:rgba(99,102,241,.08);color:#c7d2fe;font-family:"DM Sans",sans-serif;font-size:12px;cursor:pointer}\
.sm-chip.on{background:rgba(124,58,237,.38);border-color:#c4b5fd;color:#fff}\
.sm-chip:hover,.sm-chip.hover{background:rgba(99,102,241,.3);border-color:#a5b4fc}\
.sm-chip i{font-style:normal;color:#FFB547;margin-left:6px}\
.sm-then-note{font-size:12px;color:rgba(244,243,255,.7);margin:0 0 10px}\
#sm-check{position:absolute;left:16px;bottom:240px;width:288px;z-index:31;border-radius:14px;padding:12px 14px;background:rgba(13,11,30,.88);border:1px solid rgba(99,102,241,.35);box-shadow:0 18px 50px rgba(0,0,0,.5);pointer-events:none}\
#sm-check-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;font-family:"JetBrains Mono",monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#c4b5fd}\
#sm-check-x{pointer-events:auto;cursor:pointer;background:none;border:none;color:rgba(244,243,255,.6);font-size:16px;line-height:1;padding:0 2px}\
.sm-chk-row{display:flex;gap:9px;align-items:flex-start;margin:0 0 7px;font-size:12px;line-height:1.45;color:rgba(244,243,255,.82)}\
.sm-chk-dot{flex-shrink:0;width:9px;height:9px;margin-top:5px;border-radius:50%;background:rgba(244,243,255,.25)}\
.sm-chk-row.ok .sm-chk-dot{background:#34d399;box-shadow:0 0 8px rgba(52,211,153,.7)}\
.sm-chk-row.bad .sm-chk-dot{background:#FF4D6D}\
.sm-chk-row.warn .sm-chk-dot{background:#FFB547}\
.sm-chk-row b{display:block;font-size:11px;color:#a5b4fc;font-weight:600}\
.sm-chk-done{font-size:12px;color:#34d399;margin-top:2px}\
#sm-pres{position:absolute;inset:0;z-index:100000;background:radial-gradient(ellipse at 50% 20%,#14102e 0%,#050410 75%);display:flex;flex-direction:column;padding:18px 28px 22px}\
.sm-pres-top{display:flex;align-items:center;justify-content:space-between;gap:12px}\
.sm-pres-meta{font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#a5b4fc}\
.sm-pres-top-btns{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}\
.sm-pres-stage{flex:1;min-height:0;display:flex;overflow-y:auto;padding:20px 0}\
.sm-pres-slide{width:min(1080px,100%);margin:auto}\
.sm-pres-kick{display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-family:"JetBrains Mono",monospace;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#a5b4fc;margin-bottom:22px}\
.sm-pres-no{font-family:"Space Grotesk",sans-serif;font-weight:700;font-size:28px;color:#c4b5fd}\
.sm-pres-sum{font-family:"Space Grotesk",sans-serif;font-size:clamp(24px,3.4vw,44px);line-height:1.3;font-weight:600;color:#f4f3ff;margin-bottom:22px}\
.sm-pres-slide .sm-body{font-size:clamp(15px,1.7vw,21px);line-height:1.7;color:rgba(244,243,255,.88)}\
.sm-pres-slide .sm-body p{margin:0 0 14px}\
.sm-pres-slide .sm-clamp{display:block;-webkit-line-clamp:unset}\
.sm-pres-nav{display:flex;align-items:center;justify-content:space-between;gap:16px}\
.sm-pres-nb{min-width:170px;padding:18px 24px;font-size:16px}\
.sm-pres-dots{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}\
.sm-pres-dot{width:9px;height:9px;border-radius:50%;background:rgba(99,102,241,.3)}\
.sm-pres-dot.on{background:#c4b5fd;box-shadow:0 0 10px rgba(196,181,253,.7)}\
#sm-root.sm-presenting #sm-cursor{box-shadow:0 0 0 7px rgba(255,181,71,.22),0 0 36px rgba(255,181,71,.85)}\
@media(max-width:700px){.sm-pres-nb{min-width:110px;padding:14px 16px}#sm-pres{padding:14px 16px 18px}}\
#sm-consent{position:absolute;inset:0;z-index:100001;background:rgba(5,4,16,.82);display:flex;align-items:center;justify-content:center;padding:24px}\
.sm-consent-box{width:min(520px,100%);max-height:90vh;overflow-y:auto;border-radius:16px;padding:24px 26px;background:#0d0b1e;border:1px solid rgba(196,181,253,.45);box-shadow:0 30px 90px rgba(124,58,237,.35)}\
.sm-consent-box h3{margin:0 0 10px;font-family:"Space Grotesk",sans-serif;font-size:18px;color:#f4f3ff}\
.sm-consent-box p{margin:0 0 12px;font-size:13px;line-height:1.7;color:rgba(244,243,255,.82)}\
.sm-consent-box details{margin:0 0 16px;font-size:12px;color:rgba(244,243,255,.7)}\
.sm-consent-box summary{cursor:pointer;color:#c4b5fd;margin-bottom:8px}\
.sm-consent-box pre{white-space:pre-wrap;word-break:break-word;margin:0;max-height:200px;overflow-y:auto;padding:12px;border-radius:8px;background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.2);font-family:"DM Sans",sans-serif;font-size:12px;line-height:1.6}\
.sm-consent-btns{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}\
@media(max-width:900px){.sm-cmp-cols{grid-template-columns:minmax(0,1fr);grid-auto-rows:minmax(0,1fr)}}\
@media(max-width:768px){.sm-panel{width:240px}.sm-panel.open{width:88vw}#sm-title{display:none}}';

  var st = { root: null, video: null, hands: null, running: false, stream: null, raf: 0, hp: null, mp: null, ptrs: null,
             panels: [], brief: [], briefMode: 'summary', opts: {}, z: 10, tracking: false, lastSeen: 0, sel: [], cmp: null, cmpEl: null, consentEl: null, presEl: null, presI: 0, presFull: false, ariaOk: true, qcEl: null, presets: [], thenEl: null, then: null, saved: [], chkEl: null, chkT: 0, chkOk: 0, hand: null, lc: null };

  /* ARIA is paid-plan only. Hide Ask ARIA when we positively know the plan is not active:
     get_plan (run on every page load) stores trial_calls_used as a number, so its presence means the
     plan has been fetched. Unknown plan = show it; the Worker still enforces access either way. */
  function ariaAllowed() {
    try {
      var plan = JSON.parse(localStorage.getItem('vantage_plan') || 'null');
      if (!plan) return true;
      if (plan.status === 'active') return true;
      return typeof plan.trial_calls_used !== 'number';
    } catch (e) { return true; }
  }
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
  function layout(all) {
    var list = all.filter(function (p) { return !p.inBrief; });
    var W = window.innerWidth, H = window.innerHeight, n = list.length;
    var free = W < 768 ? W : W - 400, pw = W < 768 ? 240 : 300;
    var cols = W < 768 ? 1 : Math.max(1, Math.min(4, Math.ceil(Math.sqrt(n * 1.6)), Math.floor((free - 20) / (pw + 14))));
    var gx = (free - cols * pw) / (cols + 1);
    var rows = Math.max(1, Math.ceil(n / cols)), pitch = Math.max(150, Math.min(270, (H - 84 - 150) / rows));
    list.forEach(function (p, i) {
      var c = i % cols, r = Math.floor(i / cols);
      var jitter = ((i * 37) % 24) - 12;
      p.el.classList.remove('snap');
      p.el.style.left = (gx + c * (pw + gx)) + 'px';
      p.el.style.top = (84 + r * pitch + jitter) + 'px';
      if (W < 768) { p.el.style.left = ((W - pw) / 2 + jitter) + 'px'; p.el.style.top = (84 + i * 70) + 'px'; }
    });
  }
  function build(panels) {
    panels.forEach(function (d) {
      var el = document.createElement('div');
      el.className = 'sm-panel'; el.setAttribute('data-id', d.id); el.style.zIndex = ++st.z;
      el.innerHTML = '<div class="sm-head"><span class="sm-label"><span class="sm-num"></span>' + esc(d.title) + '</span>' +
        (d.tag ? '<span class="sm-tag ' + esc((d.level || '').toLowerCase()) + '">' + esc(d.tag) + '</span>' : '') +
        '</div><div class="sm-acts"><button class="sm-act" data-act="cmp" data-dwell>Compare</button>' + (st.ariaOk ? '<button class="sm-act" data-act="aria" data-dwell>Ask ARIA</button>' : '') + '</div>' +
        '<div class="sm-scroll"><div class="sm-body">' + (d.html || (d.summary ? '<p>' + esc(d.summary) + '</p>' : '')) + '</div></div>' +
        '<div class="sm-rail" aria-hidden="true"><i></i></div>';
      st.root.appendChild(el);
      var p = { id: d.id, el: el, data: d, inBrief: false, canScroll: false, heldBy: null };
      st.panels.push(p);
      el.querySelector('[data-act="cmp"]').addEventListener('click', function (e) { e.stopPropagation(); toggleSel(p); });
      var ab = el.querySelector('[data-act="aria"]');
      if (ab) ab.addEventListener('click', function (e) { e.stopPropagation(); askAria(p); });
      var sc = el.querySelector('.sm-scroll'), rl = el.querySelector('.sm-rail');
      sc.addEventListener('scroll', function () { updateRail(p); }, { passive: true });
      /* mouse: drag the bar to scroll the card */
      rl.addEventListener('pointerdown', function (e) {
        e.preventDefault(); e.stopPropagation(); updateRail(p); if (!p.canScroll) return;
        railScroll(p, e.clientY); rl.classList.add('live');
        function mv(ev) { railScroll(p, ev.clientY); }
        function up() { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); rl.classList.remove('live'); }
        window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
      });
      /* mouse / touch fallback: drag the card */
      el.addEventListener('pointerdown', function (e) {
        if (e.target.closest && e.target.closest('.sm-act, .sm-rail')) return; /* let the buttons click normally */
        var P = st.mp; if (!P || P.held || p.heldBy) return;
        e.preventDefault(); P.moved = false;
        var r = el.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top;
        grab(p, P);
        function mv(ev) { P.moved = true; P.ptr = { x: ev.clientX, y: ev.clientY }; place(p, ev.clientX - ox, ev.clientY - oy); }
        function up() { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); release(p, P); }
        window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
      });
    });
    layout(st.panels);
  }
  /* P is the pointer doing it: one per hand, plus the mouse. Two hands can hold two different cards at once. */
  function grab(p, P) {
    p.el.style.zIndex = ++st.z; p.el.classList.remove('snap'); p.el.classList.add('held');
    p.heldBy = P; P.held = p; P.moved = false; if (P.kind === 'mouse') P.ptr = null;
  }
  function release(p, P) {
    p.el.classList.remove('held'); p.heldBy = null; if (P.held === p) P.held = null;
    if (P.moved) settle(p, P);
    updateOver();
  }
  function place(p, x, y) {
    var W = window.innerWidth, H = window.innerHeight;
    p.el.style.left = Math.max(0, Math.min(W - 120, x)) + 'px';
    p.el.style.top = Math.max(56, Math.min(H - 80, y)) + 'px';
    updateOver();
  }
  function panelAt(x, y) {
    if (st.cmpEl || st.consentEl || st.presEl || st.qcEl) return null; /* an overlay is up: only its own buttons are live */
    for (var i = st.panels.length - 1, best = null; i >= 0; i--) {
      var q = st.panels[i]; if (q.heldBy) continue; /* a card in someone's fingers is not a target */
      var r = q.el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        if (!best || +q.el.style.zIndex > +best.el.style.zIndex) best = q;
      }
    }
    return best;
  }

  /* ---------- scroll bar on each card: slide a fingertip along it (or wheel / drag with a mouse) ---------- */
  function updateRail(p) {
    var sc = p.el.querySelector('.sm-scroll'), rl = p.el.querySelector('.sm-rail'); if (!sc || !rl) return;
    var over = sc.scrollHeight - sc.clientHeight, h = sc.offsetHeight;
    p.canScroll = !p.inBrief && h > 0 && over > 6;
    rl.classList.toggle('off', !p.canScroll);
    if (!p.canScroll) return;
    var th = Math.max(30, Math.min(h, h * sc.clientHeight / sc.scrollHeight)), t = rl.firstChild;
    rl.style.top = sc.offsetTop + 'px'; rl.style.height = h + 'px';
    t.style.height = th + 'px'; t.style.transform = 'translateY(' + ((sc.scrollTop / over) * (h - th)) + 'px)';
  }
  function refreshRails() { st.panels.forEach(updateRail); }
  function railScroll(p, y) {
    var sc = p.el.querySelector('.sm-scroll'), rl = p.el.querySelector('.sm-rail'), r = rl.getBoundingClientRect();
    var th = rl.firstChild.offsetHeight, span = Math.max(1, r.height - th);
    var t = clamp01(((y - r.top - th / 2) / span - 0.03) / 0.94); /* a little slack at both ends so the top and bottom are easy to reach */
    sc.scrollTop = t * (sc.scrollHeight - sc.clientHeight);
  }
  /* the card whose bar a fingertip is on (only the top card at that point, and only if it has more to read) */
  function railAt(x, y) {
    var p = panelAt(x, y); if (!p || p.inBrief) return null;
    updateRail(p); if (!p.canScroll) return null;
    var r = p.el.querySelector('.sm-rail').getBoundingClientRect();
    return (x >= r.left - 16 && x <= r.right + 10 && y >= r.top - 6 && y <= r.bottom + 6) ? p : null;
  }

  /* ---------- compare ---------- */
  function setActLabel(p, act, text, on) {
    var b = p.el.querySelector('[data-act="' + act + '"]'); if (!b) return; b.textContent = text; b.classList.toggle('on', !!on);
  }

  function refreshSel() {
    st.panels.forEach(function (q) {
      var on = st.sel.indexOf(q) >= 0;
      q.el.classList.toggle('cmp-sel', on); setActLabel(q, 'cmp', on ? 'Selected' : 'Compare', on);
    });
  }
  function toggleSel(p) {
    if (p.inBrief || st.cmpEl || st.presEl) return;
    var i = st.sel.indexOf(p);
    if (i >= 0) { st.sel.splice(i, 1); refreshSel(); trayMsg(''); return; }
    st.sel.push(p); refreshSel();
    if (st.sel.length === 1) { trayMsg('Pick a second panel to compare it with.'); return; }
    openCompare(st.sel[0], st.sel[1]);
  }
  function cmpCol(p) {
    var d = p.data;
    return '<div class="sm-cmp-col"><div class="sm-head"><span class="sm-label">' + esc(d.title) + '</span>' +
      (d.tag ? '<span class="sm-tag ' + esc((d.level || '').toLowerCase()) + '">' + esc(d.tag) + '</span>' : '') +
      '</div><div class="sm-body">' + (d.html || (d.summary ? '<p>' + esc(d.summary) + '</p>' : '')) + '</div></div>';
  }
  function renderCmp() {
    var o = st.cmpEl; if (!o) return;
    o.querySelector('.sm-cmp-cols').innerHTML = cmpCol(st.cmp[0]) + cmpCol(st.cmp[1]);
  }
  function openCompare(a, b) {
    if (st.cmpEl) return;
    st.cmp = [a, b];
    var o = document.createElement('div'); o.id = 'sm-cmp';
    o.innerHTML = '<div class="sm-cmp-bar"><div class="sm-cmp-title">Compare · ' + esc(a.data.title) + '  vs  ' + esc(b.data.title) + '</div>' +
      '<div style="display:flex;gap:8px"><button class="sm-btn" id="sm-cmp-swap" data-dwell>Swap sides</button><button class="sm-btn primary" id="sm-cmp-close" data-dwell>Close</button></div></div>' +
      '<div class="sm-cmp-cols"></div>';
    st.root.appendChild(o); st.cmpEl = o;
    o.querySelector('#sm-cmp-close').addEventListener('click', closeCompare);
    o.querySelector('#sm-cmp-swap').addEventListener('click', function () { st.cmp.reverse(); renderCmp(); });
    renderCmp();
    resetPtrs(0);
  }
  function closeCompare() {
    if (!st.cmpEl) return;
    st.cmpEl.remove(); st.cmpEl = null; st.thenEl = null; st.then = null; st.cmp = null; resetPtrs(900);
    st.sel = []; refreshSel(); trayMsg('');
  }

  /* ---------- ask ARIA about one panel ---------- */
  var ARIA_PANEL_KEY = 'sr_aria_panel', ARIA_PANEL_MAX = 2800;
  function panelPlainText(p) {
    var d = p.data, t = d.html ? htmlToText(d.html) : '';
    if (!t && d.summary) t = String(d.summary);
    t = String(t || '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    return t.length > ARIA_PANEL_MAX ? t.slice(0, ARIA_PANEL_MAX).replace(/\s+\S*$/, '') + '...' : t;
  }
  function askAria(p) {
    if (!st.ariaOk || st.consentEl || st.cmpEl || st.presEl) return;
    var txt = panelPlainText(p);
    if (!txt) { trayMsg('This panel has no text to share.'); return; }
    var o = document.createElement('div'); o.id = 'sm-consent';
    o.innerHTML = '<div class="sm-consent-box" role="dialog" aria-modal="true" aria-label="Discuss this panel with ARIA"><h3>Discuss this panel with ARIA</h3>' +
      '<p>ARIA will see the text of this one panel: <b>' + esc(p.data.title) + '</b>. Names and company names are removed before it reaches the AI. She cannot see the rest of your case, and the panel is not saved to your chat history.</p>' +
      '<details><summary>Show exactly what is shared</summary><pre>' + esc(txt) + '</pre></details>' +
      '<div class="sm-consent-btns"><button class="sm-btn" id="sm-consent-no" data-dwell>Cancel</button><button class="sm-btn primary" id="sm-consent-yes" data-dwell>Share and open ARIA</button></div></div>';
    st.root.appendChild(o); st.consentEl = o;
    resetPtrs(0);
    o.querySelector('#sm-consent-no').addEventListener('click', closeConsent);
    o.addEventListener('click', function (e) { if (e.target === o) closeConsent(); });
    o.querySelector('#sm-consent-yes').addEventListener('click', function () {
      try {
        sessionStorage.setItem(ARIA_PANEL_KEY, JSON.stringify({ tool: (st.opts && st.opts.tool) || 'Vantage', title: p.data.title, text: txt, ts: Date.now() }));
      } catch (e) { closeConsent(); trayMsg('Could not hand the panel to ARIA. Open ARIA and describe it instead.'); return; }
      close();
      window.location.href = 'aria.html';
    });
  }
  function closeConsent() {
    if (!st.consentEl) return;
    st.consentEl.remove(); st.consentEl = null; resetPtrs(900);
  }

  /* ---------- setup check: is the light and distance good enough for hand tracking? ---------- */
  /* Thresholds are starting estimates for a laptop webcam at arm's length; tune after real-camera tests. */
  var CHK = { DARK: 55, BRIGHT: 205, BACKLIGHT_GAP: 35, BACKLIGHT_MIN: 140, PALM_FAR: 0.07, PALM_NEAR: 0.30, HAND_FRESH_MS: 1500 };
  function sampleLight() {
    var v = st.video; if (!v || v.readyState < 2 || !v.videoWidth) return null;
    try {
      if (!st.lc) { st.lc = document.createElement('canvas'); st.lc.width = 64; st.lc.height = 48; }
      var c = st.lc.getContext('2d', { willReadFrequently: true }); c.drawImage(v, 0, 0, 64, 48);
      var d = c.getImageData(0, 0, 64, 48).data, sc = 0, nc = 0, sb = 0, nb = 0;
      for (var y = 0; y < 48; y++) for (var x = 0; x < 64; x++) {
        var i = (y * 64 + x) * 4, l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        if (x >= 16 && x < 48 && y >= 12 && y < 36) { sc += l; nc++; } else { sb += l; nb++; }
      }
      var cm = sc / nc, bm = sb / nb; return { all: (sc + sb) / (nc + nb), center: cm, border: bm };
    } catch (e) { return null; }
  }
  /* pure: light = {all, center, border} or null; hand = {ageMs, palm} or null (palm = wrist to middle knuckle as a share of frame width) */
  function evalCheck(light, hand) {
    var rows = [];
    if (!light) rows.push({ k: 'Light', s: 'pend', t: 'Reading the camera image...' });
    else if (light.all < CHK.DARK) rows.push({ k: 'Light', s: 'bad', t: 'Too dark. Put a lamp in front of you, not behind.' });
    else if (light.all > CHK.BRIGHT) rows.push({ k: 'Light', s: 'warn', t: 'Very bright. Your hand may wash out. Dim the light or angle the screen.' });
    else rows.push({ k: 'Light', s: 'ok', t: 'Good' });
    if (light && light.border - light.center > CHK.BACKLIGHT_GAP && light.border > CHK.BACKLIGHT_MIN) rows.push({ k: 'Backlight', s: 'bad', t: 'Bright light is behind you. Face the window or turn your chair.' });
    else rows.push({ k: 'Backlight', s: light ? 'ok' : 'pend', t: light ? 'None' : '...' });
    var seen = !!(hand && hand.ageMs <= CHK.HAND_FRESH_MS);
    rows.push(seen ? { k: 'Hand', s: 'ok', t: 'Found' } : { k: 'Hand', s: 'pend', t: 'Hold your open palm up to the camera.' });
    if (!seen) rows.push({ k: 'Distance', s: 'pend', t: '...' });
    else if (hand.palm < CHK.PALM_FAR) rows.push({ k: 'Distance', s: 'bad', t: 'Too far. Bring your hand closer to the screen.' });
    else if (hand.palm > CHK.PALM_NEAR) rows.push({ k: 'Distance', s: 'warn', t: 'Too close. Move your hand back a little.' });
    else rows.push({ k: 'Distance', s: 'ok', t: 'Good' });
    return rows;
  }
  function checkTick() {
    var o = st.chkEl; if (!o) return;
    var h = st.hand ? { ageMs: performance.now() - st.hand.t, palm: st.hand.palm } : null;
    renderCheck(evalCheck(sampleLight(), h));
  }
  function renderCheck(rows) {
    var o = st.chkEl; if (!o) return;
    var allOk = rows.every(function (r) { return r.s === 'ok'; });
    o.querySelector('#sm-check-body').innerHTML = rows.map(function (r) {
      return '<div class="sm-chk-row ' + (r.s === 'pend' ? '' : r.s) + '"><span class="sm-chk-dot"></span><div><b>' + esc(r.k) + '</b>' + esc(r.t) + '</div></div>';
    }).join('') + (allOk ? '<div class="sm-chk-done">Looks good. You are ready.</div>' : '');
    if (allOk) { st.chkOk++; if (st.chkOk >= 6) closeCheck(); } else st.chkOk = 0; /* ~3s of all-clear, then it gets out of the way */
  }
  function openCheck() {
    if (st.chkEl || !st.root || !st.tracking) return;
    var o = document.createElement('div'); o.id = 'sm-check'; o.setAttribute('role', 'status'); o.setAttribute('aria-live', 'polite');
    o.innerHTML = '<div id="sm-check-head"><span>Setup check</span><button id="sm-check-x" aria-label="Close setup check">&times;</button></div><div id="sm-check-body"></div>';
    st.root.appendChild(o); st.chkEl = o; st.chkOk = 0;
    o.querySelector('#sm-check-x').addEventListener('click', closeCheck);
    checkTick(); st.chkT = setInterval(checkTick, 500);
  }
  function closeCheck() {
    clearInterval(st.chkT); st.chkT = 0;
    if (st.chkEl) { st.chkEl.remove(); st.chkEl = null; }
  }

  /* ---------- saved briefs (on this device only) ---------- */
  var BRIEFS_PREFIX = 'sr_briefs_', BRIEFS_MAX = 10;
  function briefsKey() { var e = ''; try { e = localStorage.getItem('sr_user_email') || ''; } catch (x) {} return BRIEFS_PREFIX + (e || 'anon'); }
  function loadBriefs() { try { var a = JSON.parse(localStorage.getItem(briefsKey()) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function storeBriefs(a) {
    for (;;) {
      try { localStorage.setItem(briefsKey(), JSON.stringify(a)); return true; }
      catch (e) { if (a.length <= 1) return false; a.pop(); } /* storage full: drop the oldest */
    }
  }
  function matchingSaved() {
    var o = st.opts || {};
    return loadBriefs().filter(function (r) { return r && r.tool === (o.tool || '') && r.title === (o.title || '') && Array.isArray(r.panels); });
  }
  function whenStr(ts) { return new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); }
  function refreshQcBtn() {
    var b = st.root && st.root.querySelector('#sm-qc'); if (!b) return;
    st.saved = matchingSaved();
    var any = st.presets.length || st.saved.length;
    b.style.display = any ? '' : 'none';
    b.onclick = any ? toggleQc : null;
  }
  function saveBrief() {
    if (!st.brief.length) return;
    var o = st.opts || {};
    var rec = { id: Date.now().toString(36), ts: Date.now(), tool: o.tool || '', title: o.title || '', caseType: o.caseType || '',
      panels: st.brief.map(function (p) { var d = p.data; return { id: p.id, title: d.title || '', tag: d.tag || '', level: d.level || '', summary: d.summary || '', html: d.html || '' }; }) };
    var a = loadBriefs(); a.unshift(rec); a = a.slice(0, BRIEFS_MAX);
    trayMsg(storeBriefs(a) ? 'Saved on this device only. Cleared when you sign out.' : 'Could not save: browser storage is full or blocked.');
    refreshQcBtn();
  }
  function deleteBrief(id) {
    var a = loadBriefs().filter(function (r) { return r && r.id !== id; });
    try { localStorage.setItem(briefsKey(), JSON.stringify(a)); } catch (e) {}
    refreshQcBtn();
  }
  function cleanHtml(h) {
    var t = document.createElement('template'); t.innerHTML = String(h || '');
    t.content.querySelectorAll('script,iframe,object,embed,link,meta,style').forEach(function (n) { n.remove(); });
    t.content.querySelectorAll('*').forEach(function (n) {
      Array.prototype.slice.call(n.attributes).forEach(function (a) { if (/^on/i.test(a.name) || /^\s*javascript:/i.test(a.value)) n.removeAttribute(a.name); });
    });
    var d = document.createElement('div'); d.appendChild(t.content); return d.innerHTML;
  }
  function thenCol(kick, d) {
    return '<div class="sm-cmp-col"><div class="sm-head"><span class="sm-label">' + esc(kick) + '  ·  ' + esc(d.title) + '</span>' +
      (d.tag ? '<span class="sm-tag ' + esc((d.level || '').toLowerCase()) + '">' + esc(d.tag) + '</span>' : '') +
      '</div><div class="sm-body">' + (d.html ? cleanHtml(d.html) : (d.summary ? '<p>' + esc(d.summary) + '</p>' : '')) + '</div></div>';
  }
  function sameText(a, b) { return htmlToText(String(a || '')).replace(/\s+/g, ' ').trim() === htmlToText(String(b || '')).replace(/\s+/g, ' ').trim(); }
  function renderThen() {
    var T = st.then, o = st.thenEl; if (!T || !o) return;
    var cur = T.shared[T.i];
    o.querySelector('.sm-chips').innerHTML = T.shared.map(function (x, i) {
      return '<button class="sm-chip' + (i === T.i ? ' on' : '') + '" data-dwell data-i="' + i + '">' + esc(x.old.title) + (x.changed ? '<i title="Changed since the saved brief">changed</i>' : '') + '</button>';
    }).join('');
    o.querySelectorAll('.sm-chip').forEach(function (b) { b.addEventListener('click', function () { T.i = +b.getAttribute('data-i'); renderThen(); }); });
    o.querySelector('.sm-cmp-cols').innerHTML = thenCol('Saved ' + whenStr(T.rec.ts), cur.old) + thenCol('Now', cur.now.data);
  }
  function openThen(rec) {
    if (st.cmpEl) return;
    var shared = [];
    rec.panels.forEach(function (op) { var np = panelById(op.id); if (np) shared.push({ old: op, now: np, changed: !sameText(op.html || op.summary, np.data.html || np.data.summary) }); });
    if (!shared.length) { trayMsg('Nothing in common between that saved brief and this analysis.'); return; }
    var nChanged = shared.filter(function (x) { return x.changed; }).length;
    var first = Math.max(0, shared.findIndex(function (x) { return x.changed; }));
    st.then = { rec: rec, shared: shared, i: first };
    var o = document.createElement('div'); o.id = 'sm-cmp';
    o.innerHTML = '<div class="sm-cmp-bar"><div class="sm-cmp-title">Then vs now · ' + esc(whenStr(rec.ts)) + (rec.caseType ? ' · ' + esc(rec.caseType) : '') + '</div>' +
      '<div style="display:flex;gap:8px"><button class="sm-btn primary" id="sm-cmp-close" data-dwell>Close</button></div></div>' +
      '<p class="sm-then-note">' + nChanged + ' of ' + shared.length + ' shared ' + (shared.length === 1 ? 'panel has' : 'panels have') + ' changed. Pick a panel to compare. Left and Right arrow keys also work.</p>' +
      '<div class="sm-chips"></div><div class="sm-cmp-cols"></div>';
    st.root.appendChild(o); st.cmpEl = o; st.thenEl = o; st.cmp = null;
    o.querySelector('#sm-cmp-close').addEventListener('click', closeCompare);
    resetPtrs(0);
    renderThen();
  }

  /* ---------- quick compare: one-click preset pairs ---------- */
  function panelById(id) { for (var i = 0; i < st.panels.length; i++) if (st.panels[i].id === id) return st.panels[i]; return null; }
  function resolvePresets(list) {
    var out = [];
    (list || []).forEach(function (x) {
      if (!x || !x.label) return;
      var a = panelById(x.a), b = panelById(x.b);
      if (a && b && a !== b) out.push({ label: String(x.label), hint: x.hint ? String(x.hint) : '', a: a, b: b });
    });
    return out;
  }
  function closeQc() {
    if (!st.qcEl) return;
    st.qcEl.remove(); st.qcEl = null; resetPtrs(900);
    var qb = st.root && st.root.querySelector('#sm-qc'); if (qb) qb.classList.remove('on');
  }
  function openQc() {
    st.saved = matchingSaved();
    if (st.qcEl || st.cmpEl || st.consentEl || st.presEl || !(st.presets.length || st.saved.length)) return;
    var m = document.createElement('div'); m.id = 'sm-qc-menu'; m.setAttribute('role', 'menu');
    m.innerHTML = st.presets.map(function (x, i) {
      return '<button class="sm-qc-item" data-dwell data-qc="' + i + '" role="menuitem"><b>' + esc(x.label) + '</b>' + (x.hint ? '<span>' + esc(x.hint) + '</span>' : '') + '</button>';
    }).join('') +
    (st.saved.length ? '<div id="sm-qc-head">Compare with a saved brief</div>' + st.saved.slice(0, 5).map(function (r) {
      return '<div class="sm-qc-row"><button class="sm-qc-item" data-dwell data-then="' + esc(r.id) + '" role="menuitem"><b>' + esc(whenStr(r.ts)) + (r.caseType ? ' · ' + esc(r.caseType) : '') + '</b><span>' + r.panels.length + (r.panels.length === 1 ? ' panel' : ' panels') + ' saved</span></button>' +
        '<button class="sm-btn sm-qc-del" data-dwell data-del="' + esc(r.id) + '">Delete</button></div>';
    }).join('') : '') +
    '<button class="sm-btn sm-qc-cancel" id="sm-qc-cancel" data-dwell>Cancel</button>';
    st.root.appendChild(m); st.qcEl = m;
    var qb = st.root.querySelector('#sm-qc'), r = qb.getBoundingClientRect();
    qb.classList.add('on');
    m.style.top = (r.bottom + 8) + 'px'; m.style.left = Math.max(8, Math.min(window.innerWidth - m.offsetWidth - 8, r.right - m.offsetWidth)) + 'px';
    resetPtrs(0);
    m.querySelector('#sm-qc-cancel').addEventListener('click', closeQc);
    m.querySelectorAll('.sm-qc-item[data-qc]').forEach(function (b) {
      b.addEventListener('click', function () {
        var x = st.presets[+b.getAttribute('data-qc')]; if (!x) return;
        closeQc(); st.sel = []; refreshSel(); openCompare(x.a, x.b);
      });
    });
    m.querySelectorAll('.sm-qc-item[data-then]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-then'), r = st.saved.filter(function (z) { return z.id === id; })[0]; if (!r) return;
        closeQc(); st.sel = []; refreshSel(); openThen(r);
      });
    });
    m.querySelectorAll('.sm-qc-del').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        if (b.getAttribute('data-arm') !== '1') { b.setAttribute('data-arm', '1'); b.textContent = 'Sure?'; setTimeout(function () { if (b.isConnected) { b.removeAttribute('data-arm'); b.textContent = 'Delete'; } }, 3500); return; }
        deleteBrief(b.getAttribute('data-del')); closeQc(); openQc();
      });
    });
  }
  function toggleQc() { if (st.qcEl) closeQc(); else openQc(); }

  /* ---------- present: walk the brief, one panel per slide ---------- */
  function renderPres() {
    var o = st.presEl; if (!o || !st.brief.length) return;
    var n = st.brief.length, i = st.presI, d = st.brief[i].data, full = st.presFull || !d.summary;
    var stage = o.querySelector('.sm-pres-stage');
    stage.innerHTML = '<div class="sm-pres-slide"><div class="sm-pres-kick"><span class="sm-pres-no">' + (i + 1) + '</span><span>' + esc(d.title) + '</span>' +
      (d.tag ? '<span class="sm-tag ' + esc((d.level || '').toLowerCase()) + '">' + esc(d.tag) + '</span>' : '') + '</div>' +
      (d.summary ? '<div class="sm-pres-sum">' + esc(d.summary) + '</div>' : '') +
      (full ? '<div class="sm-body">' + (d.html || '') + '</div>' : '') + '</div>';
    stage.scrollTop = 0;
    var oo = st.opts || {};
    o.querySelector('.sm-pres-meta').textContent = [oo.title || 'Leadership Brief', oo.caseType, (i + 1) + ' / ' + n].filter(Boolean).join('  ·  ');
    o.querySelector('#sm-pres-prev').disabled = i === 0;
    o.querySelector('#sm-pres-next').textContent = i === n - 1 ? 'Finish' : 'Next';
    var dt = o.querySelector('#sm-pres-detail'); dt.textContent = st.presFull ? 'Show summary' : 'Show detail'; dt.style.display = st.brief.some(function (p) { return p.data.summary; }) ? '' : 'none';
    var dots = ''; for (var k = 0; k < n; k++) dots += '<span class="sm-pres-dot' + (k === i ? ' on' : '') + '"></span>';
    o.querySelector('.sm-pres-dots').innerHTML = dots;
  }
  function presStep(delta, viaButton) {
    if (!st.presEl) return;
    var j = st.presI + delta;
    if (j >= st.brief.length) { if (viaButton) closePresent(); return; } /* keys never end the talk by accident */
    if (j < 0) return;
    st.presI = j; renderPres();
  }
  function openPresent() {
    if (!st.brief.length || st.presEl || st.cmpEl || st.consentEl) return;
    st.presI = 0; st.presFull = false;
    var o = document.createElement('div'); o.id = 'sm-pres'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', 'Presenting the brief');
    o.innerHTML = '<div class="sm-pres-top"><div class="sm-pres-meta"></div><div class="sm-pres-top-btns">' +
      '<button class="sm-btn" id="sm-pres-detail" data-dwell></button>' +
      (document.documentElement.requestFullscreen ? '<button class="sm-btn" id="sm-pres-fs">Full screen</button>' : '') +
      '<button class="sm-btn primary" id="sm-pres-exit" data-dwell>End</button></div></div>' +
      '<div class="sm-pres-stage"></div>' +
      '<div class="sm-pres-nav"><button class="sm-btn sm-pres-nb" id="sm-pres-prev" data-dwell>Back</button><div class="sm-pres-dots"></div><button class="sm-btn primary sm-pres-nb" id="sm-pres-next" data-dwell>Next</button></div>';
    st.root.appendChild(o); st.presEl = o; st.root.classList.add('sm-presenting');
    resetPtrs(0);
    o.querySelector('#sm-pres-prev').addEventListener('click', function () { presStep(-1, true); });
    o.querySelector('#sm-pres-next').addEventListener('click', function () { presStep(1, true); });
    o.querySelector('#sm-pres-exit').addEventListener('click', closePresent);
    o.querySelector('#sm-pres-detail').addEventListener('click', function () { st.presFull = !st.presFull; renderPres(); });
    var fs = o.querySelector('#sm-pres-fs');
    if (fs) fs.addEventListener('click', function () {
      try { if (document.fullscreenElement) document.exitFullscreen(); else st.root.requestFullscreen().catch(function () {}); } catch (e) {}
    });
    renderPres();
  }
  function closePresent() {
    if (!st.presEl) return;
    st.presEl.remove(); st.presEl = null; if (st.root) st.root.classList.remove('sm-presenting');
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
    resetPtrs(900);
  }

  /* ---------- leadership brief tray ---------- */
  function trayRect() { var t = st.root && st.root.querySelector('#sm-tray'); return t ? t.getBoundingClientRect() : null; }
  function trayMsg(m) {
    var e = st.root && st.root.querySelector('#sm-tray-msg'); if (!e) return;
    e.textContent = m; clearTimeout(st.msgT); st.msgT = setTimeout(function () { e.textContent = ''; }, 4500);
  }
  function updateTray() {
    if (!st.root) return;
    var n = st.brief.length, sub = st.root.querySelector('#sm-tray-sub');
    sub.textContent = n ? n + (n > 1 ? ' panels' : ' panel') + ' in your brief. Top to bottom is the order of the document.' : 'Drag the panels you want to present into this tray. Their order here is the order of your brief.';
    st.root.querySelectorAll('#sm-tray-btns .sm-btn').forEach(function (b) { b.disabled = !n; });
    var pb = st.root.querySelector('#sm-present'); if (pb) pb.disabled = !n;
    var mb = st.root.querySelector('#sm-mode'); if (mb) mb.textContent = 'Brief style: ' + (st.briefMode === 'full' ? 'Summary + detail' : 'Summary only');
  }
  function arrangeTray() {
    var tr = trayRect(); if (!tr) return;
    var n = st.brief.length, top0 = tr.top + 64, avail = tr.height - 64 - 168;
    var step = Math.max(24, Math.min(57, n > 1 ? (avail - 50) / (n - 1) : 57));
    st.brief.forEach(function (p, i) {
      p.inBrief = true;
      p.el.classList.add('snap', 'briefed'); p.el.classList.remove('open');
      p.el.style.left = (tr.left + 14) + 'px'; p.el.style.top = (top0 + i * step) + 'px';
      var nEl = p.el.querySelector('.sm-num'); if (nEl) nEl.textContent = (i + 1) + '.';
    });
    updateTray();
  }
  /* Where a dropped card counts as "in the tray". Deliberately generous: the target is the tray plus a margin, or any card
     that is mostly on top of it. A card already in the brief must leave the tray itself to be taken out. */
  var DROP_PAD_X = 56, DROP_PAD_Y = 40;
  /* where the person is pointing (fingertip or mouse); falls back to the panel centre */
  function dropPoint(p, P) {
    if (P && P.ptr) return P.ptr;
    var r = p.el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  function inDrop(p, pt) {
    var tr = trayRect(); if (!tr) return false;
    if (p.inBrief) return pt.x >= tr.left && pt.x <= tr.right && pt.y >= tr.top && pt.y <= tr.bottom;
    if (pt.x >= tr.left - DROP_PAD_X && pt.x <= window.innerWidth && pt.y >= tr.top - DROP_PAD_Y && pt.y <= tr.bottom + DROP_PAD_Y) return true;
    var r = p.el.getBoundingClientRect();
    var ox = Math.min(r.right, tr.right) - Math.max(r.left, tr.left), oy = Math.min(r.bottom, tr.bottom) - Math.max(r.top, tr.top);
    return ox > 0 && oy > 0 && ox * oy >= 0.35 * r.width * r.height;
  }
  /* the tray glows while any held card is in the drop area, so you know before you let go */
  function updateOver() {
    var box = st.root && st.root.querySelector('#sm-tray'); if (!box || !st.ptrs) return;
    box.classList.toggle('over', st.ptrs.some(function (P) { return P.held && inDrop(P.held, dropPoint(P.held, P)); }));
  }
  function settle(p, P) {
    var tr = trayRect(); if (!tr) return;
    var pt = dropPoint(p, P), cy = pt.y;
    var was = st.brief.indexOf(p);
    if (inDrop(p, pt)) {
      if (was >= 0) st.brief.splice(was, 1);
      var idx = Math.max(0, Math.min(st.brief.length, Math.round((cy - (tr.top + 64) - 25) / 57)));
      st.brief.splice(idx, 0, p);
      arrangeTray();
    } else if (was >= 0) {
      st.brief.splice(was, 1); p.inBrief = false;
      p.el.classList.remove('briefed', 'snap');
      arrangeTray();
    }
    refreshRails();
  }
  function clearBrief() {
    st.brief.forEach(function (p) { p.inBrief = false; p.el.classList.remove('briefed', 'snap'); });
    st.brief = []; updateTray(); refreshRails();
  }

  var docCss = 'body{font-family:"DM Sans",Arial,sans-serif;color:#1a1a2e;max-width:760px;margin:24px auto;padding:0 28px;line-height:1.6;font-size:13px}header{border-bottom:2px solid #6366f1;padding-bottom:12px;margin-bottom:18px}.brand{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#6366f1;font-weight:700}h1{font-size:22px;margin:4px 0}.meta{font-size:11px;color:#666}section{margin-bottom:16px;page-break-inside:avoid}h2{font-size:14px;margin:0 0 6px;display:flex;gap:8px;align-items:baseline}h2 span{color:#6366f1}h2 em{font-style:normal;font-size:10px;border:1px solid #bbb;border-radius:4px;padding:1px 7px;color:#555;margin-left:auto}.b p{margin:0 0 6px}.sum{font-weight:600;margin:0 0 6px;font-size:13.5px}.sm-big{font-size:22px;font-weight:700;margin-bottom:4px}.sm-pt{display:flex;gap:7px;margin-bottom:3px}.sm-pt:before{content:"\\2022";color:#6366f1}footer{margin-top:22px;padding-top:10px;border-top:1px solid #ddd;font-size:10px;color:#777}';
  function dateStr() { return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function briefDoc() {
    var o = st.opts || {};
    var secs = st.brief.map(function (p, i) {
      var d = p.data, full = st.briefMode === 'full' || !d.summary, body = String(d.html).replace(/ style="[^"]*"/g, '');
      return '<section><h2><span>' + (i + 1) + '.</span> ' + esc(d.title) + (d.tag ? '<em>' + esc(d.tag) + '</em>' : '') + '</h2>' +
        (d.summary ? '<p class="sum">' + esc(d.summary) + '</p>' : '') + (full ? '<div class="b">' + body + '</div>' : '') + '</section>';
    }).join('');
    return '<!doctype html><html><head><meta charset="utf-8"><title>' + esc((o.title || 'Leadership Brief') + (o.caseType ? ' - ' + o.caseType : '')) + '</title><style>' + docCss + '</style></head><body>' +
      '<header><div class="brand">Virorah Vantage</div><h1>' + esc(o.title || 'Leadership Brief') + '</h1><div class="meta">' + esc([o.caseType, dateStr()].filter(Boolean).join('  |  ')) + '</div></header>' +
      secs + '<footer>' + esc(o.footer || '') + '</footer></body></html>';
  }
  function htmlToText(html) {
    /* parsed in an inert document: nothing in the html can load, run or fire handlers while we read its text */
    var t = new DOMParser().parseFromString('<div>' + String(html) + '</div>', 'text/html').body.firstChild;
    t.querySelectorAll('.sm-pt').forEach(function (e) { e.insertAdjacentText('afterbegin', '- '); });
    t.querySelectorAll('p,.sm-pt,.sm-big,.sm-clamp').forEach(function (e) { e.appendChild(document.createTextNode('\n')); });
    return t.textContent.replace(/\n{3,}/g, '\n\n').trim();
  }
  function briefText() {
    var o = st.opts || {};
    var lines = [(o.title || 'Leadership Brief') + (o.caseType ? ' | ' + o.caseType : ''), dateStr(), ''];
    st.brief.forEach(function (p, i) {
      var d = p.data; lines.push((i + 1) + '. ' + String(d.title).toUpperCase() + (d.tag ? ' [' + d.tag + ']' : ''));
      if (d.summary) lines.push(d.summary);
      if (st.briefMode === 'full' || !d.summary) lines.push(htmlToText(d.html));
      lines.push('');
    });
    if (o.footer) lines.push(o.footer);
    return lines.join('\n');
  }
  function printBrief() {
    if (!st.brief.length) return;
    var f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f);
    var d = f.contentWindow.document; d.open(); d.write(briefDoc()); d.close();
    setTimeout(function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {} setTimeout(function () { f.remove(); }, 60000); }, 300);
    trayMsg('Print dialog opening. Choose Save as PDF.');
  }
  function copyBrief() {
    if (!st.brief.length) return;
    var txt = briefText();
    function fallback() {
      var a = document.createElement('textarea'); a.value = txt; a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {} a.remove();
      trayMsg(ok ? 'Copied. Paste into email or chat.' : 'Copy failed. Use Download instead.');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { trayMsg('Copied. Paste into email or chat.'); }, fallback);
    else fallback();
  }
  function btnAt(x, y) {
    if (!st.root) return null;
    var bs = st.root.querySelectorAll('[data-dwell]');
    for (var i = 0; i < bs.length; i++) {
      if (bs[i].disabled) continue;
      var r = bs[i].getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        var top = document.elementFromPoint(x, y);
        if (top && !bs[i].contains(top)) continue; /* covered by another panel or overlay */
        return bs[i];
      }
    }
    return null;
  }
  function elOf(t) { return t && (t.el || t); }

  /* ---------- hand tracking: one pointer per hand (index fingertip), up to two hands at once ---------- */
  /* Hold times for the fingertip. 'careful' is the original (700/800ms); 'normal' and 'fast' trade a little accidental-grab risk for speed.
     Buttons need slightly longer than grabbing a panel, because a wrong button (Exit, Delete) costs more than a wrong grab. */
  var SPEEDS = { careful: { label: 'Careful', grab: 700, drop: 800 }, normal: { label: 'Normal', grab: 500, drop: 550 }, fast: { label: 'Fast', grab: 350, drop: 400 } };
  var SPEED_KEY = 'sr_sm_speed', speedName = 'normal';
  try { var sv = localStorage.getItem(SPEED_KEY); if (sv && SPEEDS[sv]) speedName = sv; } catch (e) {}
  var DWELL_GRAB = SPEEDS[speedName].grab, DWELL_DROP = SPEEDS[speedName].drop, DWELL_BTN = DWELL_GRAB + 150, STILL_PX = 28, ACTIVE = 0.7, HOLD_IDLE = 2500;
  function setSpeed(n) {
    if (!SPEEDS[n]) return; speedName = n; DWELL_GRAB = SPEEDS[n].grab; DWELL_DROP = SPEEDS[n].drop; DWELL_BTN = DWELL_GRAB + 150;
    try { localStorage.setItem(SPEED_KEY, n); } catch (e) {}
    var b = st.root && st.root.querySelector('#sm-speed'); if (b) b.textContent = 'Hold time: ' + SPEEDS[n].label;
  }
  function cycleSpeed() { var order = ['careful', 'normal', 'fast']; setSpeed(order[(order.indexOf(speedName) + 1) % 3]); trayMsg('Hold time: ' + SPEEDS[speedName].label + '. Grab ' + DWELL_GRAB + ' ms, drop ' + DWELL_DROP + ' ms.'); }
  /* two hands is the default; one hand is lighter on a slower computer */
  var HANDS_KEY = 'sr_sm_hands', handsWanted = 2;
  try { var hw = localStorage.getItem(HANDS_KEY); if (hw === '1' || hw === '2') handsWanted = +hw; } catch (e) {}
  function setHands(n) {
    if (n !== 1 && n !== 2) return; handsWanted = n;
    try { localStorage.setItem(HANDS_KEY, String(n)); } catch (e) {}
    var b = st.root && st.root.querySelector('#sm-hands'); if (b) b.textContent = 'Hands: ' + n;
    try { if (st.hands) st.hands.setOptions({ maxNumHands: n }); } catch (e) {}
  }
  function cycleHands() { setHands(handsWanted === 2 ? 1 : 2); trayMsg(handsWanted === 2 ? 'Two hands: each index finger works on its own.' : 'One hand: lighter on a slower computer.'); }
  /* ACTIVE: central share of camera frame mapped to the full screen */

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

  /* A pointer is one hand (or the mouse) with its own hold timer, held card, hover target and smoothing. */
  function Pointer(kind, idx) {
    this.kind = kind; this.idx = idx;
    this.held = null; this.moved = false; this.ptr = null; this.hover = null; this.rail = null; this.cool = 0;
    this.dwell = { panel: null, t0: 0, ax: 0, ay: 0 };
    this.off = { x: 0, y: 0 }; this.sx = 0; this.sy = 0;
    this.fx = new OneEuro(0.5, 10, 1); this.fy = new OneEuro(0.5, 10, 1);
    this.on = false; this.lastSeen = 0; this.raw = null; this.label = null; this.cur = null; this.gt = 0;
  }
  Pointer.prototype.ring = function (v) { if (this.cur) this.cur.style.setProperty('--p', Math.max(0, Math.min(1, v))); };
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function resetDwell(S, panel, px, py, now) { var d = S.dwell; d.panel = panel; d.t0 = now; d.ax = px; d.ay = py; S.ring(0); }
  /* 'hover' is a class on the target; keep it while any pointer is still on that target */
  function setHover(S, tgt) {
    if (S.hover === tgt) return;
    var old = S.hover; S.hover = tgt;
    if (old && !st.ptrs.some(function (Q) { return Q.hover === old; })) elOf(old).classList.remove('hover');
    if (tgt) elOf(tgt).classList.add('hover');
  }
  function setRailLive(S, p) {
    if (S.rail === p) return;
    var old = S.rail; S.rail = p;
    if (old && !st.ptrs.some(function (Q) { return Q.rail === old; })) { var r = old.el.querySelector('.sm-rail'); if (r) r.classList.remove('live'); }
    if (p) { var r2 = p.el.querySelector('.sm-rail'); if (r2) r2.classList.add('live'); }
  }
  /* an overlay opened or closed: every pointer forgets its target, and (optionally) sits out for a moment */
  function resetPtrs(coolMs) {
    if (!st.ptrs) return;
    var now = performance.now();
    st.ptrs.forEach(function (S) { setHover(S, null); setRailLive(S, null); S.dwell.panel = null; S.ring(0); if (coolMs) S.cool = now + coolMs; });
  }

  /* small live camera view with the detected hand points, so the person can see what the model sees */
  function drawPreview(res, dets) {
    var c = st.root && st.root.querySelector('#sm-preview'); if (!c) return;
    var g = c.getContext('2d'), w = c.width, h = c.height;
    g.save(); g.translate(w, 0); g.scale(-1, 1);
    if (res.image) { try { g.drawImage(res.image, 0, 0, w, h); } catch (e) {} } else { g.clearRect(0, 0, w, h); }
    (dets || []).forEach(function (lm, k) {
      for (var i = 0; i < lm.length; i++) {
        g.beginPath(); g.arc(lm[i].x * w, lm[i].y * h, i === 8 ? 6 : (i === 4 ? 5 : 2.5), 0, 6.3);
        g.fillStyle = i === 8 ? (k ? '#67e8f9' : '#ffffff') : (i === 4 ? '#fbbf24' : 'rgba(196,181,253,.85)'); g.fill();
      }
    });
    g.restore();
    c.className = dets && dets.length ? 'ok' : '';
  }

  /* The model gives hands in any order from frame to frame. Keep each hand on the same pointer by matching each
     fingertip to the nearest pointer it was last seen at (handedness only breaks ties). */
  function assignHands(dets, labs, now) {
    var slots = st.hp, out = [null, null], pairs = [], usedD = {};
    for (var i = 0; i < dets.length && i < 2; i++) {
      var tip = dets[i][8], lab = labs[i] && (labs[i].label || (labs[i].classification && labs[i].classification[0] && labs[i].classification[0].label)) || null;
      for (var j = 0; j < slots.length; j++) {
        var S = slots[j], c = (S.raw && now - S.lastSeen < 900) ? Math.hypot(tip.x - S.raw.x, tip.y - S.raw.y) : 0.6;
        if (lab && S.label && lab !== S.label) c += 0.15;
        pairs.push({ i: i, j: j, c: c, lab: lab });
      }
    }
    pairs.sort(function (a, b) { return a.c - b.c; });
    pairs.forEach(function (q) { if (out[q.j] == null && !usedD[q.i]) { out[q.j] = { lm: dets[q.i], label: q.lab }; usedD[q.i] = 1; } });
    return out;
  }

  /* one frame for one hand: returns what it is doing, for the status line */
  function drive(S, lm, now) {
    S.on = true; S.lastSeen = now; S.raw = { x: lm[8].x, y: lm[8].y };
    var W = window.innerWidth, H = window.innerHeight, m = (1 - ACTIVE) / 2;
    var nx = clamp01(((1 - lm[8].x) - m) / ACTIVE), ny = clamp01((lm[8].y - m) / ACTIVE); /* index fingertip, mirrored */
    var px = S.fx.filter(nx, now) * W, py = S.fy.filter(ny, now) * H;
    S.ptr = { x: px, y: py };
    var cur = S.cur; cur.style.display = 'block'; cur.style.left = px + 'px'; cur.style.top = py + 'px';
    cur.classList.toggle('held-cur', !!S.held);
    if (S.cool && now < S.cool) { S.ring(0); return 'live'; }
    var dw = S.dwell;
    if (!S.held) {
      var rp = railAt(px, py);
      if (rp) { setHover(S, null); setRailLive(S, rp); railScroll(rp, py); dw.panel = null; S.ring(0); return 'scroll'; }
      setRailLive(S, null);
      var btn = btnAt(px, py), h = btn ? null : panelAt(px, py), tgt = btn || h;
      setHover(S, tgt);
      if (!tgt) { dw.panel = null; S.ring(0); return 'live'; }
      if (tgt !== dw.panel || Math.hypot(px - dw.ax, py - dw.ay) > STILL_PX) resetDwell(S, tgt, px, py, now);
      var p = (now - dw.t0) / (btn ? DWELL_BTN : DWELL_GRAB); S.ring(p);
      if (p >= 1) {
        if (btn) { dw.panel = null; st.ptrs.forEach(function (Q) { Q.cool = now + 1200; }); S.ring(0); btn.click(); return 'live'; }
        var r = h.el.getBoundingClientRect(); S.off.x = px - r.left; S.off.y = py - r.top;
        grab(h, S); S.sx = px; S.sy = py; S.gt = now; resetDwell(S, h, px, py, now); setHover(S, null);
        return 'drop';
      }
      return btn ? 'press' : 'grab';
    }
    /* Holding a card. There is no drop timer until the card has moved, so a fresh grab can never be lost before you start
       moving it. After it has moved, pausing for the hold time drops it. A grab you never move is let go of after HOLD_IDLE. */
    if (!S.moved && Math.hypot(px - S.sx, py - S.sy) > 40) { S.moved = true; dw.ax = px; dw.ay = py; dw.t0 = now; }
    if (!S.moved) {
      S.ring(0);
      if (now - S.gt > HOLD_IDLE) { release(S.held, S); dw.panel = null; S.cool = now + 900; return 'live'; }
      return 'let';
    }
    place(S.held, px - S.off.x, py - S.off.y);
    if (Math.hypot(px - dw.ax, py - dw.ay) > STILL_PX) { dw.ax = px; dw.ay = py; dw.t0 = now; }
    var q = (now - dw.t0) / DWELL_DROP; S.ring(q);
    if (q >= 1) { var done = S.held; release(done, S); dw.panel = null; S.cool = now + 900; S.ring(0); return 'live'; }
    return 'drop';
  }
  function loseHand(S) {
    if (S.cur) S.cur.style.display = 'none';
    S.fx.reset(); S.fy.reset(); S.ring(0);
    if (S.held) { S.moved = true; release(S.held, S); }
    S.dwell.panel = null; setHover(S, null); setRailLive(S, null); S.on = false; S.raw = null; S.ptr = null;
  }
  var STATUS = { grab: 'hold to grab', press: 'hold to press', drop: 'holding. Pause to drop', let: 'holding. Move the card', scroll: 'sliding to scroll' };

  function onResults(res) {
    if (!st.hp) return;
    var now = performance.now();
    var dets = (res.multiHandLandmarks || []).slice(0, 2), labs = res.multiHandedness || [];
    drawPreview(res, dets);
    try { var vw = st.video && st.video.videoWidth, vh = st.video && st.video.videoHeight, a0 = dets[0]; if (a0 && vw && vh) st.hand = { t: now, palm: Math.hypot((a0[0].x - a0[9].x) * vw, (a0[0].y - a0[9].y) * vh) / vw }; } catch (e) {}
    var slots = assignHands(dets, labs, now), live = 0, act = '';
    for (var j = 0; j < st.hp.length; j++) {
      var S = st.hp[j], d = slots[j];
      if (d) {
        if (d.label) S.label = d.label;
        var a = drive(S, d.lm, now); live++;
        if (!act && a !== 'live') act = a;
      } else if (S.on && now - S.lastSeen > 900) loseHand(S);
    }
    if (live) { st.lastSeen = now; setStatus('Hand tracking: <b>' + (act ? STATUS[act] : (live > 1 ? 'two hands live' : 'live')) + '</b>'); }
    else if (!st.hp.some(function (S) { return S.on; }) && now - st.lastSeen > 900) {
      setStatus('Hand tracking: <b>' + (now - st.lastSeen > 2500 ? 'no hand found. Move closer, add light, or show an open palm to lock on' : 'lost. Show an open palm to lock on') + '</b>');
    }
  }

  function startTracking() {
    setStatus('Starting camera…');
    return navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false })
      .then(function (stream) {
        st.stream = stream; st.video.srcObject = stream;
        return st.video.play();
      })
      .then(function () { setStatus('Loading hand model…'); return loadScript(MP_LOCAL + 'hands.js').then(function () { MP_BASE = MP_LOCAL; }, function () { MP_BASE = MP_CDN; return loadScript(MP_HANDS); }); })
      .then(function () {
        st.hands = new window.Hands({ locateFile: function (f) { return MP_BASE + f; } });
        st.hands.setOptions({ maxNumHands: handsWanted, modelComplexity: 1, minDetectionConfidence: 0.35, minTrackingConfidence: 0.3 });
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
        var pv = document.getElementById('sm-preview'); if (pv) pv.style.display = 'block';
        setStatus('Hand tracking: <b>show an open palm to lock on, then point</b>');
        var cb = document.getElementById('sm-chk-btn'); if (cb) cb.style.display = ''; var sb = document.getElementById('sm-speed'); if (sb) sb.style.display = ''; var hb = document.getElementById('sm-hands'); if (hb) hb.style.display = '';
        openCheck();
        document.getElementById('sm-hint').textContent = 'Hold a fingertip on a card to grab it, move it, pause to drop · slide along the bar on a card\'s right edge to read it · both hands work · Esc to exit';
      })
      .catch(function (e) {
        st.tracking = false;
        var denied = e && (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError');
        setStatus(denied ? 'Camera blocked. <b>Mouse mode</b>' : 'Tracking unavailable. <b>Mouse mode</b>');
        document.getElementById('sm-hint').textContent = 'Drag cards into the Leadership Brief · scroll a card with the wheel or its bar · Compare puts two side by side · Esc to exit';
      });
  }

  /* ---------- open / close ---------- */
  function open(panels, opts) {
    if (st.root) return;
    st.ariaOk = ariaAllowed();
    st.opts = opts || {}; st.brief = []; st.briefMode = 'summary'; st.sel = []; st.cmp = null; st.cmpEl = null; st.consentEl = null; st.presEl = null; st.qcEl = null; st.presets = []; st.thenEl = null; st.then = null; st.saved = []; st.hand = null; st.chkOk = 0;
    injectCss();
    var root = document.createElement('div'); root.id = 'sm-root';
    root.innerHTML = '<video id="sm-video" playsinline muted></video><div id="sm-grid"></div>' +
      '<div id="sm-bar"><div><div id="sm-title">Spatial Mode · ' + esc((opts && opts.tool) || 'Vantage') + '</div><div id="sm-status">Initialising…</div></div>' +
      '<div style="display:flex;gap:8px"><button class="sm-btn" id="sm-hands" data-dwell style="display:none"></button><button class="sm-btn" id="sm-speed" data-dwell style="display:none"></button><button class="sm-btn" id="sm-chk-btn" style="display:none">Setup check</button><button class="sm-btn" id="sm-qc" data-dwell aria-haspopup="menu" style="display:none">Quick compare</button><button class="sm-btn" id="sm-reset" data-dwell>Reset layout</button><button class="sm-btn primary" id="sm-exit" data-dwell>Exit Spatial Mode</button></div></div>' +
      '<div id="sm-tray"><div id="sm-tray-head"><div id="sm-tray-title">Leadership Brief</div><div id="sm-tray-sub"></div></div>' +
      '<div id="sm-tray-foot"><button class="sm-btn" id="sm-mode" data-dwell></button><button class="sm-btn primary" id="sm-present" data-dwell disabled>Present this brief</button><div id="sm-tray-btns"><button class="sm-btn" id="sm-dl" data-dwell disabled>Download</button><button class="sm-btn" id="sm-copy" data-dwell disabled>Copy text</button><button class="sm-btn" id="sm-save" data-dwell disabled title="Keep this brief on this device so you can compare it with a later analysis">Save</button></div><div id="sm-tray-msg"></div></div></div>' +
      '<canvas id="sm-preview" width="224" height="168"></canvas><div id="sm-cursor"></div><div id="sm-cursor2"></div><div id="sm-hint">Starting…</div>';
    document.body.appendChild(root);
    st.root = root; st.video = root.querySelector('#sm-video');
    st.hp = [new Pointer('hand', 0), new Pointer('hand', 1)]; st.mp = new Pointer('mouse', -1); st.ptrs = st.hp.concat([st.mp]);
    st.hp[0].cur = root.querySelector('#sm-cursor'); st.hp[1].cur = root.querySelector('#sm-cursor2');
    st.panels = [];
    build(panels);
    root.querySelector('#sm-exit').onclick = close;
    root.querySelector('#sm-reset').onclick = function () { closeQc(); closeCompare(); st.sel = []; clearBrief(); refreshSel(); layout(st.panels); };
    st.presets = resolvePresets(st.opts.presets);
    refreshQcBtn();
    root.addEventListener('pointerdown', function (e) { if (st.qcEl && !(e.target.closest && e.target.closest('#sm-qc-menu, #sm-qc'))) closeQc(); });
    root.querySelector('#sm-present').onclick = openPresent;
    root.querySelector('#sm-hands').onclick = cycleHands; root.querySelector('#sm-hands').textContent = 'Hands: ' + handsWanted;
    root.querySelector('#sm-speed').onclick = cycleSpeed; root.querySelector('#sm-speed').textContent = 'Hold time: ' + SPEEDS[speedName].label;
    root.querySelector('#sm-chk-btn').onclick = function () { if (st.chkEl) closeCheck(); else openCheck(); };
    root.querySelector('#sm-save').onclick = saveBrief;
    root.querySelector('#sm-dl').onclick = printBrief;
    root.querySelector('#sm-copy').onclick = copyBrief;
    root.querySelector('#sm-mode').onclick = function () { st.briefMode = st.briefMode === 'full' ? 'summary' : 'full'; updateTray(); trayMsg(st.briefMode === 'full' ? 'Brief will include full detail.' : 'Brief will show one summary line per panel.'); };
    updateTray();
    refreshRails(); setTimeout(refreshRails, 400);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) startTracking();
    else { setStatus('No camera API. <b>Mouse mode</b>'); document.getElementById('sm-hint').textContent = 'Drag cards into the Leadership Brief · scroll a card with the wheel or its bar · Compare puts two side by side · Esc to exit'; }
  }
  function onKey(e) {
    if (st.presEl && !st.consentEl && !st.cmpEl) {
      var k = e.key;
      var onBtn = e.target && e.target.tagName === 'BUTTON'; /* Space/Enter on a focused button already presses it */
      if (k === 'ArrowRight' || k === 'PageDown' || ((k === ' ' || k === 'Enter') && !onBtn)) { e.preventDefault(); presStep(1, false); return; }
      if (k === 'ArrowLeft' || k === 'PageUp' || k === 'Backspace') { e.preventDefault(); presStep(-1, false); return; }
      if (k === 'Home') { e.preventDefault(); st.presI = 0; renderPres(); return; }
      if (k === 'End') { e.preventDefault(); st.presI = st.brief.length - 1; renderPres(); return; }
      if (k === 'Escape') { closePresent(); return; }
      return;
    }
    if (st.thenEl && st.then && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      var n = st.then.shared.length; st.then.i = (st.then.i + (e.key === 'ArrowRight' ? 1 : n - 1)) % n; renderThen(); e.preventDefault(); return;
    }
    if (e.key !== 'Escape') return;
    if (st.consentEl) closeConsent(); else if (st.cmpEl) closeCompare(); else if (st.qcEl) closeQc(); else close();
  }
  function onResize() { layout(st.panels); arrangeTray(); refreshRails(); }
  function close() {
    st.running = false; cancelAnimationFrame(st.raf); closeCheck();
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
    if (st.stream) st.stream.getTracks().forEach(function (t) { t.stop(); });
    try { if (st.hands) st.hands.close(); } catch (e) {}
    st.hands = null; st.stream = null;
    document.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize);
    if (st.root) st.root.remove();
    clearTimeout(st.msgT);
    st.root = null; st.hp = null; st.mp = null; st.ptrs = null; st.panels = []; st.brief = []; st.sel = []; st.cmp = null; st.cmpEl = null; st.consentEl = null; st.presEl = null; st.qcEl = null; st.presets = []; st.thenEl = null; st.then = null; st.saved = [];
  }

  window.SpatialMode = { open: open, _setSpeed: setSpeed, _setHands: setHands, _hands: function () { return handsWanted; }, _ptrs: function () { return st.ptrs; }, _railAt: function (x, y) { return railAt(x, y); }, _speed: function () { return { name: speedName, grab: DWELL_GRAB, drop: DWELL_DROP, btn: DWELL_BTN }; }, _evalCheck: evalCheck, _renderCheck: function (rows) { if (!st.chkEl) { st.tracking = true; openCheck(); } renderCheck(rows); }, _chk: CHK, _saveBrief: saveBrief, _presets: function () { return st.presets.map(function (x) { return x.label; }); }, _present: openPresent, _presStep: presStep, close: close, esc: esc, _feed: onResults, _briefText: briefText, _briefDoc: briefDoc };
})();
