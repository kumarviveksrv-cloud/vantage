/* Consent and analytics loader for vantage.virorah.com (public marketing pages only).
 *
 * Google Analytics 4 and Microsoft Clarity are loaded from here and nowhere else, and only on the
 *  public marketing pages listed in PAGES below. The logged-in Platform (tools, dashboard, profile,
 *  billing, sign-in) never loads either, which is what the Privacy Policy promises.
 *  - Visitors whose browser timezone is in Europe (EU, EEA, UK, Switzerland and other
 *    Europe/* zones), in an EU outermost region, or unknown: nothing loads until they
 *    press Accept. A choice is remembered for 12 months and can be changed from the
 *    privacy page (any element with data-consent-open reopens the banner).
 *  - Everyone else: loads as before, no banner.
 *  - ?noclarity=1 on any page switches Clarity off for that browser, in every region.
 * Region is judged from the browser timezone, which is a heuristic, not a geolocation. */
(function () {
  var GA_ID = 'G-5JZR3EMJ5Q';
  var CLARITY_ID = 'zi3kf4nbok';
  var KEY = 'vr_consent';
  var MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

  var PAGES = {
    '/': 'ga+clarity', '/index': 'ga+clarity', '/about': 'ga+clarity', '/pricing': 'ga+clarity',
    '/faq': 'ga+clarity', '/methodology': 'ga+clarity', '/privacy': 'ga+clarity', '/terms': 'ga+clarity',
    '/demo': 'ga'   /* the demo has a text box, so no session recording there */
  };
  function pageMode() {
    var p = location.pathname.replace(/\.html$/, '').replace(/\/+$/, '') || '/';
    return PAGES[p] || '';
  }

  function needsConsent() {
    var tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    if (!tz) return true;
    return /^(Europe|Atlantic)\//.test(tz) ||
      tz === 'Africa/Ceuta' ||
      /^Indian\/(Reunion|Mayotte)$/.test(tz) ||
      /^America\/(Martinique|Guadeloupe|Cayenne|Marigot|St_Barthelemy)$/.test(tz);
  }

  function readChoice() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var v = JSON.parse(raw);
      if (!v || (v.c !== 'granted' && v.c !== 'denied')) return null;
      if (!v.t || Date.now() - new Date(v.t).getTime() > MAX_AGE_MS) return null;
      return v.c;
    } catch (e) { return null; }
  }

  function saveChoice(c) {
    try { localStorage.setItem(KEY, JSON.stringify({ c: c, t: new Date().toISOString() })); } catch (e) {}
  }

  function clarityOff() {
    try {
      if (/[?&]noclarity=1\b/.test(location.search)) localStorage.setItem('vr_no_clarity', '1');
      return !!localStorage.getItem('vr_no_clarity');
    } catch (e) { return true; }
  }

  function loadAnalytics() {
    var mode = pageMode();
    if (!mode) return;
    if (!window.__vrGaLoaded) {
      window.__vrGaLoaded = true;
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      var g = document.createElement('script');
      g.async = true;
      g.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
      document.head.appendChild(g);
      window.gtag('js', new Date());
      window.gtag('config', GA_ID);
    }
    if (mode === 'ga+clarity' && !window.__vrClarityLoaded && !clarityOff()) {
      window.__vrClarityLoaded = true;
      (function (c, l, a, r, i, t, y) {
        c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
        t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
        y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
      })(window, document, 'clarity', 'script', CLARITY_ID);
    }
  }

  function clearCookies() {
    var names = document.cookie.split(';').map(function (s) { return s.split('=')[0].trim(); });
    var host = location.hostname;
    var domains = ['', ';domain=' + host, ';domain=.' + host.replace(/^www\./, '')];
    names.forEach(function (n) {
      if (!/^(_ga|_gid|_gat|_clck|_clsk|CLID|ANONCHK|MR|MUID|SM|SRM_B)/.test(n)) return;
      domains.forEach(function (d) {
        document.cookie = n + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/' + d;
      });
    });
  }

  var bannerEl = null;

  function closeBanner() {
    if (bannerEl && bannerEl.parentNode) bannerEl.parentNode.removeChild(bannerEl);
    bannerEl = null;
  }

  function decide(choice) {
    var before = readChoice();
    saveChoice(choice);
    closeBanner();
    if (choice === 'granted') {
      loadAnalytics();
    } else if (window.__vrGaLoaded || window.__vrClarityLoaded || before === 'granted') {
      clearCookies();
      location.reload();
    }
  }

  function showBanner() {
    if (bannerEl) return;
    var css = document.createElement('style');
    css.textContent =
      '#vr-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;max-width:680px;margin:0 auto;' +
      'background:#0d0b22;color:#f4f3ff;border:1px solid rgba(99,102,241,.45);border-radius:12px;padding:18px 20px;' +
      'box-shadow:0 12px 40px rgba(0,0,0,.55);font:14px/1.55 "DM Sans",system-ui,sans-serif}' +
      '#vr-consent p{margin:0 0 14px;color:rgba(244,243,255,.85)}' +
      '#vr-consent a{color:#a5b4fc}' +
      '#vr-consent .vr-row{display:flex;gap:10px;flex-wrap:wrap}' +
      '#vr-consent button{flex:1 1 140px;font:600 13px/1 "DM Sans",system-ui,sans-serif;padding:12px 16px;border-radius:8px;' +
      'cursor:pointer;color:#f4f3ff;background:rgba(99,102,241,.18);border:1px solid rgba(165,180,252,.55)}' +
      '#vr-consent button:hover,#vr-consent button:focus-visible{background:rgba(99,102,241,.35);outline:2px solid #a5b4fc;outline-offset:2px}';
    var box = document.createElement('div');
    box.id = 'vr-consent';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Analytics and cookies');
    box.innerHTML =
      '<p>This site can use Google Analytics and Microsoft Clarity to see how it is read. They set cookies and collect ' +
      'usage data such as pages viewed, clicks and scrolling. Nothing loads unless you accept. ' +
      '<a href="/privacy.html">Privacy</a></p>' +
      '<div class="vr-row"><button type="button" data-vr="denied">Decline</button>' +
      '<button type="button" data-vr="granted">Accept</button></div>';
    box.appendChild(css);
    box.addEventListener('click', function (e) {
      var v = e.target && e.target.getAttribute && e.target.getAttribute('data-vr');
      if (v) decide(v);
    });
    (document.body || document.documentElement).appendChild(box);
    bannerEl = box;
  }

  function init() {
    if (!window.gtag) window.gtag = function () {};
    window.vrConsent = { open: showBanner };
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('[data-consent-open]') : null;
      if (t) { e.preventDefault(); showBanner(); }
    });
    if (!pageMode()) { if (!window.gtag) window.gtag = function () {}; }
    var choice = readChoice();
    if (!needsConsent()) {
      if (choice !== 'denied') loadAnalytics();
      return;
    }
    if (choice === 'granted') loadAnalytics();
    else if (choice === null && pageMode()) showBanner();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
