/* vantage-autoselect.js
   Auto-selects Option C (Domestic enquiry — defensible) on page load.
   Option C keeps ARIA calm and coherent (face visible, lavender/green).
   Also injects the causal cue banner on Decision Field section.
*/
(function(){
  'use strict';

  /* ── Inject causal cue at top of Decision Field ─── */
  function injectCausalCue(){
    var machine = document.querySelector('.case-machine');
    if(!machine || document.getElementById('causal-cue')) return;
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
      display:'flex', alignItems:'center', justifyContent:'center',
      gap:'9px', padding:'0 0 20px',
      font:"11px 'JetBrains Mono',monospace",
      letterSpacing:'.16em', textTransform:'uppercase',
      color:'rgba(196,181,253,.55)',
    });
    var prompt = machine.querySelector('.case-prompt');
    if(prompt) machine.insertBefore(cue, prompt);
    else machine.insertBefore(cue, machine.firstChild);
    if(!document.getElementById('autoselect-kf')){
      var s = document.createElement('style');
      s.id = 'autoselect-kf';
      s.textContent =
        '#causal-cue svg{animation:cuearrow 2.2s ease-in-out infinite}' +
        '@keyframes cuearrow{0%,100%{opacity:.35;transform:translateY(0)}' +
        '50%{opacity:.75;transform:translateY(-4px)}}';
      document.head.appendChild(s);
    }
  }

  /* ── Auto-select Option C (defensible — ARIA stays calm) ─── */
  function autoSelectOptionC(){
    var choices = document.querySelector('.choices');
    if(!choices) return;
    // Option C is the third button (index 2, data-choice="C")
    var btnC = choices.querySelector('button[data-choice="C"]');
    if(!btnC || btnC.classList.contains('active')) return;
    btnC.dispatchEvent(new MouseEvent('click', {
      bubbles: true, cancelable: true, view: window
    }));
  }

  function init(){
    injectCausalCue();
    setTimeout(autoSelectOptionC, 900);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    window.addEventListener('load', function(){ setTimeout(autoSelectOptionC, 400); });
    init();
  }
})();
