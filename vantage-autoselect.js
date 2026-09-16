/* vantage-autoselect.js
   UX fix: auto-selects Option A (wrong choice) on page load so the
   consequence field in section 02 is never empty on first visit.
   Also injects a one-line causal cue at the top of section 03.

   Load as the LAST <script> in index.html, after vantage-cinematic.js
   and vantage-cinematic-v4.js.
*/
(function(){
  'use strict';

  /* ── 1. INJECT CAUSAL CUE (top of Decision Field section) ───────── */
  function injectCausalCue(){
    var machine = document.querySelector('.case-machine');
    if(!machine) return;

    // Already injected?
    if(document.getElementById('causal-cue')) return;

    var cue = document.createElement('div');
    cue.id = 'causal-cue';
    cue.innerHTML =
      '<svg width="12" height="16" viewBox="0 0 12 16" fill="none">' +
        '<path d="M6 14V2M6 2L2 6M6 2L10 6"' +
          ' stroke="rgba(196,181,253,.5)" stroke-width="1.2"' +
          ' stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>' +
      '<span>Your choice updates the field above</span>' +
      '<svg width="12" height="16" viewBox="0 0 12 16" fill="none">' +
        '<path d="M6 14V2M6 2L2 6M6 2L10 6"' +
          ' stroke="rgba(196,181,253,.5)" stroke-width="1.2"' +
          ' stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';

    Object.assign(cue.style, {
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      gap:            '9px',
      padding:        '0 0 20px',
      font:           "11px 'JetBrains Mono',monospace",
      letterSpacing:  '.16em',
      textTransform:  'uppercase',
      color:          'rgba(196,181,253,.55)',
    });

    // Insert before the .case-prompt (top of machine card)
    var prompt = machine.querySelector('.case-prompt');
    if(prompt) machine.insertBefore(cue, prompt);
    else machine.insertBefore(cue, machine.firstChild);

    // Pulsing arrow keyframes
    if(!document.getElementById('autoselect-kf')){
      var s = document.createElement('style');
      s.id = 'autoselect-kf';
      s.textContent =
        '#causal-cue svg{animation:cuearrow 2.2s ease-in-out infinite}' +
        '@keyframes cuearrow{' +
          '0%,100%{opacity:.35;transform:translateY(0)}' +
          '50%{opacity:.75;transform:translateY(-4px)}' +
        '}';
      document.head.appendChild(s);
    }
  }

  /* ── 2. AUTO-SELECT OPTION A ──────────────────────────────────────── */
  function autoSelectOptionA(){
    var choices = document.querySelector('.choices');
    if(!choices) return;

    var btnA = choices.querySelector('button'); // first button = Option A
    if(!btnA || btnA.classList.contains('active')) return;

    // Dispatch a real click so the existing vantage-cinematic.js
    // click handler fires and updates data-outcome, field readouts, etc.
    btnA.dispatchEvent(new MouseEvent('click', {
      bubbles: true, cancelable: true, view: window
    }));
  }

  /* ── 3. INIT ─────────────────────────────────────────────────────── */
  function init(){
    injectCausalCue();

    // Delay long enough for vantage-cinematic.js to attach its handlers,
    // but short enough to beat the user's first scroll to section 02.
    setTimeout(autoSelectOptionA, 900);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Scripts deferred or page already loaded
    window.addEventListener('load', function(){ setTimeout(autoSelectOptionA, 400); });
    init();
  }

})();
