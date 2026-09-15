/* aria-volumetric-product.js — v2
   Bigger face (97% fill), properly centred.
   Samples aria-reference.png via hidden canvas.
   Kills ring CSS immediately on load.
*/
(function(){
'use strict';

// Kill rings right away
const ks=document.createElement('style');
ks.textContent='.aria-ring,.aria-room::after,.aria-room::before,.orbit-ring{display:none!important;animation:none!important;}';
document.head.appendChild(ks);

// State colours
const COLS={idle:[99,102,241],listening:[124,58,237],thinking:[165,180,252],speaking:[232,121,249]};
const ENERGY={idle:.3,listening:.65,thinking:.45,speaking:1.1};
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

let canvas,ctx,W=0,H=0;
let rawParts=[],parts=[];

function setupCanvas(){
  canvas=document.getElementById('ariaVolumetricCanvas');
  if(!canvas){
    canvas=document.createElement('canvas');
    canvas.id='ariaVolumetricCanvas';
    Object.assign(canvas.style,{
      position:'absolute',inset:'0',
      width:'100%',height:'100%',
      zIndex:'4',pointerEvents:'none',display:'block'
    });
    const room=document.querySelector('.aria-room')||document.body;
    const old=room.querySelector('img');
    if(old)old.style.display='none';
    room.appendChild(canvas);
  }
  ctx=canvas.getContext('2d');
}

// Use getBoundingClientRect for accurate post-layout dimensions
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
  const aspect=img.width/img.height;
  const sw=aspect>=1?SMAX:Math.round(SMAX*aspect);
  const sh=aspect>=1?Math.round(SMAX/aspect):SMAX;
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

  // Tight bounding box of sampled face pixels
  let x0=1,x1=0,y0=1,y1=0;
  rawParts.forEach(p=>{
    if(p.nx<x0)x0=p.nx;if(p.nx>x1)x1=p.nx;
    if(p.ny<y0)y0=p.ny;if(p.ny>y1)y1=p.ny;
  });
  const iW=x1-x0||1,iH=y1-y0||1,iAspect=iW/iH;

  // Fill 96% of the container — no more tiny faces
  const aW=W*.96, aH=H*.96;
  let dW,dH;
  if(aW/aH>iAspect){dH=aH;dW=dH*iAspect;}
  else{dW=aW;dH=dW/iAspect;}

  // Explicit centre — horizontal and vertical
  const oX=(W-dW)*.5;
  const oY=(H-dH)*.5;

  parts=rawParts.map(p=>{
    const bx=oX+((p.nx-x0)/iW)*dW;
    const by=oY+((p.ny-y0)/iH)*dH;
    return{
      x:bx+(Math.random()-.5)*2,y:by+(Math.random()-.5)*2,
      bx,by,
      vx:(Math.random()-.5)*.45,vy:(Math.random()-.5)*.45,
      size:.5+p.lum*1.4,
      alpha:.22+p.lum*.62,
      ph:Math.random()*Math.PI*2,
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
  // Recheck dimensions every frame — zero-cost if unchanged
  measure();
  if(!W||!H)return;
  ctx.clearRect(0,0,W,H);

  for(let i=0;i<3;i++)activeRGB[i]=lerp(activeRGB[i],targetRGB[i],.022);
  const[r,g,b]=activeRGB.map(v=>Math.round(v));
  const energy=ENERGY[state]||.3;

  const grd=ctx.createRadialGradient(W*.5,H*.5,0,W*.5,H*.5,Math.max(W,H)*.55);
  grd.addColorStop(0,`rgba(${r},${g},${b},.07)`);
  grd.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);

  parts.forEach(p=>{
    p.ph+=.014*(1+energy*.4);
    const drift=energy*.75;
    p.x+=p.vx*drift*Math.sin(p.ph*1.1);
    p.y+=p.vy*drift*Math.cos(p.ph*.92);
    p.x+=(p.bx-p.x)*.028;
    p.y+=(p.by-p.y)*.028;
    const a=p.alpha*(.78+.22*Math.sin(p.ph));
    ctx.fillStyle=`rgba(${r},${g},${b},${a})`;
    ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();
  });
}

function init(){
  setupCanvas();
  watchState();

  // Wait two frames for DOM layout to settle before measuring
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    measure();
    const img=new Image();
    img.src='aria-reference.png';
    img.onload=function(){
      // Measure again after image load — layout may have shifted
      measure();
      sampleImage(img);
      // Rebuild if size changes on first resize event
      window.addEventListener('resize',()=>{
        setTimeout(()=>{measure();rebuildPositions();},80);
      });
      animate();
    };
    img.onerror=function(){measure();buildFallback();animate();};
  }));
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();

})();
