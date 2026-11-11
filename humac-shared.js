/* Shared planning helpers for the Humac Score. Used by humac-onboarding.html
   (scoring) and the pillar pages (rupee displays) so the two cannot drift.
   Attrition ranges mirror ATTRITION_BENCHMARKS in the Worker (India, 2025/26
   survey mix; several rows are directional estimates, see methodology page). */
(function(w){
  var T={
    'Government / PSU':[8,10],'Manufacturing':[13,14],'Automobile / Auto Ancillary':[13,14],
    'Chemicals / Fertilizers':[13,14],'Textiles / Apparel':[13,14],'IT / SaaS':[12,15],
    'Telecom':[16,17],'Logistics / Supply Chain':[16,17],'Oil & Gas / Energy':[16,17],
    'Consulting / Professional Services':[16,17],'Agriculture / Agri-business':[16,17],'Aviation':[16,17],
    'Media / Entertainment':[16,17],'Real Estate / Construction':[16,17],'Healthcare / Pharma':[16,17],
    'Education / EdTech':[16,17],'Banking / NBFC':[20,24],'Insurance':[20,24],'Startup':[20,24],
    'BPO / KPO':[30,40],'Retail / FMCG':[24,28]
  };
  var NATIONAL=[16,17];
  w.HumacShared={
    /* Annual leave probability: midpoint of the industry attrition range, as a fraction. */
    leaveP:function(industry){var r=T[industry]||NATIONAL;return Math.round((r[0]+r[1])/2*10)/1000;},
    leaveSource:function(industry){return T[industry]?(industry+' attrition benchmark'):'national baseline (16-17%)';},
    /* Self-labelled stars above 20% of headcount are not counted. */
    STAR_CAP_SHARE:0.20,
    cappedStars:function(stars,headcount){var cap=Math.floor((headcount||0)*0.20);return Math.max(0,Math.min(stars||0,cap>0?cap:(stars||0)));},
    /* Cross-pillar gap factor: 1.0 at a pillar score of 50, 0 at 100, 2.0 at 0. Missing score counts as 50. */
    gap:function(score){var s=(score==null||isNaN(score))?50:score;return Math.max(0,Math.min(2,2*(1-s/100)));},
    cappedHipo:function(n,headcount){var cap=Math.floor((headcount||0)*0.15);return Math.max(0,Math.min(n||0,cap>0?cap:(n||0)));},
    HIPO_P:0.25
  };
})(window);
