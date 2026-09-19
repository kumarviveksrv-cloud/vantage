/* VANTAGE 7.1 / THE 21:00 PROLOGUE
   Procedural office pressure scene. Single phase — the face/ARIA-question
   phase was retired; that hook line now lives at the top of the hero.

   SR19 reconstruction: restored to original Three.js office scene
   (removed SR18 photo background replacement). The Three.js canvas
   IS the visual — no GPU competition with photo layers, no screenglow
   CSS animation, no rain CSS overlays. Flicker-free on both desktop
   and mobile because there is only one GPU workload.

   SR19 improvements applied on top of SR17 base:
   - Timer extended: 9s → 13s (more reading time)
   - Countdown: 6/7/8s → 10/11/12s
   - void countNum.offsetWidth → double rAF (no synchronous reflow)
   - Countdown Three.js pause (GPU relief during countdown animation)
   - endPrologue: 2.4s fade, vantage_tada session key for ta-da sequence
   - Rain confinement: drops stay within window vertical span
*/
(function(){
  'use strict';
  const $=(s,p=document)=>p.querySelector(s);
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pro=$('#prologue');
  if(!pro||reduce)return;

  // Skip the prologue for anyone who's already seen it this session,
  // or returning from demo.html.
  const cameFromDemo=/\/demo\.html/i.test(document.referrer||'');
  const alreadySeen=sessionStorage.getItem('vantage_prologue_seen')==='1';
  if(cameFromDemo||alreadySeen){
    pro.style.display='none';
    document.body.classList.add('prologue-complete');
    return;
  }
  /* Kill horizontal scrollbar immediately — page content has overflow-x
     that Chrome renders on top of the fixed prologue overlay. CSS fix in
     index.html covers normal loads; this covers sw.js cached-HTML visits. */
  document.documentElement.style.overflowX='hidden';
  document.body.style.overflowX='hidden';
  const canvas=$('#prologueCanvas');
  const skip=$('#prologueSkip');
  let active=false, timers=[];
  const later=(fn,ms)=>{const id=setTimeout(fn,ms);timers.push(id);return id};
  function clearTimers(){timers.forEach(clearTimeout);timers=[]}

  function lockScroll(lock){
    document.documentElement.classList.toggle('prologue-lock',lock);
    document.body.classList.toggle('prologue-lock',lock);
  }
  function preventScroll(e){if(active)e.preventDefault();}
  addEventListener('wheel',preventScroll,{passive:false});
  addEventListener('touchmove',preventScroll,{passive:false});

  function endPrologue(){
    if(!active)return;
    active=false;
    clearTimers();
    lockScroll(false);
    pro.classList.remove('active','phase-pressure');
    pro.classList.add('ending');
    const fade=$('.prologue-fade');
    if(fade){
      fade.style.setProperty('transition','opacity 2.4s ease','important');
      fade.classList.add('on');
    }
    sessionStorage.setItem('vantage_prologue_seen','1');
    sessionStorage.setItem('vantage_tada','1');
    setTimeout(()=>{
      pro.style.display='none';
      document.body.classList.add('prologue-complete');
    },2500);
  }
  skip?.addEventListener('click',endPrologue);

  /* ---------- Three.js scene (desktop + mobile) ---------- */
  if(!canvas||!window.THREE)return;
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
  renderer.setSize(innerWidth,innerHeight);
  renderer.setClearColor(0,0);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.1,100);camera.position.set(0,1.1,9.2);
  const world=new THREE.Group();scene.add(world);
  const office=new THREE.Group();world.add(office);
  const mat=(color,rough=.8,metal=0)=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
  const dark=mat(0x080810,.92,0), darker=mat(0x030307,.98,0);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(18,13),dark);floor.rotation.x=-Math.PI/2;floor.position.y=-1.45;office.add(floor);
  const wall=new THREE.Mesh(new THREE.PlaneGeometry(18,9),darker);wall.position.set(0,2.5,-4.5);office.add(wall);
  const desk=new THREE.Mesh(new THREE.BoxGeometry(6.2,.18,2.5),mat(0x11111a,.7,.1));desk.position.set(.1,-.15,-.1);office.add(desk);
  [-2.55,2.55].forEach(x=>{const leg=new THREE.Mesh(new THREE.BoxGeometry(.16,2.2,.16),dark);leg.position.set(x,-1.25,-.8);office.add(leg)});
  const laptop=new THREE.Group();office.add(laptop);laptop.position.set(.45,.22,-.25);
  const base=new THREE.Mesh(new THREE.BoxGeometry(2.25,.08,1.45),mat(0x161621,.35,.35));base.rotation.x=-.04;laptop.add(base);
  const screenFrame=new THREE.Mesh(new THREE.BoxGeometry(2.05,1.35,.08),mat(0x080811,.45,.5));screenFrame.position.set(0,.72,-.63);screenFrame.rotation.x=-.02;laptop.add(screenFrame);

  /* ---------- Live laptop intelligence display ---------- */
  function buildScreenTexture(){
    const c=document.createElement('canvas');
    c.width=1024;c.height=600;
    const x=c.getContext('2d');
    const W=c.width,H=c.height;
    const base={risk:62,exposure:18.4,process:43,evidence:58,context:71,pressure:78};
    let phase=0;
    const rgba=(r,g,b,a)=>`rgba(${r},${g},${b},${a})`;
    const cyan=[142,214,255], violet=[180,164,255], amber=[255,180,91], red=[255,101,126];
    function line(ax,ay,bx,by,color,width=1,alpha=.5){
      x.save();x.strokeStyle=rgba(...color,alpha);x.lineWidth=width;
      x.beginPath();x.moveTo(ax,ay);x.lineTo(bx,by);x.stroke();x.restore();
    }
    function node(cx,cy,r,label,value,active=true){
      x.save();
      x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);
      x.fillStyle=rgba(5,8,20,.82);x.fill();
      x.lineWidth=1.5;x.strokeStyle=active?rgba(...cyan,.72):rgba(...violet,.24);x.stroke();
      if(active){
        x.beginPath();x.arc(cx,cy,r+5+Math.sin(phase*2.2+cx*.01)*1.5,0,Math.PI*2);
        x.strokeStyle=rgba(...cyan,.12);x.lineWidth=1;x.stroke();
      }
      x.beginPath();x.arc(cx,cy,3.5,0,Math.PI*2);
      x.fillStyle=active?rgba(...cyan,.95):rgba(...violet,.45);x.fill();
      x.font='600 13px monospace';x.fillStyle=rgba(218,222,255,.72);
      x.textAlign='center';x.textBaseline='top';x.fillText(label,cx,cy+r+10);
      if(value){x.font='500 11px monospace';x.fillStyle=rgba(170,184,226,.48);x.fillText(value,cx,cy+r+27);}
      x.restore();
    }
    function metric(label,value,unit,y,color,bar){
      x.font='600 12px monospace';x.fillStyle=rgba(...color,.62);x.textAlign='left';x.textBaseline='middle';
      x.fillText(label,676,y);
      x.font='500 25px monospace';x.fillStyle=rgba(240,242,255,.92);x.fillText(value,676,y+29);
      if(unit){x.font='500 10px monospace';x.fillStyle=rgba(177,185,218,.46);x.fillText(unit,676+Math.max(52,String(value).length*15),y+29);}
      x.fillStyle=rgba(160,170,210,.08);x.fillRect(676,y+50,292,4);
      const bw=Math.max(0,Math.min(1,bar))*292;
      x.fillStyle=rgba(...color,.58);x.fillRect(676,y+50,bw,4);
    }
    function redraw(){
      phase+=.045;
      const risk=base.risk+Math.sin(phase*.72)*2.2+Math.sin(phase*1.83)*.8;
      const exposure=base.exposure+Math.sin(phase*.46)*.32;
      const process=base.process+Math.sin(phase*.63)*3;
      const evidence=base.evidence+Math.sin(phase*.39+1.1)*4;
      const pressure=base.pressure+Math.sin(phase*.58)*3;
      x.clearRect(0,0,W,H);
      const bg=x.createLinearGradient(0,0,W,H);
      bg.addColorStop(0,'#060916');bg.addColorStop(.52,'#0b1020');bg.addColorStop(1,'#050711');
      x.fillStyle=bg;x.fillRect(0,0,W,H);
      x.strokeStyle=rgba(126,154,205,.055);x.lineWidth=1;
      for(let gx=0;gx<=W;gx+=32){x.beginPath();x.moveTo(gx,0);x.lineTo(gx,H);x.stroke()}
      for(let gy=0;gy<=H;gy+=32){x.beginPath();x.moveTo(0,gy);x.lineTo(W,gy);x.stroke()}
      x.fillStyle=rgba(111,122,181,.12);x.fillRect(0,0,W,48);
      x.fillStyle=rgba(112,207,255,.85);x.fillRect(18,18,5,12);
      x.font='600 14px monospace';x.fillStyle=rgba(220,226,255,.82);x.textAlign='left';x.textBaseline='middle';
      x.fillText('VANTAGE',34,24);
      x.font='500 10px monospace';x.fillStyle=rgba(169,181,223,.48);x.fillText('PRIVATE INTELLIGENCE / CASE 2841',134,24);
      x.textAlign='right';x.fillStyle=rgba(116,238,193,.74);x.fillText('● LIVE',978,24);
      x.font='500 9px monospace';x.textAlign='left';x.fillStyle=rgba(163,175,217,.42);x.fillText('EMPLOYEE RELATIONS',24,70);
      x.fillStyle=rgba(232,235,255,.74);x.fillText('ABSENCE / 07 DAYS',24,88);
      x.fillStyle=rgba(163,175,217,.42);x.fillText('PROCESS STATE',24,108);
      x.fillStyle=rgba(232,235,255,.74);x.fillText('DOCUMENTATION INCOMPLETE',24,126);
      const cx=382,cy=314;
      const nodes=[[382,168,36,'POLICY','STATE'],[222,314,36,'PEOPLE','CASE'],[382,460,36,'PROCESS','GAPS'],[542,314,36,'BUSINESS','PRESSURE']];
      nodes.forEach(n=>line(cx,cy,n[0],n[1],cyan,1.2,.22));
      line(222,314,382,168,violet,1,.10);line(382,168,542,314,amber,1,.10);line(542,314,382,460,amber,1,.10);line(382,460,222,314,cyan,1,.10);
      nodes.forEach((n,i)=>{
        const a=Math.atan2(n[1]-cy,n[0]-cx);
        const d=56+((phase*26+i*37)%104);
        const px=cx+Math.cos(a)*d,py=cy+Math.sin(a)*d;
        x.beginPath();x.arc(px,py,2.5,0,Math.PI*2);
        x.fillStyle=rgba(...(i===2?amber:cyan),.9);x.fill();
      });
      x.save();
      x.beginPath();x.arc(cx,cy,66+Math.sin(phase*1.4)*2,0,Math.PI*2);x.strokeStyle=rgba(...violet,.16);x.lineWidth=1;x.stroke();
      x.beginPath();x.arc(cx,cy,46,phase,phase+Math.PI*1.45);x.strokeStyle=rgba(...cyan,.66);x.lineWidth=2;x.stroke();
      x.beginPath();x.arc(cx,cy,29,-phase*.7,-phase*.7+Math.PI*.85);x.strokeStyle=rgba(...amber,.5);x.lineWidth=1;x.stroke();
      x.beginPath();x.arc(cx,cy,7,0,Math.PI*2);x.fillStyle=rgba(157,196,255,.16);x.fill();
      x.beginPath();x.arc(cx,cy,3,0,Math.PI*2);x.fillStyle=rgba(206,232,255,.95);x.fill();
      x.restore();
      nodes.forEach(n=>node(n[0],n[1],n[2],n[3],n[4],true));
      x.font='500 9px monospace';x.textAlign='center';x.fillStyle=rgba(173,183,220,.44);x.fillText('DECISION FIELD',cx,cy+82);
      line(646,66,646,550,violet,1,.12);
      metric('RISK',Math.round(risk)+'','/100',84,red,risk/100);
      metric('EXPOSURE','₹'+exposure.toFixed(1)+'L','EST.',186,amber,Math.min(1,exposure/24));
      metric('PROCESS',Math.round(process)+'%','COMPLETE',288,cyan,process/100);
      metric('EVIDENCE',Math.round(evidence)+'%','COVERAGE',390,violet,evidence/100);
      metric('PRESSURE',Math.round(pressure)+'%','MANAGER',492,amber,pressure/100);
      x.fillStyle=rgba(112,207,255,.035);x.fillRect(18,540,610,42);
      x.font='500 8px monospace';x.textAlign='left';x.fillStyle=rgba(157,173,218,.36);x.fillText('DECISION SIGNAL / LIVE',28,552);
      x.strokeStyle=rgba(...cyan,.52);x.lineWidth=1.4;x.beginPath();
      for(let i=0;i<88;i++){const px=28+i*6.55;const py=570+Math.sin(i*.34+phase*2.3)*4+Math.sin(i*.11+phase*.9)*6;if(i===0)x.moveTo(px,py);else x.lineTo(px,py);}
      x.stroke();
      x.font='500 8px monospace';x.textAlign='right';x.fillStyle=rgba(168,181,221,.35);
      const events=['CONTEXT INGESTED','POLICY INDEX READY','EVIDENCE GAP DETECTED','MANAGER PRESSURE HIGH'];
      x.fillText(events[Math.floor(phase*.34)%events.length],972,566);
      const sy=60+((phase*48)%500);
      const scan=x.createLinearGradient(0,sy-18,0,sy+18);
      scan.addColorStop(0,'rgba(111,207,255,0)');scan.addColorStop(.5,'rgba(111,207,255,.10)');scan.addColorStop(1,'rgba(111,207,255,0)');
      x.fillStyle=scan;x.fillRect(0,sy-18,W,36);
      const vignette=x.createRadialGradient(W*.5,H*.5,80,W*.5,H*.5,570);
      vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(0,0,0,.42)');
      x.fillStyle=vignette;x.fillRect(0,0,W,H);
    }
    redraw();
    const tex=new THREE.CanvasTexture(c);
    tex.colorSpace=THREE.SRGBColorSpace;tex.minFilter=THREE.LinearFilter;tex.magFilter=THREE.LinearFilter;
    return {tex,tick(){redraw();tex.needsUpdate=true;}};
  }

  const screenTexObj=buildScreenTexture();
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(1.84,1.08),new THREE.MeshBasicMaterial({map:screenTexObj.tex,transparent:true,opacity:.98,toneMapped:false}));
  screen.position.set(0,.72,-.585);screen.rotation.x=-.02;laptop.add(screen);
  const screenGlow=new THREE.Mesh(new THREE.PlaneGeometry(2.18,1.42),new THREE.MeshBasicMaterial({color:0x6e7dff,transparent:true,opacity:.085,blending:THREE.AdditiveBlending,depthWrite:false}));
  screenGlow.position.set(0,.72,-.575);screenGlow.rotation.x=-.02;laptop.add(screenGlow);
  const screenLight=new THREE.PointLight(0x7185ff,1.35,2.8);screenLight.position.set(0,.74,-.40);laptop.add(screenLight);
  const mug=new THREE.Mesh(new THREE.CylinderGeometry(.22,.18,.38,24),mat(0x161622,.35,.15));mug.position.set(-1.75,.17,.25);office.add(mug);
  const phone=new THREE.Mesh(new THREE.BoxGeometry(.52,.035,.95),mat(0x07070c,.2,.4));phone.position.set(1.8,.14,.5);phone.rotation.z=-.12;office.add(phone);
  const chair=new THREE.Group();office.add(chair);chair.position.set(-1.9,-.4,1.2);
  const seat=new THREE.Mesh(new THREE.BoxGeometry(1.7,.18,1.6),mat(0x0b0b12,.95));seat.position.y=-.2;chair.add(seat);
  const back=new THREE.Mesh(new THREE.BoxGeometry(1.65,2.8,.18),mat(0x09090f,.95));back.position.set(0,1.05,.7);chair.add(back);
  const person=new THREE.Group();office.add(person);person.position.set(-.2,.0,.55);
  const bodyMat=new THREE.MeshStandardMaterial({color:0x11111a,roughness:1,metalness:0});
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.62,.95,6,12),bodyMat);torso.scale.set(.85,1,.65);torso.position.set(-.2,.65,1.05);person.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.45,20,14),bodyMat);head.position.set(-.2,1.95,.9);person.add(head);
  const arm1=new THREE.Mesh(new THREE.CapsuleGeometry(.13,1.1,5,8),bodyMat);arm1.rotation.z=-.75;arm1.position.set(-.8,.45,.65);person.add(arm1);
  const arm2=arm1.clone();arm2.rotation.z=.75;arm2.position.x=.4;person.add(arm2);
  const light=new THREE.PointLight(0x7c83ff,4.2,7);light.position.set(.45,1.2,1.2);office.add(light);
  const windowGlow=new THREE.Mesh(new THREE.PlaneGeometry(5.8,3.2),new THREE.MeshBasicMaterial({color:0x080b1d,transparent:true,opacity:.8}));windowGlow.position.set(2.9,2.25,-4.35);office.add(windowGlow);
  const rain=new THREE.Group();office.add(rain);
  const rainSpeeds=[];
  for(let i=0;i<55;i++){
    const m=new THREE.Mesh(new THREE.BoxGeometry(.008,.28+Math.random()*.5,.008),new THREE.MeshBasicMaterial({color:0x7783d7,transparent:true,opacity:.08+Math.random()*.1}));
    m.position.set(1.3+Math.random()*3.2,.75+Math.random()*3,-4.2);m.rotation.z=-.12;rain.add(m);rainSpeeds.push(1.6+Math.random()*1.8);
  }
  const city=new THREE.Group();office.add(city);
  for(let i=0;i<45;i++){
    const m=new THREE.Mesh(new THREE.BoxGeometry(.025,.025,.025),new THREE.MeshBasicMaterial({color:i%5===0?0xc4b5fd:0x5258a8,transparent:true,opacity:.35}));
    m.position.set(1+Math.random()*4.4,.2+Math.random()*3.6,-4.18);city.add(m);
  }

  renderer.compile(scene,camera);

  let mx=0,my=0;addEventListener('pointermove',e=>{mx=e.clientX/innerWidth-.5;my=e.clientY/innerHeight-.5},{passive:true});
  function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}addEventListener('resize',resize);

  let start=0,lastMs=null,lastScreenTick=0;

  function animate(ms){
    if(!active)return;
    const t=ms*.001;const elapsed=ms-start;
    if(elapsed>13000)endPrologue();
    /* SR19: skip Three.js render during countdown to reduce GPU conflict
       with the CSS tick animation */
    if(pro.classList.contains('countdown')){requestAnimationFrame(animate);return;}
    const dt=lastMs===null?.016:Math.min(.05,(ms-lastMs)*.001);
    lastMs=ms;
    camera.position.x+=(mx*.35-camera.position.x)*.015;camera.position.y+=(1.1-my*.18-camera.position.y)*.015;camera.lookAt(.2,.5,0);
    office.rotation.y=Math.sin(t*.12)*.025;office.position.x=Math.sin(t*.3)*.02;
    light.intensity=3.7+Math.sin(t*1.4)*.35;
    screen.material.opacity=.95+Math.sin(t*1.1)*.025;
    screenGlow.material.opacity=.065+Math.sin(t*1.7)*.018;
    screenLight.intensity=1.15+Math.sin(t*1.5)*.18;
    if(t-lastScreenTick>.055){lastScreenTick=t;screenTexObj.tick();}
    rain.children.forEach((drop,i)=>{
      drop.position.y-=rainSpeeds[i]*dt;
      /* Confined to window's vertical span — rain stays outside, visible */
      if(drop.position.y<.7){drop.position.y=3.7+Math.random()*.15;drop.position.x=1.3+Math.random()*3.2;}
    });
    renderer.render(scene,camera);
    requestAnimationFrame(animate);
  }

  function startReveal(){
    active=true;start=performance.now();lockScroll(true);
    /* Start the Three.js animate loop immediately — canvas needs to render
       at least ONE frame before phase-pressure triggers text transitions.
       Without this delay: text starts fading in over a black/transparent
       canvas (opacity:0 → still transitioning), which is the "flash" glitch.
       Double rAF guarantees the animate loop has run and painted frame 1. */
    requestAnimationFrame(animate);
    pro.classList.add('active');
    /* Delay skip button — its box-shadow (0 8px 30px purple) reads as a
       white/grey line against the black bg before the photo fades in (2s).
       At 2s the photo is fully visible so the glow looks natural. */
    later(()=>{skip?.classList.add('show');},2000);
    /* Photo transition is 2s. Adding phase-pressure at ~33ms (double rAF)
       means text appeared over a pitch-black background — that's the grey
       line + sub text flash. Delay phase-pressure to 1800ms so text only
       starts transitioning in when the photo is at ~90% opacity. */
    later(()=>{ pro.classList.add('phase-pressure'); }, 1800);
    const countNum=$('#prologueCountNum');
    function tick(n){
      if(!countNum)return;
      countNum.textContent=n;
      countNum.classList.remove('tick');
      /* SR19: double rAF replaces void offsetWidth — no synchronous reflow */
      requestAnimationFrame(()=>requestAnimationFrame(()=>countNum.classList.add('tick')));
    }
    /* SR19: countdown at 10/11/12s (was 6/7/8s in SR17) */
    later(()=>{pro.classList.add('countdown');tick(3);},10000);
    later(()=>{tick(2);},11000);
    later(()=>{tick(1);},12000);
  }

  later(startReveal,100);
})();
