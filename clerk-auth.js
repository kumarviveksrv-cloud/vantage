// clerk-auth.js — Virorah Vantage
// Real Clerk authentication using ClerkJS SDK.
// Replaces the old HMAC stub. Include on every protected page.

(function () {
  'use strict';

  var PUBLISHABLE_KEY  = 'pk_test_YnJpZWYta29pLTc2LmNsZXJrLmFjY291bnRzLmRldiQ';
  var CLERK_DOMAIN     = 'https://brief-koi-76.clerk.accounts.dev';
  var WORKER_URL       = 'https://situation-room-api.kumarvivek-srv.workers.dev';
  var ACCESS_URL       = 'https://vantage.virorah.com/access.html';
  var DASHBOARD_URL    = 'https://vantage.virorah.com/dashboard.html';

  var isAccessPage = window.location.pathname.indexOf('access.html') !== -1;

  // ── SMART FLASH PREVENTION ──────────────────────────────────────────────────
  // Two tiers:
  // Returning user (localStorage flag set): show page immediately, verify in background.
  // New/unknown user: show branded loader until Clerk confirms or redirects.
  var _hasLocalFlag = localStorage.getItem('vantage_clerk_signed_in') === '1';

  if (!isAccessPage && !_hasLocalFlag) {
    // Unknown user: inject branded loader instead of hiding page
    var _ldr = document.createElement('div');
    _ldr.id = 'vantage-auth-loader';
    _ldr.innerHTML =
      '<svg width="72" height="72" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="48" cy="48" r="42" stroke="rgba(99,102,241,0.18)" stroke-width="1" fill="none"/>' +
        '<ellipse cx="48" cy="48" rx="42" ry="16" stroke="rgba(99,102,241,0.35)" stroke-width="1" fill="none">' +
          '<animateTransform attributeName="transform" type="rotate" from="0 48 48" to="360 48 48" dur="3s" repeatCount="indefinite"/>' +
        '</ellipse>' +
        '<ellipse cx="48" cy="48" rx="42" ry="16" stroke="rgba(124,58,237,0.3)" stroke-width="1" fill="none">' +
          '<animateTransform attributeName="transform" type="rotate" from="60 48 48" to="420 48 48" dur="4.5s" repeatCount="indefinite"/>' +
        '</ellipse>' +
        '<circle cx="48" cy="48" r="18" fill="url(#_cg)" opacity="0.9"><animate attributeName="r" values="16;20;16" dur="2s" repeatCount="indefinite"/></circle>' +
        '<circle cx="48" cy="48" r="5" fill="#f4f3ff" opacity="0.9"/>' +
        '<defs><radialGradient id="_cg" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#c4b5fd"/><stop offset="60%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#6366f1" stop-opacity="0"/></radialGradient></defs>' +
      '</svg>' +
      '<div style="font-family:\'JetBrains Mono\',monospace;font-size:10px;letter-spacing:.25em;text-transform:uppercase;color:#a5b4fc;margin-top:24px">ARIA</div>' +
      '<div style="font-family:sans-serif;font-size:14px;color:rgba(244,243,255,0.8);margin-top:6px">Preparing Vantage...</div>';
    _ldr.setAttribute('style','position:fixed;top:0;left:0;width:100%;height:100%;background:#050410;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:opacity .35s ease');
    document.documentElement.appendChild(_ldr);
  }
  // Returning user: no hiding, no loader. Page renders immediately.

  // Shared helper to remove loader
  function _revealPage() {
    document.documentElement.style.visibility = 'visible';
    var el = document.getElementById('vantage-auth-loader');
    if (el) {
      el.style.opacity = '0';
      setTimeout(function(){ if (el.parentNode) el.parentNode.removeChild(el); }, 400);
    }
  }

  // ── FAST-PATH ──────────────────────────────────────────────────────────────
  // If the localStorage flag is set (written after sign-in), pre-populate
  // sessionStorage so existing inline page checks don't redirect to access.html
  // before the async Clerk SDK has a chance to verify the session.
  if (!isAccessPage && localStorage.getItem('vantage_clerk_signed_in') === '1') {
    var _email = localStorage.getItem('sr_user_email') || '';
    var _name  = localStorage.getItem('sr_user_name')  || '';
    sessionStorage.setItem('sr_access',     'true');
    sessionStorage.setItem('sr_user_email', _email);
    sessionStorage.setItem('sr_user_name',  _name);
    // Restore MERIDIAN if available
    if (_email) {
      var _m = localStorage.getItem('sr_meridian_' + _email);
      if (_m && !sessionStorage.getItem('sr_meridian')) {
        sessionStorage.setItem('sr_meridian', _m);
      }
    }
  }

  // ── GLOBAL SIGN OUT ────────────────────────────────────────────────────────
  window.clerkSignOut = function () {
    localStorage.removeItem('vantage_clerk_signed_in');
    sessionStorage.clear();
    if (window.Clerk && window.Clerk.signOut) {
      window.Clerk.signOut().then(function () {
        window.location.replace(ACCESS_URL);
      }).catch(function () {
        window.location.replace(ACCESS_URL);
      });
    } else {
      window.location.replace(ACCESS_URL);
    }
  };

  // ── FETCH INTERCEPTOR ──────────────────────────────────────────────────────
  // Injects Clerk JWT into every Worker JSON call via Authorization header.
  // Multipart (transcription) and non-Worker calls pass through unchanged.
  var _origFetch = window.fetch;
  window.fetch = function (url, opts) {
    var urlStr = (typeof url === 'string') ? url : (url && url.url ? url.url : '');
    var isWorker = urlStr.indexOf(WORKER_URL) === 0;

    if (!isWorker) return _origFetch.apply(this, arguments);

    opts = opts || {};

    // Skip if not a JSON call (e.g. multipart transcription handles its own auth)
    var ct = (opts.headers && (opts.headers['Content-Type'] || opts.headers['content-type'])) || '';
    if (ct.indexOf('multipart') !== -1) return _origFetch.apply(this, arguments);

    // Inject Clerk JWT
    if (window.Clerk && window.Clerk.session) {
      var self = this;
      return window.Clerk.session.getToken().then(function (token) {
        if (token) {
          var h = Object.assign({}, opts.headers || {});
          h['Authorization'] = 'Bearer ' + token;
          opts = Object.assign({}, opts, { headers: h });
        }
        return _origFetch.call(self, url, opts);
      }).catch(function () {
        return _origFetch.apply(self, [url, opts]);
      });
    }

    return _origFetch.apply(this, arguments);
  };

  // ── SYNC USER TO SESSION ───────────────────────────────────────────────────
  // Populates sessionStorage and localStorage for backward compatibility
  // with existing page logic that reads these values.
  function syncUser(user) {
    if (!user) return;
    var email  = (user.primaryEmailAddress && user.primaryEmailAddress.emailAddress) || '';
    var name   = user.firstName || user.fullName || email.split('@')[0] || '';
    var userId = user.id || '';

    sessionStorage.setItem('sr_access',     'true');
    sessionStorage.setItem('sr_user_email', email);
    sessionStorage.setItem('sr_user_name',  name);
    sessionStorage.setItem('sr_user_id',    userId);

    localStorage.setItem('vantage_clerk_signed_in', '1');
    localStorage.setItem('sr_user_email',            email);
    localStorage.setItem('sr_user_name',             name);

    // Restore MERIDIAN
    if (email) {
      var m = localStorage.getItem('sr_meridian_' + email);
      if (m && !sessionStorage.getItem('sr_meridian')) {
        sessionStorage.setItem('sr_meridian', m);
      }
    }
  }

  // Expose for access.html to call after sign-in
  window._clerkSyncUser = syncUser;

  // ── LOAD CLERK SDK ─────────────────────────────────────────────────────────
  var s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.setAttribute('data-clerk-publishable-key', PUBLISHABLE_KEY);
  s.src = CLERK_DOMAIN + '/npm/@clerk/clerk-js@latest/dist/clerk.browser.js';

  s.addEventListener('load', function () {
    window.Clerk.load().then(function () {
      var user = window.Clerk.user;

      if (isAccessPage) {
        // access.html handles its own routing — just expose the API
        return;
      }

      if (!user) {
        // No valid Clerk session — clear fast-path flag and redirect
        localStorage.removeItem('vantage_clerk_signed_in');
        sessionStorage.clear();
        var redirect = encodeURIComponent(window.location.href);
        window.location.replace(ACCESS_URL + '?redirect_url=' + redirect);
        return;
      }

      // Session confirmed — sync user data
      syncUser(user);
      // Reveal the page now that auth is confirmed
      _revealPage();

    }).catch(function (err) {
      console.error('[Clerk] SDK init error:', err);
      if (!isAccessPage) {
        localStorage.removeItem('vantage_clerk_signed_in');
        window.location.replace(ACCESS_URL);
      }
    });
  });

  s.addEventListener('error', function () {
    console.error('[Clerk] SDK failed to load — auth unavailable');
    // Restore visibility so the page isn't stuck hidden
    _revealPage();
    // Don't redirect — let existing sessionStorage gate handle it
  });

  document.head.appendChild(s);

})();
