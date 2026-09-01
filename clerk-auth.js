// clerk-auth.js — Virorah Vantage
// Shared Clerk authentication utilities.
// Include via <script src="clerk-auth.js"></script> before sidebar-shared.js on all protected pages.

(function () {
  'use strict';

  var PUBLISHABLE_KEY = 'pk_test_YnJpZWYta29pLTc2LmNsZXJrLmFjY291bnRzLmRldiQ';
  var BASE = 'https://vantage.virorah.com/';

  // ─── getClerkUserId ────────────────────────────────────────────────────────
  // Returns the authenticated Clerk user ID (starts with 'user_').
  // Falls back to the legacy random ID for any session where Clerk has not yet
  // set the ID (should not happen in normal flow after access.html auth).
  window.getClerkUserId = function () {
    var stored = localStorage.getItem('sr_user_id');
    if (stored) return stored;
    // Fallback — generate an anonymous ID and store it
    var anon = 'usr_anon_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('sr_user_id', anon);
    return anon;
  };

  // ─── clerkSignOut ──────────────────────────────────────────────────────────
  // Clears local session state, calls Clerk's signOut(), then redirects home.
  // Called by the sign-out nav link on every page.
  window.clerkSignOut = function () {
    // Clear all local session data immediately
    sessionStorage.removeItem('sr_access');
    sessionStorage.removeItem('sr_meridian');
    sessionStorage.removeItem('sr_user_email');
    sessionStorage.removeItem('meridian_popup_dismissed');
    localStorage.removeItem('sr_user_id');
    localStorage.removeItem('sr_last_case_id');

    // Load ClerkJS and call signOut
    var s = document.createElement('script');
    s.src = 'https://cdn.clerk.com/npm/@clerk/clerk-js@5/dist/clerk.browser.js';
    s.crossOrigin = 'anonymous';
    s.onload = function () {
      try {
        var clerk = new window.Clerk(PUBLISHABLE_KEY);
        clerk.load().then(function () {
          return clerk.signOut();
        }).then(function () {
          window.location.href = BASE + 'index.html';
        }).catch(function () {
          window.location.href = BASE + 'index.html';
        });
      } catch (e) {
        window.location.href = BASE + 'index.html';
      }
    };
    s.onerror = function () {
      window.location.href = BASE + 'index.html';
    };
    document.head.appendChild(s);
  };

})();
