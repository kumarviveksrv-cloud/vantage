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

  // Canvas-drawn "dashboard" texture with actual bright, legible
  // numbers rather than abstract dark bars — the previous version used
  // low-opacity muted colors that read as nearly blank at the screen's
  // actual on-screen size. redraw() gets called periodically from the
  // render loop with slightly shifted numbers and texture.needsUpdate,
  // which is what makes it read as live telemetry rather than a static
  // image.
  function buildScreenTexture(){
    const c=document.createElement('canvas');c.width=512;c.height=314;
    const x=c.getContext('2d');
    const state={exposure:18.4,risk:62};
    let phase=0;
    function redraw(){
      x.fillStyle='#120f2e';x.fillRect(0,0,512,314);
      x.fillStyle='#2a2460';x.fillRect(0,0,512,30);
      x.fillStyle='#ff6b81';x.beginPath();x.arc(16,15,4,0,Math.PI*2);x.fill();
      x.fillStyle='#b7aef5';x.font='bold 11px monospace';x.textAlign='left';x.textBaseline='middle';
      x.fillText('CASE 2841 // LIVE MONITOR',32,15);
      x.fillStyle='rgba(196,181,253,.16)';x.fillRect(20,46,230,150);
      x.fillStyle='#9d94e8';x.font='bold 13px monospace';x.fillText('RISK SCORE',34,68);
      x.fillStyle='#c9c1ff';x.font='bold 64px monospace';x.fillText(Math.round(state.risk)+'%',30,142);
      x.fillStyle='rgba(255,159,176,.16)';x.fillRect(262,46,230,150);
      x.fillStyle='#ffb2c1';x.font='bold 13px monospace';x.fillText('EXPOSURE',276,68);
      x.fillStyle='#ffd3dc';x.font='bold 44px monospace';x.fillText('\u20B9'+state.exposure.toFixed(1)+'L',272,140);
      x.strokeStyle='#9aa3ff';x.lineWidth=3;x.beginPath();
      for(let i=0;i<58;i++){
        const px=20+i*8.6;
        const py=250+Math.sin(i*.42+phase)*22+Math.sin(i*.15+phase*1.6)*9;
        if(i===0)x.moveTo(px,py);else x.lineTo(px,py);
      }
      x.stroke();
    }
    redraw();
    const tex=new THREE.CanvasTexture(c);
    tex.colorSpace=THREE.SRGBColorSpace;
    return {tex,tick(){
      phase+=.4;
      state.exposure=Math.max(12,state.exposure+(Math.random()-.5)*.4);
      state.risk=Math.max(38,Math.min(88,state.risk+(Math.random()-.5)*4));
      redraw();
      tex.needsUpdate=true;
    }};
  }
  const screenTexObj=buildScreenTexture();
  const screenMat=new THREE.MeshBasicMaterial({map:screenTexObj.tex,transparent:true,opacity:.96});
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.1),screenMat);screen.position.set(0,.72,-.675);screen.rotation.x=-.02;laptop.add(screen);

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
    light.intensity=3.7+Math.sin(t*1.4)*.35;screen.material.opacity=.92+Math.sin(t*1.1)*.04;
    if(t-lastScreenTick>.35){lastScreenTick=t;screenTexObj.tick();}
    rain.children.forEach((drop,i)=>{
      drop.position.y-=rainSpeeds[i]*dt;
      if(drop.position.y<-1.6){drop.position.y=3.6+Math.random()*.6;drop.position.x=1+Math.random()*3.8;}
    });
    dp.rotation.y=t*.012;dp.rotation.x=Math.sin(t*.2)*.02;renderer.render(scene,camera);requestAnimationFrame(animate)}
  later(()=>{active=true;start=performance.now();lockScroll(true);pro.classList.add('active','phase-pressure');skip?.classList.add('show');requestAnimationFrame(animate)},900);
})();
