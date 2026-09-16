/* VANTAGE // AMBIENT STAR FIELD
   Full-page background star field on #world canvas.
   Matches PMS platform star density — 700 stars,
   varying size and brightness, subtle mouse parallax.
   Pure Canvas 2D — no Three.js, no dependencies. */
(function(){
  'use strict';
  const canvas = document.getElementById('world');
  if(!canvas) return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = canvas.getContext('2d');
  let W, H, stars = [], mouse = {x:0, y:0}, animId;

  const STAR_COUNT = 700;
  const COLORS = [
    'rgba(255,255,255,',    // white
    'rgba(196,181,253,',    // lavender
    'rgba(125,211,252,',    // cyan
    'rgba(165,180,252,',    // blue
  ];

  function rand(min, max){ return min + Math.random() * (max - min); }

  function buildStars(){
    stars = [];
    for(let i = 0; i < STAR_COUNT; i++){
      const tier = Math.random();
      stars.push({
        x:    Math.random() * W,
        y:    Math.random() * H,
        r:    tier > 0.92 ? rand(1.2, 2.0)       // bright large
            : tier > 0.72 ? rand(0.6, 1.2)       // medium
            :               rand(0.2, 0.6),       // dim small
        a:    tier > 0.92 ? rand(0.6, 0.9)
            : tier > 0.72 ? rand(0.3, 0.65)
            :               rand(0.12, 0.35),
        col:  COLORS[Math.floor(Math.random() * COLORS.length)],
        dx:   rand(-0.0015, 0.0015),  // very slow drift
        dy:   rand(-0.001,  0.001),
        prlx: rand(0.003, 0.018),     // parallax depth
        twinkleSpeed: rand(0.008, 0.025),
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

      // Twinkle
      const twinkle = 0.85 + 0.15 * Math.sin(t * s.twinkleSpeed * 60 + s.twinklePhase);

      // Mouse parallax (subtle)
      const px = (mouse.x / W - 0.5) * s.prlx * W;
      const py = (mouse.y / H - 0.5) * s.prlx * H;

      // Slow drift
      s.x += s.dx;
      s.y += s.dy;
      if(s.x < 0) s.x = W;
      if(s.x > W) s.x = 0;
      if(s.y < 0) s.y = H;
      if(s.y > H) s.y = 0;

      const a = s.a * twinkle;
      const x = s.x + px;
      const y = s.y + py;

      // Glow for larger stars
      if(s.r > 0.9){
        const grd = ctx.createRadialGradient(x, y, 0, x, y, s.r * 3.5);
        grd.addColorStop(0, s.col + (a * 0.55) + ')');
        grd.addColorStop(1, s.col + '0)');
        ctx.beginPath();
        ctx.arc(x, y, s.r * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      // Star dot
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = s.col + a + ')';
      ctx.fill();
    }

    animId = requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize, {passive:true});
  window.addEventListener('pointermove', function(e){
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }, {passive:true});

  resize();
  draw();
})();
