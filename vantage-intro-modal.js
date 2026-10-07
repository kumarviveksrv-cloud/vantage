/* vantage-intro-modal.js
   Premium intro modals for Vantage features.
   Shows once per device (localStorage). "?" button re-triggers on demand.
   Usage: called automatically by sidebar-shared.js per-page detection.
   Manual: VantageIntro.show('aria');

   v3: Merged hr-storyteller + stakeholder-influence into business-case.
   Sequence: Employee Case Advisor → Retention Advisor → The Business Case
   → Difficult Conversations → Policy Advisor → ARIA → Vantage Record
   → Standpoint → The Debrief
*/
(function(){
'use strict';

var PAGE_PATHS = {
  'aria':                   'aria.html',
  'debrief':                'debrief.html',
  'ledger':                 'standpoint.html',
  'humac':                  'humac-onboarding.html',
  'case-navigator':         'employee-case-advisor.html',
  'policy-compass':         'policy-advisor.html',
  'business-case':          'people-roi-brief.html',
  'offer-intelligence':     'retention-advisor.html',
  'conversation-simulator': 'difficult-conversations.html',
  'case-library':           'vantage-record.html'
};

var MODALS = {
  'aria': {
    icon: '◈',
    name: 'ARIA',
    tagline: 'Your private HR intelligence, on call at 9pm.',
    what: 'ARIA is a context-aware intelligence layer calibrated to your organisation\'s context: your state, your policies, your case history. Not a chatbot. Not a generic AI trained on someone else\'s problems.',
    does: 'She reads your situation, asks the right questions back, and gives you guidance calibrated to your context — built to hold up well if challenged, not guaranteed to.',
    start: 'Tell ARIA what is happening right now. The more specific you are (role, stakes, what has been tried), the more precise the guidance. ARIA is part of the paid plan, so she is not available during the 2-day trial.',
    next: 'case-library',
    nextLabel: 'Vantage Record'
  },
  'debrief': {
    icon: '◉',
    name: 'The Debrief',
    tagline: 'Your month, synthesised and sent to you.',
    what: 'The Debrief is auto-generated on the last working day of every month. You don\'t write it. Vantage does. It reads your entire month\'s activity and produces a professional narrative: cases navigated, tools used, modelled financial exposure, growth signal, and one provocation.',
    does: 'Twelve Debriefs become a year. A year becomes a documented record you can point to when reflecting on what you worked through. You receive it. You don\'t build it.',
    start: 'Use the platform through the month: every tool session, every case, every conversation feeds into it. The Debrief arrives automatically at month end.',
    next: null,
    nextLabel: null
  },
  'ledger': {
    icon: '📜',
    name: 'Standpoint',
    tagline: 'Your professional position, on record before the outcome.',
    what: 'Standpoint is where you file your professional stance before a decision\'s outcome is known. Every time you take a position that could later be questioned — a recommendation overruled, a risk you flagged, an alternative you proposed — you file it here, timestamped.',
    does: 'When leadership overrules you and it goes wrong six weeks later, Standpoint shows exactly what you said and when you said it. Not a complaint. Not a diary. Documented professional judgment.',
    start: 'The next time you take a stand that leadership might override: file it here before the outcome is known. One entry is worth more than a year of silence.',
    next: 'debrief',
    nextLabel: 'The Debrief'
  },
  'humac': {
    icon: '⬡',
    name: 'Humac Score',
    tagline: 'One number that speaks the CFO\'s language.',
    what: 'The Humac Score synthesises five forces (Value Ledger, Talent Premium, Org Vitals, Human P&L, and Human Balance Sheet) into a single provisional index modelling HR\'s financial contribution to the organisation.',
    does: 'Gives leadership a number they can read, track, and benchmark against. Not a feeling. Not a survey. A modelled estimate, not a verified or audited figure.',
    start: 'Complete the onboarding below to build your baseline score. It takes about 10 minutes and unlocks your full Humacity profile.',
    next: null,
    nextLabel: null
  },
  'case-navigator': {
    icon: '⚡',
    name: 'Employee Case Advisor',
    tagline: 'Navigate any employee situation, with the full picture.',
    what: 'Employee Case Advisor takes your real situation — a termination, a POSH complaint, a disciplinary issue, a PIP, an absenteeism case — and gives you guidance on what to consider, what process to follow, and what the financial exposure could look like if it\'s mishandled.',
    does: 'Calibrated to your state, your industry, and your org type. Recommendations are grounded in the law relevant to your situation, not generic HR advice, but this is guidance, not a decision on the case.',
    start: 'Describe the situation as it is right now. The more specific you are (what happened, who\'s involved, what\'s been done), the more precise the guidance.',
    next: 'offer-intelligence',
    nextLabel: 'Retention Advisor'
  },
  'policy-compass': {
    icon: '🧭',
    name: 'Policy Advisor',
    tagline: 'Can you do this? Get the legal position before you answer.',
    what: 'Policy Advisor answers a policy or compliance question the way a sharp colleague would: what the question is really asking, what the law says, and one recommended path. It cites BNS, BNSS and BSA where a question is criminal, and the labour codes and state rules where it is not.',
    does: 'Calibrated to your state, industry and organisation type. You can also ground the answer in your own policy document. It is guidance from the cited provisions, not a legal opinion, so confirm with counsel before acting on anything high stakes.',
    start: 'Write your situation the way you would say it out loud, including what you are considering doing. The flags above the question are optional.',
    next: 'aria',
    nextLabel: 'ARIA'
  },
  'business-case': {
    icon: '💼',
    name: 'The Business Case',
    tagline: 'Numbers for the room, or an argument for one specific person.',
    what: 'The Business Case has two modes. The general flow builds a board-ready SIGNAL narrative from your HR metrics — revenue at risk, financial anchors, an argument that\'s harder to wave away than an opinion. The stakeholder flow maps how one specific leader receives information and frames your recommendation to land with them.',
    does: 'Same facts. Right framing. Whether you\'re presenting to a room or walking into a one-on-one that matters, The Business Case builds the argument from your own modelled Humac Score figures — alongside your sector benchmark — to give the room something harder to wave away than an opinion.',
    start: 'Choose your mode: the general business case for a room, or a specific person to convince. Describe what you\'re trying to move and who needs to move it.',
    next: 'conversation-simulator',
    nextLabel: 'Difficult Conversations'
  },
  'offer-intelligence': {
    icon: '⚖️',
    name: 'Retention Advisor',
    tagline: 'Model the likely cost of keeping or losing this person.',
    what: 'Retention Advisor models the full financial picture of a retention decision: what it costs to keep someone, what it costs to lose them, replacement cost, ramp time, flight risk, and the counter-offer position.',
    does: 'Gives you a modelled number before any retention conversation. Not a gut feel — a calculated position, grounded in assumptions you can walk through and defend in the room.',
    start: 'Enter the person\'s current CTC, their role, and the situation. Retention Advisor models both paths (retain and lose), so you walk in prepared.',
    next: 'business-case',
    nextLabel: 'The Business Case'
  },
  'conversation-simulator': {
    icon: '🎭',
    name: 'Difficult Conversations',
    tagline: 'Rehearse before the conversation that matters.',
    what: 'Difficult Conversations is a real-time simulation environment for the conversations HR professionals dread most: performance discussions, terminations, disciplinary hearings, leadership alignment calls. The simulator plays the other person.',
    does: 'A safe space to test your approach, anticipate pushback, and walk into the real conversation having already rehearsed it, not knowing exactly what will happen. The character pushes back realistically.',
    start: 'Choose the conversation type, set the context (role, stakes, what you\'re trying to achieve), and start. Treat it like the real thing.',
    next: 'policy-compass',
    nextLabel: 'Policy Advisor'
  },
  'case-library': {
    icon: '🗄️',
    name: 'Vantage Record',
    tagline: 'Every case you\'ve navigated, yours to keep.',
    what: 'Vantage Record is your complete professional case archive, auto-populated every time you use the platform. Every employee case, every brief, every session: saved, searchable by date, and portable across organisations.',
    does: 'The record the org never built for you. After two years on Vantage, you have a searchable archive of every difficult situation you documented and how you approached it — a record of what you handled, in your own words at the time.',
    start: 'Start using the tools. Every session is saved here automatically. Search by date to see what you were navigating on any given day.',
    next: 'ledger',
    nextLabel: 'Standpoint'
  }
};

var PREFIX = 'vip_seen_';

function injectCSS(){
  if(document.getElementById('vip-css'))return;
  var s=document.createElement('style');s.id='vip-css';
  s.textContent=`
#vip-backdrop{position:fixed;inset:0;z-index:99990;background:rgba(5,4,16,.88);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:20px;animation:vipIn .22s ease}
@keyframes vipIn{from{opacity:0}to{opacity:1}}
@keyframes vipUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
#vip-modal{width:100%;max-width:500px;background:#0c0b1d;border:1px solid rgba(99,102,241,.3);border-radius:18px;padding:34px 34px 26px;position:relative;animation:vipUp .28s ease;box-shadow:0 32px 80px rgba(0,0,0,.65),0 0 0 1px rgba(99,102,241,.06) inset}
#vip-close{position:absolute;top:14px;right:16px;background:none;border:none;cursor:pointer;color:rgba(196,181,253,.3);font-size:20px;line-height:1;padding:4px 7px;border-radius:5px;transition:color .15s}
#vip-close:hover{color:rgba(196,181,253,.65)}
.vip-icon{font-size:20px;color:#a78bfa;margin-bottom:8px;display:block;font-family:'JetBrains Mono',monospace}
.vip-feature-label{font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:.22em;text-transform:uppercase;color:rgba(167,139,250,.5);margin-bottom:5px;display:block}
.vip-tagline{font-family:'Bricolage Grotesque','Space Grotesk',sans-serif;font-size:clamp(17px,2.4vw,22px);font-weight:700;color:#f4f3ff;line-height:1.22;margin-bottom:22px}
.vip-sections{display:flex;flex-direction:column;gap:12px;margin-bottom:24px}
.vip-section{background:rgba(99,102,241,.045);border:1px solid rgba(99,102,241,.1);border-radius:10px;padding:13px 15px}
.vip-section-label{font-family:'JetBrains Mono',monospace;font-size:7.5px;letter-spacing:.2em;text-transform:uppercase;color:rgba(167,139,250,.42);margin-bottom:5px;display:block}
.vip-section-text{font-size:12.5px;color:rgba(244,243,255,.68);line-height:1.68;font-family:'Plus Jakarta Sans','DM Sans',sans-serif}
.vip-start{border-color:rgba(99,102,241,.2);background:rgba(99,102,241,.08)}
.vip-start .vip-section-text{color:rgba(244,243,255,.82)}
.vip-btns{display:flex;gap:10px}
.vip-cta{flex:1;padding:13px 24px;background:linear-gradient(135deg,#6366f1,#7c3aed);border:none;border-radius:10px;cursor:pointer;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;font-size:13px;font-weight:700;color:#fff;letter-spacing:.01em;transition:opacity .18s;white-space:nowrap}
.vip-cta:hover{opacity:.88}
.vip-cta-ghost{flex:0 0 auto;padding:13px 18px;background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.2);border-radius:10px;cursor:pointer;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;font-size:13px;font-weight:600;color:rgba(196,181,253,.7);letter-spacing:.01em;transition:all .18s;white-space:nowrap}
.vip-cta-ghost:hover{background:rgba(99,102,241,.15);border-color:rgba(99,102,241,.4);color:#c4b5fd}
#vip-trigger{position:fixed;bottom:26px;right:26px;width:34px;height:34px;border-radius:50%;background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.22);color:rgba(167,139,250,.55);font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;z-index:9000;font-family:'JetBrains Mono',monospace;line-height:1}
#vip-trigger:hover{background:rgba(99,102,241,.2);border-color:rgba(99,102,241,.48);color:#c4b5fd}
@media(max-width:600px){#vip-modal{padding:26px 20px 22px}.vip-btns{flex-direction:column-reverse}#vip-trigger{bottom:72px}}
  `;
  document.head.appendChild(s);
}

function build(key){
  var d=MODALS[key];if(!d)return null;
  var el=document.createElement('div');el.id='vip-backdrop';
  var btnRow = d.next
    ? '<div class="vip-btns">' +
        '<button class="vip-cta-ghost" id="vip-got-it">Got it</button>' +
        '<button class="vip-cta" id="vip-next">Next: ' + d.nextLabel + ' \u2192</button>' +
      '</div>'
    : '<div class="vip-btns">' +
        '<button class="vip-cta" id="vip-got-it">Got it, let\'s go \u2192</button>' +
      '</div>';
  el.innerHTML='<div id="vip-modal">'+
    '<button id="vip-close" aria-label="Close">&#xd7;</button>'+
    '<span class="vip-icon">'+d.icon+'</span>'+
    '<span class="vip-feature-label">'+d.name+'</span>'+
    '<div class="vip-tagline">'+d.tagline+'</div>'+
    '<div class="vip-sections">'+
      '<div class="vip-section"><span class="vip-section-label">What this is</span><p class="vip-section-text">'+d.what+'</p></div>'+
      '<div class="vip-section"><span class="vip-section-label">What it does for you</span><p class="vip-section-text">'+d.does+'</p></div>'+
      '<div class="vip-section vip-start"><span class="vip-section-label">Where to start</span><p class="vip-section-text">'+d.start+'</p></div>'+
    '</div>'+
    btnRow+
  '</div>';
  return el;
}

function dismiss(key){
  var el=document.getElementById('vip-backdrop');
  if(el){el.style.opacity='0';el.style.transition='opacity .18s ease';setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},200);}
  try{localStorage.setItem(PREFIX+key,'1');}catch(e){}
  setTimeout(function(){injectTrigger(key);},220);
}

function navigateTo(key){
  var path=PAGE_PATHS[key];
  if(path)window.location.href=path;
}

function injectTrigger(key){
  if(document.getElementById('vip-trigger'))return;
  var btn=document.createElement('button');
  btn.id='vip-trigger';btn.textContent='?';
  btn.setAttribute('aria-label','About this feature');
  btn.setAttribute('title','About this feature');
  btn.addEventListener('click',function(){show(key,true);});
  document.body.appendChild(btn);
}

function show(key,force){
  if(!MODALS[key]){console.warn('[VantageIntro] Unknown key:',key);return;}
  if(!force){
    try{if(localStorage.getItem(PREFIX+key)==='1'){injectTrigger(key);return;}}catch(e){}
  }
  var ex=document.getElementById('vip-backdrop');
  if(ex&&ex.parentNode)ex.parentNode.removeChild(ex);
  var oldTrigger=document.getElementById('vip-trigger');
  if(oldTrigger&&oldTrigger.parentNode)oldTrigger.parentNode.removeChild(oldTrigger);
  injectCSS();
  var modal=build(key);
  document.body.appendChild(modal);
  var d=MODALS[key];
  function close(){dismiss(key);}
  document.getElementById('vip-close').addEventListener('click',close);
  document.getElementById('vip-got-it').addEventListener('click',close);
  if(d.next){
    document.getElementById('vip-next').addEventListener('click',function(){
      try{localStorage.setItem(PREFIX+key,'1');}catch(e){}
      var el=document.getElementById('vip-backdrop');
      if(el){el.style.opacity='0';el.style.transition='opacity .18s ease';
        setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);navigateTo(d.next);},180);
      }else{navigateTo(d.next);}
    });
  }
  modal.addEventListener('click',function(e){if(e.target===modal)close();});
  function onKey(e){if(e.key==='Escape'){close();document.removeEventListener('keydown',onKey);}}
  document.addEventListener('keydown',onKey);
}

window.VantageIntro={show:show};
})();
