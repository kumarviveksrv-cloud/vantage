/* VANTAGE 7.1 / THE 21:00 PROLOGUE
   Procedural office pressure scene. Single phase — the face/ARIA-question
   phase was retired; that hook line now lives at the top of the hero.

   Three fixes in this version:
   1. SCROLL LOCK — the prologue overlay is position:fixed, but the real
      page underneath it was still scrollable the whole time, which is
      why the native browser scrollbar was visible and functional during
      what's meant to be a locked cinematic. Scroll (wheel, touch, and
      the underlying document overflow) is now explicitly blocked while
      the prologue is active and restored the instant it ends.
   2. LIVE RAIN — the raindrop meshes previously never moved; only the
      whole rain group wobbled slightly, which reads as static streaks,
      not falling rain. Each drop now actually falls every frame and
      loops back to the top when it passes the floor.
   3. POPULATED SCREEN — the laptop screen was a single flat glowing
      color plane with six crude decorative bars. It's now a canvas-
      drawn texture styled like a real dashboard (header bar, sidebar,
      content rows, a small chart, one highlighted "alert" row) so it
      actually reads as software rather than a blank glowing rectangle.

   NOTE: this is ChatGPT's version of the screen redesign, adopted as
   the working baseline since it's what's actually live and confirmed
   working. My own simpler two-metric screen version is not used here.
*/
(function(){
  'use strict';
  const $=(s,p=document)=>p.querySelector(s);
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pro=$('#prologue');
  if(!pro||reduce)return;
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

  function endPrologue(){if(!active)return;active=false;clearTimers();lockScroll(false);pro.classList.remove('active','phase-pressure');pro.classList.add('ending');const fade=$('.prologue-fade');if(fade)fade.classList.add('on');setTimeout(()=>{pro.style.display='none';document.body.classList.add('prologue-complete');},1100)}
  skip?.addEventListener('click',endPrologue);

  /* ---------- Three.js scene ---------- */
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
  const dark=mat(0x080810,.92,0), darker=mat(0x030307,.98,0), violet=mat(0x2f2a68,.55,.15), glass=new THREE.MeshBasicMaterial({color:0x25224c,transparent:true,opacity:.45});
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(18,13),dark);floor.rotation.x=-Math.PI/2;floor.position.y=-1.45;office.add(floor);
  const wall=new THREE.Mesh(new THREE.PlaneGeometry(18,9),darker);wall.position.set(0,2.5,-4.5);office.add(wall);
  const desk=new THREE.Mesh(new THREE.BoxGeometry(6.2,.18,2.5),mat(0x11111a,.7,.1));desk.position.set(.1,-.15,-.1);office.add(desk);
  [-2.55,2.55].forEach(x=>{const leg=new THREE.Mesh(new THREE.BoxGeometry(.16,2.2,.16),dark);leg.position.set(x,-1.25,-.8);office.add(leg)});
  const laptop=new THREE.Group();office.add(laptop);laptop.position.set(.45,.22,-.25);
  const base=new THREE.Mesh(new THREE.BoxGeometry(2.25,.08,1.45),mat(0x161621,.35,.35));base.rotation.x=-.04;laptop.add(base);
  const screenFrame=new THREE.Mesh(new THREE.BoxGeometry(2.05,1.35,.08),mat(0x080811,.45,.5));screenFrame.position.set(0,.72,-.63);screenFrame.rotation.x=-.02;laptop.add(screenFrame);

  /* ---------- Live laptop intelligence display ----------
     This is intentionally not a generic dashboard. The laptop is the first
     visible manifestation of Vantage: a tiny, believable decision system
     doing work in the room. All motion is deterministic and tied to the
     Case 2841 narrative rather than random-number jitter.
  */
  function buildScreenTexture(){
    const c=document.createElement('canvas');
    c.width=1024;c.height=600;
    const x=c.getContext('2d');
    const W=c.width,H=c.height;

    const base={
      risk:62,
      exposure:18.4,
      process:43,
      evidence:58,
      context:71,
      pressure:78
    };
    let phase=0;
    let lastStage=-1;

    const rgba=(r,g,b,a)=>`rgba(${r},${g},${b},${a})`;
    const cyan=[142,214,255], violet=[180,164,255], amber=[255,180,91], red=[255,101,126];

    function glowText(text,px,py,font,color,blur=10){
      x.save();
      x.font=font;x.textAlign='left';x.textBaseline='middle';
      x.shadowColor=color;x.shadowBlur=blur;
      x.fillStyle=color;x.fillText(text,px,py);
      x.restore();
    }

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
      if(value){
        x.font='500 11px monospace';x.fillStyle=rgba(170,184,226,.48);
        x.fillText(value,cx,cy+r+27);
      }
      x.restore();
    }

    function metric(label,value,unit,y,color,bar){
      x.font='600 12px monospace';x.fillStyle=rgba(...color,.62);x.textAlign='left';x.textBaseline='middle';
      x.fillText(label,676,y);
      x.font='500 25px monospace';x.fillStyle=rgba(240,242,255,.92);
      x.fillText(value,676,y+29);
      if(unit){
        x.font='500 10px monospace';x.fillStyle=rgba(177,185,218,.46);
        x.fillText(unit,676+Math.max(52,String(value).length*15),y+29);
      }
      x.fillStyle=rgba(160,170,210,.08);x.fillRect(676,y+50,292,4);
      const bw=Math.max(0,Math.min(1,bar))*292;
      x.fillStyle=rgba(...color,.58);x.fillRect(676,y+50,bw,4);
      x.fillStyle=rgba(...color,.14);x.fillRect(676,y+50,bw,4);
    }

    function redraw(){
      phase+=.045;

      const risk=base.risk + Math.sin(phase*.72)*2.2 + Math.sin(phase*1.83)*.8;
      const exposure=base.exposure + Math.sin(phase*.46)*.32;
      const process=base.process + Math.sin(phase*.63)*3;
      const evidence=base.evidence + Math.sin(phase*.39+1.1)*4;
      const context=base.context + Math.sin(phase*.52+2)*2.5;
      const pressure=base.pressure + Math.sin(phase*.58)*3;

      /* Deep glass substrate */
      x.clearRect(0,0,W,H);
      const bg=x.createLinearGradient(0,0,W,H);
      bg.addColorStop(0,'#060916');bg.addColorStop(.52,'#0b1020');bg.addColorStop(1,'#050711');
      x.fillStyle=bg;x.fillRect(0,0,W,H);

      /* Fine computational grid */
      x.strokeStyle=rgba(126,154,205,.055);x.lineWidth=1;
      for(let gx=0;gx<=W;gx+=32){x.beginPath();x.moveTo(gx,0);x.lineTo(gx,H);x.stroke()}
      for(let gy=0;gy<=H;gy+=32){x.beginPath();x.moveTo(0,gy);x.lineTo(W,gy);x.stroke()}

      /* Top system rail */
      x.fillStyle=rgba(111,122,181,.12);x.fillRect(0,0,W,48);
      x.fillStyle=rgba(112,207,255,.85);x.fillRect(18,18,5,12);
      x.font='600 14px monospace';x.fillStyle=rgba(220,226,255,.82);
      x.textAlign='left';x.textBaseline='middle';
      x.fillText('VANTAGE',34,24);
      x.font='500 10px monospace';x.fillStyle=rgba(169,181,223,.48);
      x.fillText('PRIVATE INTELLIGENCE / CASE 2841',134,24);

      x.textAlign='right';x.fillStyle=rgba(116,238,193,.74);
      x.fillText('● LIVE',978,24);

      /* Case rail */
      x.font='500 9px monospace';x.textAlign='left';x.fillStyle=rgba(163,175,217,.42);
      x.fillText('EMPLOYEE RELATIONS',24,70);
      x.fillStyle=rgba(232,235,255,.74);x.fillText('ABSENCE / 07 DAYS',24,88);
      x.fillStyle=rgba(163,175,217,.42);x.fillText('PROCESS STATE',24,108);
      x.fillStyle=rgba(232,235,255,.74);x.fillText('DOCUMENTATION INCOMPLETE',24,126);

      /* Central decision topology */
      const cx=382,cy=314;
      const nodes=[
        [382,168,36,'POLICY','STATE'],
        [222,314,36,'PEOPLE','CASE'],
        [382,460,36,'PROCESS','GAPS'],
        [542,314,36,'BUSINESS','PRESSURE']
      ];
      nodes.forEach(n=>line(cx,cy,n[0],n[1],cyan,1.2,.22));
      line(222,314,382,168,violet,1,.10);
      line(382,168,542,314,amber,1,.10);
      line(542,314,382,460,amber,1,.10);
      line(382,460,222,314,cyan,1,.10);

      /* Data packets moving through the graph */
      nodes.forEach((n,i)=>{
        const a=Math.atan2(n[1]-cy,n[0]-cx);
        const d=56+((phase*26+i*37)%104);
        const px=cx+Math.cos(a)*d,py=cy+Math.sin(a)*d;
        x.beginPath();x.arc(px,py,2.5,0,Math.PI*2);
        x.fillStyle=rgba(...(i===2?amber:cyan),.9);x.fill();
      });

      x.save();
      x.beginPath();x.arc(cx,cy,66+Math.sin(phase*1.4)*2,0,Math.PI*2);
      x.strokeStyle=rgba(...violet,.16);x.lineWidth=1;x.stroke();
      x.beginPath();x.arc(cx,cy,46,phase,phase+Math.PI*1.45);
      x.strokeStyle=rgba(...cyan,.66);x.lineWidth=2;x.stroke();
      x.beginPath();x.arc(cx,cy,29,-phase*.7,-phase*.7+Math.PI*.85);
      x.strokeStyle=rgba(...amber,.5);x.lineWidth=1;x.stroke();
      x.beginPath();x.arc(cx,cy,7,0,Math.PI*2);
      x.fillStyle=rgba(157,196,255,.16);x.fill();
      x.beginPath();x.arc(cx,cy,3,0,Math.PI*2);
      x.fillStyle=rgba(206,232,255,.95);x.fill();
      x.restore();

      nodes.forEach(n=>node(n[0],n[1],n[2],n[3],n[4],true));

      x.font='500 9px monospace';x.textAlign='center';x.fillStyle=rgba(173,183,220,.44);
      x.fillText('DECISION FIELD',cx,cy+82);

      /* Right telemetry column */
      line(646,66,646,550,violet,1,.12);
      metric('RISK',Math.round(risk)+'','/100',84,red,risk/100);
      metric('EXPOSURE','₹'+exposure.toFixed(1)+'L','EST.',186,amber,Math.min(1,exposure/24));
      metric('PROCESS',Math.round(process)+'%','COMPLETE',288,cyan,process/100);
      metric('EVIDENCE',Math.round(evidence)+'%','COVERAGE',390,violet,evidence/100);
      metric('PRESSURE',Math.round(pressure)+'%','MANAGER',492,amber,pressure/100);

      /* Bottom live trace */
      x.fillStyle=rgba(112,207,255,.035);x.fillRect(18,540,610,42);
      x.font='500 8px monospace';x.textAlign='left';x.fillStyle=rgba(157,173,218,.36);
      x.fillText('DECISION SIGNAL / LIVE',28,552);
      x.strokeStyle=rgba(...cyan,.52);x.lineWidth=1.4;x.beginPath();
      for(let i=0;i<88;i++){
        const px=28+i*6.55;
        const py=570+Math.sin(i*.34+phase*2.3)*4+Math.sin(i*.11+phase*.9)*6;
        if(i===0)x.moveTo(px,py);else x.lineTo(px,py);
      }
      x.stroke();

      /* Tiny event stream */
      x.font='500 8px monospace';x.textAlign='right';
      x.fillStyle=rgba(168,181,221,.35);
      const events=['CONTEXT INGESTED','POLICY INDEX READY','EVIDENCE GAP DETECTED','MANAGER PRESSURE HIGH'];
      const eventIndex=Math.floor(phase*.34)%events.length;
      x.fillText(events[eventIndex],972,566);

      /* scan sweep */
      const sy=60+((phase*48)%500);
      const scan=x.createLinearGradient(0,sy-18,0,sy+18);
      scan.addColorStop(0,'rgba(111,207,255,0)');
      scan.addColorStop(.5,'rgba(111,207,255,.10)');
      scan.addColorStop(1,'rgba(111,207,255,0)');
      x.fillStyle=scan;x.fillRect(0,sy-18,W,36);

      /* subtle display bloom */
      const vignette=x.createRadialGradient(W*.5,H*.5,80,W*.5,H*.5,570);
      vignette.addColorStop(0,'rgba(0,0,0,0)');
      vignette.addColorStop(1,'rgba(0,0,0,.42)');
      x.fillStyle=vignette;x.fillRect(0,0,W,H);
    }

    redraw();
    const tex=new THREE.CanvasTexture(c);
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.minFilter=THREE.LinearFilter;
    tex.magFilter=THREE.LinearFilter;
    return {
      tex,
      tick(){
        redraw();
        tex.needsUpdate=true;
      }
    };
  }

  const screenTexObj=buildScreenTexture();
  const screenMat=new THREE.MeshBasicMaterial({
    map:screenTexObj.tex,
    transparent:true,
    opacity:.98,
    toneMapped:false
  });

  const screen=new THREE.Mesh(
    new THREE.PlaneGeometry(1.84,1.08),
    screenMat
  );
  screen.position.set(0,.72,-.585);
  screen.rotation.x=-.02;
  laptop.add(screen);

  /* Physical screen bloom: the light is attached to the laptop rather than
     painted into the texture, so the display feels emissive in the room. */
  const screenGlowMat=new THREE.MeshBasicMaterial({
    color:0x6e7dff,
    transparent:true,
    opacity:.085,
    blending:THREE.AdditiveBlending,
    depthWrite:false
  });
  const screenGlow=new THREE.Mesh(
    new THREE.PlaneGeometry(2.18,1.42),
    screenGlowMat
  );
  screenGlow.position.set(0,.72,-.575);
  screenGlow.rotation.x=-.02;
  laptop.add(screenGlow);

  const screenLight=new THREE.PointLight(0x7185ff,1.35,2.8);
  screenLight.position.set(0,.74,-.40);
  laptop.add(screenLight);

  const mug=new THREE.Mesh(new THREE.CylinderGeometry(.22,.18,.38,24),mat(0x161622,.35,.15));mug.position.set(-1.75,.17,.25);office.add(mug);
  const phone=new THREE.Mesh(new THREE.BoxGeometry(.52,.035,.95),mat(0x07070c,.2,.4));phone.position.set(1.8,.14,.5);phone.rotation.z=-.12;office.add(phone);
  const chair=new THREE.Group();office.add(chair);chair.position.set(-1.9,-.4,1.2);
  const seat=new THREE.Mesh(new THREE.BoxGeometry(1.7,.18,1.6),mat(0x0b0b12,.95));seat.position.y=-.2;chair.add(seat);
  const back=new THREE.Mesh(new THREE.BoxGeometry(1.65,2.8,.18),mat(0x09090f,.95));back.position.set(0,1.05,.7);chair.add(back);
  /* seated silhouette: deliberately abstract, not a game avatar */
  const person=new THREE.Group();office.add(person);person.position.set(-.2,.0,.55);
  const bodyMat=new THREE.MeshStandardMaterial({color:0x11111a,roughness:1,metalness:0});
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.62,.95,6,12),bodyMat);torso.scale.set(.85,1,.65);torso.position.set(-.2,.65,1.05);person.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.45,20,14),bodyMat);head.position.set(-.2,1.95,.9);person.add(head);
  const arm1=new THREE.Mesh(new THREE.CapsuleGeometry(.13,1.1,5,8),bodyMat);arm1.rotation.z=-.75;arm1.position.set(-.8,.45,.65);person.add(arm1);
  const arm2=arm1.clone();arm2.rotation.z=.75;arm2.position.x=.4;person.add(arm2);
  const light=new THREE.PointLight(0x7c83ff,4.2,7);light.position.set(.45,1.2,1.2);office.add(light);
  const windowGlow=new THREE.Mesh(new THREE.PlaneGeometry(5.8,3.2),new THREE.MeshBasicMaterial({color:0x080b1d,transparent:true,opacity:.8}));windowGlow.position.set(2.9,2.25,-4.35);office.add(windowGlow);

  // Rain: each drop now has its own fall speed and actually falls every
  // frame, looping back above the window once it passes the floor line.
  // Before, these were static meshes with only a tiny whole-group sway —
  // frozen streaks, not falling rain.
  const rain=new THREE.Group();office.add(rain);
  const rainSpeeds=[];
  for(let i=0;i<55;i++){
    const m=new THREE.Mesh(new THREE.BoxGeometry(.008,.28+Math.random()*.5,.008),new THREE.MeshBasicMaterial({color:0x7783d7,transparent:true,opacity:.08+Math.random()*.1}));
    m.position.set(1+Math.random()*3.8,-.1+Math.random()*4,-4.2);
    m.rotation.z=-.12;
    rain.add(m);
    rainSpeeds.push(1.6+Math.random()*1.8);
  }
  /* distant city points */
  const city=new THREE.Group();office.add(city);for(let i=0;i<45;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.025,.025,.025),new THREE.MeshBasicMaterial({color:i%5===0?0xc4b5fd:0x5258a8,transparent:true,opacity:.35}));m.position.set(1+Math.random()*4.4,.2+Math.random()*3.6,-4.18);city.add(m)}
  const dust=new THREE.BufferGeometry(),count=520,pos=new Float32Array(count*3);for(let i=0;i<count;i++){pos[i*3]=(Math.random()-.5)*12;pos[i*3+1]=(Math.random()-.5)*6;pos[i*3+2]=(Math.random()-.5)*5-1}dust.setAttribute('position',new THREE.BufferAttribute(pos,3));const dp=new THREE.Points(dust,new THREE.PointsMaterial({color:0xc4b5fd,size:.018,transparent:true,opacity:.24,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(dp);

  // Precompile every material's shader program right now, off-screen, instead of
  // letting it happen on the first real frame. With this many distinct materials
  // in the office scene, first-time shader compilation can stall the very first
  // rendered frame for a second or more on typical hardware — which is exactly
  // the multi-second black gap before the office appears. compile() forces that
  // cost to happen now, silently, well before the reveal.
  renderer.compile(scene, camera);

  let mx=0,my=0;addEventListener('pointermove',e=>{mx=e.clientX/innerWidth-.5;my=e.clientY/innerHeight-.5},{passive:true});
  function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}addEventListener('resize',resize);
  let start=performance.now();
  let lastMs=null;
  let lastScreenTick=0;
  function animate(ms){if(!active)return;const t=ms*.001;const elapsed=ms-start;
    if(elapsed>9500)endPrologue();
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
      if(drop.position.y<-1.6){drop.position.y=3.6+Math.random()*.6;drop.position.x=1+Math.random()*3.8;}
    });
    dp.rotation.y=t*.012;dp.rotation.x=Math.sin(t*.2)*.02;renderer.render(scene,camera);requestAnimationFrame(animate)}
  later(()=>{active=true;start=performance.now();lockScroll(true);pro.classList.add('active','phase-pressure');skip?.classList.add('show');requestAnimationFrame(animate)},900);
})();
