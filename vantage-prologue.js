/* VANTAGE 7.1 / THE 21:00 PROLOGUE
   Procedural office pressure scene, then a static ARIA portrait (aria-face.png) for the face phase. */
(function(){
  'use strict';
  const $=(s,p=document)=>p.querySelector(s);
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pro=$('#prologue');
  if(!pro||reduce)return;
  const canvas=$('#prologueCanvas');
  const skip=$('#prologueSkip');
  let active=false, phase='office', timers=[];
  const later=(fn,ms)=>{const id=setTimeout(fn,ms);timers.push(id);return id};
  function clearTimers(){timers.forEach(clearTimeout);timers=[]}
  function endPrologue(){if(!active)return;active=false;clearTimers();pro.classList.remove('active','phase-pressure','phase-face','face-speak');pro.classList.add('ending');const fade=$('.prologue-fade');if(fade)fade.classList.add('on');setTimeout(()=>{pro.style.display='none';document.body.classList.add('prologue-complete');},1100)}
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
  const dark=mat(0x080810,.92,0), darker=mat(0x030307,.98,0), violet=mat(0x2f2a68,.55,.15), glass=new THREE.MeshBasicMaterial({color:0x25224c,transparent:true,opacity:.45}), glow=new THREE.MeshBasicMaterial({color:0x8ea0ff,transparent:true,opacity:.72});
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(18,13),dark);floor.rotation.x=-Math.PI/2;floor.position.y=-1.45;office.add(floor);
  const wall=new THREE.Mesh(new THREE.PlaneGeometry(18,9),darker);wall.position.set(0,2.5,-4.5);office.add(wall);
  const desk=new THREE.Mesh(new THREE.BoxGeometry(6.2,.18,2.5),mat(0x11111a,.7,.1));desk.position.set(.1,-.15,-.1);office.add(desk);
  [-2.55,2.55].forEach(x=>{const leg=new THREE.Mesh(new THREE.BoxGeometry(.16,2.2,.16),dark);leg.position.set(x,-1.25,-.8);office.add(leg)});
  const laptop=new THREE.Group();office.add(laptop);laptop.position.set(.45,.22,-.25);
  const base=new THREE.Mesh(new THREE.BoxGeometry(2.25,.08,1.45),mat(0x161621,.35,.35));base.rotation.x=-.04;laptop.add(base);
  const screenFrame=new THREE.Mesh(new THREE.BoxGeometry(2.05,1.35,.08),mat(0x080811,.45,.5));screenFrame.position.set(0,.72,-.63);screenFrame.rotation.x=-.02;laptop.add(screenFrame);
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.1),glow);screen.position.set(0,.72,-.675);screen.rotation.x=-.02;laptop.add(screen);
  const screenLines=new THREE.Group();
  for(let i=0;i<6;i++){const line=new THREE.Mesh(new THREE.BoxGeometry(.95-(i%2)*.22,.018,.01),new THREE.MeshBasicMaterial({color:i===0?0xff6b81:0xb9a7ff,transparent:true,opacity:.28}));line.position.set(-.3+i%2*.25,.98-i*.13,-.69);screenLines.add(line)}
  laptop.add(screenLines);
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
  const rain=new THREE.Group();office.add(rain);
  for(let i=0;i<55;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.008,.28+Math.random()*.5,.008),new THREE.MeshBasicMaterial({color:0x7783d7,transparent:true,opacity:.08+Math.random()*.1}));m.position.set(1+Math.random()*3.8,-.1+Math.random()*4,-4.2);m.rotation.z=-.12;rain.add(m)}
  /* distant city points */
  const city=new THREE.Group();office.add(city);for(let i=0;i<45;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.025,.025,.025),new THREE.MeshBasicMaterial({color:i%5===0?0xc4b5fd:0x5258a8,transparent:true,opacity:.35}));m.position.set(1+Math.random()*4.4,.2+Math.random()*3.6,-4.18);city.add(m)}
  const dust=new THREE.BufferGeometry(),count=520,pos=new Float32Array(count*3);for(let i=0;i<count;i++){pos[i*3]=(Math.random()-.5)*12;pos[i*3+1]=(Math.random()-.5)*6;pos[i*3+2]=(Math.random()-.5)*5-1}dust.setAttribute('position',new THREE.BufferAttribute(pos,3));const dp=new THREE.Points(dust,new THREE.PointsMaterial({color:0xc4b5fd,size:.018,transparent:true,opacity:.24,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(dp);

  // Precompile every material's shader program right now, off-screen, instead of
  // letting it happen on the first real frame. With this many distinct materials
  // in the office scene, first-time shader compilation can stall the very first
  // rendered frame for a second or more on typical hardware — which is exactly
  // the multi-second black gap before the office appears. compile() forces that
  // cost to happen now, silently, well before the 5.2s reveal.
  renderer.compile(scene, camera);

  let mx=0,my=0;addEventListener('pointermove',e=>{mx=e.clientX/innerWidth-.5;my=e.clientY/innerHeight-.5},{passive:true});
  function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}addEventListener('resize',resize);
  let start=performance.now(),faceMode=false;
  function setPhaseOffice(){phase='office';pro.classList.remove('phase-face','face-speak');pro.classList.add('phase-pressure');office.visible=true}
  function setPhaseFace(){phase='face';faceMode=true;office.visible=false;pro.classList.remove('phase-pressure');pro.classList.add('phase-face');later(()=>pro.classList.add('face-speak'),650)}
  function animate(ms){if(!active)return;const t=ms*.001;const elapsed=ms-start;
    if(elapsed>7200&&phase==='office')setPhaseFace();
    if(elapsed>12500&&phase==='face')endPrologue();
    if(phase==='office'){
      const p=Math.min(1,Math.max(0,(elapsed-500)/8200));camera.position.x+=(mx*.35-camera.position.x)*.015;camera.position.y+=(1.1-my*.18-camera.position.y)*.015;camera.lookAt(.2,.5,0);
      office.rotation.y=Math.sin(t*.12)*.025;office.position.x=Math.sin(t*.3)*.02;
      light.intensity=3.7+Math.sin(t*1.4)*.35;screen.material.opacity=.48+Math.sin(t*1.1)*.12;
      rain.rotation.z=Math.sin(t*.2)*.003;
    }else{
      camera.position.x+=(mx*.65-camera.position.x)*.035;camera.position.y+=(.1-my*.3-camera.position.y)*.035;camera.position.z+= (6.9-camera.position.z)*.02;camera.lookAt(0,-.15,.2);
    }
    dp.rotation.y=t*.012;dp.rotation.x=Math.sin(t*.2)*.02;renderer.render(scene,camera);requestAnimationFrame(animate)}
  setPhaseOffice();
  later(()=>{active=true;start=performance.now();pro.classList.add('active','phase-pressure');skip?.classList.add('show');requestAnimationFrame(animate)},5200);
})();
