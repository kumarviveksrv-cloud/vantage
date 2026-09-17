/* VANTAGE V4 / CINEMATIC ENGINE */
(function(){
'use strict';
const $=(s,p=document)=>p.querySelector(s),$$=(s,p=document)=>[...p.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Scene HUD */
const hudMeter=$('#hudMeter'),sceneTag=$('#sceneTag'),root=document.documentElement;
const scenes=[['01','THE DECISION'],['02','DECISION FIELD'],['03','CONTEXT'],['04','ARIA'],['05','SYSTEM'],['06','HUMACITY'],['07','VANTAGE RECORD'],['08','THE DIFFERENCE'],['09','ACCESS'],['10','EXIT']];
const cinematicSections=$$('.meridian,.aria,.tools,.humacity,.record,.difference,.pricing,.final,.sim-room,.cta-moment');
function sceneProgress(){const y=scrollY+innerHeight*.5;let idx=0;cinematicSections.forEach((s,i)=>{if(y>=s.offsetTop)idx=i});const s=scenes[Math.min(idx,scenes.length-1)]||scenes[0];if(sceneTag)sceneTag.textContent=s[0]+' / '+s[1];if(hudMeter)hudMeter.style.width=Math.min(100,(y/(document.body.scrollHeight-innerHeight))*100)+'%'}
addEventListener('scroll',sceneProgress,{passive:true});addEventListener('resize',sceneProgress);sceneProgress();

/* Make headings breathe into view */
if(window.gsap&&!reduce&&window.ScrollTrigger){gsap.registerPlugin(ScrollTrigger);$$('h1,h2').forEach((el)=>{if(el.classList.contains('hero-title'))return;if(el.querySelector('.line.accent')){gsap.from(el,{opacity:0,y:24,duration:.9,scrollTrigger:{trigger:el,start:'top 85%',once:true}});return;}let raw=el.innerHTML.replace(/<br\s*\/?>/gi,' ').replace(/<em>/gi,'\u0001').replace(/<\/em>/gi,'\u0002').replace(/<[^>]+>/g,'');const words=raw.trim().split(/\s+/).filter(Boolean);el.innerHTML=words.map((w,i)=>{const html=w.replace(/\u0001/g,'<em>').replace(/\u0002/g,'</em>');return `<span class="kinetic-word"><span style="animation-delay:${i*35}ms">${html}</span></span>`}).join(' ');gsap.to(el.querySelectorAll('.kinetic-word span'),{y:0,opacity:1,stagger:.035,duration:.8,ease:'power4.out',scrollTrigger:{trigger:el,start:'top 86%',once:true}})});
$$('.cinematic-panel,.cinematic-portal').forEach((s,i)=>gsap.fromTo(s,{opacity:.78},{opacity:1,duration:.8,scrollTrigger:{trigger:s,start:'top 90%',end:'top 50%',scrub:true}}));
}

/* Floating film frames: visual fragments without pretending to be product screenshots */
function addFilmFrames(target){if(!target||innerWidth<700)return;const frag=document.createDocumentFragment();for(let i=1;i<=4;i++){const d=document.createElement('div');d.className='film-frame f'+i;d.setAttribute('aria-hidden','true');frag.appendChild(d)}target.appendChild(frag)}
addFilmFrames($('.hero'));addFilmFrames($('.aria'));addFilmFrames($('.humacity'));addFilmFrames($('.record'));addFilmFrames($('.meridian'));addFilmFrames($('.sim-room'));

/* 2D cinematic particle / light field */
const cv=$('#cinemaCanvas');
if(cv&&!reduce){const ctx=cv.getContext('2d',{alpha:true});let W=0,H=0,D=1,mx=0,my=0,t=0;
const N=Math.min(180,Math.floor(innerWidth/7));const pts=Array.from({length:N},(_,i)=>({x:Math.random(),y:Math.random(),z:.15+Math.random()*.85,s:Math.random()*1.6+.3,a:Math.random()*Math.PI*2,v:.0003+Math.random()*.0012}));
function resize(){D=Math.min(devicePixelRatio,1.5);W=innerWidth;H=innerHeight;cv.width=W*D;cv.height=H*D;ctx.setTransform(D,0,0,D,0,0)}
resize();addEventListener('resize',resize);addEventListener('pointermove',e=>{mx=(e.clientX/W-.5);my=(e.clientY/H-.5)},{passive:true});
function frame(){t+=.016;ctx.clearRect(0,0,W,H);const sy=scrollY/(document.body.scrollHeight-innerHeight||1);ctx.globalCompositeOperation='lighter';
for(let i=0;i<N;i++){const p=pts[i];p.a+=p.v;let x=(p.x-.5)*W*(.55+p.z*.8)+mx*45*p.z;let y=(p.y-.5)*H*(.55+p.z*.8)+my*35*p.z;const drift=Math.sin(t*.7+i)*18*p.z;x+=drift;y+=Math.cos(t*.5+i)*10*p.z;
const r=p.s*p.z*(1.2+Math.sin(t*1.5+i)*.25);ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=`rgba(${125+Math.floor(70*p.z)},${105+Math.floor(70*p.z)},${246},${.22+.33*p.z})`;ctx.fill();
if(i%9===0){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.sin(p.a)*90*p.z,y+Math.cos(p.a)*90*p.z);ctx.strokeStyle=`rgba(125,211,252,${.015+.035*p.z})`;ctx.stroke()}}
/* a horizontal scan that follows the page's progress */
const scan=((t*70)+(sy*H*2))%(H+120)-60;ctx.fillStyle='rgba(125,211,252,.018)';ctx.fillRect(0,scan,W,1);requestAnimationFrame(frame)}frame();}

/* WebGL scene: a more aggressive field than V3 */
/* WebGL scattered-star point cloud removed here — replaced by the
   fibonacci-sphere labeled-node network in vantage-star-globe.js,
   which now owns the #world canvas. Kept as a separate file (rather
   than folded into this one) since this was an explicit one-off
   experiment to try — easy to drop the <script> tag and fall back to
   nothing, or swap back to this exact block, if it doesn't land. */

/* Interactive decision field: alter the world state, not only the card */
const machine=$('#caseMachine');
if(machine&&!reduce){machine.addEventListener('pointermove',e=>{const q=machine.getBoundingClientRect(),x=e.clientX/q.width-.5,y=e.clientY/q.height-.5;machine.style.setProperty('--tiltX',`${y*-2}deg`);machine.style.setProperty('--tiltY',`${x*2}deg`)},{passive:true});machine.addEventListener('pointerleave',()=>{machine.style.setProperty('--tiltX','0deg');machine.style.setProperty('--tiltY','0deg')})}

/* Finance particles now travel toward the ₹ node */
const finance=$('#financeField');
if(finance&&!reduce&&window.gsap){for(let i=0;i<44;i++){const p=document.createElement('i');p.className='finance-particle';p.style.cssText=`position:absolute;width:${1+Math.random()*3}px;height:${1+Math.random()*3}px;border-radius:50%;left:${5+Math.random()*85}%;top:${8+Math.random()*84}%;background:rgba(196,181,253,${.2+Math.random()*.45});box-shadow:0 0 12px rgba(99,102,241,.45);pointer-events:none`;finance.appendChild(p);gsap.to(p,{x:(82-p.offsetLeft/finance.clientWidth*100)*4,y:(52-p.offsetTop/finance.clientHeight*100)*3,duration:2.5+Math.random()*4,repeat:-1,ease:'none',delay:-Math.random()*5})}}

/* Scroll-driven camera energy */
if(window.gsap&&!reduce&&window.ScrollTrigger){if(document.querySelector('.decision-stage')){gsap.to('.decision-stage',{rotationX:2,scrollTrigger:{trigger:'.decision-stage',start:'top bottom',end:'bottom top',scrub:true}});}gsap.to('.meridian-orbit',{rotation:6,scrollTrigger:{trigger:'.meridian',start:'top bottom',end:'bottom top',scrub:true}});gsap.to('.aria-room',{rotationY:-3,scrollTrigger:{trigger:'.aria',start:'top bottom',end:'bottom top',scrub:true}});gsap.to('.finance-field',{rotationY:2,scrollTrigger:{trigger:'.humacity',start:'top bottom',end:'bottom top',scrub:true}});gsap.to('.record-universe',{rotationZ:1.5,scrollTrigger:{trigger:'.record',start:'top bottom',end:'bottom top',scrub:true}})}

/* HUD fades on hoverable content */
if(!reduce){$$('a,button').forEach(el=>{el.addEventListener('pointerenter',()=>root.classList.add('interface-focus'));el.addEventListener('pointerleave',()=>root.classList.remove('interface-focus'))})}

/* Navigation */
$$('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const target=$(a.getAttribute('href'));if(!target)return;e.preventDefault();target.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'})}));
})();

/* VANTAGE V7 / INTELLIGENCE ENGINE */
(function(){
 'use strict';
 const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>[...p.querySelectorAll(s)];
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const body=document.body, stage=$('#decisionStage'), machine=$('#caseMachine');
 const rail={context:$('#intelContext'),signal:$('#intelSignal'),risk:$('#intelRisk'),memory:$('#intelMemory')};
 const field={process:$('#fieldProcess'),exposure:$('#fieldExposure'),impact:$('#fieldImpact'),def:$('#fieldDefensibility')};
 function setSystem(state){
   body.classList.remove('system-risk','system-partial','system-defensible','focus-state');
   if(state) body.classList.add('system-'+state);
 }
 function setRail(k,v){if(rail[k])rail[k].textContent=v}
 function focus(){body.classList.add('focus-state');clearTimeout(focus.t);focus.t=setTimeout(()=>body.classList.remove('focus-state'),1200)}
 $$('.node, .decision-core, .case-machine, .orbit-core, .finance-field, .record-core').forEach(el=>{el.addEventListener('pointerenter',focus,{passive:true})});
 // Hero intelligence quietly resolves while the visitor reads.
 const hero=$('.hero');
 if(hero&&!reduce){let start=performance.now();function settle(now){let p=Math.min(1,(now-start)/5200);const v=(7.4+p*1.8).toFixed(1);setRail('context',v);setRail('signal',p<.35?'LISTENING':p<.72?'WEIGHING':'READY');if(p<1)requestAnimationFrame(settle)}requestAnimationFrame(settle)}
 // Decision field follows the cursor, but with a sense of depth.
 if(stage&&!reduce){stage.addEventListener('pointermove',e=>{const r=stage.getBoundingClientRect(),x=e.clientX/r.width-.5,y=e.clientY/r.height-.5;stage.style.setProperty('--field-x',x);stage.style.setProperty('--field-y',y);$('.decision-core',stage).style.transform=`translate(calc(-50% + ${x*8}px),calc(-50% + ${y*8}px))`},{passive:true});stage.addEventListener('pointerleave',()=>{$('.decision-core',stage).style.transform='translate(-50%,-50%)'})}
 // Case choices propagate through the entire intelligence environment.
 const outcomes={
  A:{state:'risk',risk:'HIGH',signal:'EXPOSURE RISING',process:'WEAK',impact:'HIGH',def:'LOW',exposure:'₹18L–₹24L'},
  B:{state:'partial',risk:'MATERIAL',signal:'PROCESS OPEN',process:'PARTIAL',impact:'MODERATE',def:'MEDIUM',exposure:'₹4L–₹8L'},
  C:{state:'defensible',risk:'LOW',signal:'FIELD RESOLVED',process:'STRONG',impact:'LOW',def:'HIGH',exposure:'₹1L–₹3L'},
  D:{state:'risk',risk:'HIGH',signal:'PROCEDURAL RISK',process:'WEAK',impact:'HIGH',def:'LOW',exposure:'₹15L–₹20L'}
 };
 $$('#choices button').forEach(btn=>btn.addEventListener('click',()=>{
   const key=btn.dataset.choice,o=outcomes[key];
   if(stage){stage.dataset.state=o.state;$('.decision-state b',stage).textContent=o.signal}
   if(machine)machine.dataset.outcome=key;
   if(field.process)field.process.textContent=o.process;if(field.exposure)field.exposure.textContent=o.exposure;if(field.impact)field.impact.textContent=o.impact;if(field.def)field.def.textContent=o.def;
   setRail('risk',o.risk);setRail('signal',o.signal);setSystem(o.state);focus();
   document.documentElement.style.setProperty('--system-risk',o.state==='risk'?'.8':o.state==='partial'?'.35':'.05');
   document.documentElement.style.setProperty('--system-energy',o.state==='risk'?'.9':o.state==='defensible'?'.65':'.5');
 }));
 $('#caseReset')?.addEventListener('click',()=>{if(stage){stage.dataset.state='';$('.decision-state b',stage).textContent='AWAITING CHOICE'}if(machine)machine.dataset.outcome='';if(field.process)field.process.textContent='WAITING';if(field.exposure)field.exposure.textContent='—';if(field.impact)field.impact.textContent='—';if(field.def)field.def.textContent='—';setRail('risk','UNRESOLVED');setRail('signal','LISTENING');setSystem('');});
 // Meridian becomes a context lock sequence.
 const meridian=$('.meridian'),status=$('#meridianStatus');
 if(meridian){const labels=$$('.orbit-label',meridian);const observer=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){meridian.dataset.calibrated='true';setRail('context','RESOLVED');setRail('signal','PRECISION');setTimeout(()=>setRail('signal','READY'),900);observer.disconnect()}},{threshold:.35});observer.observe(meridian)}
 // ARIA changes the system mode.
 const aria=$('.aria');if(aria){const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){aria.dataset.mode='rehearsal';setRail('signal','REHEARSAL');setTimeout(()=>setRail('signal','GUIDANCE'),1100);io.disconnect()}},{threshold:.35});io.observe(aria)}
 // Humacity turns the same signal into financial language.
 const hum=$('.humacity');if(hum){const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){hum.dataset.mode='financial';setRail('signal','FINANCIAL MODEL');io.disconnect()}},{threshold:.3});io.observe(hum)}
 // Record is where all prior states become memory.
 const record=$('.record');if(record){const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){record.dataset.memory='active';setRail('memory','PERSISTENT');setTimeout(()=>setRail('memory','BUILDING'),700);io.disconnect()}},{threshold:.3});io.observe(record)}
 // HUD bottom readout evolves with the scene.
 const hudBottom=$('.hud-readout.bottom');
 if(hudBottom&&window.ScrollTrigger&&!reduce){ScrollTrigger.create({trigger:'.humacity',start:'top 70%',onEnter:()=>hudBottom.textContent='PEOPLE FINANCIAL INTELLIGENCE',onLeaveBack:()=>hudBottom.textContent='SYSTEM MEMORY / ACTIVE'});ScrollTrigger.create({trigger:'.meridian',start:'top 70%',onEnter:()=>hudBottom.textContent='CONTEXT / RESOLVING'});ScrollTrigger.create({trigger:'.aria',start:'top 70%',onEnter:()=>hudBottom.textContent='ARIA / REHEARSAL'});ScrollTrigger.create({trigger:'.humacity',start:'top 70%',onEnter:()=>hudBottom.textContent='HUMACITY / FINANCIAL MODEL'});ScrollTrigger.create({trigger:'.record',start:'top 70%',onEnter:()=>hudBottom.textContent='VANTAGE RECORD / MEMORY'});}
 // Make portal rings respond to system energy.
 if(!reduce){addEventListener('pointermove',e=>{document.documentElement.style.setProperty('--system-precision',String(Math.min(1,Math.abs(e.clientX/innerWidth-.5)*.8+.35)))},{passive:true})}
})();
