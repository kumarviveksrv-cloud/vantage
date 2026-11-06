/* Virorah Vantage: collapsible detail cards for tool outputs.
 * The answer stays open; supporting detail sits one click away.
 *
 * VantageCollapse.init({
 *   root: '#output-content',        // container holding the cards (selector)
 *   barBefore: '.fin-grid',         // optional: put the "Expand all detail" bar before this element
 *   bar: true,                      // set false to omit the bar
 *   cards: [{
 *     sel: '.script-card',          // which elements are collapsible cards
 *     head: '.script-header',       // always visible; clicking it toggles
 *     keep: ['.fin-cell-amount'],   // other direct children that stay visible when collapsed
 *     preview: '.script-text',      // direct child shown as a faded two-line preview when collapsed
 *     open: '.legal-section'        // optional: cards matching this start open and stay open on each new render
 *   }]
 * });
 *
 * Works on content that is re-rendered by script: new cards are picked up and start collapsed.
 * Roots that are shown/hidden (display:none) start collapsed every time they are shown.
 * Printing always shows everything.
 */
(function () {
  var instances = [];
  var printState = null;

  function injectCss() {
    if (document.getElementById('vc-css')) return;
    var s = document.createElement('style'); s.id = 'vc-css';
    s.textContent =
      '.vc-hide{display:none !important}' +
      '.vc-preview{max-height:48px;overflow:hidden;-webkit-mask-image:linear-gradient(#000 30%,transparent);mask-image:linear-gradient(#000 30%,transparent)}' +
      '.vc-toggle{display:block;margin-top:12px;padding:4px 0;background:none;border:none;color:#a5b4fc;font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.06em;cursor:pointer}' +
      '.vc-toggle:hover{color:#f4f3ff}' +
      '.vc-head{cursor:pointer}' +
      '.vc-card.vc-collapsed{cursor:pointer;transition:border-color .15s}' +
      '.vc-card.vc-collapsed:hover{border-color:rgba(99,102,241,0.38)}' +
      '.vc-bar{display:flex;justify-content:flex-end;margin:0 0 12px}' +
      '.vc-all{background:none;border:1px solid rgba(99,102,241,0.25);border-radius:6px;color:#a5b4fc;font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.06em;padding:5px 12px;cursor:pointer;transition:all .15s}' +
      '.vc-all:hover{background:rgba(99,102,241,0.1);color:#f4f3ff}' +
      '@media print{.vc-toggle,.vc-bar{display:none !important}}';
    document.head.appendChild(s);
  }

  function anyMatch(el, sels) { for (var i = 0; i < sels.length; i++) { if (el.matches(sels[i])) return true; } return false; }
  function anyInside(el, sels) { for (var i = 0; i < sels.length; i++) { if (el.querySelector(sels[i])) return true; } return false; }

  function Inst(cfg) {
    this.cfg = cfg; this.root = null; this.cards = []; this.queued = false; this.wasVisible = false;
  }
  Inst.prototype.classify = function (card, def) {
    var keep = def.keep || [], out = { hide: [], prev: [] };
    Array.prototype.forEach.call(card.children, function (ch) {
      if (ch.classList.contains('vc-toggle')) return;
      if ((def.head && (ch.matches(def.head) || ch.querySelector(def.head))) || anyMatch(ch, keep) || anyInside(ch, keep)) return;
      if (def.preview && ch.matches(def.preview)) { out.prev.push(ch); return; }
      out.hide.push(ch);
    });
    return out;
  };
  Inst.prototype.apply = function (rec, collapsed) {
    var c = this.classify(rec.el, rec.def);
    rec.el.classList.toggle('vc-collapsed', collapsed);
    c.hide.forEach(function (e) { e.classList.toggle('vc-hide', collapsed); });
    c.prev.forEach(function (e) { e.classList.toggle('vc-preview', collapsed); });
    var b = rec.el.querySelector(':scope > .vc-toggle');
    if (b) { b.textContent = collapsed ? 'Show detail ▾' : 'Hide detail ▴'; b.setAttribute('aria-expanded', String(!collapsed)); }
  };
  Inst.prototype.syncBar = function () {
    var b = this.root && this.root.querySelector('.vc-all'); if (!b) return;
    var anyCollapsed = this.cards.some(function (r) { return r.el.isConnected && r.el.classList.contains('vc-collapsed'); });
    b.textContent = anyCollapsed ? 'Expand all detail' : 'Collapse all detail';
  };
  Inst.prototype.toggleAll = function () {
    var self = this, live = this.cards.filter(function (r) { return r.el.isConnected; });
    var anyCollapsed = live.some(function (r) { return r.el.classList.contains('vc-collapsed'); });
    live.forEach(function (r) { self.apply(r, !anyCollapsed); });
    this.syncBar();
  };
  Inst.prototype.collapseAll = function () {
    var self = this;
    this.cards.forEach(function (r) { if (r.el.isConnected) self.apply(r, !(r.def.open && r.el.matches(r.def.open))); });
    this.syncBar();
  };
  Inst.prototype.setup = function () {
    var self = this; this.queued = false;
    if (!this.root || !this.root.isConnected) this.root = document.querySelector(this.cfg.root);
    if (!this.root) return;
    this.cards = this.cards.filter(function (r) { return r.el.isConnected; });
    var added = 0;
    (this.cfg.cards || []).forEach(function (def) {
      Array.prototype.forEach.call(self.root.querySelectorAll(def.sel), function (el) {
        if (el.classList.contains('vc-card') || el.classList.contains('vc-skip')) return;
        var rec = { el: el, def: def }, c = self.classify(el, def);
        if (!c.hide.length && !c.prev.length) { el.classList.add('vc-skip'); return; } /* nothing to collapse */
        el.classList.add('vc-card');
        var head = def.head && el.querySelector(def.head); if (head) head.classList.add('vc-head');
        var b = document.createElement('button'); b.type = 'button'; b.className = 'vc-toggle'; el.appendChild(b);
        b.addEventListener('click', function (e) { e.stopPropagation(); self.apply(rec, !el.classList.contains('vc-collapsed')); self.syncBar(); });
        el.addEventListener('click', function (e) {
          if (window.getSelection && String(window.getSelection())) return; /* person is selecting text */
          if (el.classList.contains('vc-collapsed')) {
            if (e.target.closest && e.target.closest('a,button,input,select,textarea')) return;
            self.apply(rec, false); self.syncBar();
          } else if (head && head.contains(e.target)) { self.apply(rec, true); self.syncBar(); }
        });
        self.cards.push(rec); self.apply(rec, !(def.open && el.matches(def.open))); added++;
      });
    });
    if (this.cfg.bar !== false && this.cards.length && !this.root.querySelector('.vc-bar')) {
      var bar = document.createElement('div'); bar.className = 'vc-bar';
      var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'vc-all'; btn.textContent = 'Expand all detail';
      btn.addEventListener('click', function () { self.toggleAll(); });
      bar.appendChild(btn);
      var before = this.cfg.barBefore && this.root.querySelector(this.cfg.barBefore);
      if (before && before.parentNode) before.parentNode.insertBefore(bar, before);
      else if (this.cards[0]) this.cards[0].el.parentNode.insertBefore(bar, this.cards[0].el);
    }
    if (added) this.syncBar();
  };
  Inst.prototype.queue = function () {
    var self = this; if (this.queued) return; this.queued = true;
    requestAnimationFrame(function () { self.setup(); });
  };
  Inst.prototype.start = function () {
    var self = this;
    this.root = document.querySelector(this.cfg.root); if (!this.root) return;
    this.setup();
    new MutationObserver(function () { self.queue(); }).observe(this.root, { childList: true, subtree: true });
    /* roots that are shown and hidden: start collapsed each time they appear */
    this.wasVisible = this.root.style.display !== 'none';
    new MutationObserver(function () {
      var vis = self.root.style.display !== 'none';
      if (vis && !self.wasVisible) { self.setup(); self.collapseAll(); }
      self.wasVisible = vis;
    }).observe(this.root, { attributes: true, attributeFilter: ['style'] });
  };

  window.addEventListener('beforeprint', function () {
    printState = instances.map(function (i) { return i.cards.map(function (r) { return r.el.classList.contains('vc-collapsed'); }); });
    instances.forEach(function (i) { i.cards.forEach(function (r) { if (r.el.isConnected) i.apply(r, false); }); });
  });
  window.addEventListener('afterprint', function () {
    if (!printState) return;
    instances.forEach(function (i, n) { i.cards.forEach(function (r, k) { if (r.el.isConnected && printState[n]) i.apply(r, printState[n][k]); }); i.syncBar(); });
    printState = null;
  });

  window.VantageCollapse = {
    init: function (cfg) {
      injectCss();
      var go = function () { var i = new Inst(cfg); instances.push(i); i.start(); };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
    }
  };
})();
