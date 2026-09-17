/* VANTAGE // CURTAIN RAISER v6
   Session key: vantage_q_v6
   Fixes: ta-da only on real prologue end (not skip/refresh)
   New: Demo button question intercept + persistent Questions modal
*/
(function(){
  'use strict';

  const Q_KEY = 'vantage_q_v6';
  const DELAY = 7000;

  // ── Fibonacci hero globe ────────────────────────────────────────────────
  (function initGlobe(){
    const canvas = document.getElementById('heroGlobe');
    if(!canvas || typeof THREE === 'undefined') return;
    const section = canvas.closest('.hero');
    if(!section) return;
    let W = section.offsetWidth||innerWidth, H = section.offsetHeight||innerHeight;
    const rdr = new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    rdr.setSize(W,H); rdr.setPixelRatio(Math.min(devicePixelRatio,1.5)); rdr.setClearColor(0,0);
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(42,W/H,0.1,100); cam.position.z=5.5;
    const grp = new THREE.Group(); scene.add(grp);
    const N=260,ga=Math.PI*(3-Math.sqrt(5)),pts=[],pv=[];
    for(let i=0;i<N;i++){
      const t=ga*i,p=Math.acos(1-2*(i+.5)/N);
      const x=Math.sin(p)*Math.cos(t)*2.2,y=Math.sin(p)*Math.sin(t)*2.2,z=Math.cos(p)*2.2;
      pts.push(x,y,z); pv.push(new THREE.Vector3(x,y,z));
    }
    const ng=new THREE.BufferGeometry(); ng.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
    grp.add(new THREE.Points(ng,new THREE.PointsMaterial({size:.04,color:0xc4b5fd,transparent:true,opacity:.65,blending:THREE.AdditiveBlending,depthWrite:false})));
    const lp=[];
    for(let i=0;i<N;i++) for(let j=i+1;j<N;j++) if(pv[i].distanceTo(pv[j])<.72) lp.push(pv[i].x,pv[i].y,pv[i].z,pv[j].x,pv[j].y,pv[j].z);
    const lg=new THREE.BufferGeometry(); lg.setAttribute('position',new THREE.Float32BufferAttribute(lp,3));
    grp.add(new THREE.LineSegments(lg,new THREE.LineBasicMaterial({color:0x6366f1,transparent:true,opacity:.14,blending:THREE.AdditiveBlending})));
    let mx=0,my=0,vis=true,last=0;
    window.addEventListener('pointermove',e=>{mx=(e.clientX/innerWidth-.5);my=(e.clientY/innerHeight-.5);},{passive:true});
    new IntersectionObserver(e=>{vis=e[0].isIntersecting;},{threshold:.01}).observe(section);
    (function tick(now){requestAnimationFrame(tick);if(!vis||now-last<33)return;last=now;grp.rotation.y+=.0018+mx*.001;grp.rotation.x+=.0004+my*.0005;rdr.render(scene,cam);})(0);
    window.addEventListener('resize',()=>{W=section.offsetWidth;H=section.offsetHeight;rdr.setSize(W,H);cam.aspect=W/H;cam.updateProjectionMatrix();},{passive:true});
  })();

  // ── Question data ───────────────────────────────────────────────────────
  const CARDS = [
    { trigger:'.humacity.cinematic-panel', pre:'A question for you', q:'Do you know the rupee value of the work you did last quarter?', sub:'Not headcount. Not engagement scores. The actual financial contribution HR made to the business.' },
    { trigger:'.record.cinematic-panel',   pre:'Before you scroll',  q:'When you leave this organisation — what do you take with you?', sub:'Every decision navigated. Every case closed. Every difficult conversation held. Is any of it saved anywhere?' },
    { trigger:'.meridian.cinematic-panel', pre:'A question for you', q:'The intelligence you\'re using right now — does it actually know your reality?', sub:'Or is it answering someone else\'s question, dressed up to look like yours?' },
    { trigger:'.aria.cinematic-panel',     pre:'One last question',  q:'What would you do if you had a brilliant HR colleague available at 9pm tonight?', sub:'Not a chatbot. Someone who knows your context, your policies, your history — and asks the right questions back.' },
  ];

  // ── Shared overlay builder ──────────────────────────────────────────────
  const ov = document.createElement('div');
  ov.id = 'q-overlay';
  ov.innerHTML = `<canvas id="q-canvas"></canvas>
    <div id="q-inner">
      <p id="q-pre"></p>
      <h2 id="q-question"></h2>
      <p id="q-sub"></p>
      <div id="q-actions"><button id="q-skip">Reveal <span>↓</span></button><p id="q-hint">or wait — the answer is below</p></div>
    </div>
    <div id="q-bar"><div id="q-fill"></div></div>`;
  document.body.appendChild(ov);

  let active=false, timer=null, onDismiss=null;

  function showOverlay(card, delay, callback){
    if(active) return;
    active = true;
    onDismiss = callback || null;
    document.getElementById('q-pre').textContent = card.pre;
    document.getElementById('q-question').textContent = card.q;
    document.getElementById('q-sub').textContent = card.sub;
    const fill = document.getElementById('q-fill');
    fill.style.transition = 'none'; fill.style.width = '0';
    ov.style.display = 'grid';
    ov.offsetHeight;
    ov.classList.add('q-visible');
    const d = delay || DELAY;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      fill.style.transition = `width ${d}ms linear`;
      fill.style.width = '100%';
    }));
    timer = setTimeout(()=>dismissOverlay(), d);
  }

  function dismissOverlay(){
    if(!active) return;
    clearTimeout(timer);
    const inner = document.getElementById('q-inner');
    const bar = document.getElementById('q-bar');
    if(inner) inner.style.opacity = '0';
    if(bar) bar.style.opacity = '0';
    runParticles(document.getElementById('q-canvas'), ()=>{
      ov.classList.add('q-out');
      setTimeout(()=>{
        ov.classList.remove('q-visible','q-out');
        ov.style.display = 'none';
        if(inner){ inner.style.opacity='1'; }
        if(bar){ bar.style.opacity='1'; }
        document.getElementById('q-fill').style.width = '0';
        active = false;
        const cb = onDismiss; onDismiss = null;
        if(cb) cb();
      }, 600);
    });
  }

  ov.addEventListener('click', dismissOverlay);
  document.getElementById('q-skip')?.addEventListener('click', e=>{ e.stopPropagation(); dismissOverlay(); });

  // ── Section curtain raisers (first visit only) ──────────────────────────
  if(!sessionStorage.getItem(Q_KEY) && !matchMedia('(prefers-reduced-motion:reduce)').matches){
    const triggered = new Set();
    const io = new IntersectionObserver(entries=>{
      entries.forEach(e=>{
        if(!e.isIntersecting) return;
        const i = CARDS.findIndex(c=>e.target.matches(c.trigger));
        if(i===-1 || triggered.has(i)) return;
        triggered.add(i);
        setTimeout(()=>showOverlay(CARDS[i], DELAY), 300);
        if(triggered.size >= CARDS.length) sessionStorage.setItem(Q_KEY,'1');
      });
    },{threshold:0.1});
    CARDS.forEach(c=>{const el=document.querySelector(c.trigger);if(el)io.observe(el);});
  }

  // ── Demo button intercept ───────────────────────────────────────────────
  // Shows a question before going to demo.html
  const DEMO_CARD = {
    pre: 'Before you step in',
    q: 'What\'s the HR challenge you\'re dealing with tonight?',
    sub: 'Vantage works best when it knows your situation. Think about it — then step inside.'
  };

  document.querySelectorAll('a[href="demo.html"], .nav-cta[href="demo.html"]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      e.preventDefault();
      const dest = btn.href;
      showOverlay(DEMO_CARD, 4000, ()=>{ window.location.href = dest; });
    });
  });

  // ── Ta-da reveal (prologue → landing) ──────────────────────────────────
  // ONLY triggers when vantage_tada flag is set by real prologue dismiss
  // NOT on refresh/skip (where prologue-complete is added without the flag)
  const tadaOverlay = document.getElementById('tada-overlay');
  if(tadaOverlay){
    tadaOverlay.style.display = 'none';
    const obs = new MutationObserver(()=>{
      if(!document.body.classList.contains('prologue-complete')) return;
      obs.disconnect();
      // KEY CHECK: only show ta-da if the flag was explicitly set by endPrologue
      if(!sessionStorage.getItem('vantage_tada')) return;
      sessionStorage.removeItem('vantage_tada');
      const logo = document.getElementById('tada-logoimg');
      tadaOverlay.style.display = 'flex';
      setTimeout(()=>{
        if(logo) logo.style.filter = 'drop-shadow(0 0 80px rgba(196,181,253,0.9)) drop-shadow(0 0 40px rgba(99,102,241,0.6))';
      }, 200);
      setTimeout(()=>{
        if(logo) logo.style.opacity = '0';
        runParticles(document.getElementById('tada-canvas'), ()=>{
          tadaOverlay.classList.add('tada-out');
          setTimeout(()=>{
            tadaOverlay.style.display = 'none';
            tadaOverlay.classList.remove('tada-out');
          }, 650);
        });
      }, 1100);
    });
    obs.observe(document.body,{attributes:true,attributeFilter:['class']});
  }

  // ── Persistent Questions modal ──────────────────────────────────────────
  // Floating purple button + modal with all 4 questions
  const qBtn = document.createElement('button');
  qBtn.id = 'questions-fab';
  qBtn.innerHTML = '<span>✦</span> Reflect';
  qBtn.title = 'Revisit the questions';
  document.body.appendChild(qBtn);

  const qModal = document.createElement('div');
  qModal.id = 'questions-modal';
  qModal.innerHTML = `
    <div id="questions-modal-inner">
      <button id="questions-modal-close">×</button>
      <p id="qm-pre">Four questions for the HR professional</p>
      <h3 id="qm-heading">Sit with these.</h3>
      <div id="qm-cards">
        ${CARDS.map((c,i)=>`
          <div class="qm-card" data-index="${i}">
            <span class="qm-num">0${i+1}</span>
            <p class="qm-q">${c.q}</p>
            <p class="qm-sub">${c.sub}</p>
            <button class="qm-explore" data-index="${i}">Explore this section ↓</button>
          </div>
        `).join('')}
      </div>
    </div>`;
  document.body.appendChild(qModal);

  qBtn.addEventListener('click', ()=>{
    qModal.classList.add('qm-open');
    document.body.style.overflow = 'hidden';
  });

  document.getElementById('questions-modal-close').addEventListener('click', closeModal);
  qModal.addEventListener('click', e=>{ if(e.target===qModal) closeModal(); });

  function closeModal(){
    qModal.classList.remove('qm-open');
    document.body.style.overflow = '';
  }

  // Clicking "Explore this section" closes modal, scrolls to section, shows question overlay
  qModal.querySelectorAll('.qm-explore').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const i = parseInt(btn.dataset.index);
      closeModal();
      setTimeout(()=>{
        const el = document.querySelector(CARDS[i].trigger);
        if(el){
          el.scrollIntoView({behavior:'smooth', block:'center'});
          setTimeout(()=>showOverlay(CARDS[i], 7000), 600);
        }
      }, 400);
    });
  });

  // ── Shared particle explosion ───────────────────────────────────────────
  function runParticles(canvas, done){
    if(!canvas||typeof THREE==='undefined'){done&&done();return;}
    const W=innerWidth,H=innerHeight;
    canvas.width=W;canvas.height=H;canvas.style.opacity='1';
    const rdr=new THREE.WebGLRenderer({canvas,antialias:false,alpha:true});
    rdr.setSize(W,H);rdr.setClearColor(0,0);
    const scene=new THREE.Scene();
    const cam=new THREE.OrthographicCamera(-W/2,W/2,H/2,-H/2,1,100);cam.position.z=10;
    const COUNT=5000,pos=new Float32Array(COUNT*3),col=new Float32Array(COUNT*3),vel=[];
    const pal=[[.769,.714,.992],[.388,.4,.945],[.655,.545,.98],[.91,.475,.976]];
    for(let i=0;i<COUNT;i++){
      pos[i*3]=0;pos[i*3+1]=0;pos[i*3+2]=0;
      const a=Math.random()*Math.PI*2,s=4+Math.random()*20;
      vel.push({vx:Math.cos(a)*s,vy:Math.sin(a)*s});
      const c=pal[i%4];col[i*3]=c[0];col[i*3+1]=c[1];col[i*3+2]=c[2];
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    geo.setAttribute('color',new THREE.BufferAttribute(col,3));
    const mat=new THREE.PointsMaterial({size:2.5,vertexColors:true,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false});
    scene.add(new THREE.Points(geo,mat));
    let f=0,T=60;
    (function go(){
      f++;const t=f/T,e=t*t;
      for(let i=0;i<COUNT;i++){pos[i*3]+=vel[i].vx*(1+e*4);pos[i*3+1]+=vel[i].vy*(1+e*4);}
      geo.attributes.position.needsUpdate=true;
      mat.opacity=Math.max(0,1-e*1.2);
      rdr.render(scene,cam);
      if(f<T)requestAnimationFrame(go);
      else{rdr.dispose();geo.dispose();mat.dispose();canvas.style.opacity='0';done&&done();}
    })();
  }

})();
