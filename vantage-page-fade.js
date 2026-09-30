/* VANTAGE PAGE FADE TRANSITION
   Shared across index.html, about.html and demo.html.

   Each page carries its own <div id="page-fade-overlay"> as the literal
   first element in <body>, inline-styled to start fully opaque. That's
   deliberate: the overlay's starting state lives in raw HTML, not JS, so
   there is zero window for a flash of unstyled or half-initialised content
   before this script even runs. This script only ever fades the overlay
   OUT (on arrival) or back IN (before leaving), never controls whether it
   exists in the first place.

   Usage on a page:
     VantageFade.hide(delayMs)              — fade the overlay away
     VantageFade.navigateWithFade(url, ms)  — fade to opaque, then navigate
*/
(function(){
  var overlay = document.getElementById('page-fade-overlay');
  if(!overlay) return;

  window.VantageFade = {
    hide: function(delayMs){
      setTimeout(function(){
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
      }, delayMs || 0);
    },
    show: function(){
      overlay.style.pointerEvents = 'all';
      overlay.style.opacity = '1';
    },
    navigateWithFade: function(url, fadeMs){
      fadeMs = (typeof fadeMs === 'number') ? fadeMs : 450;
      overlay.style.pointerEvents = 'all';
      overlay.style.opacity = '1';
      setTimeout(function(){ window.location.href = url; }, fadeMs);
    }
  };

  /* Zero-quote-character helper for onclick="return vantageGoHome()".
     Several of these links live inside JS string templates (demo.html's
     tool-result HTML, built as single-quoted strings), where an inline
     onclick containing its own single quotes would prematurely close the
     surrounding JS string literal. A call site with no quote characters
     at all is safe to embed inside any quoting context without escaping. */
  window.vantageGoHome = function(){
    try { sessionStorage.setItem('vantage_skip_intro_from', '1'); } catch(e){}
    if (window.VantageFade) {
      window.VantageFade.navigateWithFade('index.html');
    } else {
      window.location.href = 'index.html';
    }
    return false;
  };
})();
