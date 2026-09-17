/* VANTAGE // CURTAIN RAISER
   Scroll-triggered reveal: atmospheric moment between sections.
   Each curtain sweeps a line, then the next section opens like a blind rising.
*/
(function(){
  'use strict';
  if(matchMedia('(prefers-reduced-motion:reduce)').matches) return;

  // ── Curtain sweep animation ─────────────────────────────────────────────
  const curtains = document.querySelectorAll('.curtain-moment');
  const revealSections = document.querySelectorAll('.reveal-section, .sim-room, .cta-moment');

  // Set all reveal sections to pre-reveal state
  revealSections.forEach(s => {
    s.style.clipPath = 'inset(100% 0 0 0)';
    s.style.transition = 'none';
  });

  // Curtain IntersectionObserver — triggers sweep + section reveal
  const curtainIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(!entry.isIntersecting) return;
      const curtain = entry.target;
      if(curtain.dataset.triggered) return;
      curtain.dataset.triggered = 'true';

      // 1. Animate the sweep line
      const sweep = curtain.querySelector('.curtain-sweep');
      const line = curtain.querySelector('.curtain-line');
      const pip = curtain.querySelector('.curtain-pip');

      setTimeout(() => {
        if(sweep) sweep.classList.add('sweep-active');
        if(line) line.classList.add('line-active');
        if(pip) pip.classList.add('pip-active');
      }, 200);

      // 2. Find and reveal the NEXT .reveal-section
      let next = curtain.nextElementSibling;
      while(next && !next.classList.contains('reveal-section') && 
            !next.classList.contains('sim-room') && 
            !next.classList.contains('cta-moment')) {
        next = next.nextElementSibling;
      }
      if(next) {
        setTimeout(() => {
          next.style.transition = 'clip-path 1.1s cubic-bezier(0.77,0,0.175,1)';
          next.style.clipPath = 'inset(0 0 0 0)';
        }, 900);
      }
    });
  }, { threshold: 0.4 });

  curtains.forEach(c => curtainIO.observe(c));

  // ── Sim room threshold crossing ─────────────────────────────────────────
  const simRoom = document.querySelector('.sim-room');
  if(simRoom) {
    const simIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting) {
          simRoom.classList.add('sim-entered');
        }
      });
    }, { threshold: 0.2 });
    simIO.observe(simRoom);
  }

  // ── Hero section — no clip needed, always visible ──────────────────────
  const hero = document.querySelector('.hero');
  if(hero) {
    hero.style.clipPath = 'none';
  }

  // ── First reveal section (humacity) shows after scroll past hero ────────
  const firstReveal = document.querySelector('.reveal-section');
  if(firstReveal) {
    const firstIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting) {
          firstReveal.style.transition = 'clip-path 1.1s cubic-bezier(0.77,0,0.175,1)';
          firstReveal.style.clipPath = 'inset(0 0 0 0)';
          firstIO.disconnect();
        }
      });
    }, { threshold: 0.15 });
    firstIO.observe(firstReveal);
  }

})();
