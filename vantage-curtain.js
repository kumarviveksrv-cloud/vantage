/* VANTAGE // QUESTION CURTAIN
   Soul-searching questions cover each section.
   Auto-reveal after 3s with countdown line, or click to reveal instantly.
   Returning visitors (sessionStorage) skip all cards.
*/
(function(){
  'use strict';
  if(matchMedia('(prefers-reduced-motion:reduce)').matches){
    document.querySelectorAll('.q-curtain').forEach(q=>q.remove());
    return;
  }

  const SEEN_KEY = 'vantage_curtains_seen';
  const returning = sessionStorage.getItem(SEEN_KEY);

  // Returning visitor — remove all curtains immediately
  if(returning){
    document.querySelectorAll('.q-curtain').forEach(q=>q.remove());
    return;
  }

  const DELAY = 3200; // ms before auto-reveal

  function revealCurtain(curtain){
    if(curtain.dataset.revealed) return;
    curtain.dataset.revealed = '1';
    curtain.classList.add('revealing');
    // After animation completes, remove from DOM
    setTimeout(()=>curtain.remove(), 900);
  }

  function initCurtain(curtain){
    const bar = curtain.querySelector('.q-bar-fill');
    const btn = curtain.querySelector('.q-skip');
    let timer = null;
    let started = false;

    function startCountdown(){
      if(started) return;
      started = true;
      // Animate bar
      requestAnimationFrame(()=>{
        if(bar) bar.style.transition = `width ${DELAY}ms linear`;
        if(bar) bar.style.width = '100%';
      });
      timer = setTimeout(()=>revealCurtain(curtain), DELAY);
    }

    // Click anywhere on curtain = instant reveal
    curtain.addEventListener('click', ()=>{
      clearTimeout(timer);
      revealCurtain(curtain);
    });

    // Skip button
    if(btn) btn.addEventListener('click', e=>{
      e.stopPropagation();
      clearTimeout(timer);
      revealCurtain(curtain);
    });

    // Start countdown when curtain enters viewport
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting) startCountdown();
      });
    },{threshold:0.5});
    io.observe(curtain);
  }

  document.querySelectorAll('.q-curtain').forEach(initCurtain);

  // Mark session as seen when user has scrolled past all curtains
  window.addEventListener('scroll', ()=>{
    const remaining = document.querySelectorAll('.q-curtain:not([data-revealed])');
    if(remaining.length === 0){
      sessionStorage.setItem(SEEN_KEY, '1');
    }
  },{passive:true});

  // ── Simple section reveal on scroll ────────────────────────────────────
  const revealIO = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.classList.add('is-revealed');
        revealIO.unobserve(e.target);
      }
    });
  },{threshold:0.06});

  document.querySelectorAll('.reveal-section,.sim-room,.cta-moment').forEach(s=>{
    revealIO.observe(s);
  });

})();
