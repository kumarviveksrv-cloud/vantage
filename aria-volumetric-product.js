/* aria-volumetric-product.js — v3
   Properly moving particles driven by aria-reference.png.
*/
(function(){
'use strict';

const ks=document.createElement('style');
ks.textContent='.aria-ring,.aria-room::after,.aria-room::before,.orbit-ring{display:none!important;animation:none!important;}';
document.head.appendChild(ks);

const COLS={idle:[99,102,241],listening:[124,58,237],thinking:[165,180,252],speaking:[232,121,249]};
// Energy drives HOW FAR particles drift from their base position
// idle=subtle drift, speaking=dramatic scatter
const ENERGY={idle:1.2,listening:2.2,thinking:1.6,speaking:4.0};

let state='idle',activeRGB=[...COLS.idle],targetRGB=[...COLS.idle];

function watchState(){
  const el=document.getElementById('slbl');
  if(!el)return;
  const upd=()=>{
    const c=el.className;
    state=c.includes('listening')?'listening':c.includes('thinking')?'thinking':c.includes('speaking')?'speaking':'idle';
    targetRGB=[...COLS[state]];
  };
  new MutationObserver(upd).observe(el,{attributes:true,attributeFilter:['class']});
  upd();
}

let canvas,ctx,W=0,H=0,rawParts=[],parts=[];

function setupCanvas(){
  canvas=document.getElementById('ariaVolumetricCanvas');
  if(!canvas){
    canvas=document.createElement('canvas');
    canvas.id='ariaVolumetricCanvas';
    Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',zIndex:'4',pointerEvents:'none',display:'block'});
    const room=document.querySelector('.aria-room')||document.body;
    const old=room.querySelector('img');
    if(old)old.style.display='none';
    room.appendChild(canvas);
  }
  ctx=canvas.getContext('2d');
}

function measure(){
  const p=canvas.parentElement;
  if(!p)return;
  const r=p.getBoundingClientRect();
  const w=Math.round(r.width)||p.offsetWidth||880;
  const h=Math.round(r.height)||p.offsetHeight||650;
  if(w===W&&h===H)return;
  W=canvas.width=w;
  H=canvas.height=h;
}

function sampleImage(img){
  const SMAX=260;
  const asp=img.width/img.height;
  const sw=asp>=1?SMAX:Math.round(SMAX*asp);
  const sh=asp>=1?Math.round(SMAX/asp):SMAX;
  const off=document.createElement('canvas');
  off.width=sw;off.height=sh;
  const oc=off.getContext('2d');
  oc.drawImage(img,0,0,sw,sh);
  const d=oc.getImageData(0,0,sw,sh).data;

  rawParts=[];
  for(let y=0;y<sh;y+=2){
    for(let x=0;x<sw;x+=2){
      const i=(y*sw+x)*4;
      if(d[i+3]<80)continue;
      const lum=d[i]*.299+d[i+1]*.587+d[i+2]*.114;
      if(lum<28||lum>250)continue;
      rawParts.push({nx:x/sw,ny:y/sh,lum:lum/255});
    }
  }
  if(rawParts.length>8000){
    const f=8000/rawParts.length;
    rawParts=rawParts.filter(()=>Math.random()<f);
  }
  rebuildPositions();
}

function rebuildPositions(){
  if(!rawParts.length||!W||!H)return;
  let x0=1,x1=0,y0=1,y1=0;
  rawParts.forEach(p=>{
    if(p.nx<x0)x0=p.nx;if(p.nx>x1)x1=p.nx;
    if(p.ny<y0)y0=p.ny;if(p.ny>y1)y1=p.ny;
  });
  const iW=x1-x0||1,iH=y1-y0||1,iAsp=iW/iH;
  const aW=W*.96,aH=H*.96;
  let dW,dH;
  if(aW/aH>iAsp){dH=aH;dW=dH*iAsp;}else{dW=aW;dH=dW/iAsp;}
  const oX=(W-dW)*.5, oY=(H-dH)*.5;

  parts=rawParts.map(p=>{
    const bx=oX+((p.nx-x0)/iW)*dW;
    const by=oY+((p.ny-y0)/iH)*dH;
    return{
      x:bx,y:by,bx,by,
      // Assign each particle a unique drift direction and speed
      // vx/vy determine WHERE it drifts — range gives variety
      vx:(Math.random()-.5)*1.4,
      vy:(Math.random()-.5)*1.4,
      // Personal oscillation phase offset so particles don't all move in sync
      ph:Math.random()*Math.PI*2,
      // Phase speed variation — different particles oscillate at different rates
      spd:.03+Math.random()*.04,
      size:.8+p.lum*1.9,
      alpha:.28+p.lum*.65,
      lum:p.lum,
    };
  });
}

function buildFallback(){
  rawParts=[];
  for(let i=0;i<3000;i++){
    const a=Math.random()*Math.PI*2,r=Math.random();
    rawParts.push({nx:.15+r*.7*Math.cos(a)*.42+.43,ny:.1+r*.8*Math.sin(a)*.55+.42,lum:.3+r*.5});
  }
  rebuildPositions();
}

function lerp(a,b,t){return a+(b-a)*t;}

function animate(){
  requestAnimationFrame(animate);
  measure();
  if(!W||!H||!parts.length)return;
  ctx.clearRect(0,0,W,H);

  for(let i=0;i<3;i++)activeRGB[i]=lerp(activeRGB[i],targetRGB[i],.022);
  const[r,g,b]=activeRGB.map(v=>Math.round(v));
  const energy=ENERGY[state]||1.2;

  // Ambient glow behind face
  const grd=ctx.createRadialGradient(W*.5,H*.5,0,W*.5,H*.5,Math.max(W,H)*.55);
  grd.addColorStop(0,`rgba(${r},${g},${b},.07)`);
  grd.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);

  parts.forEach(p=>{
    // Advance personal phase
    p.ph+=p.spd;

    // ── THE ACTUAL MOTION ────────────────────────────────
    // Each particle drifts sinusoidally around its base position.
    // amplitude = vx * energy / SPRING — tuned so idle gives ~8-12px drift,
    // speaking gives ~35-50px scatter.
    const SPRING=0.018;
    const dx=p.vx*energy*Math.sin(p.ph);
    const dy=p.vy*energy*Math.cos(p.ph*.87);
    p.x+=dx;
    p.y+=dy;
    // Spring pulls back toward base — weak enough to allow real visible drift
    p.x+=(p.bx-p.x)*SPRING;
    p.y+=(p.by-p.y)*SPRING;
    // ─────────────────────────────────────────────────────

    // Brightness pulse tied to phase
    const pulsedAlpha=p.alpha*(.72+.28*Math.sin(p.ph*1.4));

    // Subtle glow on brighter particles
    if(p.lum>.65){
      ctx.shadowBlur=5;
      ctx.shadowColor=`rgba(${r},${g},${b},.45)`;
    } else {
      ctx.shadowBlur=0;
    }

    ctx.fillStyle=`rgba(${r},${g},${b},${pulsedAlpha})`;
    ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();
  });
  ctx.shadowBlur=0;
}

function init(){
  setupCanvas();
  watchState();
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    measure();
    const img=new Image();
    img.src='aria-reference.png';
    img.onload=function(){measure();sampleImage(img);animate();};
    img.onerror=function(){measure();buildFallback();animate();};
    window.addEventListener('resize',()=>{
      setTimeout(()=>{measure();rebuildPositions();},80);
    });
  }));
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();

})();
