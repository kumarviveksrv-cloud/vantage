// Virorah Vantage — Shared Sidebar Enhancements + PWA

(function() {

  // ── VIRORAH VANTAGE LOGO MARK ────────────────────────────────────────────────
  (function injectLogoMark() {
    var logoEl = document.querySelector('.logo, .sb .logo, .sb > a.logo');
    if (!logoEl) return;

    if (!document.getElementById('vantage-logo-css')) {
      var s = document.createElement('style');
      s.id = 'vantage-logo-css';
      s.textContent = [
        '.logo{flex-direction:row !important;align-items:center !important;',
        'gap:0 !important;padding:4px 0 !important;margin-bottom:16px !important;cursor:pointer;background:transparent !important;}',
        '.vl-logo{width:190px;height:auto;display:block;flex-shrink:0}'
      ].join('');
      document.head.appendChild(s);
    }

    var img = document.createElement('img');
    img.src = 'virorah-vantage-logo.png';
    img.alt = 'Virorah Vantage';
    img.className = 'vl-logo';
    img.onerror = function() { this.style.display = 'none'; };

    while (logoEl.firstChild) logoEl.removeChild(logoEl.firstChild);
    logoEl.appendChild(img);

    // Override the hardcoded index.html destination on every page.
    // Inside the app, the logo should return you to your dashboard,
    // not the public landing page. Only route to index.html when signed out.
    logoEl.onclick = function() {
      var signedIn = false;
      try { signedIn = localStorage.getItem('vantage_clerk_signed_in') === '1'; } catch(e) {}
      window.location.href = signedIn ? 'dashboard.html' : 'index.html';
    };
  })();

  // ── GLOBAL COLOR SYSTEM OVERRIDE ─────────────────────────
  var styleOverride = document.createElement('style');
  styleOverride.textContent = [
    ':root {',
    '  --teal: #6366f1 !important;',
    '  --teal-dim: rgba(99,102,241,0.08) !important;',
    '  --teal-border: rgba(99,102,241,0.25) !important;',
    '  --bg: #050410 !important;',
    '  --bg2: #0d0b1e !important;',
    '  --surface: #0d0b1e !important;',
    '  --card: #11102a !important;',
    '}',
    '.nav-item.active, a.nav-item.active {',
    '  background: rgba(99,102,241,0.12) !important;',
    '  border-color: rgba(99,102,241,0.30) !important;',
    '  color: #a5b4fc !important;',
    '}',
    '.nav-item:hover, a.nav-item:hover {',
    '  background: rgba(99,102,241,0.08) !important;',
    '  border-color: rgba(99,102,241,0.20) !important;',
    '  color: #c4b5fd !important;',
    '}',
    '.nav-section {',
    '  color: rgba(165,180,252,0.65) !important;',
    '}',
    '.nav-section, .ns {',
    '  color: rgba(165,180,252,0.65) !important;',
    '}',
    '.stat-label, .cal-month, .debrief-label, .welcome-label {',
    '  color: rgba(165,180,252,0.65) !important;',
    '}',
    '.tool-tag, .tc-tag, .tc-tier, .pc-tier, .tc-label {',
    '  color: rgba(165,180,252,0.65) !important;',
    '}',
    '.section-label, .hero-eyebrow, .lookup-group-title {',
    '  color: rgba(165,180,252,0.65) !important;',
    '}',
    '.aria-quick-text .label, .billing-notice, .mc-label,',
    '.imc-name, .hist-mode, .tc-month, .cc-month, .cs-label,',
    '.panel-sub, .faq-label, .review-label, .debrief-label {',
    '  color: rgba(165,180,252,0.60) !important;',
    '}',
    '.meridian-chip .ml, .meridian-chip .label,',
    '.m-header .label, .nav-badge-label {',
    '  color: rgba(165,180,252,0.70) !important;',
    '}',
    '[style*="00E5C3"], [style*="0,229,195"] {',
    '  --teal-replace: #6366f1;',
    '}',
    '.btn-primary, button.primary {',
    '  background: linear-gradient(135deg, #6366f1, #7c3aed) !important;',
    '  border-color: transparent !important;',
    '}',
    '[style*="color: #00E5C3"], [style*="color:#00E5C3"] {',
    '  color: #6366f1 !important;',
    '}',
    '.card, .tool-card, .case-card {',
    '  border-color: rgba(99,102,241,0.18) !important;',
    '}',
    '::-webkit-scrollbar-thumb {',
    '  background: linear-gradient(180deg, #6366f1, #7c3aed) !important;',
    '}',
    '.sidebar, #sidebar {',
    '  border-right-color: rgba(99,102,241,0.18) !important;',
    '  background: rgba(5,4,16,0.95) !important;',
    '}',
    '.aria-glow, .voice-indicator {',
    '  border-color: rgba(99,102,241,0.4) !important;',
    '  box-shadow: 0 0 20px rgba(99,102,241,0.25) !important;',
    '}',
    '.humacity-card, .humacity-block {',
    '  border-color: rgba(99,102,241,0.35) !important;',
    '}',
    '::selection {',
    '  background: rgba(99,102,241,0.35) !important;',
    '}',
    '#pwa-banner {',
    '  border-color: rgba(99,102,241,0.3) !important;',
    '}',
    '.nav-item .icon, .nav-item .nav-icon, .ni .ic {',
    '  min-width: 20px !important;',
    '  display: inline-flex !important;',
    '  justify-content: center !important;',
    '  align-items: center !important;',
    '  flex-shrink: 0 !important;',
    '}',
    '.nav-item, a.nav-item {',
    '  color: rgba(244,243,255,0.70) !important;',
    '}',
    '.sb {',
    '  background: rgba(5,4,16,0.98) !important;',
    '  border-right-color: rgba(99,102,241,0.18) !important;',
    '}',
    '.ni, a.ni {',
    '  color: rgba(244,243,255,0.70) !important;',
    '}',
    '.ni.active, a.ni.active {',
    '  background: rgba(99,102,241,0.12) !important;',
    '  border-color: rgba(99,102,241,0.30) !important;',
    '  color: #a5b4fc !important;',
    '}',
    '.ni:hover, a.ni:hover {',
    '  background: rgba(99,102,241,0.08) !important;',
    '  border-color: rgba(99,102,241,0.20) !important;',
    '  color: #c4b5fd !important;',
    '}',
    '.ns {',
    '  color: rgba(165,180,252,0.65) !important;',
    '}',
    '.logo-sub {',
    '  color: rgba(165,180,252,0.55) !important;',
    '}',
  ].join('\n');
  document.head.insertBefore(styleOverride, document.head.firstChild);

  // ── SIDEBAR REBUILD ──────────────────────────────────────
  // Single canonical function replaces all piecemeal injections.
  // Preserves: .logo, #meridian-chip (page JS holds references to its children),
  // and any existing clerkSignOut link (so clerk-auth.js keeps working).
  (function rebuildSidebar() {
    var sidebar = document.querySelector('.sidebar, #sidebar, .sb');
    if (!sidebar) return;

    var currentPage = window.location.pathname.replace(/\/+$/, '').split('/').pop() || 'dashboard.html';     if (currentPage.indexOf('.') === -1) currentPage += '.html';

    function isActivePage(href) {
      if (!href || href.indexOf('http') === 0) return false;
      return href.split('?')[0] === currentPage;
    }

    // Preserve elements that page-specific JS references
    var chipEl    = document.getElementById('meridian-chip') || sidebar.querySelector('.meridian-chip');
    var signoutEl = sidebar.querySelector('[onclick*="clerkSignOut"]');
    var logoEl    = sidebar.querySelector('.logo');
    if (chipEl    && chipEl.parentNode)    chipEl.parentNode.removeChild(chipEl);
    if (signoutEl && signoutEl.parentNode) signoutEl.parentNode.removeChild(signoutEl);

    // Clear sidebar except the logo
    var toRemove = [];
    for (var i = 0; i < sidebar.childNodes.length; i++) {
      if (sidebar.childNodes[i] !== logoEl) toRemove.push(sidebar.childNodes[i]);
    }
    toRemove.forEach(function(n) { sidebar.removeChild(n); });

    // Helpers
    function ns(text) {
      var d = document.createElement('div');
      d.className = 'nav-section';
      d.style.cssText = 'font-family:JetBrains Mono,monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;padding:4px 10px;margin:16px 0 6px';
      d.textContent = text;
      return d;
    }

    function ni(href, icon, label, opts) {
      opts = opts || {};
      var a = document.createElement('a');
      a.href = href;
      if (opts.external) a.target = '_blank';
      var cls = 'nav-item';
      if (isActivePage(href)) cls += ' active';
      if (opts.cls) cls += ' ' + opts.cls;
      a.className = cls;
      a.innerHTML = '<span style="font-size:16px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;width:22px;text-align:center">' + icon + '</span> ' + label;
      return a;
    }

    // Billing status for Pricing badge (will be replaced by Razorpay data)
      function getBillingStatus() {
      try {
        var plan = JSON.parse(localStorage.getItem('vantage_plan') || 'null');
        if (!plan) return { label: 'Billing not connected', color: 'rgba(165,180,252,.65)', bg: 'rgba(99,102,241,.08)' };
        if (plan.status === 'active') {
          var tier = plan.tier === 'consultant' ? 'Consultant' : 'Core';
          return { label: 'Active \u00b7 ' + tier, color: 'rgba(74,222,128,.85)', bg: 'rgba(74,222,128,.1)' };
        }
        return { label: 'Inactive', color: 'rgba(248,113,113,.85)', bg: 'rgba(248,113,113,.1)' };
      } catch(e) {
        return { label: 'Billing not connected', color: 'rgba(165,180,252,.65)', bg: 'rgba(99,102,241,.08)' };
      }
    }

    var f = document.createDocumentFragment();

    // Platform Tour
    var tourBtn = document.createElement('a');
    tourBtn.href = 'platform-tour.html';
    tourBtn.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:8px;cursor:pointer;transition:all .2s;border:1px solid rgba(99,102,241,0.18);text-decoration:none;color:rgba(255,255,255,0.6);font-size:13px;font-family:Plus Jakarta Sans,sans-serif;background:rgba(99,102,241,0.06);margin-bottom:10px';
    tourBtn.innerHTML = '<span style="display:flex;align-items:center;gap:10px"><span style="font-size:15px">\uD83D\uDDFA</span>Platform Tour</span><span style="font-family:JetBrains Mono,monospace;font-size:8px;letter-spacing:.08em;background:#6366f1;color:#fff;padding:2px 7px;border-radius:4px;font-weight:600">START</span>';
    f.appendChild(tourBtn);

    var replayLink = document.createElement('a');
    replayLink.href = 'dashboard.html?welcome=1';
    replayLink.style.cssText = 'display:block;font-family:JetBrains Mono,monospace;font-size:10px;letter-spacing:.04em;color:rgba(165,180,252,.45);text-decoration:none;padding:0 12px;margin:-4px 0 12px;transition:color .15s';
    replayLink.textContent = 'Replay welcome tour \u2192';
    replayLink.onmouseover = function(){ this.style.color = '#a5b4fc'; };
    replayLink.onmouseout  = function(){ this.style.color = 'rgba(165,180,252,.45)'; };
    f.appendChild(replayLink);

    // OVERVIEW
    f.appendChild(ns('Overview'));
    f.appendChild(ni('dashboard.html', '\u229E', 'Home'));
    f.appendChild(ni('https://humacity.com', '\uD83C\uDF00', 'Humacity', { external: true }));

    // YOUR FOUNDATION
    f.appendChild(ns('Your Foundation'));
    f.appendChild(ni('onboarding.html', '\u2B21', 'MERIDIAN Profile'));
    f.appendChild(ni('humac-onboarding.html', '\uD83D\uDCC8', 'Humac Score'));

    // ARIA
    f.appendChild(ns('Your Thinking Partner'));
    f.appendChild(ni('aria.html', '\u2736', 'ARIA', { cls: 'nav-item--aria' }));

    // YOUR CORE TOOLS
    f.appendChild(ns('Your Core Tools'));
    f.appendChild(ni('employee-case-advisor.html', '\u26A1', 'Employee Case Advisor'));
    f.appendChild(ni('people-roi-brief.html',       '\uD83D\uDCBC', 'The Business Case'));
    f.appendChild(ni('policy-advisor.html',          '\uD83E\uDDED', 'Policy Advisor'));
    f.appendChild(ni('retention-advisor.html',       '\u2696\uFE0F', 'Retention Advisor'));
    f.appendChild(ni('difficult-conversations.html', '\uD83C\uDFAD', 'Difficult Conversations'));

    // YOUR RECORD
    f.appendChild(ns('Your Record'));
    f.appendChild(ni('standpoint.html',    '\uD83D\uDCDC', 'Standpoint'));
    f.appendChild(ni('debrief.html',       '\uD83D\uDCCB', 'The Debrief'));
    f.appendChild(ni('vantage-record.html','🗄️', 'Vantage Record'));

    // ACCOUNT
    f.appendChild(ns('Account'));
    var billing = getBillingStatus();
    var pricingEl = document.createElement('a');
    pricingEl.href = 'pricing.html';
    pricingEl.className = 'nav-item' + (isActivePage('pricing.html') ? ' active' : '');
    pricingEl.innerHTML =
  '<span style="display:flex;align-items:center;gap:10px;min-width:0;flex:1;overflow:hidden">' +
    '<span style="font-size:16px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;width:22px;text-align:center">\uD83E\uDE99</span>' +
    '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0">Pricing</span>' +
  '</span>' +
  '<span style="font-family:JetBrains Mono,monospace;font-size:8px;letter-spacing:.04em;' +
    'background:' + billing.bg + ';color:' + billing.color + ';' +
    'padding:2px 6px;border-radius:4px;white-space:nowrap;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;max-width:120px">' +
    billing.label +
  '</span>';
pricingEl.style.overflow = 'hidden';
    f.appendChild(pricingEl);
    f.appendChild(ni('data-dashboard.html', '\uD83D\uDD12', 'My Data & Privacy'));

    // Send Feedback
    var fbDesktop = document.createElement('a');
    fbDesktop.href = '#';
    fbDesktop.className = 'nav-item';
    fbDesktop.setAttribute('onclick', 'openVantageFeedback(); return false;');
    fbDesktop.innerHTML = '<span style="font-size:16px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;width:22px;text-align:center">\uD83D\uDCAC</span> Send Feedback';
    f.appendChild(fbDesktop);

    // LEGAL
    f.appendChild(ns('Legal'));
    f.appendChild(ni('terms.html',   '\uD83D\uDCC4', 'Terms of Service'));
    f.appendChild(ni('privacy.html', '\uD83D\uDD12', 'Privacy Policy'));

    sidebar.appendChild(f);

    // Sign out
    if (signoutEl) {
      signoutEl.style.marginTop = '8px';
      signoutEl.style.borderTop = '1px solid rgba(99,102,241,.1)';
      signoutEl.style.paddingTop = '14px';
      sidebar.appendChild(signoutEl);
    } else {
      var so = document.createElement('a');
      so.href = '#';
      so.className = 'nav-item';
      so.setAttribute('onclick', 'clerkSignOut(); return false;');
      so.style.marginTop = '8px';
      so.style.borderTop = '1px solid rgba(99,102,241,.1)';
      so.style.paddingTop = '14px';
      so.innerHTML = '<span style="font-size:16px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;width:22px;text-align:center">\u21A9</span> Sign out';
      sidebar.appendChild(so);
    }

    // Re-append MERIDIAN chip (page-specific JS references its child IDs)
    if (chipEl) {
      sidebar.appendChild(chipEl);
      // Virorah attribution
      if (!chipEl.querySelector('.vr-attr')) {
        var attr = document.createElement('div');
        attr.className = 'vr-attr';
        attr.style.cssText = 'padding-top:10px;margin-top:8px;border-top:1px solid rgba(255,255,255,0.06);text-align:center';
        var attrA = document.createElement('a');
        attrA.href = 'https://virorah.com';
        attrA.target = '_blank';
        attrA.textContent = 'A Virorah Product ↗';
        attrA.style.cssText = 'font-family:JetBrains Mono,monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,0.35);text-decoration:none;display:block;transition:color .2s';
        attrA.onmouseover = function(){ this.style.color = 'rgba(99,102,241,0.6)'; };
        attrA.onmouseout  = function(){ this.style.color = 'rgba(255,255,255,0.35)'; };
        attr.appendChild(attrA);
        chipEl.appendChild(attr);
      }
    }
  })();

  // ── MERIDIAN NOT-CONFIGURED WARNING BANNER ────────────────

  // ── PWA META TAGS ─────────────────────────────────────────
  function addMeta(name, content) {
    if (!document.querySelector('meta[name="' + name + '"]')) {
      var m = document.createElement('meta');
      m.name = name; m.content = content;
      document.head.appendChild(m);
    }
  }

  function addLink(rel, href) {
    if (!document.querySelector('link[rel="' + rel + '"]')) {
      var l = document.createElement('link');
      l.rel = rel; l.href = href;
      document.head.appendChild(l);
    }
  }

  addLink('manifest', '/manifest.json');
  addMeta('theme-color', '#050410');
  addMeta('apple-mobile-web-app-capable', 'yes');
  addMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
  addMeta('apple-mobile-web-app-title', 'Vantage');
  addLink('apple-touch-icon', '/vantage/icon-192.png');
  addMeta('mobile-web-app-capable', 'yes');
  addMeta('application-name', 'Vantage');

  // ── SERVICE WORKER REGISTRATION ───────────────────────────
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js')
        .then(function(reg) { console.log('SW registered:', reg.scope); })
        .catch(function(err) { console.log('SW failed:', err); });
    });
  }

  // ── PWA INSTALL PROMPT ────────────────────────────────────
  var deferredPrompt = null;

  // iOS Safari never fires beforeinstallprompt — detect and show manual nudge
  (function() {
    var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
    var isStandalone = window.navigator.standalone === true;
    if (isIOS && !isStandalone && !sessionStorage.getItem('pwa_dismissed')) {
      setTimeout(function() {
        if (document.getElementById('pwa-banner')) return;
        var banner = document.createElement('div');
        banner.id = 'pwa-banner';
        var isMobile = window.innerWidth <= 768;
        banner.style.cssText = [
          'position:fixed',
          isMobile ? 'bottom:calc(64px + env(safe-area-inset-bottom,0px))' : 'bottom:24px',
          'left:50%',
          'transform:translateX(-50%)',
          'z-index:99999',
          'background:#0d0b1e',
          'border:1px solid rgba(99,102,241,0.35)',
          'border-radius:14px',
          'padding:14px 18px',
          'display:flex',
          'align-items:center',
          'gap:12px',
          'max-width:340px',
          'width:calc(100vw - 48px)',
          'box-shadow:0 8px 32px rgba(0,0,0,0.5)',
          'font-family:Plus Jakarta Sans,sans-serif',
        ].join(';');
        banner.innerHTML = [
          '<div style="flex:1">',
            '<div style="font-size:12px;font-weight:700;color:#f4f3ff;margin-bottom:3px">Install Vantage</div>',
            '<div style="font-size:11px;color:rgba(244,243,255,0.5);line-height:1.5">',
              'Tap <strong style="color:#a5b4fc">Share ↑</strong> then <strong style="color:#a5b4fc">Add to Home Screen</strong>',
            '</div>',
          '</div>',
          '<button id="pwa-ios-dismiss" ',
            'style="background:none;border:none;color:rgba(244,243,255,0.35);font-size:18px;cursor:pointer;padding:4px;line-height:1;flex-shrink:0">✕</button>',
        ].join('');
        document.body.appendChild(banner);
        var dismissBtn = document.getElementById('pwa-ios-dismiss');
        if (dismissBtn) {
          dismissBtn.addEventListener('click', function() {
            sessionStorage.setItem('pwa_dismissed', '1');
            var b = document.getElementById('pwa-banner');
            if (b) b.remove();
          });
        }
      }, 2500);
    }
  })();

  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;
    if (sessionStorage.getItem('pwa_dismissed')) return;
    setTimeout(showInstallBanner, 3000);
  });

  function showInstallBanner() {
    if (document.getElementById('pwa-banner')) return;
    // FIX: on mobile widths, the bottom nav now occupies the space this
    // banner used to assume was empty. Sit the banner above the nav instead
    // of colliding with it — matches the same safe-area-inset pattern the
    // bottom nav itself uses, so both stay correctly clear of notched phones.
    var isMobileWidth = window.innerWidth <= 768;
    var bottomOffset = isMobileWidth ? 'calc(86px + env(safe-area-inset-bottom, 0px))' : '24px';
    var banner = document.createElement('div');
    banner.id = 'pwa-banner';
    banner.style.cssText = 'position:fixed;bottom:' + bottomOffset + ';left:50%;transform:translateX(-50%);background:#0d0b1e;border:1px solid rgba(99,102,241,0.3);border-radius:14px;padding:16px 20px;display:flex;align-items:center;gap:14px;z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,0.4);max-width:380px;width:calc(100% - 48px)';
    banner.innerHTML = '<div style="font-size:28px;flex-shrink:0">📱</div>' +
      '<div style="flex:1"><div style="font-family:Bricolage Grotesque,sans-serif;font-weight:700;font-size:14px;color:#fff;margin-bottom:3px">Install Vantage</div>' +
      '<div style="font-size:12px;color:rgba(255,255,255,0.70);line-height:1.4">Add to home screen for instant access. Works offline too.</div></div>' +
      '<div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">' +
      '<button onclick="installPWA()" style="padding:8px 14px;background:linear-gradient(135deg,#6366f1,#7c3aed);color:#fff;font-family:Bricolage Grotesque,sans-serif;font-weight:700;font-size:12px;border:none;border-radius:7px;cursor:pointer">Install</button>' +
      '<button onclick="dismissPWA()" style="padding:6px 14px;background:transparent;color:rgba(255,255,255,0.65);font-size:12px;border:none;cursor:pointer">Not now</button>' +
      '</div>';
    document.body.appendChild(banner);
  }

  window.installPWA = function() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function(r) {
      deferredPrompt = null;
      var b = document.getElementById('pwa-banner');
      if (b) b.remove();
    });
  };

  window.dismissPWA = function() {
    sessionStorage.setItem('pwa_dismissed', '1');
    var b = document.getElementById('pwa-banner');
    if (b) b.remove();
  };


  // ── MOBILE BOTTOM NAV ────────────────────────────────────
  function injectMobileNav() {
    if (window.innerWidth > 768) return;

    // SVG icon set — stroke-based, currentColor, consistent 1.8px weight
    var S = 'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
    var IC = {
      home:      '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" '+S+'><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>',
      tools:     '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" '+S+'><path d="M13 2L4 14h8L10 22l10-12h-8L13 2z"/></svg>',
      aria_tab:  '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" '+S+'><path d="M12 2l2 5.5 5.5 2-5.5 2L12 17l-2-5.5L4.5 9.5l5.5-2z"/><path d="M19 17l.7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7z"/></svg>',
      record_tab:'<svg width="21" height="21" viewBox="0 0 24 24" fill="none" '+S+'><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5" rx="1"/><line x1="10" y1="12" x2="14" y2="12"/></svg>',
      more:      '<svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
      map:       '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" '+S+'><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>',
      globe:     '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" '+S+'><circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8M3.6 15h16.8M12 3c-3 4-3 14 0 18M12 3c3 4 3 14 0 18"/></svg>',
      hex:       '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" '+S+'><path d="M12 2l8.66 5v10L12 22 3.34 17V7z"/></svg>',
      chart:     '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" '+S+'><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>',
      sparkle:   '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" '+S+'><path d="M12 2l2 5.5 5.5 2-5.5 2L12 17l-2-5.5L4.5 9.5l5.5-2z"/></svg>',
      bolt:      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" '+S+'><path d="M13 2L4 14h8L10 22l10-12h-8L13 2z"/></svg>',
      briefcase: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" '+S+'><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>',
      book:      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" '+S+'><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
      scale:     '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" '+S+'><line x1="12" y1="3" x2="12" y2="21"/><path d="M7 3h10"/><path d="M3.5 9l3.5 7H0l3.5-7zM16.5 9l3.5 7H13l3.5-7z"/></svg>',
      chat:      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" '+S+'><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
      pin:       '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" '+S+'><path d="M12 22s-8-5.6-8-12a8 8 0 0116 0c0 6.4-8 12-8 12z"/><circle cx="12" cy="10" r="3"/></svg>',
      file:      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" '+S+'><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg>',
      archive:   '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" '+S+'><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5" rx="1"/><line x1="10" y1="12" x2="14" y2="12"/></svg>',
      tag:       '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" '+S+'><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none"/></svg>',
      shield:    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" '+S+'><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
      logout:    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" '+S+'><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
      doc:       '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" '+S+'><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
      lock:      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" '+S+'><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',
    };
    // FIX: no other injection in this file lacks this check — without it,
    // any second call to this function (e.g. from the resize fix below)
    // would create a duplicate nav bar, duplicate style tag, and duplicate
    // drawer overlay stacking on top of the originals.
    if (document.querySelector('.vantage-bottom-nav')) return;

    var path = window.location.pathname;
    var curSlug = path.split('/').filter(function(s) { return s; }).pop() || 'dashboard';     curSlug = curSlug.replace('.html', '');     var SLUG = { 'er-case-navigator': 'employee-case-advisor', 'business-case': 'people-roi-brief', 'policy-compass': 'policy-advisor', 'offer-intelligence': 'retention-advisor', 'conversation-simulator': 'difficult-conversations', 'ledger': 'standpoint', 'case-library': 'vantage-record' };     var TAB_MATCH = { 'er-case-navigator': ['employee-case-advisor', 'people-roi-brief', 'policy-advisor', 'retention-advisor', 'difficult-conversations'], 'case-library': ['vantage-record', 'standpoint', 'debrief'] };     function slugOf(key) { return SLUG[key] || key; }     function isActive(page) { var list = TAB_MATCH[page] || [slugOf(page)]; return list.indexOf(curSlug) !== -1; }     function onMainTab() { return isActive('dashboard') || isActive('aria') || isActive('er-case-navigator') || isActive('case-library'); }

    var style = document.createElement('style');
    style.id = 'vantage-bottom-nav-style';
    style.textContent = [
      '/* Mobile bottom nav */',
      '.vantage-bottom-nav {',
      '  display: none;',
      '}',
      '@media (max-width: 768px) {',
      '  .vantage-bottom-nav {',
      '    display: flex;',
      '    position: fixed;',
      '    bottom: 0;',
      '    left: 0;',
      '    right: 0;',
      '    z-index: 9990;',
      '    background: rgba(5,4,16,0.97);',
      '    border-top: 1px solid rgba(99,102,241,0.18);',
      '    backdrop-filter: blur(20px);',
      '    -webkit-backdrop-filter: blur(20px);',
      '    padding: 8px 0 calc(8px + env(safe-area-inset-bottom, 0px)) 0;',
      '    justify-content: space-around;',
      '    align-items: flex-start;',
      '  }',
      '  .vbn-item {',
      '    display: flex;',
      '    flex-direction: column;',
      '    align-items: center;',
      '    justify-content: flex-start;',
      '    gap: 2px;',
      '    padding: 6px 4px 4px;',
      '    text-decoration: none;',
      '    cursor: pointer;',
      '    flex: 1;',
      '    min-height: 52px;',
      '    border: none;',
      '    background: transparent;',
      '    -webkit-tap-highlight-color: transparent;',
      '  }',
      '  .vbn-icon-wrap {',
      '    width: 44px;',
      '    height: 30px;',
      '    display: flex;',
      '    align-items: center;',
      '    justify-content: center;',
      '    border-radius: 15px;',
      '    transition: background 0.2s ease;',
      '    margin-bottom: 2px;',
      '  }',
      '  .vbn-item.active .vbn-icon-wrap {',
      '    background: rgba(99,102,241,0.2);',
      '  }',
      '  .vbn-icon {',
      '    display: flex;',
      '    align-items: center;',
      '    justify-content: center;',
      '    line-height: 1;',
      '    transition: transform 0.15s ease;',
      '    color: rgba(244,243,255,0.55);',
      '  }',
      '  .vbn-item.active .vbn-icon {',
      '    transform: scale(1.1);',
      '    color: #a5b4fc;',
      '  }',
      '  .vbn-label {',
      '    font-family: "JetBrains Mono", monospace;',
      '    font-size: 9.5px;',
      '    letter-spacing: 0.03em;',
      '    text-transform: uppercase;',
      '    color: rgba(244,243,255,0.42);',
      '    transition: color 0.15s ease;',
      '    white-space: nowrap;',
      '  }',
      '  .vbn-item.active .vbn-label {',
      '    color: #a5b4fc;',
      '    font-weight: 600;',
      '  }',
      '  .vbn-item:active .vbn-icon-wrap {',
      '    background: rgba(99,102,241,0.15);',
      '  }',
      '  .vbn-drawer-overlay {',
      '    display: block;',
      '    position: fixed;',
      '    inset: 0;',
      '    background: rgba(5,4,16,0.55);',
      '    z-index: 9991;',
      '    backdrop-filter: blur(3px);',
      '    -webkit-backdrop-filter: blur(3px);',
      '    opacity: 0;',
      '    pointer-events: none;',
      '    transition: opacity 0.25s ease;',
      '  }',
      '  .vbn-drawer-overlay.open {',
      '    opacity: 1;',
      '    pointer-events: all;',
      '  }',
      '  .vbn-drawer {',
      '    position: absolute;',
      '    top: 0;',
      '    left: 0;',
      '    bottom: 0;',
      '    width: 82vw;',
      '    max-width: 300px;',
      '    background: #0a0918;',
      '    border-right: 1px solid rgba(99,102,241,0.18);',
      '    padding: 0 0 calc(24px + env(safe-area-inset-bottom, 0px)) 0;',
      '    overflow-y: auto;',
      '    overflow-x: hidden;',
      '    transform: translateX(-100%);',
      '    transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);',
      '  }',
      '  .vbn-drawer-overlay.open .vbn-drawer {',
      '    transform: translateX(0);',
      '  }',
      '  .vbn-drawer-header {',
      '    display: flex;',
      '    align-items: center;',
      '    padding: calc(14px + env(safe-area-inset-top, 0px)) 16px 14px;',
      '    border-bottom: 1px solid rgba(99,102,241,0.1);',
      '    margin-bottom: 6px;',
      '  }',
      '  .vbn-drawer-handle { display: none; }',
      '  .vbn-drawer-title {',
      '    font-family: "JetBrains Mono", monospace;',
      '    font-size: 9px;',
      '    letter-spacing: 0.14em;',
      '    text-transform: uppercase;',
      '    color: rgba(99,102,241,0.5);',
      '    padding: 14px 18px 6px;',
      '  }',
      '  .vbn-drawer-item {',
      '    display: flex;',
      '    align-items: center;',
      '    gap: 13px;',
      '    padding: 11px 18px;',
      '    text-decoration: none;',
      '    color: rgba(244,243,255,0.65);',
      '    font-family: "Plus Jakarta Sans", sans-serif;',
      '    font-size: 14px;',
      '    transition: background 0.15s ease, color 0.15s ease;',
      '    -webkit-tap-highlight-color: transparent;',
      '  }',
      '  .vbn-drawer-item:active {',
      '    background: rgba(99,102,241,0.08);',
      '  }',
      '  .vbn-drawer-item.active {',
      '    color: #a5b4fc;',
      '    background: rgba(99,102,241,0.06);',
      '  }',
      '  .vbn-drawer-icon {',
      '    display: flex;',
      '    align-items: center;',
      '    justify-content: center;',
      '    width: 28px;',
      '    flex-shrink: 0;',
      '    color: rgba(244,243,255,0.5);',
      '  }',
      '  .vbn-drawer-item.active .vbn-drawer-icon { color: #a5b4fc; }',
      '  .vbn-drawer-label { flex: 1; }',
      '  .vbn-drawer-sub {',
      '    font-size: 11px;',
      '    color: rgba(244,243,255,0.28);',
      '    font-family: "JetBrains Mono", monospace;',
      '    letter-spacing: 0.04em;',
      '  }',
      /* SR34: was 88px — just barely enough to clear the nav bar's own
         icons, leaving zero breathing room below whatever content sits
         last on the page (e.g. the Debrief card, reported as clipped
         flush against the nav). This rule is injected at RUNTIME by this
         shared script, landing later in the cascade than any per-page
         .main padding rule (same specificity, both !important — later
         wins), so it silently overrides page-level fixes like
         dashboard.html's own 120px rule. Bumping to 140px here, at the
         shared source, so it can't be quietly re-overridden per page. */
      '  .main, main, .main-content, .wrap, .content, .page-content,',
      '  body > div:not(.vantage-bottom-nav):not(.vbn-drawer-overlay) {',
      '    padding-bottom: calc(140px + env(safe-area-inset-bottom, 0px)) !important;',
      '  }',
      '  body {',
      '    padding-bottom: calc(140px + env(safe-area-inset-bottom, 0px));',
      '  }',
      '}',
    ].join('\n');
    document.head.appendChild(style);

    var navItems = [
      { icon: IC.home,       label: 'Home',   href: 'dashboard.html',              page: 'dashboard' },
      { icon: IC.tools,      label: 'Tools',  href: 'employee-case-advisor.html',  page: 'er-case-navigator' },
      { icon: IC.aria_tab,   label: 'ARIA',   href: 'aria.html',                   page: 'aria' },
      { icon: IC.record_tab, label: 'Record', href: 'vantage-record.html',         page: 'case-library' },
      { icon: IC.more,       label: 'More',   href: null,                          page: 'more' },
    ];

    // FIX: this list previously had 7 flat items and had fallen out of sync
    // with everything else this same file injects into the desktop sidebar
    // over time — Retention Advisor, The Ledger, MERIDIAN Profile, Pricing,
    // Terms of Service, Privacy Policy, Humacity, Platform Tour, About
    // Vantage, and Humac Score were all unreachable on mobile. Restructured
    // as sections mirroring the desktop sidebar's own grouping, both to
    // restore parity and because a flat 17-item list would be its own
    // usability problem. A couple of icons were changed from what desktop
    // uses for the same link, specifically where reusing the desktop icon
    // would have collided with another item already in this same drawer
    // (Humac Score vs People ROI Brief both use 📊 on desktop; About
    // Vantage's ✦ collides with the ARIA bottom-tab icon above) — noted
    // here so a future edit doesn't "fix" these back into a collision.
    var drawerSections = [
      {
        title: 'Overview',
        items: [
          { icon: IC.map, label: 'Platform Tour', sub: 'Guided walkthrough', href: 'platform-tour.html', page: 'platform-tour' },
          { icon: IC.globe, label: 'Humacity', sub: '', href: 'https://humacity.com', page: 'humacity', external: true },
        ]
      },
      {
        title: 'Your Foundation',
        items: [
          { icon: IC.hex, label: 'MERIDIAN Profile', sub: '8-parameter context', href: 'onboarding.html', page: 'onboarding' },
          { icon: IC.chart, label: 'Humac Score', sub: 'Your people finance number', href: 'humac-onboarding.html', page: 'humac-onboarding' },
        ]
      },
      {
        title: 'Your HRBP',
        items: [
          { icon: IC.sparkle, label: 'ARIA', sub: 'Your private HR intelligence ally', href: 'aria.html', page: 'aria' },
        ]
      },
      {
        title: 'Your Core Tools',
        items: [
          { icon: IC.bolt, label: 'Employee Case Advisor', sub: 'Navigate any employee situation', href: 'employee-case-advisor.html', page: 'er-case-navigator' },
          { icon: IC.briefcase, label: 'The Business Case', sub: 'Numbers for the room, or one specific person', href: 'people-roi-brief.html', page: 'business-case' },
          { icon: IC.book, label: 'Policy Advisor', sub: 'Applicable law, every time', href: 'policy-advisor.html', page: 'policy-compass' },
          { icon: IC.scale, label: 'Retention Advisor', sub: 'Stay or go: model the cost', href: 'retention-advisor.html', page: 'offer-intelligence' },
          { icon: IC.chat, label: 'Difficult Conversations', sub: 'Rehearse before you walk in', href: 'difficult-conversations.html', page: 'conversation-simulator' },
        ]
      },
      {
        title: 'Your Record',
        items: [
          { icon: IC.pin, label: 'Standpoint', sub: 'File your position before the outcome', href: 'standpoint.html', page: 'ledger' },
          { icon: IC.file, label: 'The Debrief', sub: 'Auto-generated monthly', href: 'debrief.html', page: 'debrief' },
          { icon: IC.archive, label: 'Vantage Record', sub: 'Your complete case archive', href: 'vantage-record.html', page: 'case-library' },
        ]
      },
      {
        title: 'Account',
        items: [
          { icon: IC.tag, label: 'Pricing', sub: '', href: 'pricing.html', page: 'pricing' },
          { icon: IC.shield, label: 'My Data & Privacy', sub: 'Your data settings', href: 'data-dashboard.html', page: 'data-dashboard' },
          { icon: IC.chat, label: 'Send Feedback', sub: 'Share what you think', href: '#', page: 'feedback', feedbackTrigger: true },
          { icon: IC.logout, label: 'Sign Out', sub: '', href: 'access.html', page: 'signout', signout: true },
        ]
      },
      {
        title: 'Legal',
        items: [
          { icon: IC.doc, label: 'Terms of Service', sub: '', href: 'terms.html', page: 'terms' },
          { icon: IC.lock, label: 'Privacy Policy', sub: '', href: 'privacy.html', page: 'privacy' },
        ]
      },
    ];

    var drawerActive = drawerSections.some(function(sec) {
      return sec.items.some(function(d) { return d.page !== 'signout' && curSlug === slugOf(d.page) && !onMainTab(); });
    });

    var nav = document.createElement('div');
    nav.className = 'vantage-bottom-nav';

    navItems.forEach(function(item) {
      var active = item.page === 'more'
        ? drawerActive
        : isActive(item.page);

      if (item.href) {
        var a = document.createElement('a');
        a.className = 'vbn-item' + (active ? ' active' : '');
        a.href = item.href;
        a.innerHTML = '<span class="vbn-icon-wrap"><span class="vbn-icon">' + item.icon + '</span></span><span class="vbn-label">' + item.label + '</span>';
        nav.appendChild(a);
      } else {
        var btn = document.createElement('button');
        btn.className = 'vbn-item' + (active ? ' active' : '');
        btn.innerHTML = '<span class="vbn-icon-wrap"><span class="vbn-icon">' + item.icon + '</span></span><span class="vbn-label">' + item.label + '</span>';
        btn.onclick = function(e) { e.stopPropagation(); toggleDrawer(); };
        nav.appendChild(btn);
      }
    });

    document.body.appendChild(nav);

    var overlay = document.createElement('div');
    overlay.className = 'vbn-drawer-overlay';

    var drawer = document.createElement('div');
    drawer.className = 'vbn-drawer';
    drawer.innerHTML = [
      '<div class="vbn-drawer-header">',
        '<img src="virorah-vantage-logo.png" alt="Vantage" ',
          'style="height:26px;width:auto;object-fit:contain;max-width:160px">',
      '</div>',
    ].join('');

    drawerSections.forEach(function(section) {
      var titleEl = document.createElement('div');
      titleEl.className = 'vbn-drawer-title';
      titleEl.textContent = section.title;
      drawer.appendChild(titleEl);

      section.items.forEach(function(item) {
        var active = item.page !== 'signout' && curSlug === slugOf(item.page);
        var a = document.createElement('a');
        a.className = 'vbn-drawer-item' + (active ? ' active' : '');
        a.href = item.href;
        if (item.external) a.target = '_blank';
        if (item.signout) {
          a.onclick = function(e) {
            e.preventDefault();
            if (window.clerkSignOut) {
              window.clerkSignOut();
            } else {
              sessionStorage.clear();
              localStorage.setItem('vantage_clerk_signed_in', '0');
              window.location.href = 'https://vantage.virorah.com/';
            }
            return false;
          };
        }
        if (item.feedbackTrigger) {
          (function(el) {
            el.onclick = function(e) {
              e.preventDefault();
              closeDrawer();
              setTimeout(function() { if (typeof openVantageFeedback === 'function') openVantageFeedback(); }, 220);
              return false;
            };
          })(a);
        }
        a.innerHTML = [
          '<span class="vbn-drawer-icon">' + item.icon + '</span>',
          '<span class="vbn-drawer-label">' + item.label + (item.sub ? '<br><span class="vbn-drawer-sub">' + item.sub + '</span>' : '') + '</span>',
        ].join('');
        drawer.appendChild(a);
      });
    });

    overlay.appendChild(drawer);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeDrawer();
    });

    function toggleDrawer() {
      if (overlay.classList.contains('open')) closeDrawer();
      else openDrawer();
    }
    function openDrawer()  { overlay.classList.add('open'); }
    function closeDrawer() { overlay.classList.remove('open'); }

    drawer.querySelectorAll('.vbn-drawer-item').forEach(function(el) {
      el.addEventListener('click', closeDrawer);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectMobileNav);
  } else {
    injectMobileNav();
  }
  window.addEventListener('resize', function() {
    var existing = document.querySelector('.vantage-bottom-nav');
    if (window.innerWidth > 768 && existing) {
      // FIX: previously only removed the nav bar itself, leaving the style
      // tag and drawer overlay orphaned in the DOM even in this already-
      // handled direction.
      existing.remove();
      var styleEl = document.getElementById('vantage-bottom-nav-style');
      if (styleEl) styleEl.remove();
      var overlayEl = document.querySelector('.vbn-drawer-overlay');
      if (overlayEl) overlayEl.remove();
    } else if (window.innerWidth <= 768 && !existing) {
      // FIX: the opposite direction was entirely unhandled — shrinking back
      // down to mobile width (e.g. rotating a tablet, or resizing a desktop
      // window) never restored the nav once it had been removed.
      injectMobileNav();
    }
  });


  // ── LOCATION CLOCK ─────────────────────────────────────────────────────────
  (function() {
    var LS_KEY = 'vantage_clock_location';
    var clockInterval = null;
    var clockEl = null;

    var LOCATIONS = [
      ['Agra',             'Uttar Pradesh',     'India', 'Asia/Kolkata'],
      ['Ahmedabad',        'Gujarat',           'India', 'Asia/Kolkata'],
      ['Amritsar',         'Punjab',            'India', 'Asia/Kolkata'],
      ['Aurangabad',       'Maharashtra',       'India', 'Asia/Kolkata'],
      ['Bengaluru',        'Karnataka',         'India', 'Asia/Kolkata'],
      ['Bhopal',           'Madhya Pradesh',    'India', 'Asia/Kolkata'],
      ['Bhubaneswar',      'Odisha',            'India', 'Asia/Kolkata'],
      ['Chandigarh',       'Punjab & Haryana',  'India', 'Asia/Kolkata'],
      ['Chennai',          'Tamil Nadu',        'India', 'Asia/Kolkata'],
      ['Coimbatore',       'Tamil Nadu',        'India', 'Asia/Kolkata'],
      ['Cuttack',          'Odisha',            'India', 'Asia/Kolkata'],
      ['Dehradun',         'Uttarakhand',       'India', 'Asia/Kolkata'],
      ['Faridabad',        'Haryana',           'India', 'Asia/Kolkata'],
      ['Gaya',             'Bihar',             'India', 'Asia/Kolkata'],
      ['Gurugram',         'Haryana',           'India', 'Asia/Kolkata'],
      ['Guwahati',         'Assam',             'India', 'Asia/Kolkata'],
      ['Gwalior',          'Madhya Pradesh',    'India', 'Asia/Kolkata'],
      ['Howrah',           'West Bengal',       'India', 'Asia/Kolkata'],
      ['Hubballi',         'Karnataka',         'India', 'Asia/Kolkata'],
      ['Hyderabad',        'Telangana',         'India', 'Asia/Kolkata'],
      ['Indore',           'Madhya Pradesh',    'India', 'Asia/Kolkata'],
      ['Jabalpur',         'Madhya Pradesh',    'India', 'Asia/Kolkata'],
      ['Jaipur',           'Rajasthan',         'India', 'Asia/Kolkata'],
      ['Jamshedpur',       'Jharkhand',         'India', 'Asia/Kolkata'],
      ['Jodhpur',          'Rajasthan',         'India', 'Asia/Kolkata'],
      ['Kanpur',           'Uttar Pradesh',     'India', 'Asia/Kolkata'],
      ['Kochi',            'Kerala',            'India', 'Asia/Kolkata'],
      ['Kolkata',          'West Bengal',       'India', 'Asia/Kolkata'],
      ['Kota',             'Rajasthan',         'India', 'Asia/Kolkata'],
      ['Kozhikode',        'Kerala',            'India', 'Asia/Kolkata'],
      ['Lucknow',          'Uttar Pradesh',     'India', 'Asia/Kolkata'],
      ['Ludhiana',         'Punjab',            'India', 'Asia/Kolkata'],
      ['Madurai',          'Tamil Nadu',        'India', 'Asia/Kolkata'],
      ['Mangaluru',        'Karnataka',         'India', 'Asia/Kolkata'],
      ['Mumbai',           'Maharashtra',       'India', 'Asia/Kolkata'],
      ['Mysuru',           'Karnataka',         'India', 'Asia/Kolkata'],
      ['Nagpur',           'Maharashtra',       'India', 'Asia/Kolkata'],
      ['Nashik',           'Maharashtra',       'India', 'Asia/Kolkata'],
      ['New Delhi',        'Delhi',             'India', 'Asia/Kolkata'],
      ['Noida',            'Uttar Pradesh',     'India', 'Asia/Kolkata'],
      ['Panaji',           'Goa',               'India', 'Asia/Kolkata'],
      ['Patna',            'Bihar',             'India', 'Asia/Kolkata'],
      ['Prayagraj',        'Uttar Pradesh',     'India', 'Asia/Kolkata'],
      ['Pune',             'Maharashtra',       'India', 'Asia/Kolkata'],
      ['Rajkot',           'Gujarat',           'India', 'Asia/Kolkata'],
      ['Ranchi',           'Jharkhand',         'India', 'Asia/Kolkata'],
      ['Salem',            'Tamil Nadu',        'India', 'Asia/Kolkata'],
      ['Shimla',           'Himachal Pradesh',  'India', 'Asia/Kolkata'],
      ['Siliguri',         'West Bengal',       'India', 'Asia/Kolkata'],
      ['Surat',            'Gujarat',           'India', 'Asia/Kolkata'],
      ['Thiruvananthapuram','Kerala',           'India', 'Asia/Kolkata'],
      ['Tiruchirappalli',  'Tamil Nadu',        'India', 'Asia/Kolkata'],
      ['Udaipur',          'Rajasthan',         'India', 'Asia/Kolkata'],
      ['Vadodara',         'Gujarat',           'India', 'Asia/Kolkata'],
      ['Varanasi',         'Uttar Pradesh',     'India', 'Asia/Kolkata'],
      ['Vijayawada',       'Andhra Pradesh',    'India', 'Asia/Kolkata'],
      ['Visakhapatnam',    'Andhra Pradesh',    'India', 'Asia/Kolkata'],
      ['Warangal',         'Telangana',         'India', 'Asia/Kolkata'],
    ];

    function getStoredLocation() {
      try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); }
      catch(e) { return null; }
    }

    function saveLocation(city, state, country, timezone) {
      localStorage.setItem(LS_KEY, JSON.stringify({ city: city, state: state, country: country, timezone: timezone }));
    }

    function fmtTime(tz) {
      try {
        return new Intl.DateTimeFormat('en-IN', {
          timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        }).format(new Date()).toUpperCase();
      } catch(e) { return '--:--:-- --'; }
    }

    function fmtDate(tz) {
      try {
        return new Intl.DateTimeFormat('en-IN', {
          timeZone: tz, weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
        }).format(new Date());
      } catch(e) { return '-- --- ----'; }
    }

    function tick() {
      var loc = getStoredLocation();
      if (!loc || !clockEl) return;
      var t = clockEl.querySelector('.vclock-time');
      var d = clockEl.querySelector('.vclock-date');
      if (t) t.textContent = fmtTime(loc.timezone);
      if (d) d.textContent = fmtDate(loc.timezone);
    }

    function startClock() {
      if (clockInterval) clearInterval(clockInterval);
      tick();
      clockInterval = setInterval(tick, 1000);
    }

    function openPicker() {
      if (document.getElementById('vclock-modal')) return;
      var overlay = document.createElement('div');
      overlay.id = 'vclock-modal';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:flex-end;justify-content:center;background:rgba(5,4,16,0.85);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)';

      var panel = document.createElement('div');
      panel.style.cssText = 'width:100%;max-width:440px;background:#0d0b1e;border:1px solid rgba(99,102,241,0.25);border-radius:20px 20px 0 0;display:flex;flex-direction:column;max-height:80vh';

      panel.innerHTML = [
        '<div style="padding:20px 20px 14px;border-bottom:1px solid rgba(99,102,241,0.1);flex-shrink:0">',
          '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:3px">',
            '<div>',
              '<div style="width:36px;height:4px;background:rgba(255,255,255,0.12);border-radius:2px;margin:0 auto 14px"></div>',
              '<div style="font-family:Bricolage Grotesque,sans-serif;font-weight:700;font-size:15px;color:#fff">Set your location</div>',
            '</div>',
            '<button id="vclock-close-btn" style="background:transparent;border:none;cursor:pointer;color:rgba(165,180,252,0.5);font-size:18px;line-height:1;padding:0;margin-top:-4px;flex-shrink:0" aria-label="Close">&times;</button>',
          '</div>',
          '<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:13px;color:rgba(255,255,255,0.65);line-height:1.5;margin-top:6px">Date and time display only. No location tracking. Nothing leaves your device.</div>',
        '</div>',
        '<div style="padding:12px 20px 8px;flex-shrink:0">',
          '<input id="vclock-search" type="text" placeholder="Search city or state\u2026" autocomplete="off"',
            ' style="width:100%;box-sizing:border-box;background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.2);border-radius:8px;padding:10px 14px;',
            'font-family:Plus Jakarta Sans,sans-serif;font-size:13px;color:#e8e6ff;outline:none;caret-color:#a5b4fc"',
          '/>',
        '</div>',
        '<div id="vclock-list" style="overflow-y:auto;padding:4px 12px 20px;flex:1;min-height:0"></div>',
      ].join('');

      overlay.appendChild(panel);
      document.body.appendChild(overlay);

      overlay.addEventListener('click', function(e) { if (e.target === overlay) closePicker(); });

      var closeBtn = document.getElementById('vclock-close-btn');
      if (closeBtn) closeBtn.addEventListener('click', closePicker);

      function handleEsc(e) { if (e.key === 'Escape') { closePicker(); document.removeEventListener('keydown', handleEsc); } }
      document.addEventListener('keydown', handleEsc);

      renderList('');

      var inp = document.getElementById('vclock-search');
      if (inp) {
        inp.focus();
        inp.addEventListener('input', function() { renderList(this.value.trim().toLowerCase()); });
      }
    }

    function renderList(filter) {
      var list = document.getElementById('vclock-list');
      if (!list) return;
      var filtered = LOCATIONS.filter(function(r) {
        if (!filter) return true;
        return r[0].toLowerCase().indexOf(filter) !== -1 || r[1].toLowerCase().indexOf(filter) !== -1;
      });

      if (!filtered.length) {
        list.innerHTML = '<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:13px;color:rgba(255,255,255,0.60);text-align:center;padding:28px 0">No cities found</div>';
        return;
      }

      list.innerHTML = '';
      filtered.forEach(function(r) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:11px 10px;border-radius:8px;cursor:pointer;transition:background 0.12s;margin-bottom:1px';
        row.innerHTML = [
          '<div>',
            '<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:13px;font-weight:500;color:rgba(232,230,255,0.9)">' + r[0] + '</div>',
            '<div style="font-family:JetBrains Mono,monospace;font-size:10px;color:rgba(165,180,252,0.55);letter-spacing:0.04em;margin-top:2px">' + r[1] + ' &middot; ' + r[2] + '</div>',
          '</div>',
          '<div style="font-family:JetBrains Mono,monospace;font-size:9px;color:rgba(255,255,255,0.55);letter-spacing:0.08em">IST</div>',
        ].join('');
        row.addEventListener('mouseover', function() { this.style.background = 'rgba(99,102,241,0.08)'; });
        row.addEventListener('mouseout',  function() { this.style.background = 'transparent'; });
        row.addEventListener('click', function() {
          saveLocation(r[0], r[1], r[2], r[3]);
          closePicker();
          refreshClockWidget();
          startClock();
        });
        list.appendChild(row);
      });
    }

    function closePicker() {
      var m = document.getElementById('vclock-modal');
      if (m) m.remove();
    }

    function refreshClockWidget() {
      if (!clockEl) return;
      var loc = getStoredLocation();
      var mainEl  = clockEl.querySelector('.vclock-main');
      var nolocEl = clockEl.querySelector('.vclock-noloc');
      var locLbl  = clockEl.querySelector('.vclock-location');
      var timeEl  = clockEl.querySelector('.vclock-time');
      var dateEl  = clockEl.querySelector('.vclock-date');
      if (loc) {
        if (mainEl)  mainEl.style.display  = 'block';
        if (nolocEl) nolocEl.style.display = 'none';
        if (timeEl)  timeEl.textContent  = fmtTime(loc.timezone);
        if (dateEl)  dateEl.textContent  = fmtDate(loc.timezone);
        if (locLbl)  locLbl.textContent  = loc.city + ', ' + loc.state + ', ' + loc.country;
      } else {
        if (mainEl)  mainEl.style.display  = 'none';
        if (nolocEl) nolocEl.style.display = 'flex';
      }
    }

    function injectClock() {
      var chip = document.querySelector('.meridian-chip');
      if (!chip || document.getElementById('vantage-clock')) return;

      var loc = getStoredLocation();

      clockEl = document.createElement('div');
      clockEl.id = 'vantage-clock';
      clockEl.style.cssText = [
        'margin:0 0 8px',
        'padding:12px 14px',
        'background:rgba(99,102,241,0.04)',
        'border:1px solid rgba(99,102,241,0.13)',
        'border-radius:10px',
      ].join(';');

      clockEl.innerHTML = [
        '<div class="vclock-main" style="display:' + (loc ? 'block' : 'none') + '">',
          '<div class="vclock-time" style="font-family:Space Grotesk,monospace;font-size:17px;font-weight:700;color:#a5b4fc;letter-spacing:0.02em;line-height:1">',
            (loc ? fmtTime(loc.timezone) : ''),
          '</div>',
          '<div class="vclock-date" style="font-family:JetBrains Mono,monospace;font-size:10px;color:rgba(255,255,255,0.65);letter-spacing:0.05em;margin-top:5px">',
            (loc ? fmtDate(loc.timezone) : ''),
          '</div>',
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:7px;padding-top:7px;border-top:1px solid rgba(99,102,241,0.1)">',
            '<div class="vclock-location" style="font-family:Plus Jakarta Sans,sans-serif;font-size:12px;color:rgba(255,255,255,0.60);line-height:1.3;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">',
              (loc ? loc.city + ', ' + loc.state + ', ' + loc.country : ''),
            '</div>',
            '<button id="vclock-edit-btn" style="background:transparent;border:none;cursor:pointer;color:rgba(99,102,241,0.4);font-size:11px;padding:0 0 0 8px;flex-shrink:0;line-height:1;transition:color 0.15s" title="Change location">&#9998;</button>',
          '</div>',
        '</div>',
        '<div class="vclock-noloc" style="display:' + (loc ? 'none' : 'flex') + ';align-items:center;gap:10px;cursor:pointer" id="vclock-noloc-btn">',
          '<span style="font-size:15px;flex-shrink:0;opacity:0.5">&#128336;</span>',
          '<div>',
            '<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:12px;color:rgba(232,230,255,0.5);font-weight:500">Set your location</div>',
            '<div style="font-family:JetBrains Mono,monospace;font-size:9px;color:rgba(99,102,241,0.45);letter-spacing:0.06em;margin-top:3px">Date &middot; Time &middot; City</div>',
          '</div>',
        '</div>',
      ].join('');

      chip.parentNode.insertBefore(clockEl, chip);

      var editBtn  = document.getElementById('vclock-edit-btn');
      var nolocBtn = document.getElementById('vclock-noloc-btn');
      if (editBtn)  editBtn.addEventListener('click', openPicker);
      if (nolocBtn) nolocBtn.addEventListener('click', openPicker);

      window._vclockOpen = openPicker;

      if (loc) startClock();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectClock);
    } else {
      injectClock();
    }

  })();
  // ── END LOCATION CLOCK ─────────────────────────────────────────────────────

  // ── LEGAL SECTION → BELOW ACCOUNT ─────────────────────────────────────────
  (function() {
    function moveLegalSection() {
      var sections = document.querySelectorAll('.nav-section, .ns, .sb-section');
      var legalHeader = null;
      var accountHeader = null;
      sections.forEach(function(s) {
        var t = s.textContent.trim().toUpperCase();
        if (t === 'LEGAL') legalHeader = s;
        if (t === 'ACCOUNT') accountHeader = s;
      });
      if (!legalHeader || !accountHeader) return;

      function isSectionHeader(el) {
        return el.classList.contains('nav-section') || el.classList.contains('ns') || el.classList.contains('sb-section');
      }

      var legalEls = [legalHeader];
      var cursor = legalHeader.nextElementSibling;
      while (cursor && !isSectionHeader(cursor)) {
        legalEls.push(cursor);
        cursor = cursor.nextElementSibling;
      }

      var accountEnd = accountHeader;
      cursor = accountHeader.nextElementSibling;
      while (cursor &&
             !isSectionHeader(cursor) &&
             !cursor.classList.contains('meridian-chip') &&
             cursor.id !== 'meridian-chip' &&
             cursor.id !== 'vantage-clock') {
        accountEnd = cursor;
        cursor = cursor.nextElementSibling;
      }

      var insertAfter = accountEnd;
      legalEls.forEach(function(el) {
        insertAfter.parentNode.insertBefore(el, insertAfter.nextSibling);
        insertAfter = el;
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', moveLegalSection);
    } else {
      moveLegalSection();
    }
  })();
  // ── END LEGAL SECTION MOVE ─────────────────────────────────────────────────

  // ── POLICY COMPASS → CORE TOOLS ────────────────────────────────────────────
  (function() {
    function movePolicyCompass() {
      var policyLink = document.querySelector('a[href*="policy-compass"]');
      if (!policyLink) return;

      var sections = document.querySelectorAll('.nav-section, .ns, .sb-section');
      var coreHeader = null;
      sections.forEach(function(s) {
        var t = s.textContent.trim().toUpperCase();
        if (t === 'YOUR ACTIVE TOOLS' || t === 'Your Active Tools') coreHeader = s;
      });
      if (!coreHeader) return;

      var cursor = coreHeader.nextElementSibling;
      var lastCoreItem = coreHeader;
      while (cursor && !cursor.classList.contains('nav-section') && !cursor.classList.contains('ns') && !cursor.classList.contains('sb-section')) {
        if (cursor !== policyLink) lastCoreItem = cursor;
        cursor = cursor.nextElementSibling;
      }

      if (lastCoreItem.nextSibling !== policyLink) {
        lastCoreItem.parentNode.insertBefore(policyLink, lastCoreItem.nextSibling);
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', movePolicyCompass);
    } else {
      movePolicyCompass();
    }
  })();
  // ── END POLICY COMPASS MOVE ────────────────────────────────────────────────

  // ── "INTELLIGENCE" SECTION → "THE PROVING GROUND" ────────────────────────
  // Renamed because "Intelligence" as a section label collided with "Offer
  // Intelligence" living in a different section (Core Tools) — a user
  // seeing a tool literally named "Retention Advisor" would reasonably
  // expect it inside a section literally labelled "Intelligence," which
  // wasn't true. The new name describes what ARIA and Conversation
  // Simulator actually are — live rehearsal and coaching sessions, not
  // single-shot generated reports — matching how PACT and MERIDIAN are
  // named for what they mean, not just how they sound.
  (function() {
    function renameIntelligenceSection() {
      var sections = document.querySelectorAll('.nav-section, .ns, .sb-section');
      sections.forEach(function(s) {
        var t = s.textContent.trim().toUpperCase();
        if (t === 'INTELLIGENCE' || t === 'THE PROVING GROUND') {
          s.textContent = 'Your Active Tools';
        }
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', renameIntelligenceSection);
    } else {
      renameIntelligenceSection();
    }
  })();
  // ── END INTELLIGENCE RENAME ───────────────────────────────────────────────

  // ── HUMAC SCORE LINK → MY RECORD SECTION ───────────────────────────────────
  (function() {
    function injectHumacLink() {
      if (document.querySelector('a[href*="humac-onboarding"]')) return;

      var sections = document.querySelectorAll('.nav-section, .ns, .sb-section');
      var myRecordHeader = null;
      sections.forEach(function(s) {
        var t = s.textContent.trim().toUpperCase();
        if (t === 'YOUR RECORD' || t === "YOUR RECORD" || t === 'Your Record') myRecordHeader = s;
      });
      if (!myRecordHeader) return;

      var isOldStyle = !!document.querySelector('.sb-item');
      var link = document.createElement('a');
      link.href = 'humac-onboarding.html';

      if (isOldStyle) {
        link.className = 'sb-item';
        link.innerHTML = '<svg class="sb-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="12" height="12" rx="2"/><path d="M5 11l2-3 2 2 2-4"/></svg>Humac Score';
      } else {
        link.className = 'nav-item';
        link.innerHTML = '<span class="icon">📊</span> Humac Score';
      }

      var firstItem = myRecordHeader.nextElementSibling;
      if (firstItem) {
        myRecordHeader.parentNode.insertBefore(link, firstItem);
      } else {
        myRecordHeader.parentNode.appendChild(link);
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectHumacLink);
    } else {
      injectHumacLink();
    }
  })();
  // ── END HUMAC SCORE LINK ───────────────────────────────────────────────────

})();

/* ── VANTAGE INTRO MODALS ──────────────────────────────────────────────────
   Auto-detects the current page and shows the right first-visit intro modal.
   Modal JS loads dynamically — no extra <script> tag needed on any page. */
(function(){
  var PAGE_MODALS = {
    'aria.html':                   'aria',
    'debrief.html':                'debrief',
    'standpoint.html':                 'ledger',
    'humac-onboarding.html':       'humac',
    'employee-case-advisor.html':      'case-navigator',
    'policy-advisor.html':         'policy-compass',
    'people-roi-brief.html':    'business-case',
    'retention-advisor.html':     'offer-intelligence',
    'difficult-conversations.html': 'conversation-simulator',
    'vantage-record.html':           'case-library'
  };

  var path = window.location.pathname.replace(/\/+$/, '').split('/').pop();
  // Cloudflare serves clean URLs (/policy-advisor with no .html), so add
  // the extension before the lookup or no page ever matches.
  if (path && path.indexOf('.') === -1) path = path + '.html';
  var key  = PAGE_MODALS[path];
  if(!key) return;

  function launchModal(){
    if(typeof window.VantageIntro !== 'undefined'){
      setTimeout(function(){ window.VantageIntro.show(key); }, 800);
      return;
    }
    var s = document.createElement('script');
    s.src = '/vantage-intro-modal.js';
    s.onload = function(){ setTimeout(function(){ window.VantageIntro.show(key); }, 800); };
    document.head.appendChild(s);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', launchModal);
  } else {
    launchModal();
  }
})();

// ── Feedback modal ────────────────────────────────────────────────────────
function openVantageFeedback() {
  if (document.getElementById('vf-overlay')) { document.getElementById('vf-overlay').style.display = 'flex'; return; }
  var ov = document.createElement('div');
  ov.id = 'vf-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(5,4,16,0.88);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  ov.innerHTML = [
    '<div id="vf-modal" style="background:#0d0b1e;border:1px solid rgba(99,102,241,0.25);border-radius:16px;padding:28px 28px 24px;max-width:420px;width:100%;position:relative">',
      '<button onclick="document.getElementById(\'vf-overlay\').style.display=\'none\'" style="position:absolute;top:14px;right:14px;background:none;border:none;color:rgba(255,255,255,0.35);font-size:18px;cursor:pointer;line-height:1">&#x2715;</button>',
      '<div style="font-family:\'Cormorant Garamond\',serif;font-size:22px;font-weight:600;color:#fff;margin-bottom:4px">Share your feedback</div>',
      '<div style="font-size:12px;color:rgba(255,255,255,0.4);font-family:\'JetBrains Mono\',monospace;margin-bottom:20px">Help us make Vantage better</div>',
      '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:rgba(99,102,241,0.75);margin-bottom:8px">How are you feeling?</div>',
      '<div id="vf-mood" style="display:flex;gap:8px;margin-bottom:18px">',
        '<button class="vf-mood-btn" data-val="delighted" onclick="vfPickMood(this)" style="flex:1;padding:10px 6px;border-radius:8px;border:1px solid rgba(99,102,241,0.2);background:rgba(99,102,241,0.05);cursor:pointer;color:rgba(255,255,255,0.7);font-size:13px;transition:all .15s">&#x1F929; Delighted</button>',
        '<button class="vf-mood-btn" data-val="okay"      onclick="vfPickMood(this)" style="flex:1;padding:10px 6px;border-radius:8px;border:1px solid rgba(99,102,241,0.2);background:rgba(99,102,241,0.05);cursor:pointer;color:rgba(255,255,255,0.7);font-size:13px;transition:all .15s">&#x1F610; Okay</button>',
        '<button class="vf-mood-btn" data-val="frustrated" onclick="vfPickMood(this)" style="flex:1;padding:10px 6px;border-radius:8px;border:1px solid rgba(99,102,241,0.2);background:rgba(99,102,241,0.05);cursor:pointer;color:rgba(255,255,255,0.7);font-size:13px;transition:all .15s">&#x1F621; Frustrated</button>',
      '</div>',
      '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:rgba(99,102,241,0.75);margin-bottom:8px">Category</div>',
      '<select id="vf-cat" style="width:100%;padding:10px 12px;background:rgba(255,255,255,0.03);border:1px solid rgba(99,102,241,0.18);border-radius:8px;color:#fff;font-family:\'Plus Jakarta Sans\',sans-serif;font-size:13px;margin-bottom:18px;-webkit-appearance:none">',
        '<option value="" style="background:#0d0b1e;color:#fff">Choose a category&hellip;</option>',
        '<option value="something_broke" style="background:#0d0b1e;color:#fff">Something broke</option>',
        '<option value="loved_it" style="background:#0d0b1e;color:#fff">Loved something</option>',
        '<option value="idea" style="background:#0d0b1e;color:#fff">I have an idea</option>',
        '<option value="other" style="background:#0d0b1e;color:#fff">Other</option>',
      '</select>',
      '<div style="font-family:\'JetBrains Mono\',monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:rgba(99,102,241,0.75);margin-bottom:8px">Tell us more <span style="opacity:.45">(optional)</span></div>',
      '<textarea id="vf-comment" placeholder="What\'s on your mind?" rows="3" style="width:100%;padding:10px 12px;background:rgba(255,255,255,0.03);border:1px solid rgba(99,102,241,0.18);border-radius:8px;color:#fff;font-family:\'Plus Jakarta Sans\',sans-serif;font-size:13px;resize:vertical;margin-bottom:14px;box-sizing:border-box"></textarea>',
      '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;color:rgba(255,255,255,0.45);margin-bottom:18px">',
        '<input type="checkbox" id="vf-anon" style="width:14px;height:14px;cursor:pointer;accent-color:#6366f1">',
        'Send without linking to my account',
      '</label>',
      '<button id="vf-submit" onclick="vfSubmit()" style="width:100%;padding:12px;background:linear-gradient(135deg,#6366f1,#7c3aed);color:#fff;border:none;border-radius:8px;font-family:\'Bricolage Grotesque\',sans-serif;font-weight:600;font-size:14px;cursor:pointer;transition:opacity .2s">Send Feedback</button>',
      '<div id="vf-msg" style="display:none;margin-top:10px;font-family:\'JetBrains Mono\',monospace;font-size:11px;text-align:center;padding:8px 12px;border-radius:6px"></div>',
    '</div>',
  ].join('');
  document.body.appendChild(ov);
}

function vfPickMood(btn) {
  document.querySelectorAll('.vf-mood-btn').forEach(function(b) {
    b.style.borderColor = 'rgba(99,102,241,0.2)';
    b.style.background  = 'rgba(99,102,241,0.05)';
    b.style.color       = 'rgba(255,255,255,0.7)';
  });
  btn.style.borderColor = 'rgba(99,102,241,0.55)';
  btn.style.background  = 'rgba(99,102,241,0.15)';
  btn.style.color       = '#c4b5fd';
}

async function vfSubmit() {
  var mood = document.querySelector('.vf-mood-btn[style*="0.55"]');
  var sentiment = mood ? mood.dataset.val : '';
  var category  = (document.getElementById('vf-cat') || {}).value || '';
  var comment   = ((document.getElementById('vf-comment') || {}).value || '').trim();
  var anon      = !!(document.getElementById('vf-anon') || {}).checked;
  var btn       = document.getElementById('vf-submit');
  var msg       = document.getElementById('vf-msg');

  if (!sentiment) { vfShowMsg('Please pick a mood first.', 'err'); return; }
  if (!category)  { vfShowMsg('Please pick a category.', 'err'); return; }

  btn.disabled = true;
  btn.textContent = 'Sending…';

  try {
    var page = window.location.pathname.split('/').pop() || 'unknown';
    var WORKER = 'https://situation-room-api.kumarvivek-srv.workers.dev';
    var headers = { 'Content-Type': 'application/json' };
    if (!anon && window.Clerk && window.Clerk.session) {
      var tok = await window.Clerk.session.getToken();
      if (tok) headers['Authorization'] = 'Bearer ' + tok;
    }
    var res = await fetch(WORKER, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ tool: 'submit_feedback', sentiment: sentiment, category: category, comment: comment, anonymous: anon, page: page, source: 'button' })
    });
    var data = await res.json();
    if (data.success) {
      vfShowMsg('✓ Thank you—noted!', 'ok');
      btn.style.display = 'none';
      setTimeout(function() { document.getElementById('vf-overlay').style.display = 'none'; }, 1800);
    } else {
      vfShowMsg(data.error || 'Something went wrong. Try again.', 'err');
      btn.disabled = false; btn.textContent = 'Send Feedback';
    }
  } catch(e) {
    vfShowMsg('Connection error. Try again.', 'err');
    btn.disabled = false; btn.textContent = 'Send Feedback';
  }
}

function vfShowMsg(text, type) {
  var el = document.getElementById('vf-msg');
  if (!el) return;
  el.textContent = text;
  el.style.display = 'block';
  el.style.background = type === 'ok' ? 'rgba(99,102,241,0.08)' : 'rgba(255,77,109,0.08)';
  el.style.color      = type === 'ok' ? '#6366f1' : '#FF4D6D';
  el.style.border     = '1px solid ' + (type === 'ok' ? 'rgba(99,102,241,0.2)' : 'rgba(255,77,109,0.2)');
}

