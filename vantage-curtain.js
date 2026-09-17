/* VANTAGE // QUESTION CURTAIN — Three.js particle explosion reveal
   Fixed overlay, 5s countdown, magical particle dispersion on dismiss.
*/
(function(){
  'use strict';

  const SEEN = 'vantage_q_v4';
  const DELAY = 5000; // 5 seconds

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
