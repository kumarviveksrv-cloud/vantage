/* aria-volumetric-touch.js
   Drop-in mobile companion for aria-volumetric.js on the landing page.
   Load it AFTER aria-volumetric.js in index.html.

   Option 1 — Touch as cursor:
     touchstart → particles converge to face (simulates mouseenter)
     touchend   → particles scatter back   (simulates mouseleave)
     touchmove  → updates position without blocking scroll

   Option 3 — Auto-breathing:
     On mobile, when nobody is touching, particles pulse in and out
     on a 5-second cycle so ARIA looks alive during passive scroll.

   Dispatches real MouseEvent objects so whatever listener is in
   aria-volumetric.js (mousemove / mouseenter / mouseleave) picks
   them up without any changes to that file.
*/
(function(){
  'use strict';

  var MOBILE = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  function ready(fn){
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn);
    else fn();
  }

  function findTarget(){
    // Try every likely container in order of specificity
    return document.querySelector('.aria-figure') ||
           document.querySelector('.aria-room')   ||
           document.querySelector('.aria canvas') ||
           document.querySelector('canvas');
  }

  function fire(el, type, cx, cy){
    var ev = new MouseEvent(type, {
      bubbles:true, cancelable:true,
      clientX: cx||0, clientY: cy||0,
      view: window
    });
    el.dispatchEvent(ev);
    // Also fire on the canvas inside in case the listener lives there
    var cv = el.querySelector('canvas') || el;
    if(cv !== el) cv.dispatchEvent(ev.constructor
      ? new MouseEvent(type,{bubbles:true,cancelable:true,clientX:cx||0,clientY:cy||0})
      : ev);
  }

  ready(function(){
    // Give aria-volumetric.js 800ms to finish its own init
    setTimeout(function(){
      var target = findTarget();
      if(!target){ console.warn('[aria-touch] No ARIA target found'); return; }

      var lastTouchTime = 0;
      var fingerDown    = false;

      /* ── OPTION 1: TOUCH AS CURSOR ──────────────────────── */
      target.addEventListener('touchstart', function(e){
        fingerDown    = true;
        lastTouchTime = Date.now();
        var t = e.touches[0];
        // mouseenter triggers convergence in most particle-face implementations
        fire(target, 'mouseenter', t.clientX, t.clientY);
        fire(target, 'mousemove',  t.clientX, t.clientY);
      }, {passive:true});

      target.addEventListener('touchmove', function(e){
        lastTouchTime = Date.now();
        var t = e.touches[0];
        // Update position — doesn't block scroll (passive:true)
        fire(target, 'mousemove', t.clientX, t.clientY);
      }, {passive:true});

      target.addEventListener('touchend', function(){
        fingerDown    = false;
        lastTouchTime = Date.now();
        fire(target, 'mouseleave', 0, 0);
      }, {passive:true});

      target.addEventListener('touchcancel', function(){
        fingerDown    = false;
        fire(target, 'mouseleave', 0, 0);
      }, {passive:true});

      /* ── OPTION 3: AUTO-BREATHING (mobile idle) ─────────── */
      if(!MOBILE) return; // desktop already has cursor; skip breathing

      var IDLE_AFTER   = 2200;  // ms after last touch before breathing starts
      var CYCLE        = 5000;  // full in-out cycle duration in ms
      var breathPhase  = 0;
      var animId;

      function breathe(){
        var now = Date.now();
        if(fingerDown || now - lastTouchTime < IDLE_AFTER){
          animId = requestAnimationFrame(breathe);
          return;
        }

        breathPhase += (2 * Math.PI) / (CYCLE / (1000/60));

        var rect = target.getBoundingClientRect();
        var cx   = rect.left + rect.width  * 0.50;
        var cy   = rect.top  + rect.height * 0.42;

        // Gentle oval orbit → makes the "converge" strength pulse in and out
        // sin goes 0→1→0→-1→0 over one cycle; we use (sin+1)/2 so it's 0→1→0
        // The cursor orbits a small ellipse whose radius matches the pulse
        var pulse  = (Math.sin(breathPhase) + 1) * 0.5;      // 0→1→0
        var rX     = rect.width  * 0.18 * pulse;
        var rY     = rect.height * 0.08 * pulse;
        var angle  = breathPhase * 0.7;

        var px = cx + Math.cos(angle) * rX;
        var py = cy + Math.sin(angle) * rY;

        if(pulse > 0.05){
          // Finger "hovering" over face → convergence
          fire(target, 'mousemove', px, py);
        } else {
          // Between pulses → scatter
          fire(target, 'mouseleave', 0, 0);
        }

        animId = requestAnimationFrame(breathe);
      }

      // Start breathing after initial idle period
      setTimeout(function(){
        animId = requestAnimationFrame(breathe);
      }, IDLE_AFTER);

    }, 800);
  });

})();
