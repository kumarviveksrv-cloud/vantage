/* aria-volumetric-touch.js — v4
   JARVIS glow via CSS injection (reliable + always visible)
   + touch cursor orb + synthetic mouse events + auto-breathing
   Load after aria-volumetric.js in index.html.
*/
(function(){
'use strict';

/* ══════════════════════════════════════════════════════════════
   1. JARVIS GLOW  — pure CSS, no canvas z-index issues
   ══════════════════════════════════════════════════════════════ */
var css = document.createElement('style');
css.textContent = [
  /* Breathing box-shadow glow on the ARIA room border + interior */
  '@keyframes ariaJarvis{',
  '  0%,100%{',
  '    box-shadow:',
  '      inset 0 0  80px rgba(99,102,241,.22),',
  '      inset 0 0 180px rgba(99,102,241,.10),',
  '      0 0 40px rgba(99,102,241,.06);',
  '  }',
  '  50%{',
  '    box-shadow:',
  '      inset 0 0 130px rgba(99,102,241,.45),',
  '      inset 0 0 260px rgba(99,102,241,.20),',
  '      0 0 80px rgba(99,102,241,.15),',
  '      0 0 160px rgba(124,58,237,.07);',
  '  }',
  '}',
  '.aria-room{',
  '  box-shadow:inset 0 0 80px rgba(99,102,241,.22),inset 0 0 180px rgba(99,102,241,.10)!important;',
  '  animation:ariaJarvis 4.5s ease-in-out infinite!important;',
  '}',

  /* Face-centre radial corona (sits behind the particle canvas) */
  '@keyframes ariaCore{',
  '  0%,100%{opacity:.55;transform:translate(-50%,-50%) scale(.92);}',
  '  50%{opacity:1;transform:translate(-50%,-50%) scale(1.08);}',
  '}',
  '.aria-glow-core{',
  '  position:absolute;top:47%;left:50%;',
  '  transform:translate(-50%,-50%);',
  '  width:320px;height:420px;border-radius:50%;',
  '  background:radial-gradient(ellipse,rgba(99,102,241,.28) 0%,rgba(124,58,237,.10) 40%,transparent 70%);',
  '  animation:ariaCore 4s ease-in-out infinite;',
  '  pointer-events:none;z-index:0;',
  '}',

  /* Scan line sweeping top to bottom */
  '@keyframes ariaScan{',
  '  0%{top:-3px;opacity:0}',
  '  4%{opacity:1}',
  '  96%{opacity:.85}',
  '  100%{top:100%;opacity:0}',
  '}',
  '.aria-scan-line{',
  '  position:absolute;left:0;right:0;height:2px;top:0;',
  '  background:linear-gradient(90deg,transparent,rgba(196,181,253,.75) 30%,rgba(196,181,253,.75) 70%,transparent);',
  '  box-shadow:0 0 8px rgba(196,181,253,.5);',
  '  animation:ariaScan 3.4s linear infinite;',
  '  pointer-events:none;z-index:6;',
  '}',

  /* Touch-active surge — class added/removed by JS */
  '.aria-room.aria-active{',
  '  box-shadow:',
  '    inset 0 0 160px rgba(99,102,241,.65),',
  '    inset 0 0 320px rgba(124,58,237,.28),',
  '    0 0 120px rgba(99,102,241,.22),',
  '    0 0 240px rgba(124,58,237,.10)!important;',
  '  transition:box-shadow .3s ease!important;',
  '}',
  '.aria-room.aria-active .aria-glow-core{',
  '  opacity:1.4!important;',
  '  animation-duration:1.8s!important;',
  '}',
].join('\n');
document.head.appendChild(css);

/* Inject DOM elements into .aria-room */
function injectGlowEls(){
  var room = document.querySelector('.aria-room');
  if(!room || room.dataset.glowInjected) return;
  room.dataset.glowInjected = '1';

  var core = document.createElement('div');
  core.className = 'aria-glow-core';
  room.insertBefore(core, room.firstChild);

  var scan = document.createElement('div');
  scan.className = 'aria-scan-line';
  room.appendChild(scan);
}

/* ══════════════════════════════════════════════════════════════
   2. TOUCH CURSOR ORB
   ══════════════════════════════════════════════════════════════ */
var IS_TOUCH = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

var orb = document.createElement('div');
orb.id = 'aria-touch-orb';
Object.assign(orb.style,{
  position:'fixed',width:'22px',height:'22px',borderRadius:'50%',
  border:'1px solid rgba(196,181,253,.55)',background:'rgba(99,102,241,.08)',
  boxShadow:'0 0 14px rgba(99,102,241,.5),0 0 28px rgba(99,102,241,.2)',
  pointerEvents:'none',zIndex:'99999',transform:'translate(-50%,-50%)',
  transition:'opacity .2s,width .12s,height .12s,box-shadow .12s',
  opacity:'0',left:'-100px',top:'-100px',willChange:'left,top'
});
document.body.appendChild(orb);

function orbMove(x,y,press){
  orb.style.left=x+'px'; orb.style.top=y+'px'; orb.style.opacity='1';
  if(press){
    orb.style.width='38px'; orb.style.height='38px';
    orb.style.boxShadow='0 0 24px rgba(99,102,241,.8),0 0 48px rgba(99,102,241,.35)';
  } else {
    orb.style.width='22px'; orb.style.height='22px';
    orb.style.boxShadow='0 0 14px rgba(99,102,241,.5),0 0 28px rgba(99,102,241,.2)';
  }
}
function orbHide(){ orb.style.opacity='0'; }

/* ══════════════════════════════════════════════════════════════
   3. SYNTHETIC MOUSE EVENTS → particle convergence
   ══════════════════════════════════════════════════════════════ */
function findAriaTarget(){
  return document.querySelector('.aria-figure')||
         document.querySelector('.aria-room')||
         document.querySelector('[class*="aria-figure"]');
}

function fireMouseAt(type, cx, cy){
  var opts={bubbles:true,cancelable:true,clientX:cx||0,clientY:cy||0,view:window};
  var ev=new MouseEvent(type,opts);
  // Fire on the target element, document, and window so any listener catches it
  var t=findAriaTarget(); if(t) t.dispatchEvent(ev);
  document.dispatchEvent(new MouseEvent(type,opts));
  window.dispatchEvent(new MouseEvent(type,opts));
}

function setRoomActive(on){
  var room=document.querySelector('.aria-room');
  if(room) room.classList[on?'add':'remove']('aria-active');
}

/* ══════════════════════════════════════════════════════════════
   4. EVENT WIRING
   ══════════════════════════════════════════════════════════════ */
var lastTouch=0, fingerDown=false;

if(IS_TOUCH){
  document.addEventListener('touchstart',function(e){
    fingerDown=true; lastTouch=Date.now();
    var t=e.touches[0];
    orbMove(t.clientX,t.clientY,true);
    setRoomActive(true);
    fireMouseAt('mouseenter',t.clientX,t.clientY);
    fireMouseAt('mousemove', t.clientX,t.clientY);
  },{passive:true});

  document.addEventListener('touchmove',function(e){
    lastTouch=Date.now();
    var t=e.touches[0];
    orbMove(t.clientX,t.clientY,false);
    fireMouseAt('mousemove',t.clientX,t.clientY);
  },{passive:true});

  document.addEventListener('touchend',function(){
    fingerDown=false; lastTouch=Date.now();
    orbHide(); setRoomActive(false);
    fireMouseAt('mouseleave',0,0);
  },{passive:true});

  document.addEventListener('touchcancel',function(){
    fingerDown=false; orbHide(); setRoomActive(false);
    fireMouseAt('mouseleave',0,0);
  },{passive:true});
}

// Desktop hover surge
var room=document.querySelector('.aria-room');
if(room){
  room.addEventListener('mouseenter',function(){ setRoomActive(true); });
  room.addEventListener('mouseleave',function(){ setRoomActive(false); });
}

/* ══════════════════════════════════════════════════════════════
   5. AUTO-BREATHING (mobile idle — orb circles the face)
   ══════════════════════════════════════════════════════════════ */
if(IS_TOUCH){
  var bPh=0;
  (function breathe(){
    requestAnimationFrame(breathe);
    if(fingerDown||Date.now()-lastTouch<2200) return;
    bPh++;
    var pulse=(Math.sin(bPh/380*Math.PI*2)+1)*0.5;
    var t=findAriaTarget(); if(!t) return;
    var r=t.getBoundingClientRect(); if(!r.width) return;
    var cx=r.left+r.width*.5, cy=r.top+r.height*.4;
    if(pulse>0.05){
      var px=cx+Math.cos(bPh/380*Math.PI*2*.65)*r.width*.13*pulse;
      var py=cy+Math.sin(bPh/380*Math.PI*2*.65)*r.height*.07*pulse;
      orb.style.left=px+'px'; orb.style.top=py+'px';
      orb.style.opacity=String(pulse*.3);
      fireMouseAt('mousemove',px,py);
    } else {
      orbHide(); fireMouseAt('mouseleave',0,0);
    }
  })();
}

/* ══════════════════════════════════════════════════════════════
   6. INIT
   ══════════════════════════════════════════════════════════════ */
function init(){
  injectGlowEls();
  // Also wire desktop hover after injection
  var r=document.querySelector('.aria-room');
  if(r&&!r.dataset.hoverWired){
    r.dataset.hoverWired='1';
    r.addEventListener('mouseenter',function(){setRoomActive(true);});
    r.addEventListener('mouseleave',function(){setRoomActive(false);});
  }
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
else init();
setTimeout(init,800); // retry after aria-volumetric.js settles

})();
