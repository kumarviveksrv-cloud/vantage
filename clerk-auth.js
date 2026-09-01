// clerk-auth.js — Virorah Vantage
// Shared Clerk authentication utilities.
// Include via <script src="clerk-auth.js"></script> on all protected pages.

(function () {
  'use strict';

  var PUBLISHABLE_KEY = 'pk_test_YnJpZWYta29pLTc2LmNsZXJrLmFjY291bnRzLmRldiQ';
  var CLERK_JS_URL    = 'https://brief-koi-76.clerk.accounts.dev/.well-known/clerk.js';
  var BASE            = 'https://vantage.virorah.com/';

  // ─── getClerkUserId ────────────────────────────────────────────────────────
  // Returns the Clerk user ID stored by access.html after successful auth.
  // Falls back to a legacy random ID if Clerk ID is not present.
  window.getClerkUserId = function () {
    var stored = localStorage.getItem('sr_user_id');
    if (stored) return stored;
    var anon = 'usr_anon_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('sr_user_id', anon);
    return anon;
  };

  // ─── clerkSignOut ──────────────────────────────────────────────────────────
  // Clears all local session state, loads Clerk JS, calls signOut(), redirects.
  window.clerkSignOut = function () {
    // Clear local state immediately
    sessionStorage.removeItem('sr_access');
    sessionStorage.removeItem('sr_meridian');
    sessionStorage.removeItem('sr_user_email');
    sessionStorage.removeItem('meridian_popup_dismissed');
    localStorage.removeItem('sr_user_id');
    localStorage.removeItem('sr_last_case_id');

    // If Clerk is already loaded on this page, use it
    if (window.Clerk && typeof window.Clerk.signOut === 'function') {
      window.Clerk.signOut().then(function () {
        window.location.href = BASE + 'index.html';
      }).catch(function () {
        window.location.href = BASE + 'index.html';
      });
      return;
    }

    // Otherwise load Clerk JS, then sign out
    var s = document.createElement('script');
    s.setAttribute('data-clerk-publishable-key', PUBLISHABLE_KEY);
    s.crossOrigin = 'anonymous';
    s.src = CLERK_JS_URL;
    s.type = 'text/javascript';
    s.onload = function () {
      var maxWait = 5000;
      var waited  = 0;
      var iv = setInterval(function () {
        waited += 100;
        if (window.Clerk && typeof window.Clerk.load === 'function') {
          clearInterval(iv);
          window.Clerk.load().then(function () {
            return window.Clerk.signOut();
          }).then(function () {
            window.location.href = BASE + 'index.html';
          }).catch(function () {
            window.location.href = BASE + 'index.html';
          });
        }
        if (waited > maxWait) {
          clearInterval(iv);
          window.location.href = BASE + 'index.html';
        }
      }, 100);
    };
    s.onerror = function () {
      window.location.href = BASE + 'index.html';
    };
    document.head.appendChild(s);
  };

})();
