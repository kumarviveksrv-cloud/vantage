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

  // ── FLASH PREVENTION ───────────────────────────────────────────────────────
  // Hide the page body immediately while Clerk verifies the session.
  // Prevents a brief flash of protected content before the auth redirect.
  // Body becomes visible again once Clerk confirms the user is signed in.
  if (!isAccessPage) {
    document.documentElement.style.visibility = 'hidden';
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
      document.documentElement.style.visibility = 'visible';

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
    document.documentElement.style.visibility = 'visible';
    // Don't redirect — let existing sessionStorage gate handle it
  });

  document.head.appendChild(s);

})();
