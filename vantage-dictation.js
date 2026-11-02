/* Virorah Vantage: "dictate instead of typing" tip under long text fields, on touch devices only.
 * Phones already have voice typing on the keyboard; this just makes people aware of it.
 * VantageDictation.init(['narrative', 'context'])  (textarea ids)
 * The tip is removed as soon as the person types or dictates. It is hidden when printing.
 */
(function () {
  function touch() { return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); }
  function injectCss() {
    if (document.getElementById('vd-css')) return;
    var s = document.createElement('style'); s.id = 'vd-css';
    s.textContent = '.vd-tip{margin:6px 2px 0;font-family:"DM Sans",sans-serif;font-size:12px;line-height:1.5;color:rgba(196,181,253,0.85)}' +
      '.vd-tip small{display:block;margin-top:2px;font-size:11px;color:rgba(244,243,255,0.55)}' +
      '@media print{.vd-tip{display:none !important}}';
    document.head.appendChild(s);
  }
  function add(id) {
    var ta = document.getElementById(id);
    if (!ta || ta.getAttribute('data-vd') || ta.value) return;
    ta.setAttribute('data-vd', '1');
    var tip = document.createElement('div'); tip.className = 'vd-tip';
    tip.innerHTML = '🎤 Tip: tap the mic on your keyboard to speak instead of typing.<small>Voice typing is done by your phone’s keyboard, not by Vantage.</small>';
    ta.insertAdjacentElement('afterend', tip);
    ta.addEventListener('input', function () { if (tip.parentNode) tip.parentNode.removeChild(tip); }, { once: true });
  }
  window.VantageDictation = {
    init: function (ids) {
      if (!touch()) return;
      injectCss();
      var go = function () { (ids || []).forEach(add); };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
    }
  };
})();
