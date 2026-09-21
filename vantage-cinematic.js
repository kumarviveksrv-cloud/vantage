(function(){
'use strict';
const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>[...p.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- boot sequence ---------- */
const boot=$('#boot'), log=$('#bootLog'), nav=$('#nav');
const logs=['INITIALISING PRIVATE INTELLIGENCE LAYER','LOADING INDIA / HR CONTEXT','CONNECTING DECISION FIELD','MERIDIAN CONTEXT ENGINE READY','ARIA SIMULATION ENVIRONMENT READY','HUMACITY FINANCIAL LAYER READY','VANTAGE RECORD: PRIVATE / ACTIVE'];

/* Fix 5b: Boot uses a 2-hour localStorage TTL in addition to sessionStorage.
   Mobile browsers suspend (not kill) tabs — sessionStorage can persist across
   "closes". The TTL means returning within 2 hours skips the boot on ANY
   mobile reopen. After 2 hours, boot plays again as a fresh cinematic. */
function bootSeenRecently(){
  /* Only check localStorage TTL for paying users — non-paying users
     should see the boot on every new tab/session. */
  if(!localStorage.getItem('vantage_paid_user')) return false;
  try{var ts=localStorage.getItem('vantage_boot_ts');return !!(ts&&(Date.now()-parseInt(ts,10))<2*3600000);}catch(e){return false;}
}
function markBootSeen(){
  try{
    sessionStorage.setItem('vantage_boot_seen','1');
    /* Only persist the 2-hour skip in localStorage for paying users.
       Non-paying users get sessionStorage only — boot replays every close/reopen. */
    if(localStorage.getItem('vantage_paid_user')){
      localStorage.setItem('vantage_boot_ts',Date.now().toString());
    }
  }catch(e){}
}

if(sessionStorage.getItem('vantage_boot_seen')||bootSeenRecently()){
  /* Skip — seen this session or within last 2 hours */
  if(boot){boot.classList.add('done');}
  if(nav){nav.classList.add('ready');}
}else{
  /* First visit or 2+ hours since last boot — run full cinematic */
  let li=0; const logTimer=setInterval(()=>{if(li<logs.length){log.insertAdjacentHTML('beforeend','<div>\u203a '+logs[li++]+'</div>');}else clearInterval(logTimer)},260);
  setTimeout(()=>{
    boot.classList.add('done');nav.classList.add('ready');
    markBootSeen();
  },5000);
}

/* ---------- live clock ---------- */
function clock(){const d=new Date();const t=[d.getHours(),d.getMinutes(),d.getSeconds()].map(x=>String(x).padStart(2,'0')).join(':');const el=$('#liveClock');if(el)el.textContent=t;const bt=$('#bootTime');if(bt)bt.textContent=t.slice(0,5)}
clock();setInterval(clock,1000);

/* ---------- smooth scroll ---------- */
let lenis=null;
if(!reduce && window.Lenis){lenis=new Lenis({duration:1.15,smoothWheel:true,wheelMultiplier:.9});function raf(t){lenis.raf(t);requestAnimationFrame(raf)}requestAnimationFrame(raf)}
if(window.gsap && window.ScrollTrigger){gsap.registerPlugin(ScrollTrigger);if(lenis)lenis.on('scroll',ScrollTrigger.update);}

/* ---------- cursor / magnetic ---------- */
const orb=$('.cursor-orb');
if(orb && innerWidth>900 && !reduce){addEventListener('pointermove',e=>{orb.style.left=e.clientX+'px';orb.style.top=e.clientY+'px'});$$('.magnetic').forEach(el=>{el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();const x=(e.clientX-r.left-r.width/2)*.12,y=(e.clientY-r.top-r.height/2)*.12;el.style.transform=`translate(${x}px,${y}px)`});el.addEventListener('pointerleave',()=>el.style.transform='')})}

/* ---------- reveal choreography ---------- */
if(window.gsap && window.ScrollTrigger && !reduce){$$('.decision-head,.case-intro,.case-machine,.section-head,.meridian-copy,.aria-copy,.humacity-copy,.record-head,.difference-grid,.pricing-head,.price-card').forEach(el=>gsap.from(el,{y:45,opacity:0,duration:1,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 82%',once:true}}));
 gsap.to('.hero-copy',{y:-80,opacity:.35,scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true}});
 gsap.to('.hero-field',{scale:1.35,rotation:15,scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true}});
 
}

/* ---------- decision field ---------- */
const stage=$('#decisionStage');
if(stage&&!reduce){stage.addEventListener('pointermove',e=>{const r=stage.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;$$('.node',stage).forEach((n,i)=>n.style.transform=`translate(${x*(i%2?12:-12)}px,${y*(i%2?8:-8)}px)`);$('.decision-core',stage).style.transform=`translate(calc(-50% + ${x*10}px),calc(-50% + ${y*10}px))`});stage.addEventListener('pointerleave',()=>{$$('.node',stage).forEach(n=>n.style.transform='');$('.decision-core',stage).style.transform='translate(-50%,-50%)'})}

/* ---------- case navigator ---------- */
const outcomes={A:{badge:'HIGH RISK',title:'Fast closure. Expensive tail.',copy:'Immediate termination without a documented process leaves a large gap between what happened and what you can defend.',exposure:'₹18L–₹24L',impact:'HIGH',process:'WEAK'},B:{badge:'PARTIAL',title:'Better. Still incomplete.',copy:'A written warning creates a record, but the absence of a fuller process can still leave material exposure.',exposure:'₹4L–₹8L',impact:'MODERATE',process:'PARTIAL'},C:{badge:'DEFENSIBLE',title:'Process becomes your protection.',copy:'A domestic enquiry gives the organisation a structured route to establish facts before deciding the outcome.',exposure:'₹1L–₹3L',impact:'LOW',process:'STRONG'},D:{badge:'HIGH RISK',title:'A shortcut with a trapdoor.',copy:'Treating absence as voluntary abandonment without the required process can create a second problem while solving the first.',exposure:'₹15L–₹20L',impact:'HIGH',process:'WEAK'}};
const result=$('#caseResult'),badge=$('#resultBadge'),title=$('#resultTitle'),copy=$('#resultCopy'),exposure=$('#resultExposure'),impact=$('#resultImpact'),process=$('#resultProcess');
$$('#choices button').forEach(btn=>btn.addEventListener('click',()=>{const o=outcomes[btn.dataset.choice];$$('#choices button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');badge.textContent=o.badge;title.textContent=o.title;copy.textContent=o.copy;exposure.textContent=o.exposure;impact.textContent=o.impact;process.textContent=o.process;result.classList.add('live');if(window.gsap)gsap.from(result,{y:15,opacity:0,duration:.45})}));
$('#caseReset')?.addEventListener('click',()=>{$$('#choices button').forEach(b=>b.classList.remove('active'));result.classList.remove('live');badge.textContent='AWAITING DECISION';title.textContent='The system is waiting.';copy.textContent='Choose a path. Vantage will show you what sits underneath it.';exposure.textContent='—';impact.textContent='—';process.textContent='—'});

/* ---------- meridian calibration ---------- */
const status=$('#meridianStatus'), bars=$$('.readout-line i');
const states=['READING STATE','READING INDUSTRY','READING ORG TYPE','READING ORG SIZE','READING SENIORITY','READING UNION ENVIRONMENT','READING FUNCTION','PRECISION ADVICE READY'];
let meridianStarted=false;
function runMeridian(){if(meridianStarted)return;meridianStarted=true;let i=0;const timer=setInterval(()=>{if(i<states.length){status.textContent=states[i];if(bars[i])bars[i].classList.add('on');i++;}else{clearInterval(timer);status.textContent='PRECISION ADVICE READY';$$('.orbit-label').forEach((x,j)=>setTimeout(()=>x.classList.add('lit'),j*100))}},360)}
const mo=$('#meridianOrbit');if(mo){const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){runMeridian();io.disconnect()}},{threshold:.35});io.observe(mo)}

/* ---------- ARIA dialogue ---------- */
const typing=$('#ariaTyping');if(typing&&!reduce){const phrase='“Let’s look at the cleanest way to get there.”';let idx=0;const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){typing.firstChild.textContent='';const timer=setInterval(()=>{if(idx<phrase.length)typing.firstChild.textContent+=phrase[idx++];else clearInterval(timer)},42);io.disconnect()}},{threshold:.4});io.observe(typing)}

/* ---------- tool hover light ---------- */
$$('.tool-tile').forEach(tile=>tile.addEventListener('pointermove',e=>{const r=tile.getBoundingClientRect();tile.style.setProperty('--mx',((e.clientX-r.left)/r.width*100)+'%');tile.style.setProperty('--my',((e.clientY-r.top)/r.height*100)+'%')}));

/* ---------- finance particles ---------- */
const finance=$('#financeField');
if(finance&&!reduce){for(let i=0;i<26;i++){const p=document.createElement('span');p.style.cssText=`position:absolute;width:${2+Math.random()*3}px;height:${2+Math.random()*3}px;border-radius:50%;background:rgba(196,181,253,${.18+Math.random()*.4});left:${5+Math.random()*90}%;top:${8+Math.random()*84}%;filter:blur(.2px);box-shadow:0 0 10px rgba(99,102,241,.5)`;finance.appendChild(p);gsap.to(p,{x:(Math.random()-.5)*120,y:(Math.random()-.5)*100,duration:3+Math.random()*5,repeat:-1,yoyo:true,ease:'sine.inOut',delay:-Math.random()*4})}}

/* ---------- record constellation ---------- */
const record=$('#recordUniverse');if(record&&!reduce){record.addEventListener('pointermove',e=>{const r=record.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;record.querySelectorAll('.record-point').forEach((p,i)=>p.style.transform=`translate(${x*(i%2?15:-10)}px,${y*(i%2?10:-8)}px)`)});record.addEventListener('pointerleave',()=>record.querySelectorAll('.record-point').forEach(p=>p.style.transform=''))}

/* ---------- Three.js ambient world ----------
   Disabled in the V4 bundle: vantage-cinematic-v4.js creates its own,
   more elaborate WebGLRenderer targeting this same #world canvas. Running
   both meant two independent Three.js scenes and render loops fighting
   over a single canvas element — wasted GPU cost at best, a flickering,
   undefined visual result at worst. V4's field fully supersedes this one. */

/* ---------- navigation / anchor safety ---------- */
$$('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const target=$(a.getAttribute('href'));if(target){e.preventDefault();if(lenis)lenis.scrollTo(target,{offset:-70});else target.scrollIntoView({behavior:'smooth'})}}));
})();
