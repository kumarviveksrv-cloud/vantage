/* VANTAGE PROLOGUE / MOBILE STABILITY PATCH
   Purpose:
   - Use the CSS photo background as the sole prologue visual.
   - Do not create a hidden Three.js/WebGL scene during startup.
   - Lock horizontal overflow before the first delayed reveal.
   - Preload the correct portrait/landscape background before revealing text.
   - Keep the countdown text swap opacity-stable on mobile.
*/
(function () {
  'use strict';

  /* A signed-in visitor landing on this page (any path — back-navigation,
     a bookmark, a shared link) sees "Sign in" on four different elements,
     which is a false claim once you're already signed in. access.html
     itself already redirects a signed-in visitor onward correctly, so
     nothing was ever functionally broken — this only fixes what the page
     SAYS to someone who is, in fact, signed in already. Runs inside the
     same fast-path branches that already hold the fade overlay opaque for
     a signed-in user, so the swap is always complete before anything is
     ever visible — never a race, never a flash. */
  function swapAuthLinksForSignedIn() {
    document.querySelectorAll('.vantage-auth-link').forEach(function (el) {
      var text = el.getAttribute('data-signed-in-text');
      var href = el.getAttribute('data-signed-in-href');
      if (text) {
        var span = el.querySelector('span, b');
        if (span) {
          el.childNodes[0].textContent = text + ' ';
        } else {
          el.textContent = text;
        }
      }
      if (href) el.setAttribute('href', href);
    });
  }

  /* SR20: Skip prologue when navigating back from an internal page (e.g. about.html).
     about.html sets vantage_skip_intro_from before navigating — cinematic.js
     reads it first (skips boot), then we read it here to hide the prologue
     element and mark the sequence complete so the landing page renders immediately. */
  const _skipFrom = sessionStorage.getItem('vantage_skip_intro_from');
  if (_skipFrom) {
    sessionStorage.removeItem('vantage_skip_intro_from');
    try {
      sessionStorage.setItem('vantage_prologue_seen', '1');
      sessionStorage.removeItem('vantage_tada'); // ensure ta-da doesn't fire
    } catch(e) {}
    /* Hide the prologue element directly — 'pro' isn't assigned yet at this
       point in the IIFE, so we reference the DOM element by ID directly. */
    var _prologueEl = document.getElementById('prologue');
    if (_prologueEl) _prologueEl.style.display = 'none';
    document.body.classList.add('prologue-complete');
    try {
      if (localStorage.getItem('vantage_clerk_signed_in') === '1') swapAuthLinksForSignedIn();
    } catch(e) {}
    /* Longer hold here than the other exit paths below: this is the
       specific path where the hero's climax lines have shown a brief
       raw-gradient flash before their word-by-word JS reveal settles.
       Holding the overlay opaque a bit longer masks that window entirely
       rather than chasing the exact race condition underneath it. */
    if (window.VantageFade) { window.VantageFade.hide(500); }
    return;
  }

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const pro = $('#prologue');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!pro || reduce) { if (window.VantageFade) { window.VantageFade.hide(100); } return; }

  /* ── PAYING USER BYPASS ──────────────────────────────────────────────────
     Two signals — either is enough to skip the prologue permanently:
     1. vantage_clerk_signed_in — Clerk session active (set by clerk-auth.js
        syncUser, cleared on sign-out via clerkSignOut)
     2. vantage_returning_user — permanent flag, set once on first sign-in by
        syncUser(), never cleared. Returning paying users skip the prologue
        even after signing out — they know the product. */
  const isPayingUser = localStorage.getItem('vantage_clerk_signed_in') === '1' ||
                       localStorage.getItem('vantage_returning_user') === '1';

  /* ── ONCE-PER-DEVICE BYPASS, ANY VISITOR ─────────────────────────────────
     Was: SR20 force-replayed the full ~13s prologue on every single load
     for every non-paying visitor, forever, by clearing the session-level
     flags below on every load so an in-session "already seen" never stuck.
     Kumar's call (26 Nov 2026, after a friend said the landing page took
     explaining to understand, and the prologue eats roughly half of the
     "30 seconds" a cold visitor gives a page): a visitor who has already
     sat through it once on this device shouldn't be shown it again
     automatically, ever, paying or not. vantage_seen_ever is the durable,
     cross-session flag for that (the name was already reserved for this in
     a comment above that was never wired up); endPrologue() below sets it
     the moment the sequence actually ends, whether by completing or by
     hitting Skip. A visitor can still always rewatch deliberately — nothing
     here removes the intro, it only stops it defaulting to on. */
  const hasSeenPrologueOnDevice = (function () {
    try { return localStorage.getItem('vantage_seen_ever') === '1'; }
    catch (e) { return false; }
  })();

  const cameFromDemo = /\/demo\.html/i.test(document.referrer || '');
  if (cameFromDemo || isPayingUser || hasSeenPrologueOnDevice) {
    pro.style.display = 'none';
    document.body.classList.add('prologue-complete');
    // Only swap auth links to "Dashboard" when the user has an ACTIVE Clerk
    // session — not just because vantage_returning_user is set. vantage_returning_user
    // is permanent and survives signout; using it here caused "Dashboard" to
    // appear on the landing page for signed-out returning users.
    if (localStorage.getItem('vantage_clerk_signed_in') === '1') swapAuthLinksForSignedIn();
    if (window.VantageFade) { window.VantageFade.hide(500); }
    return;
  }

  /* ── PROLOGUE DISABLED SITE-WIDE (28 Nov 2026) ──────────────────────────
     Kumar's call, after several people separately said the landing page
     "looked stuck" on first load. The 26 Nov once-per-device bypass above
     only ever helped a RETURNING visitor on the same device/browser
     profile; a first-time visitor — exactly who this feedback was about —
     still sat through the full ~13s cinematic before anything moved, and
     more than one read that pause as a broken page rather than an
     intentional intro and left before the skip button registered.
     This takes the identical, already-proven bypass path above (same one
     paying/returning users have used safely since the 26th) and routes
     every visitor through it, so nobody gets the prologue by default.
     Nothing else in this file changed - to bring the prologue back for
     everyone, flip this to false; to restore just the 26 Nov once-per-
     device behaviour, delete this block instead. */
  const PROLOGUE_DISABLED = true;
  if (PROLOGUE_DISABLED) {
    pro.style.display = 'none';
    document.body.classList.add('prologue-complete');
    if (localStorage.getItem('vantage_clerk_signed_in') === '1') swapAuthLinksForSignedIn();
    if (window.VantageFade) { window.VantageFade.hide(500); }
    return;
  }

  const skip = $('#prologueSkip');
  const copy = $('.prologue-copy');
  const kicker = $('.prologue-kicker');
  const message = $('.prologue-message');
  const sub = $('.prologue-sub');
  const signal = $('.prologue-signal');
  const note = $('.prologue-note');
  const countdown = $('.prologue-countdown');
  const countNum = $('#prologueCountNum');
  const fade = $('.prologue-fade');

  if (window.VantageFade) { window.VantageFade.hide(150); }

  let active = true;
  let timers = [];
  let ending = false;

  const later = (fn, ms) => {
    const id = window.setTimeout(fn, ms);
    timers.push(id);
    return id;
  };

  function clearTimers() {
    timers.forEach(window.clearTimeout);
    timers = [];
  }

  function lockScroll(lock) {
    document.documentElement.classList.toggle('prologue-lock', lock);
    document.body.classList.toggle('prologue-lock', lock);
  }

  function preventScroll(event) {
    if (active) event.preventDefault();
  }

  function setImportant(element, property, value) {
    if (element) element.style.setProperty(property, value, 'important');
  }

  function hideInitialText() {
    [copy, kicker, message, sub, signal, note, countdown].forEach((element) => {
      setImportant(element, 'opacity', '0');
      setImportant(element, 'visibility', 'hidden');
    });
  }

  function revealText() {
    /* Signal and note: remove inline hide so CSS phase-pressure transitions take over.
       Kicker/message/sub: curtain.js (vantage-curtain.js ~line 1235) owns those —
       it reads kicker text, clears it, types it at 68ms/char, then reveals
       message word-by-word and sub. We must not touch them here. */
    [signal, note].forEach(el => {
      if (!el) return;
      el.style.removeProperty('opacity');
      el.style.removeProperty('visibility');
    });
  }  function hideCopyForCountdown() {
    setImportant(copy, 'opacity', '0');
    setImportant(copy, 'visibility', 'hidden');
    setImportant(signal, 'opacity', '0');
    setImportant(signal, 'visibility', 'hidden');
    setImportant(note, 'opacity', '0');
    setImportant(note, 'visibility', 'hidden');
  }

  function showCountdown(number) {
    if (!countNum) return;
    countNum.textContent = String(number);
    countNum.classList.remove('tick');
    setImportant(countdown, 'opacity', '1');
    setImportant(countdown, 'visibility', 'visible');
    // No forced reflow and no opacity/scale animation on mobile.
  }

  function endPrologue(fastFade) {
    if (!active || ending) return;
    ending = true;
    active = false;
    clearTimers();
    lockScroll(false);
    pro.classList.remove('active', 'phase-pressure', 'countdown');
    pro.classList.add('ending');

    if (fade) {
      fade.style.setProperty('transition', fastFade ? 'opacity 0.5s ease' : 'opacity 2.4s ease', 'important');
      fade.classList.add('on');
    }
    /* Fade skip button at the same moment the screen goes to black */
    if (skip) skip.style.setProperty('opacity', '0', 'important');

    sessionStorage.setItem('vantage_prologue_seen', '1');
    sessionStorage.setItem('vantage_tada', '1');
    /* Durable, cross-session: this device has now sat through the
       prologue once (naturally or via Skip). Never auto-show it again
       here — see the once-per-device bypass above. */
    try { localStorage.setItem('vantage_seen_ever', '1'); } catch (e) {}

    window.setTimeout(() => {
      pro.style.display = 'none';
      document.body.classList.add('prologue-complete');
    }, fastFade ? 600 : 2500);
  }

  // Inject only stability rules. This avoids requiring an additional CSS file
  // or changing the landing-page HTML.
  const stabilityStyle = document.createElement('style');
  stabilityStyle.id = 'vantage-prologue-mobile-stability';
  stabilityStyle.textContent = `
    html.prologue-lock,
    body.prologue-lock {
      overflow: hidden !important;
      overflow-x: clip !important;
      overscroll-behavior: none !important;
    }
    #prologue {
      width: 100% !important;
      max-width: 100% !important;
      height: 100svh !important;
      min-height: 100svh !important;
      max-height: 100svh !important;
      overflow: hidden !important;
      overscroll-behavior: none !important;
    }
    #prologue .prologue-photo,
    #prologue .prologue-grid,
    #prologue .prologue-vignette,
    #prologue .prologue-fade {
      max-width: 100% !important;
      max-height: 100% !important;
    }
    #prologue .prologue-photo {
      will-change: opacity !important;
      backface-visibility: hidden !important;
      -webkit-backface-visibility: hidden !important;
    }
    #prologue #prologueCanvas {
      display: none !important;
    }
    #prologue .prologue-skip {
      will-change: opacity !important;
      backface-visibility: hidden !important;
      -webkit-backface-visibility: hidden !important;
    }
    #prologue .prologue-copy {
      overflow: hidden !important;
    }
    #prologue .prologue-countdown strong.tick {
      animation: none !important;
    }
    @media (max-width: 900px) {
      #prologue .prologue-grid { display: none !important; }
      #prologue .prologue-photo { transition-duration: 0.8s !important; }
      #prologue .prologue-signal,
      #prologue .prologue-note {
        transform: none !important;
        transition: opacity 0.7s ease !important;
      }
      #prologue .prologue-skip {
        box-shadow: 0 2px 8px rgba(99,102,241,.3) !important;
        transition: opacity 0.5s ease !important;
      }
      #prologue .prologue-message span,
      #prologue .prologue-message em span {
        transform: none !important;
        transition: opacity 480ms ease !important;
      }
      #prologue .prologue-copy {
        width: 94% !important;
        max-width: 94% !important;
        left: 3% !important;
        right: auto !important;
        transform: none !important;
      }
    }
  `;
  document.head.appendChild(stabilityStyle);

  // Apply the initial lock and hidden state synchronously, before any timer.
  lockScroll(true);
  hideInitialText();

  // Preload the exact CSS background selected by the same media query used by
  // the stylesheet. The image is never inserted into the document.
  const mobilePortrait = window.matchMedia('(max-width: 700px) and (orientation: portrait)').matches;
  const backgroundURL = mobilePortrait ? 'prologue-bg-mobile.png' : 'prologue-bg.png';
  const backgroundImage = new Image();
  let backgroundReady = false;
  let revealStarted = false;

  function beginVisualReveal() {
    if (revealStarted) return;
    revealStarted = true;
    pro.classList.add('active');
    /* Make kicker and copy visible immediately — curtain.js (line ~1235) fires
       on 'active' and starts typing the kicker after a 700ms pause. Without
       this, curtain.js types into a hidden element for 1100ms then it pops
       visible mid-word. With this, the cursor blinks from t=0 and typing is
       visible from the first character. Kicker CSS transitions killed so
       phase-pressure doesn't also animate it. */
    if (copy) { copy.style.removeProperty('opacity'); copy.style.removeProperty('visibility'); }
    if (kicker) { kicker.style.transition='none'; kicker.style.setProperty('opacity','1','important'); kicker.style.setProperty('visibility','visible','important'); }
    /* Remove visibility:hidden from message/sub now so when curtain.js later
       sets opacity:1 on them they actually appear (visibility:hidden would
       block them even with opacity:1). Opacity stays at 0 via curtain.js. */
    if (message) message.style.removeProperty('visibility');
    if (sub)     sub.style.removeProperty('visibility');
    /* Skip button shown immediately, not after the old 2000ms delay. A
       first-time visitor should be able to see and use the way out from
       the first frame, not be made to wait before the option even
       appears. Combined with the image-preload path (beginVisualReveal
       fires within ~0-1200ms of load) and this element's own 0.5s CSS
       fade, the button is fully visible well inside 2s of page load. */
    if (skip) skip.classList.add('show');
    later(() => {
      revealText();
      pro.classList.add('phase-pressure');
    }, 1800);
    later(() => {
      hideCopyForCountdown();
      pro.classList.add('countdown');
      showCountdown(3);
    }, 10000);
    later(() => showCountdown(2), 11000);
    later(() => showCountdown(1), 12000);
    later(endPrologue, 13000);
  }

  backgroundImage.onload = () => {
    backgroundReady = true;
    // Wait for two paint opportunities so the first visible frame already has
    // the decoded image and does not flash the fallback background.
    requestAnimationFrame(() => requestAnimationFrame(beginVisualReveal));
  };
  backgroundImage.onerror = () => {
    // Never leave the visitor on a locked screen if an asset fails.
    beginVisualReveal();
  };
  backgroundImage.src = backgroundURL;

  // Safety fallback for slow mobile image decoding/network conditions.
  later(() => {
    if (!backgroundReady) beginVisualReveal();
  }, 1200);

  window.addEventListener('wheel', preventScroll, { passive: false });
  window.addEventListener('touchmove', preventScroll, { passive: false });
  /* SR20: Skip Intro skips the full sequence — prologue + ta-da.
     Sets vantage_skip_tada so curtain.js bypasses the ta-da overlay. */
  function skipFullIntro() {
    sessionStorage.setItem('vantage_skip_tada', '1');
    sessionStorage.setItem('vantage_post_skip', '1');
    endPrologue(true);
  }
  skip?.addEventListener('click', skipFullIntro);
})();
