// Virorah Vantage — Shared Sidebar Enhancements + PWA

(function() {

  // ── VIRORAH VANTAGE LOGO MARK ────────────────────────────────────────────────
  (function injectLogoMark() {
    var logoEl = document.querySelector('.logo');
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

  // ── PLATFORM TOUR + OVERVIEW SECTION ─────────────────────
  var dashLink = document.querySelector('.sb a.ni[href="dashboard.html"],a.ni[href="dashboard.html"],.sidebar a.nav-item[href="dashboard.html"],a.nav-item[href="dashboard.html"]');
  var alreadyHasOverview = document.getElementById('vs-overview');
  if (dashLink && !alreadyHasOverview) {
    var overview = document.createElement('div');
    overview.id = 'vs-overview';

    var tourBtn = document.createElement('a');
    tourBtn.href = 'platform-tour.html';
    tourBtn.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:8px;cursor:pointer;transition:all .2s;border:1px solid rgba(99,102,241,0.18);text-decoration:none;color:rgba(255,255,255,0.6);font-size:13px;font-family:Plus Jakarta Sans,sans-serif;background:rgba(99,102,241,0.06);margin-bottom:10px';
    tourBtn.innerHTML = '<span style="display:flex;align-items:center;gap:10px"><span style="font-size:15px">🗺</span>Platform Tour</span><span style="font-family:JetBrains Mono,monospace;font-size:8px;letter-spacing:.08em;background:#6366f1;color:#fff;padding:2px 7px;border-radius:4px;font-weight:600">START</span>';

    var overviewNs = document.createElement('div');
    overviewNs.className = 'nav-section';
    overviewNs.style.cssText = 'font-family:JetBrains Mono,monospace;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.2);padding:4px 10px;margin:0 0 6px';
    overviewNs.innerText = 'Overview';

    var isOnAbout = window.location.pathname.includes('about');
    var isOnDash  = window.location.pathname.includes('dashboard') || window.location.pathname === '/' || window.location.pathname.endsWith('/vantage/');

    var homeLink = document.createElement('a');
    homeLink.href = 'dashboard.html';
    homeLink.className = 'nav-item' + (isOnDash ? ' active' : '');
    homeLink.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;transition:all .2s;border:1px solid transparent;text-decoration:none;color:rgba(255,255,255,.45);font-size:13px;font-family:Plus Jakarta Sans,sans-serif;margin-bottom:2px';
    homeLink.innerHTML = '<span style="font-size:16px;flex-shrink:0">⊞</span>Home';

    var aboutLink = document.createElement('a');
    aboutLink.href = 'about.html';
    aboutLink.className = 'nav-item' + (isOnAbout ? ' active' : '');
    aboutLink.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;transition:all .2s;border:1px solid transparent;text-decoration:none;color:rgba(255,255,255,.45);font-size:13px;font-family:Plus Jakarta Sans,sans-serif;margin-bottom:10px';
    aboutLink.innerHTML = '<span style="font-size:16px;flex-shrink:0">✦</span>About Vantage';

    overview.appendChild(tourBtn);
    overview.appendChild(overviewNs);
    overview.appendChild(homeLink);
    overview.appendChild(aboutLink);

    dashLink.parentNode.insertBefore(overview, dashLink);
    dashLink.style.display = 'none';
  }

  // ── LEDGER NAV INJECTION ──────────────────────────────────
  var clNavLink = document.querySelector('a[href="vantage-record.html"]');
  var alreadyHasLedger = document.querySelector('a[href="standpoint.html"]');
  if (clNavLink && !alreadyHasLedger) {
    var currentPage2 = window.location.pathname.split('/').pop();
    var ledgerLink = document.createElement('a');
    ledgerLink.href = 'standpoint.html';
    var isNiClass2 = clNavLink.classList.contains('ni');
    ledgerLink.className = isNiClass2 ? 'ni' : 'nav-item';
    if (currentPage2 === 'standpoint.html') ledgerLink.className += ' active';
    ledgerLink.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;transition:all .2s;border:1px solid transparent;text-decoration:none;color:rgba(255,255,255,0.65);font-size:13px;font-family:Plus Jakarta Sans,sans-serif;margin-bottom:2px';
    ledgerLink.innerHTML = '<span style="font-size:16px;flex-shrink:0">\u{1F4DC}</span> Standpoint';
    clNavLink.parentNode.insertBefore(ledgerLink, clNavLink.nextSibling);
  }

  // ── OFFER INTELLIGENCE NAV INJECTION ─────────────────────
  var siNavLink = document.querySelector('a[href="leadership-communicator.html"]');
  var alreadyHasOI = document.querySelector('a[href="retention-advisor.html"]');
  if (siNavLink && !alreadyHasOI) {
    var currentPage = window.location.pathname.split('/').pop();
    var oiLink = document.createElement('a');
    oiLink.href = 'retention-advisor.html';
    var isNiClass = siNavLink.classList.contains('ni');
    oiLink.className = isNiClass ? 'ni' : 'nav-item';
    if (currentPage === 'retention-advisor.html') oiLink.className += ' active';
    oiLink.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;transition:all .2s;border:1px solid transparent;text-decoration:none;color:rgba(255,255,255,0.65);font-size:13px;font-family:Plus Jakarta Sans,sans-serif;margin-bottom:2px';
    oiLink.innerHTML = '<span style="font-size:16px;flex-shrink:0">\u2696\uFE0F</span> Retention Advisor';
    siNavLink.parentNode.insertBefore(oiLink, siNavLink.nextSibling);
  }

  // ── MERIDIAN PROFILE LINK INJECTION ──────────────────────
  var dataPrivacyLink = document.querySelector('a[href*="data-dashboard"]');
  var alreadyInjected = document.querySelector('.nav-item[href*="onboarding"],.ni[href*="onboarding"]');

  // ── PHILOSOPHY & LEGAL SECTION INJECTION ─────────────────
  var alreadyHasPhilosophy = document.querySelector('a[href*="humacity.com"]');
  if (dataPrivacyLink && !alreadyHasPhilosophy) {
    var accountSection = dataPrivacyLink.closest
      ? dataPrivacyLink.parentElement
      : dataPrivacyLink.parentNode;

    var allNavSections = document.querySelectorAll('.nav-section, .ns');
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
    humacityLink.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;transition:all .2s;border:1px solid transparent;text-decoration:none;color:rgba(255,255,255,0.72);font-size:13px;font-family:Plus Jakarta Sans,sans-serif;margin-bottom:2px';
    humacityLink.innerHTML = '<span style="font-size:16px;flex-shrink:0">🌀</span> Humacity';
    parent.insertBefore(humacityLink, insertBefore);

    var legalSection = document.createElement('div');
    legalSection.className = 'nav-section';
    legalSection.innerText = 'Legal';
    parent.insertBefore(legalSection, insertBefore);

    var termsLink = document.createElement('a');
    termsLink.href = 'terms.html';
    termsLink.className = 'nav-item';
    termsLink.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;transition:all .2s;border:1px solid transparent;text-decoration:none;color:rgba(255,255,255,0.72);font-size:13px;font-family:Plus Jakarta Sans,sans-serif;margin-bottom:2px';
    termsLink.innerHTML = '<span style="font-size:16px;flex-shrink:0">📄</span> Terms of Service';
    parent.insertBefore(termsLink, insertBefore);

    var privacyLink2 = document.createElement('a');
    privacyLink2.href = 'privacy.html';
    privacyLink2.className = 'nav-item';
    privacyLink2.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;transition:all .2s;border:1px solid transparent;text-decoration:none;color:rgba(255,255,255,0.72);font-size:13px;font-family:Plus Jakarta Sans,sans-serif;margin-bottom:2px';
    privacyLink2.innerHTML = '<span style="font-size:16px;flex-shrink:0">🔒</span> Privacy Policy';
    parent.insertBefore(privacyLink2, insertBefore);
  }

  if (dataPrivacyLink && !alreadyInjected) {
    var meridianLink = document.createElement('a');
    meridianLink.href = 'onboarding.html';
    meridianLink.className = 'nav-item';
    meridianLink.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;transition:all .2s;border:1px solid transparent;text-decoration:none;color:rgba(255,255,255,0.72);font-size:13px;font-family:Plus Jakarta Sans,sans-serif;margin-bottom:2px';
    meridianLink.innerHTML = '<span style="font-size:16px;flex-shrink:0">🧭</span> MERIDIAN Profile';
    if (window.location.pathname.includes('onboarding')) {
      meridianLink.style.background = 'rgba(99,102,241,0.10)';
      meridianLink.style.borderColor = 'rgba(99,102,241,0.25)';
      meridianLink.style.color = '#a5b4fc';
      meridianLink.style.fontWeight = '500';
    }
    dataPrivacyLink.parentNode.insertBefore(meridianLink, dataPrivacyLink);
  }

  // ── PRICING LINK + BILLING STATUS ────────────────────────
  var alreadyHasPricing = document.querySelector('a[href*="pricing"]');
  if (dataPrivacyLink && !alreadyHasPricing) {
    function _getBillingStatus() {
      try {
        var plan = JSON.parse(localStorage.getItem('vantage_plan') || 'null');
        if (!plan) return { label: 'Early Access', color: 'rgba(255,181,71,.85)', bg: 'rgba(255,181,71,.1)' };
        if (plan.status === 'active') {
          var tier = plan.tier === 'consultant' ? 'Consultant' : 'Core';
          return { label: 'Active \u00b7 ' + tier, color: 'rgba(74,222,128,.85)', bg: 'rgba(74,222,128,.1)' };
        }
        return { label: 'Inactive', color: 'rgba(248,113,113,.85)', bg: 'rgba(248,113,113,.1)' };
      } catch(e) {
        return { label: 'Early Access', color: 'rgba(255,181,71,.85)', bg: 'rgba(255,181,71,.1)' };
      }
    }
    var _billing = _getBillingStatus();
    var _isOnPricing = window.location.pathname.includes('pricing');

    var pricingLink = document.createElement('a');
    pricingLink.href = 'pricing.html';
    pricingLink.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:6px;padding:10px 12px;border-radius:8px;cursor:pointer;transition:all .2s;border:1px solid transparent;text-decoration:none;color:rgba(255,255,255,.45);font-size:13px;font-family:Plus Jakarta Sans,sans-serif;margin-bottom:2px';
    if (_isOnPricing) {
      pricingLink.style.background = 'rgba(99,102,241,0.10)';
      pricingLink.style.borderColor = 'rgba(99,102,241,0.25)';
      pricingLink.style.color = '#a5b4fc';
      pricingLink.style.fontWeight = '500';
    }
    pricingLink.innerHTML =
      '<span style="display:flex;align-items:center;gap:10px;min-width:0">' +
        '<span style="font-size:16px;flex-shrink:0">🪙</span>' +
        '<span>Pricing</span>' +
      '</span>' +
      '<span style="font-family:JetBrains Mono,monospace;font-size:8px;letter-spacing:.04em;' +
        'background:' + _billing.bg + ';color:' + _billing.color + ';' +
        'padding:2px 6px;border-radius:4px;white-space:nowrap;flex-shrink:0">' +
        _billing.label +
      '</span>';

    dataPrivacyLink.parentNode.insertBefore(pricingLink, dataPrivacyLink);
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

  // FIX: sessionStorage['sr_meridian'] only gets set during onboarding's own
  // completion flow within that session — it does not survive a closed
  // browser. A returning user with a genuinely saved profile would see this
  // return empty on a fresh session and get a false "your results will be
  // generic" warning, even though real MERIDIAN data exists in the backend.
  // Falls back to the cross-session localStorage backup, and repopulates
  // sessionStorage from it so any OTHER code on the page reading
  // sr_meridian directly (e.g. the meridian-chip display) also self-heals,
  // not just this one check.
  function isMeridianConfigured() {
    if (sessionStorage.getItem('sr_meridian')) return true;
    var email = sessionStorage.getItem('sr_user_email') || localStorage.getItem('sr_user_email');
    if (email) {
      var backup = localStorage.getItem('sr_meridian_' + email);
      if (backup) {
        sessionStorage.setItem('sr_meridian', backup);
        return true;
      }
    }
    return false;
  }
  var meridianConfigured = isMeridianConfigured();
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

    // FIX: dismiss button now calls a named function that restores the exact
    // padding this banner added, instead of just removing the element and
    // leaving .main permanently padded for the rest of the session.
    banner.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">' +
        '<span style="font-size:16px;flex-shrink:0">⚠️</span>' +
        '<span style="font-family:Plus Jakarta Sans,sans-serif;font-size:12px;color:rgba(255,181,71,0.95);line-height:1.4">' +
          'Your results will be generic until MERIDIAN is configured. ' +
          '<a href="onboarding.html" style="color:#FFB547;font-weight:600;text-decoration:underline">Set up your 7-parameter profile \u2192</a>' +
          ' \u00a0\u00b7\u00a0 5 minutes.' +
        '</span>' +
      '</div>' +
      '<button onclick="window.vantageDismissMeridianBanner()" ' +
        'style="background:transparent;border:none;color:rgba(255,181,71,0.6);font-size:18px;cursor:pointer;flex-shrink:0;line-height:1;padding:0 4px">' +
        '\u00d7' +
      '</button>';

    document.body.insertBefore(banner, document.body.firstChild);

    window.addEventListener('load', function() {
      var bannerEl = document.getElementById('meridian-warning-banner');
      var mainEl = document.querySelector('.main') || document.querySelector('main');
      if (bannerEl && mainEl) {
        var addedHeight = bannerEl.offsetHeight;
        mainEl.setAttribute('data-meridian-banner-padding', String(addedHeight));
        mainEl.style.paddingTop = (parseInt(mainEl.style.paddingTop || 0) + addedHeight) + 'px';
      }
    });

    window.vantageDismissMeridianBanner = function() {
      sessionStorage.setItem('meridian_banner_dismissed', '1');
      var b = document.getElementById('meridian-warning-banner');
      if (b) b.remove();
      var mainEl = document.querySelector('.main') || document.querySelector('main');
      if (mainEl) {
        var addedHeight = parseInt(mainEl.getAttribute('data-meridian-banner-padding') || '0', 10);
        if (addedHeight > 0) {
          mainEl.style.paddingTop = (parseInt(mainEl.style.paddingTop || 0) - addedHeight) + 'px';
          mainEl.removeAttribute('data-meridian-banner-padding');
        }
      }
    };
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
      '<div style="font-size:12px;color:rgba(255,255,255,0.70);line-height:1.4">Add to home screen for instant access — works offline too.</div></div>' +
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
    // FIX: no other injection in this file lacks this check — without it,
    // any second call to this function (e.g. from the resize fix below)
    // would create a duplicate nav bar, duplicate style tag, and duplicate
    // drawer overlay stacking on top of the originals.
    if (document.querySelector('.vantage-bottom-nav')) return;

    var path = window.location.pathname;
    function isActive(page) { return path.includes(page); }

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
      '    color: rgba(244,243,255,0.62);',
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
      '    max-height: 75vh;',
      '    overflow-y: auto;',
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
      '    padding: 10px 20px 8px;',
      '  }',
      '  .vbn-drawer-title:first-of-type {',
      '    padding-top: 0;',
      '  }',
      '  .vbn-drawer-item {',
      '    display: flex;',
      '    align-items: center;',
      '    gap: 14px;',
      '    padding: 12px 20px;',
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
      '  .main, main, .main-content, body > div:not(.vantage-bottom-nav):not(.vbn-drawer-overlay) {',
      '    padding-bottom: calc(70px + env(safe-area-inset-bottom, 0px)) !important;',
      '  }',
      '}',
    ].join('\n');
    document.head.appendChild(style);

    var navItems = [
      { icon: '\u229E', label: 'Home',    href: 'dashboard.html',         page: 'dashboard' },
      { icon: '\u26A1', label: 'Cases',   href: 'employee-case-advisor.html', page: 'er-case-navigator' },
      { icon: '\u2726', label: 'ARIA',    href: 'aria.html',              page: 'aria' },
      { icon: '\u25CE', label: 'Record',  href: 'vantage-record.html',      page: 'case-library' },
      { icon: '\u22EF', label: 'More',    href: null,                     page: 'more' },
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
          { icon: '\uD83D\uDDFA', label: 'Platform Tour', sub: 'Guided walkthrough', href: 'platform-tour.html', page: 'platform-tour' },
          { icon: '\u2139\uFE0F', label: 'About Vantage', sub: '', href: 'about.html', page: 'about' },
        ]
      },
      {
        title: 'Your Foundation',
        items: [
          { icon: '\u2B21', label: 'MERIDIAN Profile', sub: '7-parameter context', href: 'onboarding.html', page: 'onboarding' },
          { icon: '\uD83D\uDCC8', label: 'Humac Score', sub: 'Your people finance number', href: 'humac-onboarding.html', page: 'humac-onboarding' },
        ]
      },
      {
        title: 'Your Active Tools',
        items: [
          { icon: '\u26A1', label: 'Employee Case Advisor', sub: 'Navigate any employee situation', href: 'employee-case-advisor.html', page: 'er-case-navigator' },
          { icon: '\uD83D\uDCCA', label: 'People ROI Brief', sub: 'HR metrics to boardroom argument', href: 'people-roi-brief.html', page: 'hr-data-storyteller' },
          { icon: '\uD83C\uDFAF', label: 'Leadership Communicator', sub: 'Frame the right conversation', href: 'leadership-communicator.html', page: 'stakeholder-influence' },
          { icon: '\uD83C\uDFAD', label: 'Difficult Conversations', sub: 'Rehearse before you walk in', href: 'difficult-conversations.html', page: 'conversation-simulator' },
          { icon: '\uD83E\uDDED', label: 'Policy Advisor', sub: 'Applicable law, every time', href: 'policy-advisor.html', page: 'policy-compass' },
          { icon: '\u2696\uFE0F', label: 'Retention Advisor', sub: 'Stay or go — model the cost', href: 'retention-advisor.html', page: 'offer-intelligence' },
          { icon: '\u2726', label: 'ARIA', sub: 'Your private HR intelligence ally', href: 'aria.html', page: 'aria' },
        ]
      },
      {
        title: 'Your Record',
        items: [
          { icon: '\u25CE', label: 'Vantage Record', sub: 'Your complete case archive', href: 'vantage-record.html', page: 'case-library' },
          { icon: '\uD83D\uDCDC', label: 'Standpoint', sub: 'File your position before the outcome', href: 'standpoint.html', page: 'ledger' },
          { icon: '\uD83D\uDCCB', label: 'The Debrief', sub: 'Auto-generated monthly', href: 'debrief.html', page: 'debrief' },
        ]
      },
      {
        title: 'Philosophy',
        items: [
          { icon: '\uD83C\uDF00', label: 'Humacity', sub: '', href: 'https://humacity.com', page: 'humacity', external: true },
        ]
      },
      {
        title: 'Legal',
        items: [
          { icon: '\uD83D\uDCC4', label: 'Terms of Service', sub: '', href: 'terms.html', page: 'terms' },
          { icon: '\uD83D\uDD12', label: 'Privacy Policy', sub: '', href: 'privacy.html', page: 'privacy' },
        ]
      },
      {
        title: 'Account',
        items: [
          { icon: '\uD83E\uDDED', label: 'MERIDIAN Profile', sub: '', href: 'onboarding.html', page: 'onboarding' },
          { icon: '\uD83E\uDE99', label: 'Pricing', sub: '', href: 'pricing.html', page: 'pricing' },
          { icon: '\uD83D\uDD12', label: 'Data & Privacy', sub: 'Your data settings', href: 'data-dashboard.html', page: 'data-dashboard' },
          { icon: '\u21A9', label: 'Sign Out', sub: '', href: 'access.html', page: 'signout', signout: true },
        ]
      },
    ];

    var drawerActive = drawerSections.some(function(sec) {
      return sec.items.some(function(d) { return d.page !== 'signout' && path.includes(d.page); });
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
        a.innerHTML = '<span class="vbn-icon">' + item.icon + '</span><span class="vbn-label">' + item.label + '</span>';
        nav.appendChild(a);
      } else {
        var btn = document.createElement('button');
        btn.className = 'vbn-item' + (active ? ' active' : '');
        btn.innerHTML = '<span class="vbn-icon">' + item.icon + '</span><span class="vbn-label">' + item.label + '</span>';
        btn.onclick = function(e) { e.stopPropagation(); toggleDrawer(); };
        nav.appendChild(btn);
      }
    });

    document.body.appendChild(nav);

    var overlay = document.createElement('div');
    overlay.className = 'vbn-drawer-overlay';

    var drawer = document.createElement('div');
    drawer.className = 'vbn-drawer';
    drawer.innerHTML = '<div class="vbn-drawer-handle"></div>';

    drawerSections.forEach(function(section) {
      var titleEl = document.createElement('div');
      titleEl.className = 'vbn-drawer-title';
      titleEl.textContent = section.title;
      drawer.appendChild(titleEl);

      section.items.forEach(function(item) {
        var active = item.page !== 'signout' && path.includes(item.page);
        var a = document.createElement('a');
        a.className = 'vbn-drawer-item' + (active ? ' active' : '');
        a.href = item.href;
        if (item.external) a.target = '_blank';
        if (item.signout) { a.onclick = function() { sessionStorage.clear(); }; }
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
    'people-roi-brief.html':    'hr-storyteller',
    'retention-advisor.html':     'offer-intelligence',
    'leadership-communicator.html':  'stakeholder-influence',
    'difficult-conversations.html': 'conversation-simulator',
    'vantage-record.html':           'case-library'
  };

  var path = window.location.pathname.split('/').pop();
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
