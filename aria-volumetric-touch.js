/* aria-volumetric-touch.js — v3
   Mobile touch cursor + particle convergence + auto-breathing + JARVIS glow overlay.
   Load after aria-volumetric.js in index.html.
*/
(function(){
'use strict';

var IS_TOUCH = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

/* ── VISIBLE TOUCH CURSOR ──────────────────────────────────────── */
var orb = document.createElement('div');
orb.id = 'aria-touch-orb';
Object.assign(orb.style,{
  position:'fixed',width:'22px',height:'22px',borderRadius:'50%',
  border:'1px solid rgba(196,181,253,.55)',background:'rgba(99,102,241,.07)',
  boxShadow:'0 0 14px rgba(99,102,241,.45),0 0 28px rgba(99,102,241,.18)',
  pointerEvents:'none',zIndex:'99999',transform:'translate(-50%,-50%)',
  transition:'opacity .2s,width .15s,height .15s',opacity:'0',
  left:'-100px',top:'-100px',willChange:'left,top'
});
document.body.appendChild(orb);

function orbAt(x,y,press){
  orb.style.left=x+'px'; orb.style.top=y+'px'; orb.style.opacity='1';
  orb.style.width=press?'36px':'22px'; orb.style.height=press?'36px':'22px';
  orb.style.boxShadow=press
    ?'0 0 22px rgba(99,102,241,.7),0 0 44px rgba(99,102,241,.3)'
    :'0 0 14px rgba(99,102,241,.45),0 0 28px rgba(99,102,241,.18)';
}
function orbHide(){ orb.style.opacity='0'; }

/* ── TARGET DISCOVERY ──────────────────────────────────────────── */
function findTarget(){
  return document.querySelector('.aria-figure')||
         document.querySelector('.aria-room')||
         document.querySelector('[class*="aria-"]');
}

function fireAt(type,cx,cy){
  var ev={bubbles:true,cancelable:true,clientX:cx||0,clientY:cy||0,view:window};
  [findTarget(),document,window].forEach(function(el){
    if(el) el.dispatchEvent(new MouseEvent(type,ev));
  });
}

/* ── TOUCH EVENTS ──────────────────────────────────────────────── */
var lastTouch=0, fingerDown=false;
if(IS_TOUCH){
  document.addEventListener('touchstart',function(e){
    fingerDown=true; lastTouch=Date.now();
    var t=e.touches[0]; orbAt(t.clientX,t.clientY,true);
    fireAt('mouseenter',t.clientX,t.clientY);
    fireAt('mousemove', t.clientX,t.clientY);
  },{passive:true});
  document.addEventListener('touchmove',function(e){
    lastTouch=Date.now();
    var t=e.touches[0]; orbAt(t.clientX,t.clientY,false);
    fireAt('mousemove',t.clientX,t.clientY);
  },{passive:true});
  document.addEventListener('touchend',function(){
    fingerDown=false; lastTouch=Date.now(); orbHide();
    fireAt('mouseleave',0,0);
  },{passive:true});
  document.addEventListener('touchcancel',function(){
    fingerDown=false; orbHide(); fireAt('mouseleave',0,0);
  },{passive:true});
}

/* ── JARVIS GLOW OVERLAY (landing page) ──────────────────────── */
function setupGlow(){
  var target=findTarget(); if(!target) return;
  var rect=target.getBoundingClientRect();
  if(!rect.width) return;

  var gc=document.createElement('canvas');
  gc.id='aria-glow-canvas';
  Object.assign(gc.style,{
    position:'absolute',inset:'0',width:'100%',height:'100%',
    zIndex:'2',pointerEvents:'none',display:'block'
  });
  // Insert above the particle canvas
  var existing=target.querySelector('canvas');
  if(existing&&existing.nextSibling) target.insertBefore(gc,existing.nextSibling);
  else target.appendChild(gc);

  var gctx=gc.getContext('2d');
  var GW=0,GH=0,gPh=0,sPh=0;
  var hovering=false, hoverX=0, hoverY=0;

  function resize(){
    var r=target.getBoundingClientRect();
    GW=gc.width=Math.round(r.width)||560;
    GH=gc.height=Math.round(r.height)||600;
  }
  resize();
  new ResizeObserver(resize).observe(target);

  // Track hover/touch state
  target.addEventListener('mouseenter',function(e){hovering=true;hoverX=e.clientX;hoverY=e.clientY;});
  target.addEventListener('mousemove', function(e){hoverX=e.clientX;hoverY=e.clientY;});
  target.addEventListener('mouseleave',function(){hovering=false;});
  document.addEventListener('touchstart',function(){hovering=true; lastTouch=Date.now();},{passive:true});
  document.addEventListener('touchend',  function(){hovering=false;},{passive:true});

  var CYCLE=380; // frames per full breath

  function drawFrame(){
    requestAnimationFrame(drawFrame);
    gPh++;
    gctx.clearRect(0,0,GW,GH);

    var idle=Date.now()-lastTouch>2000&&!hovering;
    var breathPulse=(Math.sin((gPh/CYCLE)*Math.PI*2)+1)*0.5; // 0→1→0
    var intensity=hovering||!idle?1.0:0.22+breathPulse*0.38;

    // Face centre (approximate for landing page)
    var fx=GW*.5, fy=GH*.38;

    // Corona
    var c1=gctx.createRadialGradient(fx,fy,0,fx,fy,Math.max(GW,GH)*.55);
    c1.addColorStop(0,  'rgba(99,102,241,'+(0.14*intensity)+')');
    c1.addColorStop(.28,'rgba(99,102,241,'+(0.05*intensity)+')');
    c1.addColorStop(1,  'rgba(0,0,0,0)');
    gctx.fillStyle=c1; gctx.fillRect(0,0,GW,GH);

    // Tight halo
    var c2=gctx.createRadialGradient(fx,fy,0,fx,fy,Math.min(GW,GH)*.28);
    c2.addColorStop(0,  'rgba(124,58,237,'+(0.22*intensity)+')');
    c2.addColorStop(.6, 'rgba(99,102,241,'+(0.06*intensity)+')');
    c2.addColorStop(1,  'rgba(0,0,0,0)');
    gctx.fillStyle=c2; gctx.fillRect(0,0,GW,GH);

    // Scan line (on hover/touch or at breath peak)
    if(intensity>0.45){
      sPh+=0.003*(1+intensity*.5);
      var sy=(sPh%1)*GH;
      var sg=gctx.createLinearGradient(0,sy-5,0,sy+5);
      sg.addColorStop(0,'rgba(0,0,0,0)');
      sg.addColorStop(.5,'rgba(196,181,253,'+(0.5*intensity)+')');
      sg.addColorStop(1,'rgba(0,0,0,0)');
      gctx.fillStyle=sg; gctx.fillRect(0,sy-5,GW,10);
    }

    // Touch/hover burst
    if(hovering){
      var burst=Math.max(0,Math.sin(gPh*.18))*.14;
      var c3=gctx.createRadialGradient(fx,fy,0,fx,fy,Math.min(GW,GH)*.2);
      c3.addColorStop(0,'rgba(196,181,253,'+burst+')');
      c3.addColorStop(1,'rgba(0,0,0,0)');
      gctx.fillStyle=c3; gctx.fillRect(0,0,GW,GH);
    }
  }
  drawFrame();
}

/* ── AUTO-BREATHING CURSOR (mobile idle) ──────────────────────── */
function startBreathing(){
  if(!IS_TOUCH) return;
  var bPh=0, CYCLE2=380;
  (function breathe(){
    requestAnimationFrame(breathe);
    if(fingerDown||Date.now()-lastTouch<2200) return;
    bPh++;
    var pulse=(Math.sin((bPh/CYCLE2)*Math.PI*2)+1)*0.5;
    var target=findTarget(); if(!target) return;
    var rect=target.getBoundingClientRect();
    var cx=rect.left+rect.width*.5, cy=rect.top+rect.height*.38;
    if(pulse>0.05){
      var rX=rect.width*.14*pulse, rY=rect.height*.06*pulse;
      var a=(bPh/CYCLE2)*Math.PI*2*.65;
      var px=cx+Math.cos(a)*rX, py=cy+Math.sin(a)*rY;
      orb.style.left=px+'px'; orb.style.top=py+'px';
      orb.style.opacity=String(pulse*.35);
      fireAt('mousemove',px,py);
    } else {
      orbHide(); fireAt('mouseleave',0,0);
    }
  })();
}

setTimeout(function(){
  setupGlow();
  startBreathing();
},900);

})();
