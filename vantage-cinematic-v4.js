/* VANTAGE V4 / CINEMATIC ENGINE */
(function(){
'use strict';
const $=(s,p=document)=>p.querySelector(s),$$=(s,p=document)=>[...p.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Scene HUD */
const hudMeter=$('#hudMeter'),sceneTag=$('#sceneTag'),root=document.documentElement;
const scenes=[['01','THE DECISION'],['02','DECISION FIELD'],['03','CONTEXT'],['04','ARIA'],['05','SYSTEM'],['06','HUMACITY'],['07','VANTAGE RECORD'],['08','THE DIFFERENCE'],['09','ACCESS'],['10','EXIT']];
const cinematicSections=$$('.decision,.case,.meridian,.aria,.tools,.humacity,.record,.difference,.pricing,.final');
function sceneProgress(){const y=scrollY+innerHeight*.5;let idx=0;cinematicSections.forEach((s,i)=>{if(y>=s.offsetTop)idx=i});const s=scenes[Math.min(idx,scenes.length-1)]||scenes[0];if(sceneTag)sceneTag.textContent=s[0]+' / '+s[1];if(hudMeter)hudMeter.style.width=Math.min(100,(y/(document.body.scrollHeight-innerHeight))*100)+'%'}
addEventListener('scroll',sceneProgress,{passive:true});addEventListener('resize',sceneProgress);sceneProgress();

/* Make headings breathe into view */
if(window.gsap&&!reduce&&window.ScrollTrigger){gsap.registerPlugin(ScrollTrigger);$$('h1,h2').forEach((el)=>{if(el.classList.contains('hero-title'))return;let raw=el.innerHTML.replace(/<br\s*\/?>/gi,' ').replace(/<em>/gi,'\u0001').replace(/<\/em>/gi,'\u0002').replace(/<[^>]+>/g,'');const words=raw.trim().split(/\s+/).filter(Boolean);el.innerHTML=words.map((w,i)=>{const html=w.replace(/\u0001/g,'<em>').replace(/\u0002/g,'</em>');return `<span class="kinetic-word"><span style="animation-delay:${i*35}ms">${html}</span></span>`}).join(' ');gsap.to(el.querySelectorAll('.kinetic-word span'),{y:0,opacity:1,stagger:.035,duration:.8,ease:'power4.out',scrollTrigger:{trigger:el,start:'top 86%',once:true}})});
$$('.cinematic-panel,.cinematic-portal').forEach((s,i)=>gsap.fromTo(s,{opacity:.78},{opacity:1,duration:.8,scrollTrigger:{trigger:s,start:'top 90%',end:'top 50%',scrub:true}}));
}

/* Floating film frames: visual fragments without pretending to be product screenshots */
function addFilmFrames(target){if(!target||innerWidth<700)return;const frag=document.createDocumentFragment();for(let i=1;i<=4;i++){const d=document.createElement('div');d.className='film-frame f'+i;d.setAttribute('aria-hidden','true');frag.appendChild(d)}target.appendChild(frag)}
addFilmFrames($('.hero'));addFilmFrames($('.aria'));addFilmFrames($('.humacity'));

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
const world=$('#world');
if(world&&window.THREE&&!reduce){
const r=new THREE.WebGLRenderer({canvas:world,alpha:true,antialias:true,powerPreference:'high-performance'});r.setPixelRatio(Math.min(devicePixelRatio,1.7));r.setSize(innerWidth,innerHeight);r.setClearColor(0,0);
const s=new THREE.Scene(),c=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,100);c.position.z=7.5;
const group=new THREE.Group();s.add(group);
const count=Math.min(2200,Math.floor(innerWidth*innerHeight/480));const g=new THREE.BufferGeometry(),pos=new Float32Array(count*3),col=new Float32Array(count*3),size=new Float32Array(count);
for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,rad=2.4+Math.pow(Math.random(),.55)*8.5,yy=(Math.random()-.5)*5.8;pos[i*3]=Math.cos(a)*rad;pos[i*3+1]=yy;pos[i*3+2]=Math.sin(a)*rad;const hue=Math.random()>.78?.53:.7+Math.random()*.08;const cc=new THREE.Color().setHSL(hue,.65,.45+.35*Math.random());col[i*3]=cc.r;col[i*3+1]=cc.g;col[i*3+2]=cc.b;size[i]=Math.random()*1.4+.4}
g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));g.setAttribute('aSize',new THREE.BufferAttribute(size,1));
const m=new THREE.PointsMaterial({size:.026,transparent:true,opacity:.62,vertexColors:true,blending:THREE.AdditiveBlending,depthWrite:false});const p=new THREE.Points(g,m);group.add(p);
const torus=new THREE.Mesh(new THREE.TorusGeometry(1.8,.006,12,160),new THREE.MeshBasicMaterial({color:0x8b5cf6,transparent:true,opacity:.24,blending:THREE.AdditiveBlending}));torus.rotation.x=Math.PI/2.3;group.add(torus);
const torus2=torus.clone();torus2.scale.setScalar(1.8);torus2.material=torus.material.clone();torus2.material.opacity=.12;group.add(torus2);
let tx=0,ty=0,sx=0;addEventListener('pointermove',e=>{tx=(e.clientX/innerWidth-.5);ty=(e.clientY/innerHeight-.5)},{passive:true});addEventListener('scroll',()=>sx=scrollY*.0001,{passive:true});
function resize(){r.setSize(innerWidth,innerHeight);c.aspect=innerWidth/innerHeight;c.updateProjectionMatrix()}addEventListener('resize',resize);
function tick(ms){const q=ms*.001;p.rotation.y=q*.035+tx*.18;p.rotation.x=Math.sin(q*.12)*.035+ty*.08;group.rotation.z=Math.sin(q*.07)*.025;torus.rotation.z=q*.12;torus2.rotation.z=-q*.08;c.position.x+=(tx*.8-c.position.x)*.02;c.position.y+=(-ty*.45-c.position.y)*.02;c.position.z=7.5-sx;r.render(s,c);requestAnimationFrame(tick)}requestAnimationFrame(tick);
}

/* Interactive decision field: alter the world state, not only the card */
const machine=$('#caseMachine');
if(machine&&!reduce){machine.addEventListener('pointermove',e=>{const q=machine.getBoundingClientRect(),x=e.clientX/q.width-.5,y=e.clientY/q.height-.5;machine.style.setProperty('--tiltX',`${y*-2}deg`);machine.style.setProperty('--tiltY',`${x*2}deg`)},{passive:true});machine.addEventListener('pointerleave',()=>{machine.style.setProperty('--tiltX','0deg');machine.style.setProperty('--tiltY','0deg')})}

/* Finance particles now travel toward the ₹ node */
const finance=$('#financeField');
if(finance&&!reduce&&window.gsap){for(let i=0;i<44;i++){const p=document.createElement('i');p.className='finance-particle';p.style.cssText=`position:absolute;width:${1+Math.random()*3}px;height:${1+Math.random()*3}px;border-radius:50%;left:${5+Math.random()*85}%;top:${8+Math.random()*84}%;background:rgba(196,181,253,${.2+Math.random()*.45});box-shadow:0 0 12px rgba(99,102,241,.45);pointer-events:none`;finance.appendChild(p);gsap.to(p,{x:(82-p.offsetLeft/finance.clientWidth*100)*4,y:(52-p.offsetTop/finance.clientHeight*100)*3,duration:2.5+Math.random()*4,repeat:-1,ease:'none',delay:-Math.random()*5})}}

/* Scroll-driven camera energy */
if(window.gsap&&!reduce&&window.ScrollTrigger){gsap.to('.decision-stage',{rotationX:2,scrollTrigger:{trigger:'.decision',start:'top bottom',end:'bottom top',scrub:true}});gsap.to('.meridian-orbit',{rotation:6,scrollTrigger:{trigger:'.meridian',start:'top bottom',end:'bottom top',scrub:true}});gsap.to('.aria-room',{rotationY:-3,scrollTrigger:{trigger:'.aria',start:'top bottom',end:'bottom top',scrub:true}});gsap.to('.finance-field',{rotationY:2,scrollTrigger:{trigger:'.humacity',start:'top bottom',end:'bottom top',scrub:true}});gsap.to('.record-universe',{rotationZ:1.5,scrollTrigger:{trigger:'.record',start:'top bottom',end:'bottom top',scrub:true}})}

/* HUD fades on hoverable content */
if(!reduce){$$('a,button').forEach(el=>{el.addEventListener('pointerenter',()=>root.classList.add('interface-focus'));el.addEventListener('pointerleave',()=>root.classList.remove('interface-focus'))})}

/* Navigation */
$$('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const target=$(a.getAttribute('href'));if(!target)return;e.preventDefault();target.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'})}));
})();


/* ============================================================
   VANTAGE V5 / INTELLIGENCE CONSOLE
   Additive layer. Existing corrected V4 engines remain intact.
   ============================================================ */
(function(){
  'use strict';
  const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>[...p.querySelectorAll(s)];
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

  const consoleRoot=$('#live-console');
  const shell=$('#consoleShell');
  const time=$('#consoleTime');
  const confidence=$('#consoleConfidence');
  const coreStatus=$('#coreStatus');
  const coreSub=$('#coreSub');
  const money=$('#consoleMoney');
  const vectorTitle=$('#vectorTitle');
  const vectorExposure=$('#vectorExposure');
  const vectorProcess=$('#vectorProcess');
  const vectorVelocity=$('#vectorVelocity');

  const states={
    baseline:{confidence:'72.4%',status:'READING CASE',sub:'CONTEXT INCOMPLETE',money:'₹18.4L',title:'PROCESS BEFORE OUTCOME',exposure:'₹18L–₹24L',process:'WEAK',velocity:'HIGH'},
    warning:{confidence:'86.8%',status:'CONTEXT UPDATED',sub:'DOCUMENTATION ATTACHED',money:'₹8.2L',title:'CREATE THE RECORD FIRST',exposure:'₹4L–₹8L',process:'PARTIAL',velocity:'MEDIUM'},
    union:{confidence:'93.1%',status:'ENVIRONMENT CHANGED',sub:'COLLECTIVE CONTEXT ACTIVE',money:'₹6.7L',title:'PROCESS BECOMES THE DECISION',exposure:'₹1L–₹4L',process:'STRONG',velocity:'LOW'},
    closure:{confidence:'79.6%',status:'PRESSURE SIGNAL DETECTED',sub:'OUTCOME VS. PROCESS',money:'₹12.6L',title:'SEPARATE URGENCY FROM RISK',exposure:'₹8L–₹16L',process:'PARTIAL',velocity:'HIGH'}
  };

  function updateConsole(key){
    const s=states[key]||states.baseline;
    if(consoleRoot)consoleRoot.classList.add('is-thinking');
    [confidence,coreStatus,coreSub,money,vectorTitle,vectorExposure,vectorProcess,vectorVelocity].forEach(el=>{if(el)el.style.opacity='.25'});
    setTimeout(()=>{
      if(confidence)confidence.textContent='CONFIDENCE '+s.confidence;
      if(coreStatus)coreStatus.textContent=s.status;
      if(coreSub)coreSub.textContent=s.sub;
      if(money)money.textContent=s.money;
      if(vectorTitle)vectorTitle.textContent=s.title;
      if(vectorExposure)vectorExposure.textContent=s.exposure;
      if(vectorProcess)vectorProcess.textContent=s.process;
      if(vectorVelocity)vectorVelocity.textContent=s.velocity;
      [confidence,coreStatus,coreSub,money,vectorTitle,vectorExposure,vectorProcess,vectorVelocity].forEach(el=>{if(el)el.style.opacity='1'});
      if(consoleRoot)consoleRoot.classList.remove('is-thinking');
    },reduce?0:280);
  }

  $$('.console-control').forEach(btn=>btn.addEventListener('click',()=>{
    $$('.console-control').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    updateConsole(btn.dataset.state);
  }));

  $$('.console-module').forEach(mod=>mod.addEventListener('click',()=>{
    $$('.console-module').forEach(m=>m.classList.remove('active'));
    mod.classList.add('active');
  }));

  function tick(){
    if(time){
      const d=new Date();
      time.textContent=[d.getHours(),d.getMinutes(),d.getSeconds()].map(v=>String(v).padStart(2,'0')).join(':');
    }
  }
  tick();setInterval(tick,1000);

  if(shell && !reduce && innerWidth>800){
    shell.addEventListener('pointermove',e=>{
      const r=shell.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-.5;
      const y=(e.clientY-r.top)/r.height-.5;
      shell.style.transform=`perspective(1800px) rotateX(${y*-1.4}deg) rotateY(${x*1.7}deg)`;
      $$('.telemetry-card',shell).forEach((card,i)=>{
        card.style.transform=`translate(${x*(i%2?10:-10)}px,${y*(i%2?8:-8)}px)`;
      });
    });
    shell.addEventListener('pointerleave',()=>{
      shell.style.transform='';
      $$('.telemetry-card',shell).forEach(card=>card.style.transform='');
    });
  }

  if(window.gsap && window.ScrollTrigger && !reduce){
    gsap.from('.v5-console .console-shell',{
      y:70,opacity:0,duration:1.2,ease:'power4.out',
      scrollTrigger:{trigger:'.v5-console',start:'top 75%',once:true}
    });
    gsap.from('.v5-console .telemetry-card',{
      scale:.8,opacity:0,stagger:.1,duration:.8,ease:'back.out(1.6)',
      scrollTrigger:{trigger:'.v5-console',start:'top 65%',once:true}
    });
    gsap.to('.v5-console .console-radar',{
      rotation:18,
      scrollTrigger:{trigger:'.v5-console',start:'top bottom',end:'bottom top',scrub:true}
    });
  }
})();
