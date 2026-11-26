/* Virorah Vantage: site-wide rupee-symbol fix.
 *
 * Why this exists: neither of this site's two display fonts (Cormorant
 * Garamond, Space Grotesk) actually contains a glyph for U+20B9 (₹) in
 * their self-hosted woff2 subsets, despite declaring unicode-range
 * coverage that includes it. The browser silently falls back to the
 * OS's generic sans-serif for just that one character, and which font
 * the OS picks for that fallback is inconsistent across devices (this
 * shipped first as a font-family fix in the hero headline, then had to
 * be replaced after it rendered as a visibly different, malformed-looking
 * glyph on a real Android/Chrome device). The only fix that is
 * guaranteed to render identically everywhere is to stop relying on a
 * font glyph at all: swap the character for a fixed vector icon
 * (Font Awesome's "indian-rupee-sign", CC BY 4.0 license).
 *
 * This script does that swap once, site-wide, for every ₹ character
 * that ends up as literal text in the page - whether it was written
 * directly into the HTML, inserted via `&#8377;`, or generated later by
 * a script (a report builder, a score guide, a dashboard card). It does
 * this by walking text nodes on load and then watching the page with a
 * MutationObserver, so content created after load is covered too. It
 * never touches the character inside an HTML attribute (placeholder,
 * aria-label, alt, title, input values) - an inline SVG can't go there,
 * and those are editable/assistive text anyway, not a rendered figure,
 * so leaving them as the plain character is correct.
 *
 * By default every swapped icon renders at the surrounding text's own
 * weight (no bold, no glow) so it reads as "a rupee sign," not a
 * shout, in paragraphs and tables full of other numbers. An element can
 * opt into the bolder, glowing treatment used in the hero headline by
 * adding `data-rupee-style="bold"` to itself or an ancestor - use this
 * sparingly, for the one or two figures per page that should actually
 * read as the dominant number, not every currency mention on the page.
 */
(function () {
  if (window.__vantageRupeeInit) return;
  window.__vantageRupeeInit = true;

  var RUPEE = '₹';
  var SVG_PATH = 'M0 64C0 46.3 14.3 32 32 32l64 0 16 0 176 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-56.2 0c9.6 14.4 16.7 30.6 20.7 48l35.6 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-35.6 0c-13.2 58.3-61.9 103.2-122.2 110.9L274.6 422c14.4 10.3 17.7 30.3 7.4 44.6s-30.3 17.7-44.6 7.4L13.4 314C2.1 306-2.7 291.5 1.5 278.2S18.1 256 32 256l80 0c32.8 0 61-19.7 73.3-48L32 208c-17.7 0-32-14.3-32-32s14.3-32 32-32l153.3 0C173 115.7 144.8 96 112 96L96 96 32 96C14.3 96 0 81.7 0 64z';

  /* OPTION is skipped deliberately: a <select><option> can only render
   * plain text, so an inline <svg> inside one is dropped/flattened by
   * the browser rather than shown, and policy-advisor.html's exposure-
   * range dropdown ("Under ₹500", "₹500 to ₹2,000", ...) has exactly
   * this shape. Leaving the plain character there is the correct,
   * working behaviour, not a gap. */
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, SVG: 1, NOSCRIPT: 1, TEXTAREA: 1, INPUT: 1, TITLE: 1, OPTION: 1 };

  var style = document.createElement('style');
  style.textContent =
    '.v-rupee{display:inline-block;height:0.8em;width:auto;vertical-align:-0.07em;' +
    'fill:currentColor;flex:none;}' +
    '.v-rupee-bold{stroke:currentColor;stroke-width:16;stroke-linejoin:round;' +
    'filter:drop-shadow(0 0 10px rgba(139,92,246,.5));}';
  document.head.appendChild(style);

  function makeIcon(bold) {
    var span = document.createElement('span');
    span.className = bold ? 'v-rupee v-rupee-bold' : 'v-rupee';
    span.setAttribute('data-vantage-rupee', '1');
    span.innerHTML =
      '<svg viewBox="0 0 320 512" aria-label="rupees" role="img" ' +
      'style="height:100%;width:auto;display:block;fill:inherit;' +
      (bold ? 'stroke:inherit;stroke-width:16;stroke-linejoin:round;' : '') +
      '"><path d="' + SVG_PATH + '"/></svg>';
    return span;
  }

  /* Known "this is the figure the page wants you to notice" containers,
   * one entry per page that has one: the landing-page example card and
   * proof stats, the HR-return metric on the about page, the case-record
   * stat tiles on the demo page, the P&L ledger rows on pillar-l4, the
   * CTC comparison chips on retention-advisor, and the plan price on
   * subscribe. Everything else (prose, form hints, placeholders, table
   * rows of case narratives) stays at plain weight by design - bolding
   * every rupee mention on a page of case studies would drown out the
   * ones that are actually meant to stand out. `data-rupee-style="bold"`
   * on any element is the manual override for a figure added later that
   * isn't covered by this list. */
  var BOLD_SELECTOR =
    '.rf-hero-example-num,.rf-panel-stat-value,.rf-proof-stat-value,' +
    '.rf-price-currency,.rf-price-daily,.hsf-metric,.record-stat-num,' +
    '.pl-row-val,.pl-subtotal-val,.pl-net-val,.pc-val,.price-amount';

  function isBoldContext(node) {
    var el = node.nodeType === 1 ? node : node.parentElement;
    while (el) {
      if (el.getAttribute && el.getAttribute('data-rupee-style') === 'bold') return true;
      if (el.matches && el.matches(BOLD_SELECTOR)) return true;
      el = el.parentElement;
    }
    return false;
  }

  function shouldSkip(el) {
    while (el) {
      if (el.nodeType === 1) {
        if (SKIP_TAGS[el.tagName]) return true;
        if (el.isContentEditable) return true;
        if (el.getAttribute && el.getAttribute('data-vantage-rupee')) return true;
      }
      el = el.parentNode;
    }
    return false;
  }

  function convertTextNode(textNode) {
    var text = textNode.nodeValue;
    if (!text || text.indexOf(RUPEE) === -1) return;
    if (shouldSkip(textNode.parentNode)) return;

    var bold = isBoldContext(textNode.parentNode);
    var parts = text.split(RUPEE);
    var frag = document.createDocumentFragment();
    for (var i = 0; i < parts.length; i++) {
      if (parts[i]) frag.appendChild(document.createTextNode(parts[i]));
      if (i < parts.length - 1) frag.appendChild(makeIcon(bold));
    }
    textNode.parentNode.replaceChild(frag, textNode);
  }

  function walk(root) {
    if (root.nodeType === 3) {
      convertTextNode(root);
      return;
    }
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    if (root.nodeType === 1 && shouldSkip(root)) return;

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        return n.nodeValue && n.nodeValue.indexOf(RUPEE) !== -1
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      }
    });
    var node;
    var batch = [];
    while ((node = walker.nextNode())) batch.push(node);
    for (var i = 0; i < batch.length; i++) convertTextNode(batch[i]);
  }

  function init() {
    walk(document.body);

    var scheduled = false;
    var pending = [];
    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'characterData') {
          pending.push(m.target);
        } else if (m.type === 'childList') {
          for (var j = 0; j < m.addedNodes.length; j++) pending.push(m.addedNodes[j]);
        }
      }
      if (!scheduled) {
        scheduled = true;
        (window.requestAnimationFrame || window.setTimeout)(function () {
          scheduled = false;
          var batch = pending;
          pending = [];
          for (var k = 0; k < batch.length; k++) {
            var n = batch[k];
            if (!n || !n.isConnected) continue;
            walk(n);
          }
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
