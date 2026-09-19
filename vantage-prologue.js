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

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const pro = $('#prologue');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!pro || reduce) return;

  const alreadySeen = sessionStorage.getItem('vantage_prologue_seen') === '1';
  const cameFromDemo = /\/demo\.html/i.test(document.referrer || '');
  if (alreadySeen || cameFromDemo) {
    pro.style.display = 'none';
    document.body.classList.add('prologue-complete');
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

  function endPrologue() {
    if (!active || ending) return;
    ending = true;
    active = false;
    clearTimers();
    lockScroll(false);
    pro.classList.remove('active', 'phase-pressure', 'countdown');
    pro.classList.add('ending');

    if (fade) {
      fade.style.setProperty('transition', 'opacity 2.4s ease', 'important');
      fade.classList.add('on');
    }

    sessionStorage.setItem('vantage_prologue_seen', '1');
    sessionStorage.setItem('vantage_tada', '1');

    window.setTimeout(() => {
      pro.style.display = 'none';
      document.body.classList.add('prologue-complete');
    }, 2500);
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
      contain: paint !important;
      overscroll-behavior: none !important;
    }
    #prologue .prologue-photo,
    #prologue #prologueCanvas,
    #prologue .prologue-grid,
    #prologue .prologue-vignette,
    #prologue .prologue-fade {
      max-width: 100% !important;
      max-height: 100% !important;
    }
    #prologue .prologue-countdown strong.tick {
      animation: none !important;
    }
    @media (max-width: 700px) {
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
    later(() => {
      revealText();
      pro.classList.add('phase-pressure');
    }, 1800);
    later(() => {
      if (skip) skip.classList.add('show');
    }, 2000);
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
  skip?.addEventListener('click', endPrologue);
})();
