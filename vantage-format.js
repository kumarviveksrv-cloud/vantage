/* Virorah Vantage: Indian number display for rupee amounts held in lakh.
 * vantageFmtL(126.7) -> "₹1.27 Cr", vantageFmtL(12.5) -> "₹12.5L", vantageFmtL(0) -> null
 * Below one crore the amount stays in lakh; from one crore up it is shown in crore (1 Cr = 100 L).
 */
(function () {
  window.vantageFmtL = function (lakh) {
    var n = Number(lakh);
    if (!(n > 0)) return null;
    var l = Math.round(n * 10) / 10;
    if (l < 100) return '₹' + l + 'L';
    return '₹' + (Math.round(n) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' Cr';
  };
})();
