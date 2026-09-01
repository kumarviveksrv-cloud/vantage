// clerk-auth.js — Virorah Vantage
// Authentication utilities + automatic token injection for all Worker calls.
// Include via <script src="clerk-auth.js"></script> on all protected pages.

(function () {
  'use strict';

  var WORKER_URL = 'https://situation-room-api.kumarvivek-srv.workers.dev';
  var BASE       = 'https://vantage.virorah.com/';

  // ─── getClerkUserId ────────────────────────────────────────────────────────
  // Returns the user ID stored after sign-in.
  window.getClerkUserId = function () {
    var stored = localStorage.getItem('sr_user_id');
    if (stored) return stored;
    var anon = 'usr_anon_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('sr_user_id', anon);
    return anon;
  };

  // ─── clerkSignOut ──────────────────────────────────────────────────────────
  window.clerkSignOut = function () {
    sessionStorage.clear();
    localStorage.removeItem('sr_user_id');
    localStorage.removeItem('sr_user_email');
    localStorage.removeItem('sr_last_case_id');
    window.location.href = BASE + 'access.html';
  };

  // ─── FETCH INTERCEPTOR ────────────────────────────────────────────────────
  // Automatically injects the session token into every Worker call.
  // No changes needed to individual tool pages.
  var _originalFetch = window.fetch;
  window.fetch = function (url, options) {
    if (typeof url === 'string' && url.indexOf(WORKER_URL) === 0 && options && options.body) {
      try {
        var body = JSON.parse(options.body);
        // Only inject if this isn't the auth or save_user endpoint
        if (body.tool !== 'auth' && body.tool !== 'save_user') {
          var token = sessionStorage.getItem('sr_session_token') || '';
          if (!body.token) {
            body.token = token;
            options = Object.assign({}, options, { body: JSON.stringify(body) });
          }
        }
      } catch(e) {}
    }
    return _originalFetch.call(this, url, options);
  };

})();
