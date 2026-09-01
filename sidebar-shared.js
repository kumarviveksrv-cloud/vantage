// Virorah Vantage — Shared Sidebar Enhancements + PWA

(function() {

  // ── GLOBAL COLOR SYSTEM OVERRIDE ─────────────────────────
  // Unifies Vantage with PMS / Virorah Universe blue-indigo palette
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

    // Sidebar active state
    '.nav-item.active, a.nav-item.active {',
    '  background: rgba(99,102,241,0.12) !important;',
    '  border-color: rgba(99,102,241,0.30) !important;',
    '  color: #a5b4fc !important;',
    '}',

    // Sidebar hover
    '.nav-item:hover, a.nav-item:hover {',
    '  background: rgba(99,102,241,0.08) !important;',
    '  border-color: rgba(99,102,241,0.20) !important;',
    '  color: #c4b5fd !important;',
    '}',

    // Nav section labels
    '.nav-section {',
    '  color: rgba(99,102,241,0.55) !important;',
    '}',

    // Teal accent buttons → indigo
    '[style*="00E5C3"], [style*="0,229,195"] {',
    '  --teal-replace: #6366f1;',
    '}',

    // Primary buttons
    '.btn-primary, button.primary {',
    '  background: linear-gradient(135deg, #6366f1, #7c3aed) !important;',
    '  border-color: transparent !important;',
    '}',

    // Teal text anywhere
    '[style*="color: #00E5C3"], [style*="color:#00E5C3"] {',
    '  color: #6366f1 !important;',
    '}',

    // Card borders
    '.card, .tool-card, .case-card {',
    '  border-color: rgba(99,102,241,0.18) !important;',
    '}',

    // Scrollbar
    '::-webkit-scrollbar-thumb {',
    '  background: linear-gradient(180deg, #6366f1, #7c3aed) !important;',
    '}',

    // Sidebar border
    '.sidebar, #sidebar {',
    '  border-right-color: rgba(99,102,241,0.18) !important;',
    '  background: rgba(5,4,16,0.95) !important;',
    '}',

    // ARIA teal glow → indigo
    '.aria-glow, .voice-indicator {',
    '  border-color: rgba(99,102,241,0.4) !important;',
    '  box-shadow: 0 0 20px rgba(99,102,241,0.25) !important;',
    '}',

    // Humacity card teal border → indigo
    '.humacity-card, .humacity-block {',
    '  border-color: rgba(99,102,241,0.35) !important;',
    '}',

    // Selection highlight
    '::selection {',
    '  background: rgba(99,102,241,0.35) !important;',
    '}',

    // PWA banner teal → indigo
    '#pwa-banner {',
    '  border-color: rgba(99,102,241,0.3) !important;',
    '}',
  ].join('\n');
  document.head.insertBefore(styleOverride, document.head.firstChild);

  // ── MERIDIAN PROFILE LINK INJECTION ──────────────────────
  var dataPrivacyLink = document.querySelector('a[href*="data-dashboard"]');
  var alreadyInjected = document.querySelector('a[href*="onboarding"]');

  // ── PHILOSOPHY & LEGAL SECTION INJECTION ─────────────────
  var alreadyHasPhilosophy = document.querySelector('a[href*="humacity.com"]');
  if (dataPrivacyLink && !alreadyHasPhilosophy) {
    var accountSection = dataPrivacyLink.closest
      ? dataPrivacyLink.parentElement
      : dataPrivacyLink.parentNode;

    var allNavSections = document.querySelectorAll('.nav-section');
    var accountHeading = null;
    allNavSections.forEach(function(el){
      if (el.innerText.trim().toUpperCase() === 'ACCOUNT') accountHeading = el;
    });

    var insertBefore = accountHeading || dataPrivacyLink;
    var parent = insertBefore.parentNode;

    var philSection = document.createElement('div');
    philSection.className = 'nav-section';
    philSection.innerText = 'Philosophy';
    parent.insertBefore(philSection, insertBefore);

    var humacityLink = document.createElement('a');
    humacityLink.href = 'https://humacity.com';
    humacityLink.target = '_blank';
    humacityLink.className = 'nav-item';
    humacityLink.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;transition:all .2s;border:1px solid transparent;text-decoration:none;color:rgba(255,255,255,0.45);font-size:13px;font-family:Plus Jakarta Sans,sans-serif;margin-bottom:2px';
    humacityLink.innerHTML = '<span style="font-size:16px;flex-shrink:0">🌀</span> Humacity';
    parent.insertBefore(humacityLink, insertBefore);

    var legalSection = document.createElement('div');
    legalSection.className = 'nav-section';
    legalSection.innerText = 'Legal';
    parent.insertBefore(legalSection, insertBefore);

    var termsLink = document.createElement('a');
    termsLink.href = 'terms.html';
    termsLink.className = 'nav-item';
    termsLink.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;transition:all .2s;border:1px solid transparent;text-decoration:none;color:rgba(255,255,255,0.45);font-size:13px;font-family:Plus Jakarta Sans,sans-serif;margin-bottom:2px';
    termsLink.innerHTML = '<span style="font-size:16px;flex-shrink:0">📄</span> Terms of Service';
    parent.insertBefore(termsLink, insertBefore);

    var privacyLink2 = document.createElement('a');
    privacyLink2.href = 'privacy.html';
    privacyLink2.className = 'nav-item';
    privacyLink2.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;transition:all .2s;border:1px solid transparent;text-decoration:none;color:rgba(255,255,255,0.45);font-size:13px;font-family:Plus Jakarta Sans,sans-serif;margin-bottom:2px';
    privacyLink2.innerHTML = '<span style="font-size:16px;flex-shrink:0">🔒</span> Privacy Policy';
    parent.insertBefore(privacyLink2, insertBefore);
  }

  if (dataPrivacyLink && !alreadyInjected) {
    var meridianLink = document.createElement('a');
    meridianLink.href = 'onboarding.html';
    meridianLink.className = 'nav-item';
    meridianLink.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;transition:all .2s;border:1px solid transparent;text-decoration:none;color:rgba(255,255,255,0.45);font-size:13px;font-family:Plus Jakarta Sans,sans-serif;margin-bottom:2px';
    meridianLink.innerHTML = '<span style="font-size:16px;flex-shrink:0">🧭</span> MERIDIAN Profile';
    if (window.location.pathname.includes('onboarding')) {
      meridianLink.style.background = 'rgba(99,102,241,0.10)';
      meridianLink.style.borderColor = 'rgba(99,102,241,0.25)';
      meridianLink.style.color = '#a5b4fc';
      meridianLink.style.fontWeight = '500';
    }
    dataPrivacyLink.parentNode.insertBefore(meridianLink, dataPrivacyLink);
  }

  // ── MERIDIAN NOT-CONFIGURED WARNING BANNER ────────────────
  var TOOL_PAGES = [
    'er-case-navigator',
    'stakeholder-influence',
    'hr-data-storyteller',
    'policy-compass',
    'conversation-simulator'
  ];

  var currentPath = window.location.pathname;
  var isToolPage = TOOL_PAGES.some(function(page) {
    return currentPath.includes(page);
  });

  var meridianConfigured = !!sessionStorage.getItem('sr_meridian');
  var bannerDismissed = !!sessionStorage.getItem('meridian_banner_dismissed');

  if (isToolPage && !meridianConfigured && !bannerDismissed) {
    var banner = document.createElement('div');
    banner.id = 'meridian-warning-banner';
    banner.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'right:0',
      'z-index:9998',
      'background:rgba(255,181,71,0.10)',
      'border-bottom:1px solid rgba(255,181,71,0.35)',
      'padding:10px 20px',
      'display:flex',
      'align-items:center',
      'justify-content:space-between',
      'gap:12px',
      'flex-wrap:wrap'
    ].join(';');

    banner.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">' +
        '<span style="font-size:16px;flex-shrink:0">⚠️</span>' +
        '<span style="font-family:Plus Jakarta Sans,sans-serif;font-size:12px;color:rgba(255,181,71,0.95);line-height:1.4">' +
          'Your results will be generic until MERIDIAN is configured. ' +
          '<a href="onboarding.html" style="color:#FFB547;font-weight:600;text-decoration:underline">Set up your 7-parameter profile \u2192</a>' +
          ' \u00a0\u00b7\u00a0 5 minutes.' +
        '</span>' +
      '</div>' +
      '<button onclick="(function(){sessionStorage.setItem(\'meridian_banner_dismissed\',\'1\');var b=document.getElementById(\'meridian-warning-banner\');if(b)b.remove();})()" ' +
        'style="background:transparent;border:none;color:rgba(255,181,71,0.6);font-size:18px;cursor:pointer;flex-shrink:0;line-height:1;padding:0 4px">' +
        '\u00d7' +
      '</button>';

    document.body.insertBefore(banner, document.body.firstChild);

    window.addEventListener('load', function() {
      var bannerEl = document.getElementById('meridian-warning-banner');
      var mainEl = document.querySelector('.main') || document.querySelector('main');
      if (bannerEl && mainEl) {
        mainEl.style.paddingTop = (parseInt(mainEl.style.paddingTop || 0) + bannerEl.offsetHeight) + 'px';
      }
    });
  }

  // ── VIRORAH ATTRIBUTION ───────────────────────────────────
  var chip = document.querySelector('.meridian-chip');
  if (chip) {
    var attribution = document.createElement('div');
    attribution.style.cssText = 'padding-top:10px;margin-top:8px;border-top:1px solid rgba(255,255,255,0.06);text-align:center';
    attribution.innerHTML = '<a href="https://kumarviveksrv-cloud.github.io/virorah/" target="_blank" style="font-family:\'JetBrains Mono\',monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,0.35);text-decoration:none;display:block;transition:color .2s" onmouseover="this.style.color=\'rgba(99,102,241,0.6)\'" onmouseout="this.style.color=\'rgba(255,255,255,0.35)\'">A Virorah Product &#x2197;</a>';
    chip.appendChild(attribution);
  }

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

  addLink('manifest', '/vantage/manifest.json');
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
      navigator.serviceWorker.register('/vantage/sw.js')
        .then(function(reg) { console.log('SW registered:', reg.scope); })
        .catch(function(err) { console.log('SW failed:', err); });
    });
  }

  // ── PWA INSTALL PROMPT ────────────────────────────────────
  var deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;
    if (sessionStorage.getItem('pwa_dismissed')) return;
    setTimeout(showInstallBanner, 3000);
  });

  function showInstallBanner() {
    if (document.getElementById('pwa-banner')) return;
    var banner = document.createElement('div');
    banner.id = 'pwa-banner';
    banner.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0d0b1e;border:1px solid rgba(99,102,241,0.3);border-radius:14px;padding:16px 20px;display:flex;align-items:center;gap:14px;z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,0.4);max-width:380px;width:calc(100% - 48px)';
    banner.innerHTML = '<div style="font-size:28px;flex-shrink:0">📱</div>' +
      '<div style="flex:1"><div style="font-family:Bricolage Grotesque,sans-serif;font-weight:700;font-size:14px;color:#fff;margin-bottom:3px">Install Vantage</div>' +
      '<div style="font-size:12px;color:rgba(255,255,255,0.45);line-height:1.4">Add to home screen for instant access — works offline too.</div></div>' +
      '<div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">' +
      '<button onclick="installPWA()" style="padding:8px 14px;background:linear-gradient(135deg,#6366f1,#7c3aed);color:#fff;font-family:Bricolage Grotesque,sans-serif;font-weight:700;font-size:12px;border:none;border-radius:7px;cursor:pointer">Install</button>' +
      '<button onclick="dismissPWA()" style="padding:6px 14px;background:transparent;color:rgba(255,255,255,0.35);font-size:11px;border:none;cursor:pointer">Not now</button>' +
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
  // Injects a native-style bottom navigation bar on mobile only
  // Replaces the hidden sidebar with a proper mobile nav pattern

  function injectMobileNav() {
    if (window.innerWidth > 768) return;

    // Determine active page
    var path = window.location.pathname;
    function isActive(page) { return path.includes(page); }

    // Bottom nav CSS
    var style = document.createElement('style');
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
      '    gap: 4px;',
      '    padding: 4px 12px;',
      '    text-decoration: none;',
      '    cursor: pointer;',
      '    flex: 1;',
      '    border: none;',
      '    background: transparent;',
      '    -webkit-tap-highlight-color: transparent;',
      '  }',
      '  .vbn-icon {',
      '    font-size: 20px;',
      '    line-height: 1;',
      '    transition: transform 0.2s ease;',
      '  }',
      '  .vbn-label {',
      '    font-family: "JetBrains Mono", monospace;',
      '    font-size: 9px;',
      '    letter-spacing: 0.04em;',
      '    text-transform: uppercase;',
      '    color: rgba(244,243,255,0.35);',
      '    transition: color 0.2s ease;',
      '    white-space: nowrap;',
      '  }',
      '  .vbn-item.active .vbn-label {',
      '    color: #a5b4fc;',
      '  }',
      '  .vbn-item.active .vbn-icon {',
      '    transform: scale(1.15);',
      '  }',
      '  .vbn-item:not(.active):hover .vbn-label {',
      '    color: rgba(244,243,255,0.6);',
      '  }',
      '  /* More drawer overlay */',
      '  .vbn-drawer-overlay {',
      '    display: none;',
      '    position: fixed;',
      '    inset: 0;',
      '    background: rgba(5,4,16,0.7);',
      '    z-index: 9991;',
      '    backdrop-filter: blur(4px);',
      '    -webkit-backdrop-filter: blur(4px);',
      '    animation: vbnFadeIn 0.2s ease;',
      '  }',
      '  @keyframes vbnFadeIn { from { opacity: 0; } to { opacity: 1; } }',
      '  @keyframes vbnSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }',
      '  .vbn-drawer-overlay.open { display: block; }',
      '  .vbn-drawer {',
      '    position: absolute;',
      '    bottom: 0;',
      '    left: 0;',
      '    right: 0;',
      '    background: #0d0b1e;',
      '    border-top: 1px solid rgba(99,102,241,0.25);',
      '    border-radius: 20px 20px 0 0;',
      '    padding: 12px 0 calc(80px + env(safe-area-inset-bottom, 0px)) 0;',
      '    animation: vbnSlideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1);',
      '  }',
      '  .vbn-drawer-handle {',
      '    width: 36px;',
      '    height: 4px;',
      '    background: rgba(255,255,255,0.15);',
      '    border-radius: 2px;',
      '    margin: 0 auto 16px;',
      '  }',
      '  .vbn-drawer-title {',
      '    font-family: "JetBrains Mono", monospace;',
      '    font-size: 9px;',
      '    letter-spacing: 0.12em;',
      '    text-transform: uppercase;',
      '    color: rgba(99,102,241,0.6);',
      '    padding: 0 20px 10px;',
      '    border-bottom: 1px solid rgba(99,102,241,0.08);',
      '    margin-bottom: 8px;',
      '  }',
      '  .vbn-drawer-item {',
      '    display: flex;',
      '    align-items: center;',
      '    gap: 14px;',
      '    padding: 14px 20px;',
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
      '  .vbn-drawer-icon { font-size: 18px; flex-shrink: 0; }',
      '  .vbn-drawer-label { flex: 1; }',
      '  .vbn-drawer-sub {',
      '    font-size: 11px;',
      '    color: rgba(244,243,255,0.28);',
      '    font-family: "JetBrains Mono", monospace;',
      '    letter-spacing: 0.04em;',
      '  }',
      '  /* Push page content above bottom nav */',
      '  .main, main, .main-content, body > div:not(.vantage-bottom-nav):not(.vbn-drawer-overlay) {',
      '    padding-bottom: calc(70px + env(safe-area-inset-bottom, 0px)) !important;',
      '  }',
      '}',
    ].join('\n');
    document.head.appendChild(style);

    // Build bottom nav HTML
    var navItems = [
      { icon: '\u229E', label: 'Home',    href: 'dashboard.html',         page: 'dashboard' },
      { icon: '\u26A1', label: 'Cases',   href: 'er-case-navigator.html', page: 'er-case-navigator' },
      { icon: '\u2726', label: 'ARIA',    href: 'aria.html',              page: 'aria' },
      { icon: '\u25CE', label: 'Library', href: 'case-library.html',      page: 'case-library' },
      { icon: '\u22EF', label: 'More',    href: null,                     page: 'more' },
    ];

    var drawerItems = [
      { icon: '\uD83C\uDFAD', label: 'Conversation Simulator', sub: 'Practice before the real thing', href: 'conversation-simulator.html', page: 'conversation-simulator' },
      { icon: '\uD83D\uDCCA', label: 'HR Data Storyteller',    sub: 'SIGNAL framework',               href: 'hr-data-storyteller.html',   page: 'hr-data-storyteller' },
      { icon: '\uD83E\uDDED', label: 'Policy Compass',         sub: 'BNS · BNSS · BSA',               href: 'policy-compass.html',        page: 'policy-compass' },
      { icon: '\uD83C\uDFAF', label: 'Stakeholder Influence',  sub: 'INFLUENCE stack',                href: 'stakeholder-influence.html', page: 'stakeholder-influence' },
      { icon: '\uD83D\uDCCB', label: 'The Debrief',            sub: 'Monthly intelligence brief',     href: 'debrief.html',               page: 'debrief' },
      { icon: '\uD83D\uDD12', label: 'Data & Privacy',         sub: 'Your data settings',             href: 'data-dashboard.html',        page: 'data-dashboard' },
      { icon: '\u21A9',        label: 'Sign Out',               sub: '',                               href: 'access.html',                page: 'signout', signout: true },
    ];

    // Check if any drawer item is active
    var drawerActive = drawerItems.some(function(d) { return d.page !== 'signout' && path.includes(d.page); });

    // Build nav
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
        a.innerHTML = '<span class="vbn-icon">' + item.icon + '</span><span class="vbn-label">' + item.label + '</span>';
        nav.appendChild(a);
      } else {
        // More button
        var btn = document.createElement('button');
        btn.className = 'vbn-item' + (active ? ' active' : '');
        btn.innerHTML = '<span class="vbn-icon">' + item.icon + '</span><span class="vbn-label">' + item.label + '</span>';
        btn.onclick = function(e) { e.stopPropagation(); toggleDrawer(); };
        nav.appendChild(btn);
      }
    });

    document.body.appendChild(nav);

    // Build drawer overlay
    var overlay = document.createElement('div');
    overlay.className = 'vbn-drawer-overlay';

    var drawer = document.createElement('div');
    drawer.className = 'vbn-drawer';
    drawer.innerHTML = '<div class="vbn-drawer-handle"></div><div class="vbn-drawer-title">More tools</div>';

    drawerItems.forEach(function(item) {
      var active = item.page !== 'signout' && path.includes(item.page);
      var a = document.createElement('a');
      a.className = 'vbn-drawer-item' + (active ? ' active' : '');
      a.href = item.href;
      if (item.signout) { a.onclick = function() { sessionStorage.clear(); }; }
      a.innerHTML = [
        '<span class="vbn-drawer-icon">' + item.icon + '</span>',
        '<span class="vbn-drawer-label">' + item.label + (item.sub ? '<br><span class="vbn-drawer-sub">' + item.sub + '</span>' : '') + '</span>',
      ].join('');
      drawer.appendChild(a);
    });

    overlay.appendChild(drawer);
    document.body.appendChild(overlay);

    // Drawer toggle
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeDrawer();
    });

    function toggleDrawer() {
      if (overlay.classList.contains('open')) closeDrawer();
      else openDrawer();
    }
    function openDrawer()  { overlay.classList.add('open'); }
    function closeDrawer() { overlay.classList.remove('open'); }

    // Close drawer on nav item click
    drawer.querySelectorAll('.vbn-drawer-item').forEach(function(el) {
      el.addEventListener('click', closeDrawer);
    });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectMobileNav);
  } else {
    injectMobileNav();
  }
  window.addEventListener('resize', function() {
    var existing = document.querySelector('.vantage-bottom-nav');
    if (window.innerWidth > 768 && existing) existing.remove();
  });


  // ── LOCATION CLOCK ─────────────────────────────────────────────────────────
  // Displays live time, date, and user-selected city/state/country.
  // Privacy-first: no geolocation. User picks from a list. Stored in localStorage.
  // Architecture: timezone (IANA key) drives time. Location display (city/state/country)
  // is a separate label. Adding global cities later = add rows to LOCATIONS array only.

  (function() {
    var LS_KEY = 'vantage_clock_location';
    var clockInterval = null;
    var clockEl = null;

    // ── LOCATION DATA ─────────────────────────────────────────────────────────
    // Format: [City, State, Country, IANA Timezone]
    // India phase: all IST (Asia/Kolkata). Global phase: add new rows with correct tz.
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

    // ── HELPERS ───────────────────────────────────────────────────────────────

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

    // ── CLOCK TICK ────────────────────────────────────────────────────────────

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

    // ── CITY PICKER MODAL ─────────────────────────────────────────────────────

    function openPicker() {
      if (document.getElementById('vclock-modal')) return;
      var overlay = document.createElement('div');
      overlay.id = 'vclock-modal';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:flex-end;justify-content:center;background:rgba(5,4,16,0.85);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)';

      var panel = document.createElement('div');
      panel.style.cssText = 'width:100%;max-width:440px;background:#0d0b1e;border:1px solid rgba(99,102,241,0.25);border-radius:20px 20px 0 0;display:flex;flex-direction:column;max-height:80vh';

      panel.innerHTML = [
        '<div style="padding:20px 20px 14px;border-bottom:1px solid rgba(99,102,241,0.1);flex-shrink:0">',
          '<div style="width:36px;height:4px;background:rgba(255,255,255,0.12);border-radius:2px;margin:0 auto 14px"></div>',
          '<div style="font-family:Bricolage Grotesque,sans-serif;font-weight:700;font-size:15px;color:#fff;margin-bottom:3px">Set your location</div>',
          '<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:12px;color:rgba(255,255,255,0.35);line-height:1.5">Date and time display only. No location tracking. Nothing leaves your device.</div>',
        '</div>',
        '<div style="padding:12px 20px 8px;flex-shrink:0">',
          '<input id="vclock-search" type="text" placeholder="Search city or state\u2026" autocomplete="off"',
            ' style="width:100%;box-sizing:border-box;background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.2);border-radius:8px;padding:10px 14px;',
            'font-family:Plus Jakarta Sans,sans-serif;font-size:13px;color:#e8e6ff;outline:none;caret-color:#a5b4fc"',
          '/>',
        '</div>',
        '<div id="vclock-list" style="overflow-y:auto;padding:4px 12px 20px;flex:1"></div>',
      ].join('');

      overlay.appendChild(panel);
      document.body.appendChild(overlay);

      overlay.addEventListener('click', function(e) { if (e.target === overlay) closePicker(); });

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
        list.innerHTML = '<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:13px;color:rgba(255,255,255,0.25);text-align:center;padding:28px 0">No cities found</div>';
        return;
      }

      list.innerHTML = '';
      filtered.forEach(function(r) {
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:11px 10px;border-radius:8px;cursor:pointer;transition:background 0.12s;margin-bottom:1px';
        row.innerHTML = [
          '<div>',
            '<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:13px;font-weight:500;color:rgba(232,230,255,0.9)">' + r[0] + '</div>',
            '<div style="font-family:JetBrains Mono,monospace;font-size:10px;color:rgba(99,102,241,0.55);letter-spacing:0.04em;margin-top:2px">' + r[1] + ' &middot; ' + r[2] + '</div>',
          '</div>',
          '<div style="font-family:JetBrains Mono,monospace;font-size:9px;color:rgba(255,255,255,0.18);letter-spacing:0.08em">IST</div>',
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

    // ── CLOCK WIDGET RENDER ───────────────────────────────────────────────────

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
      // Anchor: .meridian-chip — the sidebar footer card present on all tool pages
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
        // ── Set state: location configured ──
        '<div class="vclock-main" style="display:' + (loc ? 'block' : 'none') + '">',
          '<div class="vclock-time" style="font-family:Space Grotesk,monospace;font-size:17px;font-weight:700;color:#a5b4fc;letter-spacing:0.02em;line-height:1">',
            (loc ? fmtTime(loc.timezone) : ''),
          '</div>',
          '<div class="vclock-date" style="font-family:JetBrains Mono,monospace;font-size:10px;color:rgba(255,255,255,0.38);letter-spacing:0.05em;margin-top:5px">',
            (loc ? fmtDate(loc.timezone) : ''),
          '</div>',
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:7px;padding-top:7px;border-top:1px solid rgba(99,102,241,0.1)">',
            '<div class="vclock-location" style="font-family:Plus Jakarta Sans,sans-serif;font-size:11px;color:rgba(255,255,255,0.3);line-height:1.3;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">',
              (loc ? loc.city + ', ' + loc.state + ', ' + loc.country : ''),
            '</div>',
            '<button id="vclock-edit-btn" style="background:transparent;border:none;cursor:pointer;color:rgba(99,102,241,0.4);font-size:11px;padding:0 0 0 8px;flex-shrink:0;line-height:1;transition:color 0.15s" title="Change location">&#9998;</button>',
          '</div>',
        '</div>',
        // ── Empty state: no location set ──
        '<div class="vclock-noloc" style="display:' + (loc ? 'none' : 'flex') + ';align-items:center;gap:10px;cursor:pointer" id="vclock-noloc-btn">',
          '<span style="font-size:15px;flex-shrink:0;opacity:0.5">&#128336;</span>',
          '<div>',
            '<div style="font-family:Plus Jakarta Sans,sans-serif;font-size:12px;color:rgba(232,230,255,0.5);font-weight:500">Set your location</div>',
            '<div style="font-family:JetBrains Mono,monospace;font-size:9px;color:rgba(99,102,241,0.45);letter-spacing:0.06em;margin-top:3px">Date &middot; Time &middot; City</div>',
          '</div>',
        '</div>',
      ].join('');

      // Inject just before the meridian-chip in the DOM
      chip.parentNode.insertBefore(clockEl, chip);

      // Bind events
      var editBtn  = document.getElementById('vclock-edit-btn');
      var nolocBtn = document.getElementById('vclock-noloc-btn');
      if (editBtn)  editBtn.addEventListener('click', openPicker);
      if (nolocBtn) nolocBtn.addEventListener('click', openPicker);

      // Expose globally for any page-level code that needs it
      window._vclockOpen = openPicker;

      if (loc) startClock();
    }

    // Run after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectClock);
    } else {
      injectClock();
    }

  })();
  // ── END LOCATION CLOCK ─────────────────────────────────────────────────────

})();
