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

})();
