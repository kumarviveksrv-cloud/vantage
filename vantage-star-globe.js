/* VANTAGE // AMBIENT STAR FIELD — performance-tuned
   Throttled to 30fps, no per-frame gradients, pauses when hidden. */
(function(){
  'use strict';
  const canvas = document.getElementById('world');
  if(!canvas) return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = canvas.getContext('2d');
  let W, H, stars = [], mouse = {x:0, y:0};
  const STAR_COUNT = 500;  // reduced from 700

  // Force GPU compositing on the canvas
  canvas.style.willChange = 'transform';
  canvas.style.transform = 'translateZ(0)';

  function rand(min, max){ return min + Math.random() * (max - min); }

  function buildStars(){
    stars = [];
    for(let i = 0; i < STAR_COUNT; i++){
      const tier = Math.random();
      stars.push({
        x:    Math.random() * W,
        y:    Math.random() * H,
        r:    tier > 0.93 ? rand(0.7, 1.0)
            : tier > 0.75 ? rand(0.35, 0.6)
            :               rand(0.1, 0.3),
        a:    tier > 0.93 ? rand(0.5, 0.78)
            : tier > 0.75 ? rand(0.2, 0.45)
            :               rand(0.06, 0.2),
        dx:   rand(-0.0008, 0.0008),
        dy:   rand(-0.0005, 0.0005),
        prlx: rand(0.001, 0.008),
        twinkleSpeed: rand(0.004, 0.015),
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  function resize(){
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    buildStars();
  }

  // Throttle to 30fps — halves GPU load vs 60fps
  let lastFrame = 0;
  const INTERVAL = 1000 / 30;
  let t = 0;
  let visible = true;

  document.addEventListener('visibilitychange', () => {
    visible = document.visibilityState === 'visible';
  });

  function draw(now){
    requestAnimationFrame(draw);
    if(!visible) return;
    const delta = now - lastFrame;
    if(delta < INTERVAL) return;
    lastFrame = now - (delta % INTERVAL);
    t += 0.03;

    ctx.clearRect(0, 0, W, H);

    for(let i = 0; i < stars.length; i++){
      const s = stars[i];
      const twinkle = 0.88 + 0.12 * Math.sin(t * s.twinkleSpeed * 30 + s.twinklePhase);
      const px = (mouse.x / W - 0.5) * s.prlx * W;
      const py = (mouse.y / H - 0.5) * s.prlx * H;

      s.x += s.dx;
      s.y += s.dy;
      if(s.x < 0) s.x = W;
      if(s.x > W) s.x = 0;
      if(s.y < 0) s.y = H;
      if(s.y > H) s.y = 0;

      // Plain filled circle — no per-frame gradient
      ctx.beginPath();
      ctx.arc(s.x + px, s.y + py, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,228,255,${(s.a * twinkle).toFixed(2)})`;
      ctx.fill();
    }
  }

  window.addEventListener('resize', resize, {passive:true});
  window.addEventListener('pointermove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }, {passive:true});

  resize();
  requestAnimationFrame(draw);
})();
