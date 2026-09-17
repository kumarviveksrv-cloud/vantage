/* VANTAGE // CURTAIN RAISER v2 — simplified, reliable */
(function(){
  'use strict';
  if(matchMedia('(prefers-reduced-motion:reduce)').matches) return;

  // ── Curtain sweep + text reveal ─────────────────────────────────────────
  const curtainIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(!entry.isIntersecting || entry.target.dataset.done) return;
      entry.target.dataset.done = '1';
      const sweep = entry.target.querySelector('.curtain-sweep');
      const line  = entry.target.querySelector('.curtain-line');
      const pip   = entry.target.querySelector('.curtain-pip');
      setTimeout(() => { if(sweep) sweep.classList.add('sweep-active'); }, 100);
      setTimeout(() => { if(line)  line.classList.add('line-active'); },  500);
      setTimeout(() => { if(pip)   pip.classList.add('pip-active'); },    1100);
    });
  }, { threshold: 0.35 });

  document.querySelectorAll('.curtain-moment').forEach(c => curtainIO.observe(c));

  // ── Section reveal — simple opacity + rise ──────────────────────────────
  const sectionIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        sectionIO.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  document.querySelectorAll('.reveal-section, .sim-room, .cta-moment').forEach(s => {
    sectionIO.observe(s);
  });

  // ── Sim room atmospheric entry ──────────────────────────────────────────
  const simRoom = document.querySelector('.sim-room');
  if(simRoom) {
    const simIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting) {
          simRoom.classList.add('sim-entered');
          simIO.disconnect();
        }
      });
    }, { threshold: 0.15 });
    simIO.observe(simRoom);
  }

})();
