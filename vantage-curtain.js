/* VANTAGE // QUESTION CURTAIN v3
   Soul-searching questions sit before each section in normal document flow.
   Curtain slides UP after 3s or on click, revealing the section below.
   Returning visitors (sessionStorage) skip all cards instantly.
*/
(function(){
  'use strict';
  if(matchMedia('(prefers-reduced-motion:reduce)').matches){
    document.querySelectorAll('.q-curtain').forEach(q=>q.remove());
    return;
  }

  const SEEN_KEY = 'vantage_curtains_seen';

  // Returning visitor — remove all curtains immediately
  if(sessionStorage.getItem(SEEN_KEY)){
    document.querySelectorAll('.q-curtain').forEach(q=>q.remove());
    return;
  }

  const DELAY = 3200;

  function revealCurtain(curtain){
    if(curtain.dataset.revealed) return;
    curtain.dataset.revealed = '1';
    curtain.classList.add('revealing');
    setTimeout(()=>{ curtain.remove(); }, 900);
  }

  function initCurtain(curtain){
    const bar = curtain.querySelector('.q-bar-fill');
    let timer = null;
    let started = false;

    function startCountdown(){
      if(started) return;
      started = true;
      requestAnimationFrame(()=>{
        if(bar){
          bar.style.transition = `width ${DELAY}ms linear`;
          bar.style.width = '100%';
        }
      });
      timer = setTimeout(()=>revealCurtain(curtain), DELAY);
    }

    // Click anywhere = instant reveal
    curtain.addEventListener('click', ()=>{
      clearTimeout(timer);
      revealCurtain(curtain);
    });

    // Start when curtain enters viewport
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{ if(e.isIntersecting) startCountdown(); });
    },{threshold:0.45});
    io.observe(curtain);
  }

  document.querySelectorAll('.q-curtain').forEach(initCurtain);

  // Mark session when all curtains are done
  window.addEventListener('scroll', ()=>{
    if(!document.querySelector('.q-curtain:not([data-revealed])')){
      sessionStorage.setItem(SEEN_KEY, '1');
    }
  },{passive:true});

  // ── Simple scroll reveal for CTA and sim-room ───────────────────────────
  const revealIO = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.classList.add('is-revealed');
        revealIO.unobserve(e.target);
      }
    });
  },{threshold:0.06});

  document.querySelectorAll('.sim-room,.cta-moment').forEach(s=>revealIO.observe(s));

})();
