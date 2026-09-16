/* VANTAGE // AMBIENT STAR FIELD
   Full-page background star field on #world canvas.
   Single colour (white/near-white), small uniform dots — matches PMS platform. */
(function(){
  'use strict';
  const canvas = document.getElementById('world');
  if(!canvas) return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = canvas.getContext('2d');
  let W, H, stars = [], mouse = {x:0, y:0};

  const STAR_COUNT = 700;

  function rand(min, max){ return min + Math.random() * (max - min); }

  function buildStars(){
    stars = [];
    for(let i = 0; i < STAR_COUNT; i++){
      const tier = Math.random();
      stars.push({
        x:    Math.random() * W,
        y:    Math.random() * H,
        r:    tier > 0.93 ? rand(0.8, 1.1)    // bright
            : tier > 0.75 ? rand(0.4, 0.7)    // medium
            :               rand(0.1, 0.35),   // dim tiny
        a:    tier > 0.93 ? rand(0.55, 0.82)
            : tier > 0.75 ? rand(0.25, 0.5)
            :               rand(0.08, 0.22),
        dx:   rand(-0.001, 0.001),
        dy:   rand(-0.0007, 0.0007),
        prlx: rand(0.002, 0.012),
        twinkleSpeed: rand(0.006, 0.02),
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  function resize(){
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    buildStars();
  }

  let t = 0;
  function draw(){
    ctx.clearRect(0, 0, W, H);
    t += 0.016;

    for(let i = 0; i < stars.length; i++){
      const s = stars[i];
      const twinkle = 0.88 + 0.12 * Math.sin(t * s.twinkleSpeed * 60 + s.twinklePhase);
      const px = (mouse.x / W - 0.5) * s.prlx * W;
      const py = (mouse.y / H - 0.5) * s.prlx * H;

      s.x += s.dx;
      s.y += s.dy;
      if(s.x < 0) s.x = W;
      if(s.x > W) s.x = 0;
      if(s.y < 0) s.y = H;
      if(s.y > H) s.y = 0;

      const a = s.a * twinkle;
      const x = s.x + px;
      const y = s.y + py;

      // Subtle white glow for the largest stars only — no colour
      if(s.r > 0.75){
        const grd = ctx.createRadialGradient(x, y, 0, x, y, s.r * 2.8);
        grd.addColorStop(0, `rgba(220,228,255,${(a * 0.35).toFixed(3)})`);
        grd.addColorStop(1, 'rgba(220,228,255,0)');
        ctx.beginPath();
        ctx.arc(x, y, s.r * 2.8, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      // Star dot — single near-white colour
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,228,255,${a.toFixed(3)})`;
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize, {passive:true});
  window.addEventListener('pointermove', function(e){
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }, {passive:true});

  resize();
  draw();
})();
