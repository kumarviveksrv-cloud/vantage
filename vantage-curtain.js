/* GRADIENT FIX — reads exact color from the 'you' em element, applies it everywhere */
(function applyGradients(){
  /* Canonical gradient source: the <em>you</em> in the sim-case h2
     That element is styled by vantage-cinematic.css — we copy it exactly */
  const FALLBACK = 'linear-gradient(135deg,#c4b5fd 0%,#6366f1 100%)';

  function getSourceGradient(){
    const ref = document.querySelector('.case-intro h2 em') ||
                document.querySelector('h2 em') ||
                document.querySelector('.sim-case h2 em');
    if(!ref) return FALLBACK;
    const cs  = window.getComputedStyle(ref);
    const bg  = cs.getPropertyValue('background-image');
    /* If em has a gradient, use it verbatim */
    if(bg && bg !== 'none' && bg.includes('gradient')) return bg;
    /* Otherwise, build a gradient from the em's solid color */
    const col = cs.getPropertyValue('-webkit-text-fill-color') ||
                cs.getPropertyValue('color') || '';
    if(col && col !== 'transparent' && col !== 'rgba(0, 0, 0, 0)'){
      return 'linear-gradient(135deg,' + col + ' 0%,#6366f1 100%)';
    }
    return FALLBACK;
  }

  function run(){
    /* Hero CTA buttons — setProperty beats any CSS !important */
    const heroBtns=document.querySelectorAll('.hero-actions a');
    if(heroBtns[0]){
      heroBtns[0].style.setProperty('background','linear-gradient(135deg,#7c3aed 0%,#6366f1 100%)','important');
      heroBtns[0].style.setProperty('color','#fff','important');
      heroBtns[0].style.setProperty('border','none','important');
      heroBtns[0].style.setProperty('opacity','1','important');
      heroBtns[0].style.setProperty('box-shadow','0 4px 28px rgba(124,58,237,.55),0 1px 0 rgba(196,181,253,.2) inset','important');
    }
    if(heroBtns[1]){
      heroBtns[1].style.setProperty('border','1.5px solid rgba(196,181,253,.6)','important');
      heroBtns[1].style.setProperty('color','rgba(196,181,253,.92)','important');
      heroBtns[1].style.setProperty('background','rgba(196,181,253,.07)','important');
      heroBtns[1].style.setProperty('opacity','1','important');
    }
    const grad = getSourceGradient();

    /* Force hero-kicker to DM Sans — beats any split-reveal span override */
    const kicker = document.querySelector('.hero-kicker');
    if(kicker){
      kicker.style.setProperty('font-family',"'DM Sans',sans-serif",'important');
      kicker.querySelectorAll('span').forEach(s=>{
        s.style.setProperty('font-family',"'DM Sans',sans-serif",'important');
      });
    }
    document.querySelectorAll('span.accent').forEach(el=>{
      el.style.setProperty('display','block','important');
      el.style.setProperty('font-style','italic','important');
      el.style.setProperty('font-family',"'Cormorant Garamond',serif",'important');
      el.style.setProperty('background', grad,'important');
      el.style.setProperty('-webkit-background-clip','text','important');
      el.style.setProperty('background-clip','text','important');
      el.style.setProperty('color','transparent','important');
      el.style.setProperty('-webkit-text-fill-color','transparent','important');
      /* font-weight intentionally NOT set — let each element's own weight show */
    });
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',run);
  } else { run(); }
  window.addEventListener('load',run);
})();

/* VANTAGE // CURTAIN RAISER v6
   Session key: vantage_q_v6
   Fixes: ta-da only on real prologue end (not skip/refresh)
   New: Demo button question intercept + persistent Questions modal
   SR18: +3s timer (10s total), Reflect hidden during prologue/boot,
         section-aware nudge on Reflect button
*/
(function(){
  'use strict';

  const Q_KEY = 'vantage_q_v6';
  const DELAY = 10000;

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
    { trigger:'.humacity.cinematic-panel', pre:'A question for you', q:'Do you know the rupee value of the work you did last quarter?', sub:'Not headcount. Not engagement scores. The actual financial contribution HR made to the business.', nudge:'A question about Humacity' },
    { trigger:'.record.cinematic-panel',   pre:'Before you scroll',  q:'When you leave this organisation \u2014 what do you take with you?', sub:'Every decision navigated. Every case closed. Every difficult conversation held. Is any of it saved anywhere?', nudge:'A question about your Record' },
    { trigger:'.meridian.cinematic-panel', pre:'A question for you', q:'The intelligence you\'re using right now \u2014 does it actually know your reality?', sub:'Or is it answering someone else\u2019s question, dressed up to look like yours?', nudge:'A question about MERIDIAN' },
    { trigger:'.aria.cinematic-panel',     pre:'One last question',  q:'What would you do if you had a brilliant HR colleague available at 9pm tonight?', sub:'Not a chatbot. Someone who knows your context, your policies, your history \u2014 and asks the right questions back.', nudge:'A question about ARIA' },
  ];

  // ── Shared overlay builder ──────────────────────────────────────────────
  const ov = document.createElement('div');
  ov.id = 'q-overlay';
  ov.innerHTML = `<canvas id="q-canvas"></canvas>
    <div id="q-inner">
      <p id="q-pre"></p>
      <h2 id="q-question"></h2>
      <p id="q-sub"></p>
      <div id="q-actions"><button id="q-skip">Reveal <span>\u2193</span></button><p id="q-hint">or wait \u2014 the answer is below</p></div>
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
    q: 'What\u2019s the HR challenge you\u2019re dealing with tonight?',
    sub: 'Vantage works best when it knows your situation. Think about it \u2014 then step inside.'
  };

  document.querySelectorAll('a[href="demo.html"], .nav-cta[href="demo.html"]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      e.preventDefault();
      const dest = btn.href;
      showOverlay(DEMO_CARD, 4000, ()=>{ window.location.href = dest; });
    });
  });

  // ── Ta-da reveal — with "Initiating Vantage..." interstitial (SR18) ──────────
  const tadaOverlay = document.getElementById('tada-overlay');
  const initOverlay = document.getElementById('init-overlay');
  const initTextEl  = document.getElementById('init-text');

  if(tadaOverlay){
    tadaOverlay.style.display = 'none';
    const obs = new MutationObserver(()=>{
      if(!document.body.classList.contains('prologue-complete')) return;
      obs.disconnect();
      if(!sessionStorage.getItem('vantage_tada')) return;
      sessionStorage.removeItem('vantage_tada');

      /* ═══ SR18 SEQUENCE: Prologue → Typewriter → Curtain Raiser → Landing ═══
         Each stage dims in, does its thing, dims out.
         Init-overlay stays BLACK until curtain raiser is confirmed active.
         If curtain raiser was already seen this session, skip to doTada. */

      const curtainAlreadySeen = sessionStorage.getItem('vantage_q_v6');

      if(initOverlay && initTextEl && !curtainAlreadySeen){
        /* ── STAGE 2: "Initiating Vantage..." typewriter ── */
        initOverlay.classList.add('init-active');
        initOverlay.style.opacity = '1';
        initTextEl.textContent = '';
        const msg = 'Initiating Vantage...';
        let idx = 0;
        const typer = setInterval(()=>{
          if(idx <= msg.length){ initTextEl.textContent = msg.slice(0, idx); idx++; }
          else {
            clearInterval(typer);
            /* Hold 1.8s so user reads it */
            setTimeout(()=>{
              /* Fade the typewriter TEXT only — overlay stays black */
              initTextEl.style.transition = 'opacity .8s ease';
              initTextEl.style.opacity = '0';

              /* ── STAGE 3: Wait for curtain raiser to activate ── */
              /* vantage-cinematic.js fires #q-overlay on its own schedule
                 after prologue-complete. We poll until it's active, THEN
                 fade the init-overlay to reveal it. Zero flash. */
              let polls = 0;
              const maxPolls = 120; /* 120 × 50ms = 6s safety net */
              const poller = setInterval(()=>{
                polls++;
                const qov = document.getElementById('q-overlay');
                const isActive = qov && (qov.classList.contains('active') || qov.style.display === 'flex');

                if(isActive || polls >= maxPolls){
                  clearInterval(poller);

                  if(isActive){
                    /* Curtain raiser is ready underneath — dim out init-overlay */
                    initOverlay.style.transition = 'opacity 1s ease';
                    initOverlay.style.opacity = '0';
                    setTimeout(()=>{
                      initOverlay.classList.remove('init-active');
                      initOverlay.style.opacity = '';
                      initOverlay.style.transition = '';
                      initTextEl.style.opacity = '';
                      initTextEl.style.transition = '';
                    }, 1050);
                  } else {
                    /* Safety: curtain raiser never appeared — fall through to doTada */
                    initOverlay.style.transition = 'opacity 1s ease';
                    initOverlay.style.opacity = '0';
                    setTimeout(()=>{
                      initOverlay.classList.remove('init-active');
                      initOverlay.style.opacity = '';
                      initOverlay.style.transition = '';
                      initTextEl.style.opacity = '';
                      initTextEl.style.transition = '';
                      doTada();
                    }, 1050);
                  }
                }
              }, 50);
            }, 1800);
          }
        }, 95);

      } else if(initOverlay && initTextEl && curtainAlreadySeen){
        /* Curtain already seen — do the typewriter → doTada flow */
        initOverlay.classList.add('init-active');
        initTextEl.textContent = '';
        const msg2 = 'Initiating Vantage...';
        let idx2 = 0;
        const typer2 = setInterval(()=>{
          if(idx2 <= msg2.length){ initTextEl.textContent = msg2.slice(0, idx2); idx2++; }
          else {
            clearInterval(typer2);
            setTimeout(()=>{
              initOverlay.style.transition = 'opacity 1s ease';
              initOverlay.style.opacity = '0';
              setTimeout(()=>{
                initOverlay.classList.remove('init-active');
                initOverlay.style.opacity = '';
                initOverlay.style.transition = '';
                doTada();
              }, 1050);
            }, 1800);
          }
        }, 95);
      } else { doTada(); }

      function doTada(){
        const logo = document.getElementById('tada-logoimg');
        /* Dim IN — ta-da fades in, not abrupt */
        tadaOverlay.style.opacity = '0';
        tadaOverlay.style.transition = 'opacity .85s ease';
        tadaOverlay.style.display = 'flex';
        requestAnimationFrame(()=>requestAnimationFrame(()=>{ tadaOverlay.style.opacity='1'; }));
        setTimeout(()=>{ if(logo) logo.style.filter = 'drop-shadow(0 0 80px rgba(196,181,253,0.9)) drop-shadow(0 0 40px rgba(99,102,241,0.6))'; }, 200);
        setTimeout(()=>{
          if(logo) logo.style.opacity = '0';
          runParticles(document.getElementById('tada-canvas'), ()=>{
            tadaOverlay.classList.add('tada-out');
            /* Wait for curtain raiser to be active before hiding ta-da —
               eliminates the bare-landing-page flash between the two */
            (function waitForCurtain(){
              const qov = document.getElementById('q-overlay');
              /* If curtain raiser already seen or doesn't exist, hide normally */
              if(!qov || sessionStorage.getItem('vantage_q_v6')){
                setTimeout(()=>{ tadaOverlay.style.display='none'; tadaOverlay.classList.remove('tada-out'); }, 650);
                return;
              }
              /* Already active — hide ta-da immediately */
              if(qov.classList.contains('active') || qov.style.display==='flex'){
                setTimeout(()=>{ tadaOverlay.style.display='none'; tadaOverlay.classList.remove('tada-out'); }, 80);
                return;
              }
              /* Watch for curtain raiser to activate, then hide ta-da */
              const obs = new MutationObserver(()=>{
                if(qov.classList.contains('active') || qov.style.display==='flex'){
                  obs.disconnect();
                  clearTimeout(safety);
                  /* Small pause so curtain raiser renders before ta-da disappears */
                  setTimeout(()=>{ tadaOverlay.style.display='none'; tadaOverlay.classList.remove('tada-out'); }, 100);
                }
              });
              obs.observe(qov,{attributes:true,attributeFilter:['class','style']});
              /* Safety: hide ta-da after 3.5s regardless (user already saw the curtain) */
              const safety=setTimeout(()=>{ obs.disconnect(); tadaOverlay.style.display='none'; tadaOverlay.classList.remove('tada-out'); }, 3500);
            })();
          });
        }, 1100);
      }
    });
    obs.observe(document.body,{attributes:true,attributeFilter:['class']});
  }

  // ── Persistent Questions modal ──────────────────────────────────────────
  const qBtn = document.createElement('button');
  qBtn.id = 'questions-fab';
  qBtn.innerHTML = '<span>\u2726</span> Reflect';
  qBtn.title = 'Revisit the questions';
  /* SR18: start hidden until prologue/boot are done */
  qBtn.style.display = 'none';
  document.body.appendChild(qBtn);

  /* SR18: show Reflect only after prologue is dismissed or skipped */
  function revealReflect(){
    /* Don't show during prologue or boot */
    const prologue = document.getElementById('prologue');
    const boot = document.getElementById('boot');
    const prologueGone = !prologue || prologue.style.display === 'none' || getComputedStyle(prologue).display === 'none' || getComputedStyle(prologue).opacity === '0' || document.body.classList.contains('prologue-complete');
    const bootGone = !boot || boot.style.display === 'none' || getComputedStyle(boot).display === 'none' || getComputedStyle(boot).opacity === '0';
    if(prologueGone && bootGone){
      qBtn.style.display = '';
      return true;
    }
    return false;
  }
  /* Try immediately, then watch for prologue-complete class */
  if(!revealReflect()){
    const reflectObs = new MutationObserver(()=>{
      if(revealReflect()) reflectObs.disconnect();
    });
    reflectObs.observe(document.body, {attributes:true, attributeFilter:['class']});
    /* Also check on visibility changes (prologue uses display:none) */
    const reflectTimer = setInterval(()=>{
      if(revealReflect()){ clearInterval(reflectTimer); }
    }, 500);
    /* Safety: stop checking after 30s */
    setTimeout(()=>clearInterval(reflectTimer), 30000);
  }

  /* SR18: Nudge tooltip element */
  const nudgeTip = document.createElement('div');
  nudgeTip.id = 'reflect-nudge';
  nudgeTip.style.cssText = 'position:fixed;bottom:70px;right:24px;background:rgba(99,102,241,.88);color:#fff;font:12px "DM Sans",sans-serif;padding:8px 16px;border-radius:10px;opacity:0;pointer-events:none;transition:opacity .4s,transform .4s;transform:translateY(8px);z-index:8999;white-space:nowrap;backdrop-filter:blur(8px);box-shadow:0 4px 20px rgba(99,102,241,.35);';
  document.body.appendChild(nudgeTip);

  /* SR18: Section-aware nudge on Reflect button */
  let currentNudge = -1, nudgeTimeout = null;
  function showNudge(text){
    nudgeTip.textContent = text;
    nudgeTip.style.opacity = '1';
    nudgeTip.style.transform = 'translateY(0)';
    qBtn.classList.add('reflect-pulse');
    clearTimeout(nudgeTimeout);
    nudgeTimeout = setTimeout(hideNudge, 4000);
  }
  function hideNudge(){
    nudgeTip.style.opacity = '0';
    nudgeTip.style.transform = 'translateY(8px)';
    qBtn.classList.remove('reflect-pulse');
  }

  /* Nudge on ALL visits: pulse Reflect whenever user is inside a question section
     Guard: skip if a curtain overlay is already active (!active) */
  const nudgeIO = new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      const i = CARDS.findIndex(c=>e.target.matches(c.trigger));
      if(i === -1) return;
      if(e.isIntersecting && currentNudge !== i && qBtn.style.display !== 'none' && !active){
        currentNudge = i;
        showNudge(CARDS[i].nudge);
      } else if(!e.isIntersecting && currentNudge === i){
        currentNudge = -1;
        hideNudge();
      }
    });
  },{threshold:0.2});
  CARDS.forEach(c=>{const el=document.querySelector(c.trigger);if(el)nudgeIO.observe(el);});

  /* SR18: pulse animation CSS injected */
  const pulseStyle = document.createElement('style');
  pulseStyle.textContent = `
    @keyframes reflectPulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(124,58,237,.5); }
      50% { box-shadow: 0 0 0 12px rgba(124,58,237,0); }
    }
    #questions-fab.reflect-pulse {
      animation: reflectPulse 1.5s ease-in-out 3;
    }
  `;
  document.head.appendChild(pulseStyle);

  const qModal = document.createElement('div');
  qModal.id = 'questions-modal';
  qModal.innerHTML = `
    <div id="questions-modal-inner">
      <button id="questions-modal-close">\u00d7</button>
      <p id="qm-pre">Four questions for the HR professional</p>
      <h3 id="qm-heading">Sit with these.</h3>
      <div id="qm-cards">
        ${CARDS.map((c,i)=>`
          <div class="qm-card" data-index="${i}">
            <span class="qm-num">0${i+1}</span>
            <p class="qm-q">${c.q}</p>
            <p class="qm-sub">${c.sub}</p>
            <button class="qm-explore" data-index="${i}">Explore this section \u2193</button>
          </div>
        `).join('')}
      </div>
    </div>`;
  document.body.appendChild(qModal);

  qBtn.addEventListener('click', ()=>{
    hideNudge();
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
          setTimeout(()=>showOverlay(CARDS[i], DELAY), 600);
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


/* ARIA room — ambient particle cloud (SR18) */
(function initAriaAmbient(){
  'use strict';
  const canvas=document.getElementById('ariaAmbient');
  if(!canvas) return;
  const room=canvas.closest('.aria-room');
  if(!room) return;
  const ctx=canvas.getContext('2d');
  let W=0,H=0,pts=null,anim=null;

  function resize(){
    W=room.offsetWidth||500; H=room.offsetHeight||600;
    canvas.width=W; canvas.height=H;
  }

  function makePts(){
    pts=Array.from({length:220},()=>({
      x:Math.random()*W, y:Math.random()*H,
      r:0.4+Math.random()*1.6,
      vx:(Math.random()-.5)*.25,
      vy:(Math.random()-.5)*.25,
      a:0.08+Math.random()*.28,
      phase:Math.random()*Math.PI*2,
    }));
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    const t=performance.now()/1000;
    pts.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<-2)p.x=W+2; if(p.x>W+2)p.x=-2;
      if(p.y<-2)p.y=H+2; if(p.y>H+2)p.y=-2;
      const alpha=Math.max(0,p.a+Math.sin(t*1.2+p.phase)*.1);
      /* lavender-to-indigo drift based on x position */
      const u=p.x/W;
      const r=Math.round(168-u*44); // 168→124
      const g=Math.round(85-u*27);  // 85→58
      const b=Math.round(247-u*10); // 247→237
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(${r},${g},${b},${alpha})`;
      ctx.fill();
    });
    anim=requestAnimationFrame(draw);
  }

  const section=document.querySelector('.aria.cinematic-panel');
  if(!section) return;
  new IntersectionObserver(entries=>{
    if(entries[0].isIntersecting){
      resize(); if(!pts)makePts(); if(!anim)draw();
    } else {
      if(anim){cancelAnimationFrame(anim);anim=null;}
    }
  },{threshold:0.05}).observe(section);

  window.addEventListener('resize',()=>{resize();makePts();},{passive:true});
})();

/* ═══ SHARED DASHBOARD ANIMATION UTILITIES (SR18.2) ═══ */
(function(){
  'use strict';
  window._vDash={
    /* Scramble-then-settle numeric counter */
    num(el,target,dur,pre='',suf='',dec=0){
      if(!el)return;
      const chars='0123456789',s=performance.now();
      (function f(now){
        const p=Math.min(1,(now-s)/dur),ease=1-Math.pow(1-p,3);
        if(p<0.60){
          const raw=dec>0?target.toFixed(dec):String(target);
          let sc='';for(let i=0;i<raw.length;i++)sc+=chars[Math.floor(Math.random()*10)];
          el.textContent=pre+sc+suf;
        }else{
          const v=ease*target;
          el.textContent=pre+(dec>0?v.toFixed(dec):Math.round(v))+suf;
        }
        if(p<1)requestAnimationFrame(f);
        else el.textContent=pre+(dec>0?target.toFixed(dec):target)+suf;
      })(s);
    },
    /* Scramble text string letter-by-letter */
    str(el,final,dur){
      if(!el)return;
      const chars='0123456789ABCDEF░▒',s=performance.now(),n=final.length;
      (function f(now){
        const p=Math.min(1,(now-s)/dur),settled=Math.floor(p*n);
        let res='';
        for(let i=0;i<n;i++){
          if(i<settled||final[i]===' ')res+=final[i];
          else res+=chars[Math.floor(Math.random()*chars.length)];
        }
        el.textContent=res;
        if(p<1)requestAnimationFrame(f);else el.textContent=final;
      })(s);
    },
    /* Horizontal scan line sweeping across a container (returns Promise) */
    scan(container,dur=850,col='rgba(196,181,253,.8)'){
      return new Promise(resolve=>{
        const line=document.createElement('div');
        line.style.cssText=`position:absolute;left:0;right:0;height:1px;top:0;z-index:20;pointer-events:none;
          background:linear-gradient(90deg,transparent 0%,${col} 30%,rgba(255,255,255,.95) 50%,${col} 70%,transparent 100%);
          box-shadow:0 0 10px ${col},0 0 22px ${col};`;
        const prev=container.style.position;
        if(!prev||prev==='static')container.style.position='relative';
        container.appendChild(line);
        const h=container.offsetHeight||220;
        let st=null;
        (function anim(ts){
          if(!st)st=ts;
          const p=Math.min(1,(ts-st)/dur);
          line.style.top=(p*h)+'px';
          if(p<1)requestAnimationFrame(anim);
          else{line.remove();if(!prev)container.style.position='';resolve();}
        })(performance.now());
      });
    },
    /* Progress bar fill with moving glow head */
    bar(fillEl,pct,dur){
      if(!fillEl)return;
      const glow=document.createElement('span');
      glow.style.cssText=`position:absolute;right:-3px;top:-4px;width:8px;height:calc(100%+8px);
        background:rgba(255,255,255,.9);border-radius:50%;filter:blur(5px);pointer-events:none;`;
      fillEl.style.position='relative';fillEl.appendChild(glow);
      const s=performance.now();
      (function f(now){
        const t=Math.min(1,(now-s)/dur),ease=1-Math.pow(1-t,2.5);
        fillEl.style.width=(ease*pct)+'%';
        if(t<1)requestAnimationFrame(f);else glow.remove();
      })(s);
    }
  };
})();

/* ── Intelligence Dossier — SPECTACULAR (SR18.2) ────────────────────────── */
(function initDossier(){
  'use strict';
  const dossier=document.getElementById('recordDossier');
  if(!dossier)return;
  const entries=[...dossier.querySelectorAll('.dos-entry')];
  const progress=document.getElementById('dosProgress');
  const percent=document.getElementById('dosPercent');
  const total=document.getElementById('dosTotal');
  let fired=false;

  async function run(){
    if(fired)return;fired=true;
    const D=window._vDash;if(!D)return;

    /* Phase 1: scan line sweeps across the whole dossier card */
    await D.scan(dossier,720,'rgba(196,181,253,.75)');

    /* Phase 2: progress bar fills immediately after scan */
    setTimeout(()=>{
      D.bar(progress,73,2000);
      D.num(percent,73,2200,'','%');
    },80);

    /* Phase 3: entries flash in sequentially with scramble typewriter */
    entries.forEach((entry,i)=>{
      setTimeout(()=>{
        /* Border flash */
        entry.classList.add('dos-flash','dos-visible');

        /* Scramble the timestamp */
        const ts=entry.querySelector('.dos-ts');
        if(ts){const orig=ts.textContent.trim();ts.textContent='';D.str(ts,orig,520);}

        /* Scramble the title */
        const title=entry.querySelector('.dos-title');
        if(title){const orig=title.textContent.trim();title.textContent='';D.str(title,orig,800);}

        /* Badge pops in after title settles */
        const badges=entry.querySelectorAll('.dos-badge');
        badges.forEach((b,bi)=>{
          setTimeout(()=>{
            b.style.opacity='0';b.style.transform='scale(.4) translateY(4px)';
            b.style.transition='none';
            setTimeout(()=>{
              b.style.transition='';b.classList.add('badge-pop');b.style.opacity='1';
            },60+bi*80);
          },750);
        });
      },420+i*580);
    });

    /* Phase 4: career capital scramble counter fires after last entry */
    const lastAt=420+entries.length*580+260;
    setTimeout(()=>{
      if(total)D.num(total,18.4,2000,'₹','L',1);
    },lastAt);
  }

  const section=document.querySelector('.record.cinematic-panel');
  if(!section)return;
  new IntersectionObserver(es=>{if(es[0].isIntersecting)run();},{threshold:0.2}).observe(section);
})();

/* ── Humac Score Synthesis — SPECTACULAR (SR18.2) ──────────────────────── */
(function initHumacSynthesis(){
  'use strict';
  const panel=document.getElementById('humacSynthesis');
  if(!panel)return;
  const forces=[...panel.querySelectorAll('.hs-force')];
  const scorePnl=document.getElementById('humacScorePanel');
  const numEl=document.getElementById('humacNum');
  const fillEl=document.getElementById('humacFill');
  const statusEl=document.getElementById('humacStatus');
  let fired=false;

  const STATUS=[
    'CALIBRATING L1: VALUE LEDGER...','CALIBRATING L2: TALENT PREMIUM...',
    'CALIBRATING L3: ORG VITALS...','CALIBRATING L4: HUMAN P&L...',
    'CALIBRATING L5: NET HUMAN WORTH...'
  ];

  async function run(){
    if(fired)return;fired=true;
    const D=window._vDash;if(!D)return;

    /* Phase 1: scan sweeps the full synthesis panel */
    await D.scan(panel,800,'rgba(196,181,253,.7)');

    /* Phase 2: force cards boot up one by one */
    const GAP=480;
    forces.forEach((fc,i)=>{
      setTimeout(()=>{
        /* Flash + class */
        fc.classList.add('card-boot-flash','hf-visible');

        /* Status text scrambles */
        if(statusEl)D.str(statusEl,STATUS[i],400);

        /* Bar fills with glow */
        const bar=fc.querySelector('.hsf-fill');
        if(bar){
          const target=parseFloat(bar.dataset.w)||60;
          bar.style.width='0%';
          setTimeout(()=>D.bar(bar,target,1200),80);
        }

        /* The big number scrambles */
        const numSpan=fc.querySelector('.hs-val');
        if(numSpan){
          const orig=numSpan.textContent.trim();
          numSpan.textContent='';
          setTimeout(()=>D.str(numSpan,orig,700),200);
        }

        /* "+18 pts" badge pops */
        const pts=fc.querySelector('.hs-pts');
        if(pts){
          pts.style.opacity='0';pts.style.transform='scale(.3)';
          setTimeout(()=>{pts.classList.add('badge-pop');pts.style.opacity='1';},700);
        }
      },200+i*GAP);
    });

    /* Phase 3: score synthesis panel slides up + counters */
    const scoreAt=200+forces.length*GAP+320;
    setTimeout(()=>{
      if(scorePnl)scorePnl.classList.add('hsp-visible');

      /* Master scan across score panel */
      setTimeout(()=>{
        if(scorePnl)D.scan(scorePnl,600,'rgba(196,181,253,.65)');
      },120);

      /* Humac score scramble-counter */
      if(fillEl)setTimeout(()=>D.bar(fillEl,84,2000),200);
      if(numEl) setTimeout(()=>D.num(numEl,84,2200,'',''),200);
      setTimeout(()=>{const v=document.getElementById('humacVerdict');if(v)v.textContent='Value Generating';},2400);

      /* HCI-Adjusted */
      setTimeout(()=>{
        const hci=document.getElementById('humacHCI');
        const hcix=document.getElementById('humacHCIx');
        if(hci)D.num(hci,79,1600,'','');
        if(hcix){
          const s=performance.now();
          (function f(now){const t=Math.min(1,(now-s)/1600);const e=1-Math.pow(1-t,3);
            hcix.textContent=(0.50+e*0.44).toFixed(2)+'x';if(t<1)requestAnimationFrame(f);else hcix.textContent='0.94x';
          })(s);
        }
      },350);

      /* Trajectory */
      setTimeout(()=>{
        const tNum=document.getElementById('humacTrajNum');
        const tSt=document.getElementById('humacTrajStatus');
        if(tNum)D.num(tNum,6,1400,'+','');
        setTimeout(()=>{if(tSt)tSt.textContent='Improving';},1500);
      },700);

      /* Tagline */
      setTimeout(()=>{
        const tag=document.getElementById('humacTagline');
        if(tag)D.str(tag,'This is what your organisation\u2019s human capital position looks like when it speaks the CFO\u2019s language.',1800);
      },2600);
    },scoreAt);
  }

  const section=document.querySelector('.humacity.cinematic-panel');
  if(!section)return;
  new IntersectionObserver(es=>{if(es[0].isIntersecting)run();},{threshold:0.15}).observe(section);
})();

/* ── MERIDIAN Engine Stack — SPECTACULAR (SR18.2) ──────────────────────── */
(function initMeridianStack(){
  'use strict';
  const stack=document.getElementById('meridianStack');
  if(!stack)return;
  const layers=[...stack.querySelectorAll('.ms-layer')].reverse(); /* L1 first */
  const output=document.getElementById('msOutput');
  const outputText=output?output.querySelector('.mso-label'):null;
  const stackContainer=stack.querySelector('.msl-layers')||stack;
  let fired=false;

  function activateLayer(layer,i){
    const D=window._vDash;
    return new Promise(resolve=>{
      /* Scan line sweeps across this layer row */
      const scanDiv=document.createElement('div');
      scanDiv.className='msl-scanline';
      layer.style.position='relative';
      layer.appendChild(scanDiv);

      setTimeout(()=>{
        layer.classList.add('msl-active');
        /* Scramble the layer label */
        const label=layer.querySelector('.msl-label');
        if(label&&D){const orig=label.textContent.trim();D.str(label,orig,500);}
        /* Scramble the description */
        const desc=layer.querySelector('.msl-desc');
        if(desc&&D){
          const orig=desc.textContent.trim();
          desc.style.opacity='0';
          setTimeout(()=>{desc.style.opacity='1';D.str(desc,orig,700);},200);
        }
        scanDiv.addEventListener('animationend',()=>{scanDiv.remove();},{ once:true });
        setTimeout(resolve,620);
      },60);
    });
  }

  async function run(){
    if(fired)return;fired=true;
    const D=window._vDash;if(!D)return;

    /* Phase 1: scan the whole stack panel */
    await D.scan(stack,800,'rgba(196,181,253,.6)');

    /* Phase 2: activate layers one by one, bottom-up */
    for(let i=0;i<layers.length;i++){
      await activateLayer(layers[i],i);
      await new Promise(r=>setTimeout(r,80));
    }

    /* Phase 3: DATA PACKET travels from top layer DOWN to output */
    const packet=document.createElement('div');
    packet.className='ms-packet';
    stackContainer.style.position='relative';
    stackContainer.appendChild(packet);

    /* Get layer positions for the packet to travel through */
    const visibleLayers=[...stack.querySelectorAll('.ms-layer')]; /* original order: L4 top */
    const stackRect=stackContainer.getBoundingClientRect();

    packet.style.opacity='1';
    let lastY=0;
    for(const layer of visibleLayers){
      const r=layer.getBoundingClientRect();
      const y=r.top-stackRect.top+r.height/2;
      packet.style.top=y+'px';
      await new Promise(r=>setTimeout(r,480));
    }

    /* Phase 4: PRECISION ADVICE bursts in */
    setTimeout(()=>{
      if(output)output.classList.add('mso-active');
      if(outputText){
        outputText.style.opacity='0';
        setTimeout(()=>{
          outputText.style.opacity='1';
          outputText.classList.add('advice-burst');
        },150);
      }
      packet.style.opacity='0';
      setTimeout(()=>packet.remove(),300);
    },200);
  }

  const section=document.querySelector('.meridian.cinematic-panel');
  if(!section)return;
  new IntersectionObserver(es=>{if(es[0].isIntersecting)run();},{threshold:0.15}).observe(section);
})();

/* Sim-room classified briefing — lines appear one by one on scroll (SR18) */
(function initSimRoom(){
  'use strict';
  const brief = document.getElementById('simBrief');
  if(!brief) return;
  const lines = [...brief.querySelectorAll('.sb-line')];
  let fired = false;

  function run(){
    if(fired) return; fired = true;
    lines.forEach((line, i) => {
      setTimeout(() => {
        line.classList.add('sb-visible');
      }, i * 280);
    });
  }

  const section = document.querySelector('.sim-room');
  if(!section) return;
  new IntersectionObserver(es => {
    if(es[0].isIntersecting) run();
  }, {threshold: 0.15}).observe(section);
})();

/* "Enter Vantage." — typewriter × 3 then Vantage blinks forever (SR18) */
(function initHeroEnter(){
  'use strict';
  const wrap = document.getElementById('heroEnter');
  if(!wrap) return;

  /* Build DOM: [heText][heVantage][cursor] */
  const heText    = document.createElement('span');
  heText.id       = 'heText';
  const heVantage = document.createElement('span');
  heVantage.id    = 'heVantage';
  const heCursor  = document.createElement('span');
  heCursor.className = 'he-cursor';
  heCursor.textContent = '|';
  wrap.appendChild(heText);
  wrap.appendChild(heVantage);
  wrap.appendChild(heCursor);

  const delay = ms => new Promise(r => setTimeout(r, ms));

  async function typeIn(el, text, speed){
    for(let i = 0; i <= text.length; i++){
      el.textContent = text.slice(0, i);
      await delay(speed);
    }
  }

  async function typeOut(el, speed){
    const t = el.textContent;
    for(let i = t.length; i >= 0; i--){
      el.textContent = t.slice(0, i);
      await delay(speed);
    }
  }

  async function run(){
    /* Cycles 1 & 2: type full text, hold, erase */
    for(let cycle = 0; cycle < 2; cycle++){
      await typeIn(heText, 'Enter Vantage.', 58);
      await delay(480);
      await typeOut(heText, 26);
      await delay(200);
    }

    /* Cycle 3: "Enter " in heText, then "Vantage." in heVantage */
    await typeIn(heText, 'Enter ', 58);
    await typeIn(heVantage, 'Vantage.', 58);
    await delay(520);

    /* Cursor off — Vantage blinks forever */
    heCursor.style.animation = 'none';
    heCursor.style.opacity   = '0';
    heVantage.classList.add('he-blink');
  }

  window.addEventListener('load', () => setTimeout(run, 900));
})();

/* ── Prologue JS typewriter on .prologue-kicker (SR18) ──────────────────────
   CSS typewriter was unreliable against prologue.css specificity.
   This watches for #prologue.active then types the kicker text. */
(function initPrologueTypewriter(){
  'use strict';
  const pro = document.getElementById('prologue');
  if(!pro) return;
  let fired = false;
  const obs = new MutationObserver(()=>{
    if(!pro.classList.contains('active') || fired) return;
    fired = true; obs.disconnect();

    /* Force prologue-copy to bottom via inline style — overrides prologue.css */
    const copy = pro.querySelector('.prologue-copy');
    if(copy){
      copy.style.position = 'absolute';
      copy.style.top = 'auto';
      copy.style.bottom = '90px';
      copy.style.left = '50%';
      copy.style.transform = 'translateX(-50%)';
      copy.style.width = '82%';
      copy.style.maxWidth = '760px';
      copy.style.textAlign = 'center';
    }

    /* Hide message + sub initially — reveal after kicker types */
    const message = pro.querySelector('.prologue-message');
    const sub = pro.querySelector('.prologue-sub');
    if(message){ message.style.opacity='0'; message.style.transition='opacity 1.3s ease'; }
    if(sub){ sub.style.opacity='0'; sub.style.transition='opacity 1.3s ease'; }

    const kicker = pro.querySelector('.prologue-kicker');
    if(!kicker) return;
    const text = kicker.textContent.trim();
    kicker.textContent = '';
    const cur = document.createElement('span');
    cur.style.cssText = 'display:inline-block;border-right:2px solid rgba(196,181,253,.6);margin-left:1px;animation:heCursorBlink .65s step-end infinite;';
    kicker.appendChild(cur);
    let idx = 0;
    function type(){
      if(idx <= text.length){
        kicker.textContent = text.slice(0, idx);
        kicker.appendChild(cur);
        idx++;
        setTimeout(type, 68);
      } else {
        /* Cursor blinks, then reveal message, then sub */
        setTimeout(()=>{ if(message) message.style.opacity='1'; }, 900);
        setTimeout(()=>{ if(sub)     sub.style.opacity='1';     }, 2400);
        setTimeout(()=>{ cur.style.opacity='0'; cur.style.transition='opacity .4s'; }, 2800);
      }
    }
    setTimeout(type, 700);
  });
  obs.observe(pro, {attributes:true, attributeFilter:['class']});
})();

/* ── Prologue canvas rain overlay (SR18) ────────────────────────────────────
   Replaces the CSS gradient rain (not convincing). Canvas draws actual
   diagonal streaks that fall continuously over the photo background. */
(function initPrologueRain(){
  'use strict';
  /* Remove the static CSS rain div and replace with a canvas */
  const rainDiv = document.querySelector('.prologue-rain');
  if(!rainDiv) return;
  const pro = rainDiv.parentNode;

  const canvas = document.createElement('canvas');
  canvas.id = 'prologueRainCanvas';
  canvas.setAttribute('aria-hidden','true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;';
  pro.insertBefore(canvas, rainDiv);
  rainDiv.remove();

  function resize(){
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize, {passive:true});

  const ctx = canvas.getContext('2d');
  /* Build 180 drops with varied opacity, length, speed */
  const drops = Array.from({length:280}, ()=>({
    x:     Math.random() * window.innerWidth,
    y:     Math.random() * window.innerHeight,
    len:   14 + Math.random() * 22,
    speed: 11 + Math.random() * 9,
    op:    0.14 + Math.random() * 0.22,
    w:     0.4  + Math.random() * 0.5
  }));

  let animating = false;
  function frame(){
    if(!animating) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    /* Clip rain to the window region of the photo only */
    ctx.save();
    ctx.beginPath();
    ctx.rect(canvas.width*.17, canvas.height*.02, canvas.width*.67, canvas.height*.70);
    ctx.clip();
    drops.forEach(d=>{
      ctx.beginPath();
      /* Slight diagonal — matches the rain angle in the photo */
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.len * 0.12, d.y + d.len);
      ctx.strokeStyle = `rgba(160,180,220,${d.op})`;
      ctx.lineWidth = d.w;
      ctx.stroke();
      d.y += d.speed;
      d.x -= d.speed * 0.07;
      if(d.y > canvas.height + d.len){
        d.y = -d.len - Math.random() * 40;
        d.x = Math.random() * (canvas.width + 80);
      }
    });
    ctx.restore(); /* end window clip */
    requestAnimationFrame(frame);
  }

  /* Start/stop with prologue active state */
  const prologueEl = document.getElementById('prologue');
  if(prologueEl){
    const obs2 = new MutationObserver(()=>{
      if(prologueEl.classList.contains('active') && !animating){
        animating = true; frame();
      }
      if(!prologueEl.classList.contains('active')){ animating = false; }
    });
    obs2.observe(prologueEl, {attributes:true, attributeFilter:['class']});
  }
})();

/* ARIA mouseenter — face forms the moment cursor enters the box (SR18) */
(function initAriaMouseEnter(){
  'use strict';
  const ariaRoom = document.querySelector('.aria-room');
  if(!ariaRoom) return;

  ariaRoom.addEventListener('mouseenter', e => {
    const rect = ariaRoom.getBoundingClientRect();
    /* Fire a synthetic mousemove at box centre to seed the face */
    ['mousemove','pointermove'].forEach(type => {
      const ev = new MouseEvent(type, {
        clientX: rect.left + rect.width  * .5,
        clientY: rect.top  + rect.height * .45,
        bubbles: true,
        cancelable: true
      });
      ariaRoom.dispatchEvent(ev);
      document.dispatchEvent(ev);
    });
  });

  /* Also fire on every tiny mousemove within the box — throttled to 30fps */
  let last = 0;
  ariaRoom.addEventListener('mousemove', e => {
    const now = performance.now();
    if(now - last < 33) return;
    last = now;
    /* Re-dispatch on document so aria-volumetric.js picks it up
       regardless of which element it listens on */
    const relay = new MouseEvent('mousemove', {
      clientX: e.clientX, clientY: e.clientY,
      bubbles: true, cancelable: true
    });
    document.dispatchEvent(relay);
  }, {passive: true});
})();
