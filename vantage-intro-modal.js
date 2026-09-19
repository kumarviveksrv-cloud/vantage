/* vantage-intro-modal.js
   Premium intro modals for Vantage features.
   Shows once per device (localStorage). "?" button re-triggers on demand.
   Usage: called automatically by sidebar-shared.js per-page detection.
   Manual: VantageIntro.show('aria');
*/
(function(){
'use strict';

var MODALS = {
  'aria': {
    icon: '◈',
    name: 'ARIA',
    tagline: 'Your private HR intelligence, on call at 9pm.',
    what: 'ARIA is a context-aware intelligence layer built on your organisation\'s exact reality — your state, your policies, your case history. Not a chatbot. Not a generic AI trained on someone else\'s problems.',
    does: 'She reads your situation, asks the right questions back, and gives you advice calibrated to your reality — the kind that would survive a boardroom challenge.',
    start: 'Tell ARIA what\'s happening right now. The more specific you are — role, stakes, what\'s been tried — the more precise the advice.'
  },
  'debrief': {
    icon: '◉',
    name: 'The Debrief',
    tagline: 'Every decision you made, finally on record.',
    what: 'Your professional intelligence log. Every case closed, every difficult conversation navigated, every policy call made — documented, searchable, and owned by you.',
    does: 'Builds your Vantage Record over time. Every entry compounds: the next case is easier, your career capital grows, and your judgment becomes something you can prove.',
    start: 'Log your most recent decision. What was the situation, what did you decide, and what happened next. That\'s the first entry.'
  },
  'ledger': {
    icon: '₹',
    name: 'The Ledger',
    tagline: 'The financial language HR never had.',
    what: 'A running ledger of the people decisions you\'ve made, translated into rupee-value terms — costs avoided, exposure managed, and value created for the business.',
    does: 'Gives you the numbers to walk into any boardroom conversation with evidence instead of instinct. HR has always done financial work. Now you can show it.',
    start: 'Add your first case — select the type, describe what happened, and let Vantage calculate the financial position it represents.'
  },
  'humac': {
    icon: '⬡',
    name: 'Humac Score',
    tagline: 'One number that speaks the CFO\'s language.',
    what: 'The Humac Score synthesises five forces — Value Ledger, Talent Premium, Org Vitals, Human P&L, and Net Human Worth — into a single index that quantifies HR\'s financial contribution to the organisation.',
    does: 'Gives leadership a number they can read, track, and benchmark against. Not a feeling. Not a survey. A calculation that survives cross-examination.',
    start: 'Complete the onboarding below to build your baseline score. It takes about 10 minutes and unlocks your full Humacity profile.'
  },
  'case-navigator': {
    icon: '⊞',
    name: 'The Stakes',
    tagline: 'Five real cases. Every decision has a consequence.',
    what: 'An interactive decision simulator built around five real HR case types — Termination, POSH, Restructuring, Performance/PIP, and Wage Compliance. Each with four paths. Each with a real cost.',
    does: 'Shows you exactly what each decision costs, legally and financially, before you make it in the real world. Built for practice. Built for proof.',
    start: 'Choose a case type, open the first room, and pick a path. PACT calculates the exposure. Your decision, your consequences.'
  },
  'policy-compass': {
    icon: '⊕',
    name: 'Policy Compass',
    tagline: 'The policy that fits your exact situation — not a template.',
    what: 'A policy generation and analysis engine calibrated to your state, industry, and organisation type. Built on India\'s actual legal framework, not generic HR boilerplate.',
    does: 'Drafts defensible policies grounded in the regulations that actually apply to you — jurisdiction-specific, role-aware, and legally grounded.',
    start: 'Select your state, describe the policy gap you need to fill, and let Policy Compass build the framework from the ground up.'
  },
  'hr-storyteller': {
    icon: '◎',
    name: 'HR Data Storyteller',
    tagline: 'Turn your numbers into a CFO-ready narrative.',
    what: 'A signal analysis tool that takes your HR metrics and builds a financial argument your leadership cannot dismiss. Attrition, engagement, headcount, cost-per-hire — all translated into board language.',
    does: 'Converts raw HR data into narrative with rupee-value anchors and business linkage. The same numbers your CFO sees, told in the story that actually moves decisions.',
    start: 'Enter your key HR metrics, choose your audience — CEO, CFO, Board — and describe the outcome you\'re driving toward. SIGNAL does the rest.'
  },
  'offer-intelligence': {
    icon: '◇',
    name: 'Offer Intelligence',
    tagline: 'Know exactly what an offer is worth — and what it costs to say no.',
    what: 'An offer analysis engine that models the full financial cost of a hiring or counter-offer decision — market positioning, replacement cost, ramp time, flight risk, and timeline.',
    does: 'Gives you the number you need to defend or challenge any offer in the room. The answer before the question gets asked.',
    start: 'Enter the candidate\'s current CTC, the offer on the table, and the role details. Offer Intelligence models the full position in both directions.'
  },
  'stakeholder-influence': {
    icon: '◬',
    name: 'Stakeholder Influence',
    tagline: 'Know how to say it before you say it.',
    what: 'A communication intelligence tool that models how different stakeholders — CEOs, CFOs, line managers, boards — receive the same information differently, and what framing actually moves them.',
    does: 'Same facts. Right framing. Helps you position every people decision in the language that lands with the specific person you\'re talking to.',
    start: 'Choose your stakeholder, describe the decision you need to communicate, and specify the outcome you\'re driving. INFLUENCE maps the path.'
  },
  'conversation-simulator': {
    icon: '◈',
    name: 'Conversation Simulator',
    tagline: 'Rehearse the conversation before it matters.',
    what: 'A real-time simulation environment for the conversations HR professionals dread most — performance discussions, terminations, disciplinary hearings, leadership alignment calls.',
    does: 'A safe space to test your approach, anticipate pushback, and walk into the real conversation already knowing what\'s coming. ARIA plays the other person and holds nothing back.',
    start: 'Choose the conversation type, set the context — role, stakes, what you\'re trying to achieve — and start. Treat it like the real thing.'
  },
  'case-library': {
    icon: '▦',
    name: 'Case Library',
    tagline: 'Every precedent you\'ve ever needed, in one place.',
    what: 'A curated library of HR case precedents — documented decision patterns, outcome analysis, and legal grounding across all major case types and jurisdictions in India.',
    does: 'Gives you the reference point to defend any decision before it gets challenged, and anticipate any objection before it gets raised.',
    start: 'Search by case type, outcome, or keyword — or browse the featured cases to see what others have navigated and how it resolved.'
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
.vip-cta{width:100%;padding:13px 24px;background:linear-gradient(135deg,#6366f1,#7c3aed);border:none;border-radius:10px;cursor:pointer;font-family:'Plus Jakarta Sans','DM Sans',sans-serif;font-size:13px;font-weight:700;color:#fff;letter-spacing:.01em;transition:opacity .18s}
.vip-cta:hover{opacity:.88}
#vip-trigger{position:fixed;bottom:26px;right:26px;width:34px;height:34px;border-radius:50%;background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.22);color:rgba(167,139,250,.55);font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;z-index:9000;font-family:'JetBrains Mono',monospace;line-height:1}
#vip-trigger:hover{background:rgba(99,102,241,.2);border-color:rgba(99,102,241,.48);color:#c4b5fd}
@media(max-width:600px){#vip-modal{padding:26px 20px 22px}#vip-trigger{bottom:72px}}
  `;
  document.head.appendChild(s);
}

function build(key){
  var d=MODALS[key];if(!d)return null;
  var el=document.createElement('div');el.id='vip-backdrop';
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
    '<button class="vip-cta" id="vip-got-it">Got it, let\'s go \u2192</button>'+
  '</div>';
  return el;
}

function dismiss(key){
  var el=document.getElementById('vip-backdrop');
  if(el){el.style.opacity='0';el.style.transition='opacity .18s ease';setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},200);}
  try{localStorage.setItem(PREFIX+key,'1');}catch(e){}
  setTimeout(function(){injectTrigger(key);},220);
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
  // Remove old trigger before re-showing
  var oldTrigger=document.getElementById('vip-trigger');
  if(oldTrigger&&oldTrigger.parentNode)oldTrigger.parentNode.removeChild(oldTrigger);

  injectCSS();
  var modal=build(key);
  document.body.appendChild(modal);

  function close(){dismiss(key);}
  document.getElementById('vip-close').addEventListener('click',close);
  document.getElementById('vip-got-it').addEventListener('click',close);
  modal.addEventListener('click',function(e){if(e.target===modal)close();});
  function onKey(e){if(e.key==='Escape'){close();document.removeEventListener('keydown',onKey);}}
  document.addEventListener('keydown',onKey);
}

window.VantageIntro={show:show};
})();
