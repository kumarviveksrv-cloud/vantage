/* aria-volumetric-product.js — v5
   Fixes: uses existing #aria-canvas (not .aria-room which doesn't exist in aria.html)
   Mouse events on .face-area (canvas has pointer-events:none)
   Chin positioned above mic button.
*/
(function(){
'use strict';

const ks=document.createElement('style');
ks.textContent='.aria-ring,.aria-room::after,.aria-room::before,.orbit-ring{display:none!important;animation:none!important;}';
document.head.appendChild(ks);

const COLS={idle:[99,102,241],listening:[124,58,237],thinking:[165,180,252],speaking:[232,121,249]};
const ENERGY={idle:1.0,listening:1.8,thinking:1.3,speaking:3.2};
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
let mx=-9999,my=-9999;

function setupCanvas(){
  // aria.html already has <canvas id="aria-canvas"> — use it
  canvas = document.getElementById('aria-canvas') || document.getElementById('ariaVolumetricCanvas');

  if(!canvas){
    canvas=document.createElement('canvas');
    canvas.id='ariaVolumetricCanvas';
    Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',zIndex:'4',pointerEvents:'none',display:'block'});
    const container=document.querySelector('.face-area')||document.querySelector('.aria-room')||document.body;
    container.appendChild(canvas);
  }

  ctx=canvas.getContext('2d');

  // Mouse events on .face-area — canvas has pointer-events:none so we track the parent
  const faceArea=document.querySelector('.face-area')||canvas.parentElement||document.body;
  faceArea.addEventListener('mousemove',e=>{
    const r=canvas.getBoundingClientRect();
    mx=e.clientX-r.left; my=e.clientY-r.top;
  });
  faceArea.addEventListener('mouseleave',()=>{mx=-9999;my=-9999;});
}

function measure(){
  const p=canvas.parentElement;
  if(!p)return;
  const r=p.getBoundingClientRect();
  const w=Math.round(r.width)||p.offsetWidth||880;
  const h=Math.round(r.height)||p.offsetHeight||650;
  if(w===W&&h===H)return;
  W=canvas.width=w; H=canvas.height=h;
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
  const aW=W*.95,aH=H*.95;
  let dW,dH;
  if(aW/aH>iAsp){dH=aH;dW=dH*iAsp;}else{dW=aW;dH=dW/iAsp;}

  // Chin above mic: mic-area is position:absolute;bottom:16px, micb is 72px tall
  // So mic top edge is at H-16-72=H-88. Put face bottom at H-88-8=H-96 (8px gap)
  const oX=(W-dW)*.5;
  const oY=Math.max(0, H-96-dH);

  parts=rawParts.map(p=>{
    const bx=oX+((p.nx-x0)/iW)*dW;
    const by=oY+((p.ny-y0)/iH)*dH;
    return{
      x:bx,y:by,bx,by,
      vx:(Math.random()-.5)*1.2,vy:(Math.random()-.5)*1.2,
      ph:Math.random()*Math.PI*2,
      spd:.03+Math.random()*.04,
      size:.25+p.lum*.75,   // thin — matches landing page ARIA teaser
      alpha:.25+p.lum*.55,
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

const REPEL_R=90, REPEL_F=4.5;

function animate(){
  requestAnimationFrame(animate);
  measure();
  if(!W||!H||!parts.length)return;
  ctx.clearRect(0,0,W,H);

  for(let i=0;i<3;i++)activeRGB[i]=lerp(activeRGB[i],targetRGB[i],.022);
  const[r,g,b]=activeRGB.map(v=>Math.round(v));
  const energy=ENERGY[state]||1.0;

  const grd=ctx.createRadialGradient(W*.5,H*.5,0,W*.5,H*.5,Math.max(W,H)*.55);
  grd.addColorStop(0,`rgba(${r},${g},${b},.06)`);
  grd.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);

  const SPRING=0.018;
  parts.forEach(p=>{
    p.ph+=p.spd;
    p.x+=p.vx*energy*Math.sin(p.ph);
    p.y+=p.vy*energy*Math.cos(p.ph*.87);
    p.x+=(p.bx-p.x)*SPRING;
    p.y+=(p.by-p.y)*SPRING;

    // Cursor repulsion
    const ddx=p.x-mx,ddy=p.y-my;
    const dist=Math.sqrt(ddx*ddx+ddy*ddy);
    if(dist<REPEL_R&&dist>0.5){
      const force=(1-dist/REPEL_R)*REPEL_F;
      p.x+=(ddx/dist)*force;
      p.y+=(ddy/dist)*force;
    }

    const al=p.alpha*(.72+.28*Math.sin(p.ph*1.4));
    ctx.fillStyle=`rgba(${r},${g},${b},${al})`;
    ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();
  });
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
    window.addEventListener('resize',()=>{setTimeout(()=>{measure();rebuildPositions();},80);});
  }));
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();

})();
