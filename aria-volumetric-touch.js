/* aria-volumetric-touch.js — v2
   Mobile touch cursor (glowing orb following finger) + particle convergence + auto-breathing.
   Load after aria-volumetric.js in index.html. No changes to that file needed.
*/
(function(){
'use strict';

// Only run on touch devices
var IS_TOUCH = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if(!IS_TOUCH) return;

/* ── 1. VISIBLE TOUCH CURSOR (the orb that follows the finger) ── */
var orb = document.createElement('div');
orb.id = 'aria-touch-orb';
Object.assign(orb.style, {
  position:       'fixed',
  width:          '22px',
  height:         '22px',
  borderRadius:   '50%',
  border:         '1px solid rgba(196,181,253,.55)',
  background:     'rgba(99,102,241,.07)',
  boxShadow:      '0 0 14px rgba(99,102,241,.45), 0 0 28px rgba(99,102,241,.18)',
  pointerEvents:  'none',
  zIndex:         '99999',
  transform:      'translate(-50%,-50%)',
  transition:     'opacity .2s, width .15s, height .15s, box-shadow .2s',
  opacity:        '0',
  willChange:     'left, top',
  left:           '-100px',
  top:            '-100px',
});
document.body.appendChild(orb);

function orbShow(x, y){
  orb.style.left    = x + 'px';
  orb.style.top     = y + 'px';
  orb.style.opacity = '1';
}
function orbHide(){
  orb.style.opacity = '0';
}
function orbPress(){
  orb.style.width      = '36px';
  orb.style.height     = '36px';
  orb.style.boxShadow  = '0 0 22px rgba(99,102,241,.7), 0 0 44px rgba(99,102,241,.3)';
}
function orbRelease(){
  orb.style.width      = '22px';
  orb.style.height     = '22px';
  orb.style.boxShadow  = '0 0 14px rgba(99,102,241,.45), 0 0 28px rgba(99,102,241,.18)';
}

/* ── 2. SYNTHETIC MOUSE EVENTS → ARIA particle convergence ─────── */
// Dispatch to the element AND bubble up to document/window so the
// particle script catches it regardless of where its listener sits.
function fireMouseAt(type, cx, cy){
  var opts = {bubbles:true, cancelable:true, clientX:cx||0, clientY:cy||0, view:window};
  [findTarget(), document, window].forEach(function(el){
    if(el) el.dispatchEvent(new MouseEvent(type, opts));
  });
}

function findTarget(){
  return document.querySelector('.aria-figure') ||
         document.querySelector('.aria-room')   ||
         document.querySelector('.aria section') ||
         document.querySelector('[class*="aria"]');
}

/* ── 3. EVENT LISTENERS ──────────────────────────────────────────── */
document.addEventListener('touchstart', function(e){
  var t = e.touches[0];
  orbShow(t.clientX, t.clientY);
  orbPress();
  fireMouseAt('mouseenter', t.clientX, t.clientY);
  fireMouseAt('mousemove',  t.clientX, t.clientY);
}, {passive:true});

document.addEventListener('touchmove', function(e){
  var t = e.touches[0];
  orb.style.left = t.clientX + 'px';
  orb.style.top  = t.clientY + 'px';
  fireMouseAt('mousemove', t.clientX, t.clientY);
}, {passive:true});

document.addEventListener('touchend', function(){
  orbRelease();
  orbHide();
  fireMouseAt('mouseleave', 0, 0);
}, {passive:true});

document.addEventListener('touchcancel', function(){
  orbRelease();
  orbHide();
  fireMouseAt('mouseleave', 0, 0);
}, {passive:true});

/* ── 4. AUTO-BREATHING (idle state — face pulses while nobody touches) ── */
var lastTouch    = 0;
var breathPhase  = 0;
var IDLE_AFTER   = 2000;  // ms of no touch before breathing starts
var CYCLE_FRAMES = 380;   // frames per full in-out pulse (~6s at 60fps)

document.addEventListener('touchstart', function(){ lastTouch = Date.now(); }, {passive:true});
document.addEventListener('touchmove',  function(){ lastTouch = Date.now(); }, {passive:true});
document.addEventListener('touchend',   function(){ lastTouch = Date.now(); }, {passive:true});

function breathe(){
  requestAnimationFrame(breathe);

  // Only breathe when idle
  if(Date.now() - lastTouch < IDLE_AFTER) return;

  breathPhase++;
  var pulse = (Math.sin((breathPhase / CYCLE_FRAMES) * Math.PI * 2) + 1) * 0.5; // 0→1→0

  // Find the ARIA canvas centre
  var target = findTarget();
  if(!target) return;
  var rect = target.getBoundingClientRect();
  if(!rect.width) return;

  var cx = rect.left + rect.width  * 0.5;
  var cy = rect.top  + rect.height * 0.42;

  if(pulse > 0.05){
    // Small oval orbit scaled by pulse amplitude
    var rX = rect.width  * 0.15 * pulse;
    var rY = rect.height * 0.07 * pulse;
    var a  = (breathPhase / CYCLE_FRAMES) * Math.PI * 2 * 0.6;
    var px = cx + Math.cos(a) * rX;
    var py = cy + Math.sin(a) * rY;

    // Move orb to show the breathing position visually
    orbShow(px, py);
    orb.style.opacity = String(pulse * 0.45); // very subtle
    fireMouseAt('mousemove', px, py);
  } else {
    orbHide();
    fireMouseAt('mouseleave', 0, 0);
  }
}

// Wait for aria-volumetric.js to init, then start breathing
setTimeout(function(){ requestAnimationFrame(breathe); }, 1200);

})();
