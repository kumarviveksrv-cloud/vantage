/* VANTAGE // STAR GLOBE — ambient background, experimental replacement
   for the old #world scattered-star point cloud (removed from
   vantage-cinematic-v4.js). Adapted from the fibonacci-sphere labeled-
   node network already proven on pms.virorah.com's hero (#vr-globe) —
   same core technique (golden-ratio sphere distribution, nearest-
   neighbour connecting lines, a subset of "hot" glowing nodes, a
   handful of labeled ones), retargeted to Vantage's own palette and
   feature names, and sized to the full page rather than just the hero
   since it's replacing a full-page ambient background, not a hero
   centerpiece.

   This is an explicit one-off experiment ("just try once, let's see
   how it looks") — deliberately kept in its own file so reverting is
   a one-line change (drop the <script> tag) rather than untangling it
   from anything else.

   Left non-interactive (no drag-to-rotate) since #world sits behind
   the entire scrollable page, not a single contained panel — dragging
   the whole page's background would fight with normal scrolling.
*/
(function(){
  'use strict';
  const cv=document.getElementById('world');
  if(!cv)return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;

  const ctx=cv.getContext('2d');
  let W,H,CX,CY,SR;

  const LABELS=['MERIDIAN','ARIA','PACT','SIGNAL','Case Navigator','Policy Compass','Offer Intelligence','Humacity','Conversation Simulator','Stakeholder Influence','Context Engine','Vantage Record','Precision Advice','Decision Field','Trust Preservation','Consequence Mapping','Process Integrity','Accountability','07 Variables','Meridian Active'];

  const N=220,PHI=Math.PI*(1+Math.sqrt(5));
  const nodes=[];let labelIdx=0;
  for(let i=0;i<N;i++){
    const y=1-(i/(N-1))*2,r=Math.sqrt(Math.max(0,1-y*y)),theta=PHI*i;
    const x=Math.cos(theta)*r,z=Math.sin(theta)*r;
    const isHot=(i%38===0),hasLbl=(i%11===0)&&labelIdx<LABELS.length;
    nodes.push({ox:x,oy:y,oz:z,x:x,y:y,z:z,r:isHot?3.5:(1.2+Math.random()*1.2),isHot:isHot,label:hasLbl?LABELS[labelIdx++]:null,pulse:Math.random()*Math.PI*2});
  }

  const CONN_THRESH=0.42,edges=[];
  for(let i=0;i<nodes.length;i++){
    for(let j=i+1;j<nodes.length;j++){
      const dx=nodes[i].ox-nodes[j].ox,dy=nodes[i].oy-nodes[j].oy,dz=nodes[i].oz-nodes[j].oz;
      if(Math.sqrt(dx*dx+dy*dy+dz*dz)<CONN_THRESH)edges.push([i,j]);
    }
  }

  let rotY=0,rotX=.12,targetRotX=.12;
  const autoSpinY=.0009;
  let mx=0,my=0;

  function rotateNode(n){
    const cosY=Math.cos(rotY),sinY=Math.sin(rotY);
    const x1=n.ox*cosY+n.oz*sinY,z1=-n.ox*sinY+n.oz*cosY;
    const cosX=Math.cos(rotX),sinX=Math.sin(rotX);
    const y1=n.oy*cosX-z1*sinX,z2=n.oy*sinX+z1*cosX;
    n.x=x1;n.y=y1;n.z=z2;
  }
  function project(x,y,z){
    const d=2.8/(2.8-z*.7);
    return{sx:CX+x*SR*d,sy:CY+y*SR*d,d:d,depth:z};
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    rotY+=autoSpinY+mx*.00025;
    rotX+=(targetRotX-rotX)*.03;
    targetRotX=.12+my*.12;
    nodes.forEach(rotateNode);

    edges.forEach(e=>{
      const a=nodes[e[0]],b=nodes[e[1]];
      const avgZ=(a.z+b.z)*.5,alpha=Math.max(0,.03+(avgZ+1)*.05);
      const pa=project(a.x,a.y,a.z),pb=project(b.x,b.y,b.z);
      ctx.beginPath();ctx.moveTo(pa.sx,pa.sy);ctx.lineTo(pb.sx,pb.sy);
      ctx.strokeStyle='rgba(102,126,234,'+alpha+')';ctx.lineWidth=.6;ctx.stroke();
    });

    const sorted=nodes.slice().sort((a,b)=>a.z-b.z);
    sorted.forEach(n=>{
      const p=project(n.x,n.y,n.z);
      const depthN=(n.z+1)*.5,baseA=.08+depthN*.5;
      if(n.isHot){
        n.pulse+=.03;
        const pulse=Math.sin(n.pulse)*.3+.7;
        const glowR=p.d*SR*.045*pulse+11;
        const grd=ctx.createRadialGradient(p.sx,p.sy,0,p.sx,p.sy,glowR);
        grd.addColorStop(0,'rgba(190,160,255,'+(.4*pulse*baseA)+')');
        grd.addColorStop(.4,'rgba(102,126,234,'+(.22*pulse*baseA)+')');
        grd.addColorStop(1,'rgba(102,126,234,0)');
        ctx.fillStyle=grd;ctx.beginPath();ctx.arc(p.sx,p.sy,glowR,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(220,200,255,'+Math.min(1,baseA*1.1)+')';
        ctx.beginPath();ctx.arc(p.sx,p.sy,n.r*p.d*1.1,0,Math.PI*2);ctx.fill();
      }else{
        ctx.fillStyle='rgba(147,112,219,'+(baseA*.65)+')';
        ctx.beginPath();ctx.arc(p.sx,p.sy,Math.max(.4,n.r*p.d*.5),0,Math.PI*2);ctx.fill();
      }
      if(n.label&&depthN>.55){
        const lAlpha=Math.min(.5,(depthN-.55)*2.2*baseA);
        const fs=Math.max(9,Math.round(10*p.d*depthN));
        ctx.font=fs+'px "JetBrains Mono",monospace';
        ctx.textAlign='left';ctx.textBaseline='middle';
        ctx.fillStyle='rgba(165,180,252,'+lAlpha+')';
        ctx.fillText(n.label,p.sx+n.r*p.d*1.4+3,p.sy);
      }
    });
  }

  function tick(){draw();requestAnimationFrame(tick);}

  addEventListener('pointermove',e=>{
    mx=(e.clientX/innerWidth-.5);my=(e.clientY/innerHeight-.5);
  },{passive:true});

  function resize(){
    W=cv.width=innerWidth;H=cv.height=innerHeight;
    CX=W*.5;CY=H*.5;SR=Math.min(W,H)*.62;
  }
  addEventListener('resize',resize);
  resize();
  requestAnimationFrame(tick);
})();
