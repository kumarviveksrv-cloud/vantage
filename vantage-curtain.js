/* VANTAGE // QUESTION CURTAIN — fixed overlay approach
   Curtains are position:fixed overlays, triggered by scroll into section.
   Sections stay in 100% normal document flow — no layout interference.
*/
(function(){
  'use strict';

  const SEEN = 'vantage_q_seen';
  const DELAY = 3200;

  // Remove all curtain HTML elements — they're not needed in this approach
  document.querySelectorAll('.q-curtain').forEach(q => q.remove());

  if(matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  if(sessionStorage.getItem(SEEN)) return;

  // The 4 questions — one per section trigger
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
      sub: 'Every decision you navigated. Every case you closed. Every difficult conversation you held. Is any of it saved anywhere?',
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
      sub: 'Not a chatbot. Someone who already knows your context, your policies, your history — and asks the right questions back.',
    },
  ];

  // Build the fixed overlay element (one shared, content swaps)
  const overlay = document.createElement('div');
  overlay.id = 'q-overlay';
  overlay.innerHTML = `
    <div id="q-inner">
      <p id="q-pre"></p>
      <h2 id="q-question"></h2>
      <p id="q-sub"></p>
      <div id="q-actions">
        <button id="q-skip">Reveal <span>↓</span></button>
        <p id="q-hint">or wait 3 seconds</p>
      </div>
    </div>
    <div id="q-bar"><div id="q-fill"></div></div>
  `;
  document.body.appendChild(overlay);

  let currentCard = -1;
  let revealTimer = null;
  let shown = false;

  function showCard(index) {
    if(index >= CARDS.length || shown) return;
    const card = CARDS[index];
    currentCard = index;
    shown = true;

    document.getElementById('q-pre').textContent = card.pre;
    document.getElementById('q-question').textContent = card.q;
    document.getElementById('q-sub').textContent = card.sub;

    const fill = document.getElementById('q-fill');
    fill.style.transition = 'none';
    fill.style.width = '0';

    overlay.classList.remove('q-hiding');
    overlay.classList.add('q-visible');

    // Start countdown bar
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fill.style.transition = `width ${DELAY}ms linear`;
        fill.style.width = '100%';
      });
    });

    revealTimer = setTimeout(() => dismissCard(), DELAY);
  }

  function dismissCard() {
    clearTimeout(revealTimer);
    overlay.classList.add('q-hiding');
    shown = false;
    setTimeout(() => {
      overlay.classList.remove('q-visible', 'q-hiding');
      const fill = document.getElementById('q-fill');
      fill.style.width = '0';
    }, 700);

    // Mark session when last card dismissed
    if(currentCard >= CARDS.length - 1) {
      sessionStorage.setItem(SEEN, '1');
    }
  }

  // Click or skip button to dismiss instantly
  overlay.addEventListener('click', () => {
    if(overlay.classList.contains('q-visible')) dismissCard();
  });

  // Each section triggers its card on first scroll-into-view
  const triggered = new Set();
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(!entry.isIntersecting) return;
      const idx = CARDS.findIndex(c => entry.target.matches(c.trigger));
      if(idx === -1 || triggered.has(idx) || shown) return;
      triggered.add(idx);
      // Small delay so user sees section start to enter
      setTimeout(() => showCard(idx), 300);
    });
  }, { threshold: 0.12 });

  CARDS.forEach(card => {
    const el = document.querySelector(card.trigger);
    if(el) io.observe(el);
  });

})();
