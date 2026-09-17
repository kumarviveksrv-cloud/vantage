/* VANTAGE // QUESTION CURTAIN — Three.js particle explosion reveal
   Fixed overlay, 5s countdown, magical particle dispersion on dismiss.
*/
(function(){
  'use strict';

  const SEEN = 'vantage_q_v4';
  const DELAY = 7000; // 7 seconds — enough time to read // 5 seconds

  if(sessionStorage.getItem(SEEN)) return;
  if(matchMedia('(prefers-reduced-motion:reduce)').matches) return;

  const CARDS = [
    {
      trigger: '.humacity.cinematic-panel',
      pre: 'A QUESTION FOR YOU',
      q: 'Do you know the rupee value of the work you did last quarter?',
      sub: 'Not headcount. Not engagement scores. The actual financial contribution HR made to the business.',
    },
    {
      trigger: '.record.cinematic-panel',
      pre: 'BEFORE YOU SCROLL',
      q: 'When you leave this organisation — what do you take with you?',
      sub: 'Every decision navigated. Every case closed. Every difficult conversation held. Is any of it saved anywhere?',
    },
    {
      trigger: '.meridian.cinematic-panel',
      pre: 'A QUESTION FOR YOU',
      q: 'The intelligence you\'re using right now — does it actually know your reality?',
      sub: 'Or is it answering someone else\'s question, dressed up to look like yours?',
    },
    {
      trigger: '.aria.cinematic-panel',
      pre: 'ONE LAST QUESTION',
      q: 'What would you do if you had a brilliant HR colleague available at 9pm tonight?',
      sub: 'Not a chatbot. Someone who knows your context, your policies, your history — and asks the right questions back.',
    },
  ];

  // ── Build overlay ───────────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'q-overlay';
  overlay.innerHTML = `
    <canvas id="q-canvas"></canvas>
    <div id="q-inner">
      <p id="q-pre"></p>
      <h2 id="q-question"></h2>
      <p id="q-sub"></p>
      <div id="q-actions">
        <button id="q-skip">Reveal <span>↓</span></button>
        <p id="q-hint">or wait — the answer is just below</p>
      </div>
    </div>
    <div id="q-bar"><div id="q-fill"></div></div>
  `;
  document.body.appendChild(overlay);

  // ── Three.js particle explosion ─────────────────────────────────────────
  function runExplosion(onDone) {
    const canvas = document.getElementById('q-canvas');
    const W = window.innerWidth, H = window.innerHeight;
    canvas.width = W; canvas.height = H;
    canvas.style.opacity = '1';

    if(typeof THREE === 'undefined') { onDone(); return; }

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(-W/2, W/2, H/2, -H/2, 1, 100);
    cam.position.z = 10;

    const COUNT = 5000;
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const vel = [];

    const palette = [
      [0.769, 0.714, 0.992], // #c4b5fd lavender
      [0.388, 0.400, 0.945], // #6366f1 indigo
      [0.655, 0.545, 0.980], // #a78bfa violet
      [0.910, 0.475, 0.976], // #e879f9 rose
    ];

    for(let i = 0; i < COUNT; i++){
      // Particles start scattered across whole screen (image of background)
      pos[i*3]   = (Math.random() - 0.5) * W;
      pos[i*3+1] = (Math.random() - 0.5) * H;
      pos[i*3+2] = 0;

      // Velocity: accelerate OUTWARD from center
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 18;
      vel.push({
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1.5 + Math.random() * 3
      });

      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i*3] = c[0]; col[i*3+1] = c[1]; col[i*3+2] = c[2];
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));

    const mat = new THREE.PointsMaterial({
      size: 2.5,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    scene.add(new THREE.Points(geo, mat));

    let frame = 0;
    const TOTAL = 55;

    (function animate(){
      frame++;
      const t = frame / TOTAL;
      const eased = t * t; // accelerate

      // Update positions
      for(let i = 0; i < COUNT; i++){
        pos[i*3]   += vel[i].vx * (1 + eased * 3);
        pos[i*3+1] += vel[i].vy * (1 + eased * 3);
      }
      geo.attributes.position.needsUpdate = true;

      // Fade out
      mat.opacity = Math.max(0, 1 - eased * 1.2);

      renderer.render(scene, cam);

      if(frame < TOTAL){
        requestAnimationFrame(animate);
      } else {
        renderer.dispose(); geo.dispose(); mat.dispose();
        canvas.style.opacity = '0';
        onDone();
      }
    })();
  }

  // ── Overlay state ───────────────────────────────────────────────────────
  let currentCard = -1;
  let revealTimer = null;
  let active = false;

  function showCard(idx){
    if(active || idx >= CARDS.length) return;
    active = true;
    currentCard = idx;

    const card = CARDS[idx];
    document.getElementById('q-pre').textContent = card.pre;
    document.getElementById('q-question').textContent = card.q;
    document.getElementById('q-sub').textContent = card.sub;

    const fill = document.getElementById('q-fill');
    fill.style.transition = 'none';
    fill.style.width = '0';

    overlay.style.display = 'grid';
    // Force reflow then animate in
    overlay.offsetHeight;
    overlay.classList.add('q-visible');

    requestAnimationFrame(() => requestAnimationFrame(() => {
      fill.style.transition = `width ${DELAY}ms linear`;
      fill.style.width = '100%';
    }));

    revealTimer = setTimeout(() => dismissCard(), DELAY);
  }

  function dismissCard(){
    if(!active) return;
    clearTimeout(revealTimer);

    // Fade out text immediately
    document.getElementById('q-inner').style.opacity = '0';
    document.getElementById('q-bar').style.opacity = '0';

    // Run Three.js explosion THEN dismiss
    runExplosion(() => {
      overlay.classList.remove('q-visible');
      overlay.classList.add('q-out');
      setTimeout(() => {
        overlay.classList.remove('q-out');
        overlay.style.display = 'none';
        document.getElementById('q-inner').style.opacity = '1';
        document.getElementById('q-bar').style.opacity = '1';
        const fill = document.getElementById('q-fill');
        fill.style.transition = 'none';
        fill.style.width = '0';
        active = false;
        if(currentCard >= CARDS.length - 1){
          sessionStorage.setItem(SEEN, '1');
        }
      }, 600);
    });
  }

  overlay.addEventListener('click', dismissCard);

  // ── Trigger on scroll into each section ────────────────────────────────
  const triggered = new Set();
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if(!e.isIntersecting) return;
      const idx = CARDS.findIndex(c => e.target.matches(c.trigger));
      if(idx === -1 || triggered.has(idx)) return;
      triggered.add(idx);
      setTimeout(() => showCard(idx), 250);
    });
  }, { threshold: 0.1 });

  CARDS.forEach(card => {
    const el = document.querySelector(card.trigger);
    if(el) io.observe(el);
  });

})();

/* ── HERO FIBONACCI GLOBE ─────────────────────────────────────────────── */
(function initHeroGlobe(){
  const canvas = document.getElementById('heroGlobe');
  if(!canvas || typeof THREE === 'undefined') return;

  const section = canvas.closest('.hero');
  if(!section) return;

  let W = section.offsetWidth || window.innerWidth;
  let H = section.offsetHeight || window.innerHeight;

  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0,0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, W/H, 0.1, 100);
  camera.position.z = 5.5;

  const group = new THREE.Group();
  scene.add(group);

  // Fibonacci sphere
  const N = 260;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const pts = [];
  const posArr = [];

  for(let i = 0; i < N; i++){
    const theta = goldenAngle * i;
    const phi = Math.acos(1 - 2*(i+0.5)/N);
    const x = Math.sin(phi)*Math.cos(theta) * 2.2;
    const y = Math.sin(phi)*Math.sin(theta) * 2.2;
    const z = Math.cos(phi) * 2.2;
    pts.push(x,y,z);
    posArr.push(new THREE.Vector3(x,y,z));
  }

  // Nodes
  const nodGeo = new THREE.BufferGeometry();
  nodGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts,3));
  const nodMat = new THREE.PointsMaterial({
    size:0.04, color:0xc4b5fd, transparent:true, opacity:0.65,
    blending:THREE.AdditiveBlending, depthWrite:false
  });
  group.add(new THREE.Points(nodGeo, nodMat));

  // Connecting lines
  const linePts = [];
  const MAX_D = 0.72;
  for(let i=0;i<N;i++){
    for(let j=i+1;j<N;j++){
      if(posArr[i].distanceTo(posArr[j]) < MAX_D){
        linePts.push(posArr[i].x,posArr[i].y,posArr[i].z,
                     posArr[j].x,posArr[j].y,posArr[j].z);
      }
    }
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePts,3));
  const lineMat = new THREE.LineBasicMaterial({
    color:0x6366f1, transparent:true, opacity:0.14,
    blending:THREE.AdditiveBlending
  });
  group.add(new THREE.LineSegments(lineGeo, lineMat));

  // Mouse parallax
  let mx = 0, my = 0;
  window.addEventListener('pointermove',e=>{
    mx = (e.clientX/window.innerWidth - 0.5);
    my = (e.clientY/window.innerHeight - 0.5);
  },{passive:true});

  // Pause when hero not visible (perf)
  let visible = true;
  const visIO = new IntersectionObserver(e=>{visible=e[0].isIntersecting;},{threshold:0.01});
  visIO.observe(section);

  // Throttled 30fps
  let last = 0;
  (function tick(now){
    requestAnimationFrame(tick);
    if(!visible || now - last < 33) return;
    last = now;
    group.rotation.y += 0.0018 + mx*0.001;
    group.rotation.x += 0.0004 + my*0.0005;
    renderer.render(scene,camera);
  })(0);

  window.addEventListener('resize',()=>{
    W = section.offsetWidth; H = section.offsetHeight;
    renderer.setSize(W,H); camera.aspect=W/H; camera.updateProjectionMatrix();
  },{passive:true});
})();

/* ── TA-DA REVEAL (prologue → landing page) ─────────────────────────────── */
(function tadaReveal(){
  const overlay = document.getElementById('tada-overlay');
  if(!overlay) return;

  // Always hidden initially
  overlay.style.display = 'none';

  // Watch for prologue-complete class on body (added by vantage-prologue.js)
  const observer = new MutationObserver(() => {
    if(document.body.classList.contains('prologue-complete')){
      observer.disconnect();
      runTada();
    }
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  function runTada(){

  const canvas = document.getElementById('tada-canvas');
  const logo = document.getElementById('tada-logo');
  overlay.style.display = 'flex';

  // Phase 1: Show logo for 0.8s
  setTimeout(()=>{
    if(logo) logo.classList.add('tada-logo-pulse');
  }, 200);

  // Phase 2: Particle explosion from logo position
  setTimeout(()=>{
    if(logo) logo.style.opacity = '0';
    runExplosion(canvas, ()=>{
      // Phase 3: Overlay fades out
      overlay.classList.add('tada-out');
      setTimeout(()=>{ overlay.style.display='none'; }, 700);
    });
  }, 1000);

  function runExplosion(cnv, done){
    if(!cnv || typeof THREE === 'undefined'){ done(); return; }
    const W = window.innerWidth, H = window.innerHeight;
    cnv.width = W; cnv.height = H;
    cnv.style.opacity = '1';

    const rdr = new THREE.WebGLRenderer({canvas:cnv, antialias:false, alpha:true});
    rdr.setSize(W,H); rdr.setClearColor(0,0);

    const scn = new THREE.Scene();
    const cam = new THREE.OrthographicCamera(-W/2,W/2,H/2,-H/2,1,100);
    cam.position.z=10;

    const COUNT = 6000;
    const pos = new Float32Array(COUNT*3);
    const col = new Float32Array(COUNT*3);
    const vel = [];
    const pal=[[0.769,0.714,0.992],[0.388,0.4,0.945],[0.655,0.545,0.98],[0.91,0.475,0.976]];

    for(let i=0;i<COUNT;i++){
      pos[i*3]=0; pos[i*3+1]=0; pos[i*3+2]=0;
      const angle=Math.random()*Math.PI*2;
      const spd=4+Math.random()*22;
      vel.push({vx:Math.cos(angle)*spd, vy:Math.sin(angle)*spd});
      const c=pal[Math.floor(Math.random()*pal.length)];
      col[i*3]=c[0]; col[i*3+1]=c[1]; col[i*3+2]=c[2];
    }

    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    geo.setAttribute('color',new THREE.BufferAttribute(col,3));
    const mat=new THREE.PointsMaterial({size:3,vertexColors:true,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false});
    scn.add(new THREE.Points(geo,mat));

    let f=0,TOTAL=70;
    (function go(){
      f++;
      const t=f/TOTAL, e=t*t;
      for(let i=0;i<COUNT;i++){pos[i*3]+=vel[i].vx*(1+e*4);pos[i*3+1]+=vel[i].vy*(1+e*4);}
      geo.attributes.position.needsUpdate=true;
      mat.opacity=Math.max(0,1-e*1.3);
      rdr.render(scn,cam);
      if(f<TOTAL) requestAnimationFrame(go);
      else{ rdr.dispose(); geo.dispose(); mat.dispose(); cnv.style.opacity='0'; done(); }
    })();
  }
})();
