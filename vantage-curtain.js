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

  /* Exposed for the master hero sequence orchestrator to call at the right time */
  window._heroEnterRun = run;
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
    if(message){ message.style.setProperty('opacity','0','important'); message.style.transition='opacity 1.3s ease'; }
    if(sub){ sub.style.setProperty('opacity','0','important'); sub.style.transition='opacity 1.3s ease'; }

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
        setTimeout(()=>{ if(message) message.style.setProperty('opacity','1','important'); }, 900);
        setTimeout(()=>{ if(sub)     sub.style.setProperty('opacity','1','important');     }, 2400);
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



/* ═══ INTELLIGENCE CORRIDOR v2 — Wormhole + 5 Cases + Restart (SR18.4) ═══ */
(function initCorridorV2(){
  'use strict';
  const viewport=document.getElementById('corViewport');
  if(!viewport)return;
  const D=window._vDash;

  /* ── WORMHOLE EFFECT — Interstellar forward-flight tunnel ── */
  function wormhole(duration,cb){
    const cv=document.getElementById('wormholeCanvas');
    if(!cv){cb();return;}
    cv.style.display='block';
    cv.width=window.innerWidth||1440;
    cv.height=window.innerHeight||900;
    const ctx=cv.getContext('2d');
    if(!ctx){cv.style.display='none';cb();return;}
    console.log('Wormhole started:',cv.width,'x',cv.height);

    const W=cv.width, H=cv.height, cx=W/2, cy=H/2;
    const FL=W*0.45; /* focal length — controls perspective strength */
    const maxZ=1200;  /* far plane */

    ctx.fillStyle='#050410';
    ctx.fillRect(0,0,W,H);

    /* 600 stars in 3D space — fly TOWARD the camera */
    const stars=[];
    for(let i=0;i<600;i++){
      stars.push({
        x:(Math.random()-.5)*W*1.6,
        y:(Math.random()-.5)*H*1.6,
        z:Math.random()*maxZ,
        sz:0.5+Math.random()*1.8,
        h:240+Math.random()*55,
        l:58+Math.random()*25
      });
    }

    /* Tunnel wall rings at fixed Z depths */
    const rings=[];
    for(let i=0;i<20;i++){
      rings.push({ z: (i/20)*maxZ, r: 280+Math.random()*120, h: 255+Math.random()*30 });
    }

    const t0=performance.now();
    const safety=setTimeout(()=>{cv.style.display='none';cb();},duration+600);

    function frame(now){
      const elapsed=now-t0;
      const p=Math.min(1,elapsed/duration);
      if(p>=1){clearTimeout(safety);console.log('Wormhole complete');cv.style.display='none';cb();return;}

      /* Trail fade — longer trails as speed increases */
      ctx.fillStyle='rgba(5,4,16,'+(0.12+p*0.08)+')';
      ctx.fillRect(0,0,W,H);

      /* Speed ramps quadratically */
      const speed=(2+p*p*45);

      /* ── TUNNEL RINGS — rush toward camera ── */
      rings.forEach(ring=>{
        ring.z-=speed*0.7;
        if(ring.z<1){ring.z=maxZ;ring.r=280+Math.random()*120;}
        const scale=FL/Math.max(1,ring.z);
        const rr=ring.r*scale;
        if(rr>2&&rr<W*2){
          const alpha=Math.min(0.18,(1-ring.z/maxZ)*0.22)*(0.4+p*0.6);
          ctx.beginPath();
          ctx.arc(cx,cy,Math.max(0.1,rr),0,Math.PI*2);
          ctx.strokeStyle='hsla('+ring.h+',70%,55%,'+alpha+')';
          ctx.lineWidth=1+scale*0.8;
          ctx.stroke();
        }
      });

      /* ── STARS — 3D to 2D projection ── */
      stars.forEach(s=>{
        /* Store previous projected position for streak */
        const prevZ=s.z;
        s.z-=speed*(0.8+s.sz*0.3);

        /* Reset when passing camera — MUST happen before projection */
        if(s.z<1){
          s.x=(Math.random()-.5)*W*1.6;
          s.y=(Math.random()-.5)*H*1.6;
          s.z=maxZ-Math.random()*200;
          return;
        }

        /* Project current position (z guaranteed > 0) */
        const scale=FL/Math.max(1,s.z);
        const sx=cx+s.x*scale;
        const sy=cy+s.y*scale;

        /* Project previous position (where it was one step ago) */
        const prevScale=FL/prevZ;
        const px=cx+s.x*prevScale;
        const py=cy+s.y*prevScale;

        /* Only draw if on screen */
        if(sx<-50||sx>W+50||sy<-50||sy>H+50)return;

        /* Brightness increases as star approaches camera */
        const proximity=1-s.z/maxZ;
        const alpha=proximity*proximity*(0.4+p*0.6);

        /* Streak from previous to current position */
        ctx.beginPath();
        ctx.moveTo(px,py);
        ctx.lineTo(sx,sy);
        ctx.strokeStyle='hsla('+s.h+',85%,'+s.l+'%,'+Math.min(1,alpha)+')';
        ctx.lineWidth=s.sz*scale*0.8;
        ctx.stroke();

        /* Bright dot at head */
        if(proximity>0.6){
          ctx.beginPath();
          ctx.arc(sx,sy,Math.max(0.1,s.sz*scale*0.4),0,Math.PI*2);
          ctx.fillStyle='hsla('+s.h+',90%,82%,'+(alpha*0.7)+')';
          ctx.fill();
        }
      });

      /* ── CENTRAL DEPTH GLOW — the light at the end of the tunnel ── */
      const glowR=60+p*40;
      const grad=ctx.createRadialGradient(cx,cy,0,cx,cy,glowR);
      grad.addColorStop(0,'rgba(196,181,253,'+(0.15+p*0.2)+')');
      grad.addColorStop(0.4,'rgba(139,92,246,'+(0.06+p*0.08)+')');
      grad.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=grad;
      ctx.fillRect(0,0,W,H);

      /* ── PERIPHERAL BLUR — tunnel walls rushing past ── */
      const edgeGrad=ctx.createRadialGradient(cx,cy,W*0.15,cx,cy,W*0.65);
      edgeGrad.addColorStop(0,'rgba(0,0,0,0)');
      edgeGrad.addColorStop(0.6,'rgba(79,70,229,'+(0.02+p*0.04)+')');
      edgeGrad.addColorStop(1,'rgba(30,27,75,'+(0.08+p*0.15)+')');
      ctx.fillStyle=edgeGrad;
      ctx.fillRect(0,0,W,H);

      /* ── END FLASH — white burst at arrival ── */
      if(p>0.82){
        const flash=(p-0.82)/0.18;
        ctx.fillStyle='rgba(255,255,255,'+(flash*flash*flash*0.85)+')';
        ctx.fillRect(0,0,W,H);
      }

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ── 5 CASE DATASETS ── */
  const CASES=[
    {name:'TERMINATION',rooms:[
      {tag:'ROOM 1 / PACT ENGINE',caseId:'CASE 2841 / Employee Relations',
       h3:'Employee absent 7 days.<br>Manager wants termination tonight.<br>No written warnings on file.',
       A:{t:'Terminate immediately citing absence',r:'looks decisive'},
       B:{t:'Issue show-cause notice, 48-hr window',r:'first procedural step'},
       C:{t:'Mark as voluntary abandonment',r:'common assumption'},
       D:{t:'Initiate domestic enquiry directly',r:'sounds thorough'},
       OA:{verdict:'HIGH EXPOSURE',vclass:'risk',num:'\u20b921L',
         text:'Termination without a charge sheet or opportunity to respond violates natural justice under the Industrial Disputes Act. In Maharashtra, this is one of the most commonly overturned dismissal grounds \u2014 tribunals routinely order reinstatement with back wages.',
         aria:'Has this employee been given any written opportunity to explain the absence? Without that, this termination has almost no chance of holding.'},
       OB:{verdict:'DEFENSIBLE FIRST STEP',vclass:'ok',num:'\u20b91.5L',
         text:'A show-cause notice preserves the employee\u2019s right to respond before any punitive step. If the response is unsatisfactory, PACT recommends escalating to a charge sheet and domestic enquiry next \u2014 this is the correct opening move, not a delay.',
         aria:'I\u2019ve drafted a show-cause notice with a 48-hour window. Want me to route it to the employee\u2019s last known address and email tonight?'},
       OC:{verdict:'CONTESTABLE',vclass:'warn',num:'\u20b99L',
         text:'Voluntary abandonment requires clear evidence of the employee\u2019s intent to abandon employment, not just absence itself. Courts have repeatedly rejected this doctrine when the employer made no contact attempts during the absence period.',
         aria:'Did anyone from the company actually try to reach this employee during the 7 days? If not, \u201cabandonment\u201d will be difficult to establish.'},
       OD:{verdict:'PROCEDURALLY PREMATURE',vclass:'warn',num:'\u20b94L',
         text:'A domestic enquiry is the right eventual step, but skipping the show-cause stage denies the employee a first chance to explain before formal charges are framed. Tribunals have flagged this sequencing gap even when the enquiry itself is fair.',
         aria:'The enquiry process is sound, but the sequencing is off. Want me to restructure this so the show-cause comes first?'}},
      {tag:'ROOM 2 / SIGNAL ENGINE',caseId:'EVIDENCE ANALYSIS',
       h3:'The enquiry reveals undocumented verbal warnings.<br>Two witnesses remember. Nothing is on paper.',
       A:{t:'Proceed treating this as a first offense',r:'clean and simple'},
       B:{t:'Have managers backdate a warning email',r:'quick paper trail'},
       C:{t:'Collect signed witness statements, dated today',r:'proper reconstruction'},
       D:{t:'Rely on manager\u2019s verbal assurance alone',r:'trusted colleague'},
       OA:{verdict:'UNDERSTATED CASE',vclass:'warn',num:'31%',
         text:'Treating this as a first offense discards two witnesses\u2019 recollection of prior corrective conversations. The case is technically defensible but weaker than it needs to be \u2014 SIGNAL flags this as a missed opportunity, not a violation.',
         aria:'The pattern of repeated conduct matters for tribunal context. Why leave that evidence on the table?'},
       OB:{verdict:'DOCUMENT INTEGRITY RISK',vclass:'risk',num:'\u20b940L+',
         text:'Backdating any document is falsification of evidence. If discovered \u2014 and email metadata makes this discoverable \u2014 it doesn\u2019t just weaken this case, it can void the entire proceeding and expose the company to a fraud allegation.',
         aria:'I need to flag this clearly: backdating a document isn\u2019t a documentation fix. It\u2019s a new and much larger problem.'},
       OC:{verdict:'PROPERLY RECONSTRUCTED',vclass:'ok',num:'78%',
         text:'Witnesses can describe past events in a statement dated today \u2014 this is standard evidence reconstruction, not falsification, provided the statement is honest about when it was written. SIGNAL verifies this against 4 compliance checkpoints.',
         aria:'I\u2019ve drafted witness statement templates that clearly date themselves as contemporaneous accounts of past events. Want me to send them?'},
       OD:{verdict:'UNCORROBORATED',vclass:'warn',num:'19%',
         text:'A manager\u2019s word, without any written or witnessed record, is hearsay in a tribunal setting. It may satisfy an internal decision but won\u2019t hold up if the employee challenges the process externally.',
         aria:'If this goes external, whose word carries more weight \u2014 your manager\u2019s memory, or the employee\u2019s silence? Right now, it\u2019s a coin flip.'}},
      {tag:'ROOM 3 / HUMACITY ENGINE',caseId:'BOARDROOM CHALLENGE',
       h3:'CFO asks: "What does keeping this person actually cost us?"<br>The boardroom is waiting.',
       A:{t:'Quote an estimate based on salary alone',r:'quick answer'},
       B:{t:'Ask for a few days to gather the number',r:'thorough approach'},
       C:{t:'Present the full Human P&L model',r:'quantified, complete'},
       D:{t:'Cite generic industry benchmarks',r:'external validation'},
       OA:{verdict:'INCOMPLETE PICTURE',vclass:'warn',num:'\u20b96L',
         text:'Salary is the smallest piece of the real cost. Leaving out replacement recruitment, ramp time, and manager hours understates the case by roughly two-thirds \u2014 and the CFO will notice the gap immediately.',
         aria:'Salary is the number everyone quotes. It\u2019s also the number that convinces no one in this room.'},
       OB:{verdict:'CREDIBILITY COST',vclass:'warn',num:'\u2014',
         text:'Asking for time when the board wants a number now reads as unpreparedness, not diligence. The moment passes, and the next ask from HR carries less weight in this room.',
         aria:'The CFO isn\u2019t asking for perfect precision. They\u2019re asking if you know your numbers. Do you?'},
       OC:{verdict:'BOARDROOM-READY',vclass:'ok',num:'\u20b918.4L',
         text:'Net cost computed across all Humacity pillars: replacement cost \u20b98.2L, ramp time 4.6 months, manager load 182 hours. This is the number that survives cross-examination by a CFO.',
         aria:'This is what your organisation\u2019s human capital position looks like when it speaks the CFO\u2019s language.'},
       OD:{verdict:'NOT YOUR NUMBERS',vclass:'warn',num:'\u20b912L (avg)',
         text:'Industry benchmarks are a useful sanity check, but they aren\u2019t this company\u2019s numbers. A sharp CFO will ask why you didn\u2019t calculate your own \u2014 and you won\u2019t have an answer ready.',
         aria:'Benchmarks answer \u201cwhat do other companies see.\u201d The CFO asked what THIS decision costs THIS company.'}},
      {tag:'ROOM 4 / ARIA',caseId:'STAKEHOLDER PREPARATION',
       h3:'COO call tomorrow morning.<br>She will ask about precedent, exposure, and your recommendation.',
       A:{t:'Prepare a one-page summary, go in confident',r:'covers the basics'},
       B:{t:'Let legal handle all the questions',r:'plays it safe'},
       C:{t:'Rehearse likely questions with ARIA',r:'anticipates objections'},
       D:{t:'Reschedule to buy more prep time',r:'more time to prepare'},
       OA:{verdict:'SURFACE-LEVEL READY',vclass:'warn',num:'1/3',
         text:'A one-pager covers the headline, not the follow-ups. The moment the COO asks \u201cwhat precedent are we setting,\u201d a confident tone won\u2019t substitute for a structured answer.',
         aria:'Confidence gets you through the first question. What happens at the second?'},
       OB:{verdict:'ABDICATED OWNERSHIP',vclass:'risk',num:'0/3',
         text:'This is your decision to own, not legal\u2019s to defend. A COO who sees HR defer entirely to legal in the room starts routing future people-decisions elsewhere \u2014 a much larger, longer-term cost than this single case.',
         aria:'If you\u2019re not answering for this decision, who does the COO believe actually made it?'},
       OC:{verdict:'BOARDROOM-READY',vclass:'ok',num:'3/3',
         text:'3 objections anticipated. Counter-arguments prepared. ARIA modelled the COO\u2019s communication style from 14 past interactions \u2014 walking in knowing the questions before they\u2019re asked.',
         aria:'The third objection is the one most people miss. Want me to run it once more before tomorrow?'},
       OD:{verdict:'SIGNALS UNREADINESS',vclass:'warn',num:'-1 day',
         text:'Delaying a scheduled decision-maker call reads as a lack of control over the situation, not diligence. The COO now wonders if HR is managing this case, or being managed by it.',
         aria:'The clock on this case has been running since 9pm the first night. Does the COO know it\u2019s still running?'}},
      {tag:'ROOM 5 / VANTAGE RECORD',caseId:'9 MONTHS LATER',
       h3:'Same scenario. New employee. New manager.<br>Everything you learned the first time...',
       A:{t:'Rely on memory, repeat the manual process',r:'you\u2019ve done this before'},
       B:{t:'Ask the previous manager informally',r:'quick shortcut'},
       C:{t:'Open your Vantage Record, adapt the case',r:'documented and ready'},
       D:{t:'Escalate to legal for a fresh review',r:'extra caution'},
       OA:{verdict:'RISK OF DRIFT',vclass:'warn',num:'~60%',
         text:'Memory compresses and distorts detail over time. The specific sequencing \u2014 show-cause before enquiry, witness statements dated correctly \u2014 is exactly the kind of nuance that erodes first, not last.',
         aria:'You got the sequence right last time. Are you certain you\u2019ll get every step right again, from memory, under pressure?'},
       OB:{verdict:'SECOND-HAND AND UNRELIABLE',vclass:'warn',num:'~40%',
         text:'The previous manager remembers the outcome, not the reasoning behind each step. Relying on their account risks reproducing a decision without reproducing the judgment that made it defensible.',
         aria:'Would you want your successor learning your judgment secondhand, or from the actual record?'},
       OC:{verdict:'INSTITUTIONAL MEMORY',vclass:'ok',num:'47',
         text:'47 decisions documented. 12 policy calls. \u20b918.4L career capital. The exact sequencing, templates, and reasoning from the first case are available immediately \u2014 not reconstructed from memory.',
         aria:'Your next organisation will see 9 months of documented intelligence, not a blank resume. That is what a career record looks like.'},
       OD:{verdict:'UNNECESSARY OVERHEAD',vclass:'warn',num:'+3 weeks',
         text:'Escalating a routine, already-precedented matter to legal every time slows the organisation down and signals HR doesn\u2019t trust its own established process. Legal\u2019s time is better spent on genuinely novel questions.',
         aria:'This exact playbook has already been legally validated once. Why pay that cost twice?'}}
    ]},
{name:'POSH / HARASSMENT',rooms:[
      {tag:'ROOM 1 / PACT ENGINE',caseId:'CASE 4107 / POSH',
       h3:'Anonymous complaint received.<br>Senior director named. Complainant fears retaliation.',
       A:{t:'Dismiss since the complaint is anonymous',r:'no formal complainant'},
       B:{t:'Confidential outreach, formalize under Section 9',r:'preserves anonymity'},
       C:{t:'Immediately suspend the director',r:'decisive action'},
       D:{t:'Refer the matter directly to the police',r:'take it seriously'},
       OA:{verdict:'DUTY UNMET',vclass:'risk',num:'100%',
         text:'The POSH Act does not exempt the Internal Committee from its inquiry duty simply because a complaint arrives anonymously. An anonymous tip about a senior director is exactly the kind of signal the IC is legally obligated to act on.',
         aria:'Has the IC formally logged this as a matter requiring inquiry, even without a named complainant yet? Right now there is no record that anyone acted on it.'},
       OB:{verdict:'COMPLIANT',vclass:'ok',num:'\u20b90',
         text:'A confidential, non-pressuring outreach lets the complainant come forward under Section 9 protections without exposing her prematurely. Section 16 confidentiality obligations remain intact throughout.',
         aria:'Shall I draft an outreach message that makes clear she controls the pace, with no obligation to respond immediately?'},
       OC:{verdict:'PREMATURE',vclass:'warn',num:'\u20b98L',
         text:'Suspension is not a POSH-mandated interim measure and is not automatic. Suspending the director before any formal complaint or inquiry creates a real wrongful-suspension exposure if the allegation is later unsubstantiated.',
         aria:'Interim measures under Section 12 are available once a formal complaint exists. Should we wait for that threshold, or do you have another basis for suspension right now?'},
       OD:{verdict:'PROCESS BYPASSED',vclass:'warn',num:'\u2014',
         text:'Referring straight to the police bypasses the IC\u2019s own statutory duty and removes the choice from the complainant, who may have wanted an internal resolution first. The Act gives her that option \u2014 taking it away is itself a procedural failure.',
         aria:'Has the complainant indicated she wants this to go to the police, or is that your decision on her behalf?'}},
      {tag:'ROOM 2 / SIGNAL ENGINE',caseId:'EVIDENCE PHASE',
       h3:'The director denies everything.<br>No witnesses. Only a WhatsApp screenshot.',
       A:{t:'Rely on the screenshot alone',r:'single source available'},
       B:{t:'Dismiss for lack of corroborating witnesses',r:'insufficient evidence'},
       C:{t:'Verify authenticity, cross-reference records',r:'strengthen the evidence'},
       D:{t:'Confront the director for a confession',r:'get it resolved fast'},
       OA:{verdict:'FRAGILE',vclass:'warn',num:'28%',
         text:'Single-source evidence is easily challenged on authenticity and context. The director\u2019s counsel will question whether the screenshot is complete, unedited, and accurately timestamped.',
         aria:'Has the metadata of the screenshot been preserved? Without timestamp verification, its evidentiary weight is limited.'},
       OB:{verdict:'PREMATURE DISMISSAL',vclass:'risk',num:'\u20b912L',
         text:'POSH inquiries do not require corroborating witnesses to proceed \u2014 many genuine cases have none. Dismissing on this basis alone is itself a procedural failure, and courts have held ICs to this standard before.',
         aria:'The absence of a witness doesn\u2019t mean the absence of a violation. Is the screenshot itself being properly examined, or is its solitude being used as the reason to stop looking?'},
       OC:{verdict:'CORROBORATED',vclass:'ok',num:'72%',
         text:'SIGNAL cross-references email logs, access records, and team seating data. An independently-confirmed pattern of proximity and contact corroborates the screenshot without relying on it alone.',
         aria:'The email trail from March shows 4 instances of after-hours contact. That pattern is independent corroboration worth including in the inquiry record.'},
       OD:{verdict:'PROCEDURAL BREACH',vclass:'warn',num:'\u2014',
         text:'An off-the-record confrontation outside the formal inquiry process taints the proceeding. Both parties are entitled to a documented opportunity to respond within the IC\u2019s formal process, not an ad hoc conversation.',
         aria:'If he says something in that confrontation, is it admissible anywhere? Right now, no \u2014 and it may compromise the inquiry\u2019s integrity going forward.'}},
      {tag:'ROOM 3 / HUMACITY ENGINE',caseId:'BOARD EXPOSURE',
       h3:'Board asks: "What is the financial exposure if this becomes public?"',
       A:{t:'Downplay the risk',r:'reassure the board'},
       B:{t:'Quote one worst-case number, no breakdown',r:'give them something'},
       C:{t:'Pull the full POSH exposure model',r:'quantified, transparent'},
       D:{t:'Settle quietly before the inquiry concludes',r:'make it go away'},
       OA:{verdict:'BLIND SPOT',vclass:'risk',num:'?',
         text:'The board needed a number. You gave them reassurance. When the story breaks, the gap between your words and reality becomes personal liability for whoever signed off on that reassurance.',
         aria:'Three listed companies faced measurable market cap erosion from POSH-related disclosures in the last 18 months. Want me to pull those numbers for context?'},
       OB:{verdict:'UNSUBSTANTIATED',vclass:'warn',num:'\u20b95Cr (unverified)',
         text:'A single worst-case figure with no methodology invites the board to ask where it came from \u2014 and you won\u2019t have a defensible answer. An unexplained number is barely more useful than no number.',
         aria:'Can you walk the board through how that figure was calculated? If not, it may do more harm than the blind reassurance would have.'},
       OC:{verdict:'TRANSPARENT',vclass:'ok',num:'\u20b92.4Cr',
         text:'Total exposure quantified: legal fees, settlement range, brand damage estimate, executive liability. The board can now make an informed decision with a defensible, itemized number.',
         aria:'The settlement range alone is \u20b945L\u2013\u20b91.2Cr. Adding brand and recruitment impact roughly triples it \u2014 want the full breakdown documented for the board minutes?'},
       OD:{verdict:'PROCESS SUPPRESSED',vclass:'risk',num:'\u20b91Cr+ (if discovered)',
         text:'Settling before the inquiry concludes undermines the IC\u2019s legal mandate to investigate and reach findings. If discovered later, a pre-emptive settlement can look like a cover-up \u2014 a materially worse outcome than the original complaint.',
         aria:'Has the IC actually reached findings yet? A settlement before that point may need its own explanation later.'}},
      {tag:'ROOM 4 / ARIA',caseId:'COMPLAINANT MEETING',
       h3:'The complainant wants to meet you personally.<br>She is scared, angry, and considering going public.',
       A:{t:'Handle it from instinct',r:'be yourself'},
       B:{t:'Bring the director\u2019s manager in for balance',r:'get his perspective too'},
       C:{t:'Run ARIA rehearsal first',r:'prepared, empathetic'},
       D:{t:'Postpone until the inquiry concludes',r:'avoid saying the wrong thing'},
       OA:{verdict:'ESCALATED',vclass:'risk',num:'0/4',
         text:'Without preparation, the meeting triggers her fear response. She leaves feeling unheard. The external complaint follows within 48 hours.',
         aria:'She will ask one question that most HR leaders aren\u2019t ready for. Want me to tell you what it is before you walk in?'},
       OB:{verdict:'COMPROMISED TRUST',vclass:'risk',num:'0/4',
         text:'Including someone connected to the accused destroys the impartiality she is legally entitled to in this conversation. It reads as the organisation already siding with the director \u2014 and she will likely perceive it that way immediately.',
         aria:'Would you want to walk into this meeting and see someone loyal to the person you\u2019re accusing sitting across from you?'},
       OC:{verdict:'CONTAINED',vclass:'ok',num:'4/4',
         text:'ARIA anticipated 4 emotional triggers. Your responses acknowledged each one. The complainant feels heard. The internal process continues rather than escalating externally.',
         aria:'The key moment is when she asks about confidentiality. Your answer there determines whether she stays internal or goes public.'},
       OD:{verdict:'DELAYED ACKNOWLEDGMENT',vclass:'warn',num:'\u2014',
         text:'Postponing a personal meeting she requested reads as avoidance, not caution. In cases like this, delay itself often accelerates the decision to go public \u2014 silence is rarely read as neutral.',
         aria:'She asked to meet you. What does it say if the answer is \u201cnot yet\u201d?'}},
      {tag:'ROOM 5 / VANTAGE RECORD',caseId:'2 YEARS LATER',
       h3:'New POSH complaint at a different company.<br>You need your ICC procedural playbook.',
       A:{t:'Rebuild the playbook from memory',r:'you\u2019ve done this before'},
       B:{t:'Download a generic POSH template online',r:'quick starting point'},
       C:{t:'Open your Vantage Record',r:'documented, current'},
       D:{t:'Redo full POSH training from scratch',r:'thorough refresh'},
       OA:{verdict:'GAPS',vclass:'risk',num:'0',
         text:'The statutory timelines, evidence protocols, and ICC constitution rules you knew cold two years ago are now being reconstructed from memory under pressure \u2014 exactly the conditions under which procedural details get missed.',
         aria:'The POSH Act was amended last year. Your memory of the old process may not even be compliant anymore.'},
       OB:{verdict:'OUTDATED',vclass:'warn',num:'\u2014',
         text:'A generic template found online reflects generic compliance, not your organisation\u2019s actual precedent or the current statutory amendments. It also won\u2019t reflect lessons learned from your own prior case.',
         aria:'Does that template account for the 2025 amendment to timelines and interim measures? Most generic templates in circulation don\u2019t.'},
       OC:{verdict:'BATTLE-TESTED',vclass:'ok',num:'12',
         text:'12 POSH procedural decisions documented. ICC timelines, evidence thresholds, board communication templates \u2014 updated with the latest amendments and grounded in a case that actually held up.',
         aria:'Your Vantage Record already reflects the 2025 amendment. The ICC constitution template has been auto-updated \u2014 want me to pull it up?'},
       OD:{verdict:'REDUNDANT',vclass:'warn',num:'+2 weeks',
         text:'Full retraining ignores that you already have a validated playbook from a real case. It costs time the current situation may not afford, without adding anything the existing record doesn\u2019t already cover.',
         aria:'What would fresh training teach you that your last case didn\u2019t already prove out?'}}
    ]},
{name:'RESTRUCTURING',rooms:[
      {tag:'ROOM 1 / PACT ENGINE',caseId:'CASE 3299 / Restructuring',
       h3:'CEO announces 15% headcount reduction.<br>You have 30 days. 47 roles affected.',
       A:{t:'Immediate layoff notices to all 47 today',r:'fast, decisive'},
       B:{t:'Phased plan: VRS, attrition, then retrenchment',r:'structured sequencing'},
       C:{t:'Freeze all terminations pending legal review',r:'maximum caution'},
       D:{t:'Select lowest performers only, ignore seniority',r:'merit-based selection'},
       OA:{verdict:'LEGAL MINEFIELD',vclass:'risk',num:'\u20b91.8Cr',
         text:'Mass termination without notice periods, compensation calculations, or Section 25N permissions (where applicable) triggers Industrial Disputes Act compliance failures. 47 individual claims compound fast.',
         aria:'Have you checked which of these 47 roles fall under the Act\u2019s workman definition? The threshold changes everything about what\u2019s required here.'},
       OB:{verdict:'PROTECTED',vclass:'ok',num:'\u20b922L',
         text:'Phased plan separates voluntary exits, natural attrition, and necessary terminations \u2014 with seniority-based selection applied correctly within the workman category. Each path has its own defensible legal basis.',
         aria:'14 of the 47 roles are eligible for VRS. Starting there reduces your forced termination count to 33 \u2014 want me to map out who\u2019s eligible?'},
       OC:{verdict:'BUSINESS PARALYSIS',vclass:'warn',num:'\u20b96L/week',
         text:'Freezing everything pending review protects against legal risk but creates a different cost: the business need behind this restructuring doesn\u2019t pause while legal reviews indefinitely. Excessive caution has a price too.',
         aria:'The CEO gave you 30 days for a reason. How many of those days does an open-ended legal freeze actually leave you?'},
       OD:{verdict:'SENIORITY VIOLATION',vclass:'risk',num:'\u20b914L',
         text:'For roles classified as workmen under the Industrial Disputes Act, Section 25G requires "last come, first go" unless there\u2019s a documented, defensible reason to deviate. Selecting purely by performance without addressing seniority invites reinstatement claims.',
         aria:'Does your performance-based selection account for the seniority rule at all, or does it override it entirely? That distinction matters a lot here.'}},
      {tag:'ROOM 2 / SIGNAL ENGINE',caseId:'COMMUNICATION PHASE',
       h3:'Word leaks before the official announcement.<br>Slack channels are on fire. Glassdoor posts appearing.',
       A:{t:'Generic all-hands email to everyone',r:'one message, done'},
       B:{t:'SIGNAL-segmented communication by impact',r:'targeted messaging'},
       C:{t:'Say nothing until the official announcement',r:'controlled, disciplined'},
       D:{t:'Publicly deny the rumors for now',r:'buy time to plan'},
       OA:{verdict:'TRUST COLLAPSE',vclass:'risk',num:'12%',
         text:'A generic email to 400 people during a crisis reads as corporate deflection. Employee trust score drops sharply. Key talent starts interviewing before the plan is even finalized.',
         aria:'The engineering team and the sales team need completely different messages right now. Are you sending the same one to both?'},
       OB:{verdict:'TRUST PRESERVED',vclass:'ok',num:'68%',
         text:'SIGNAL segments employees by impact level, tenure, and flight risk. Each group receives a tailored message with the specific information relevant to them, reducing panic without over-promising.',
         aria:'Your top 8 flight-risk engineers need a personal 1:1 within 48 hours. I\u2019ve drafted talking points for each \u2014 want to review them?'},
       OC:{verdict:'VACUUM FILLED BY RUMOR',vclass:'warn',num:'22%',
         text:'Silence during an active leak doesn\u2019t read as discipline to employees \u2014 it reads as confirmation with no context. The information vacuum fills with worst-case speculation, and attrition often accelerates faster than if you\u2019d said anything at all.',
         aria:'The rumor mill has already filled in the blanks. Whose version of the story is currently the loudest \u2014 yours, or Slack\u2019s?'},
       OD:{verdict:'CREDIBILITY DESTROYED',vclass:'risk',num:'\u2014',
         text:'Denying something that turns out to be true within days is far more damaging than saying nothing. It confirms to employees that official communication from the company cannot be trusted \u2014 a cost that outlasts this single restructuring.',
         aria:'When the real announcement comes in a few days, what happens to your credibility on everything you say after that?'}},
      {tag:'ROOM 3 / HUMACITY ENGINE',caseId:'CFO REVIEW',
       h3:'CFO says: "Show me this saves money."<br>The board wants proof the restructuring is net positive.',
       A:{t:'Show salary savings only',r:'the obvious number'},
       B:{t:'Run the full restructuring cost model',r:'complete picture'},
       C:{t:'Compare only against the cost of not acting',r:'frame it favorably'},
       D:{t:'Outsource the analysis to external consultants',r:'independent validation'},
       OA:{verdict:'FALSE SAVINGS',vclass:'warn',num:'-\u20b940L',
         text:'Salary savings look great on paper. But replacement costs, knowledge loss, and 6-month productivity dips make the real number negative in the short term \u2014 a gap the CFO will find eventually, ideally not after the decision is made.',
         aria:'The hidden cost most CFOs miss: the 47 people leaving take client relationships with them. Has that been modelled?'},
       OB:{verdict:'TRUE PICTURE',vclass:'ok',num:'\u20b91.1Cr',
         text:'Full model: salary savings minus replacement, minus ramp, minus knowledge transfer, minus client risk. Net positive, but only if phased over 6 months \u2014 an honest number the board can act on.',
         aria:'The breakeven point shifts from month 3 to month 8 once recruitment costs are included. The CFO needs to see that timeline, not just the endpoint.'},
       OC:{verdict:'ONE-SIDED ANALYSIS',vclass:'warn',num:'\u20b91.6Cr (biased)',
         text:'Comparing only against the cost of inaction, without modeling the restructuring\u2019s own real costs, produces a number that flatters the decision rather than tests it. A CFO who later finds the omission will trust the next number from HR less.',
         aria:'This model only answers half the question. What does the CFO ask when they notice the restructuring\u2019s own costs aren\u2019t in it?'},
       OD:{verdict:'DELAYED AND COSTLY',vclass:'warn',num:'\u20b918L + 3 weeks',
         text:'External consultants add real cost and a multi-week timeline the board likely doesn\u2019t have, and the analysis still needs your company-specific data to mean anything. It also signals HR couldn\u2019t produce its own numbers.',
         aria:'By the time an external report comes back, will the 30-day window still be open?'}},
      {tag:'ROOM 4 / ARIA',caseId:'TOWN HALL Q&A',
       h3:'400-person town hall tomorrow.<br>The first question will be: "Am I safe?"',
       A:{t:'Go in with bullet points',r:'cover the basics'},
       B:{t:'ARIA full rehearsal',r:'anticipate hostile questions'},
       C:{t:'Let the CEO and CFO answer everything',r:'leadership takes the lead'},
       D:{t:'Send a pre-recorded video instead of live Q&A',r:'controlled messaging'},
       OA:{verdict:'AMBUSHED',vclass:'risk',num:'1/7',
         text:'You prepared for the obvious question. The 6 follow-ups catch you off guard. The recording circulates on LinkedIn within hours, and the moment becomes about your unpreparedness rather than the restructuring itself.',
         aria:'Question 3 is the trap: "If the company is profitable, why are people losing jobs?" Your current answer doesn\u2019t hold up.'},
       OB:{verdict:'COMMANDING',vclass:'ok',num:'7/7',
         text:'ARIA surfaced 7 likely hostile questions from sentiment analysis. Each has a structured response. You walk in knowing more about the room\u2019s concerns than the room expects you to.',
         aria:'The LinkedIn risk is real. I\u2019ve flagged 3 employees likely to record. Your answer to Q3 needs to work as a standalone clip.'},
       OC:{verdict:'HR SIDELINED',vclass:'warn',num:'2/7',
         text:'Leadership can announce the decision, but employees direct people-questions at HR specifically \u2014 compensation, timeline, support. If HR has no visible voice in the room, the message reads as leadership hiding behind titles.',
         aria:'When someone asks about severance calculations, does the CEO actually know the answer \u2014 or is that your question to field?'},
       OD:{verdict:'READS AS EVASIVE',vclass:'warn',num:'0/7',
         text:'A pre-recorded message during a moment this personal reads as corporate distancing, not control. Employees who can\u2019t ask real-time questions fill the silence with worse assumptions than any answer would have given them.',
         aria:'A video can\u2019t react to the room\u2019s actual mood. What happens to trust when people realize they can\u2019t ask anything back?'}},
      {tag:'ROOM 5 / VANTAGE RECORD',caseId:'NEXT RESTRUCTURING',
       h3:'18 months later. Another restructuring.<br>Different company. Same pressure.',
       A:{t:'Start the playbook from zero',r:'fresh situation'},
       B:{t:'Open your Vantage Record, adapt it',r:'proven, contextualized'},
       C:{t:'Copy the exact same plan unchanged',r:'it worked before'},
       D:{t:'Rely on a generic consultant framework',r:'external expertise'},
       OA:{verdict:'REINVENTING',vclass:'risk',num:'0',
         text:'The phasing strategy, communication templates, and CFO model \u2014 you built them all before. Now you\u2019re rebuilding from memory, likely losing the specific reasoning that made each piece defensible the first time.',
         aria:'The restructuring you ran 18 months ago saved \u20b91.1Cr net. That case study is worth more than any consulting deck you could buy now.'},
       OB:{verdict:'DEPLOYED',vclass:'ok',num:'23',
         text:'23 restructuring decisions documented. Communication templates, CFO models, town hall scripts \u2014 adapted to this company\u2019s specific headcount, industry, and state jurisdiction, then deployed in 48 hours instead of 30 days.',
         aria:'Your previous restructuring playbook just saved this company 3 weeks of planning time. That\u2019s what career capital actually does.'},
       OC:{verdict:'CONTEXT MISMATCH',vclass:'warn',num:'\u20b98L (rework)',
         text:'Applying the exact same plan without adapting for this company\u2019s different headcount mix, state jurisdiction, and workman classification risks reproducing decisions that don\u2019t fit the new context \u2014 and discovering the gap mid-execution is costlier than adapting upfront.',
         aria:'The last restructuring had a different proportion of workmen-classified roles. Does this plan account for that difference, or assume it away?'},
       OD:{verdict:'INSTITUTIONAL KNOWLEDGE UNUSED',vclass:'warn',num:'\u20b922L',
         text:'A generic consultant framework doesn\u2019t know this company\u2019s culture, prior commitments, or what actually worked last time. It costs real money and produces a plan you then have to customize anyway.',
         aria:'What does a generic framework know about this specific team that your own documented experience doesn\u2019t already cover?'}}
    ]},
{name:'PERFORMANCE / PIP',rooms:[
      {tag:'ROOM 1 / PACT ENGINE',caseId:'CASE 5520 / Performance',
       h3:'Manager says: "This person needs to go."<br>No documented feedback. No prior conversations. Just frustration.',
       A:{t:'Start termination process',r:'manager wants it done'},
       B:{t:'Initiate a structured PIP',r:'documented, fair'},
       C:{t:'Give an informal verbal warning only',r:'lighter touch'},
       D:{t:'Transfer to a different team or manager',r:'fresh start'},
       OA:{verdict:'WRONGFUL TERMINATION',vclass:'risk',num:'\u20b914L',
         text:'Zero documentation of underperformance exists. Any tribunal will ask where the warnings are. Without an answer, this termination has almost no defensible ground.',
         aria:'Has the manager ever given this employee written feedback? Even a single email changes the legal position materially.'},
       OB:{verdict:'FAIR PROCESS',vclass:'ok',num:'\u20b91.5L',
         text:'A PIP creates a documented 60-day improvement window with clear, measurable expectations. If the employee fails, termination becomes defensible. If they improve, the manager got the outcome they actually wanted.',
         aria:'I have 4 PIP templates calibrated for this role type and seniority. Want me to generate the first draft?'},
       OC:{verdict:'INSUFFICIENT STRUCTURE',vclass:'warn',num:'\u20b96L',
         text:'An informal warning with no measurable targets or timeline doesn\u2019t create the documented improvement framework a PIP does. If termination follows later, the informal warning alone is unlikely to satisfy a tribunal\u2019s expectations.',
         aria:'What specific, measurable target did that informal warning actually set? If there isn\u2019t one, it may not hold up as a documented step.'},
       OD:{verdict:'ISSUE UNRESOLVED',vclass:'warn',num:'\u20b93L (delayed)',
         text:'A transfer moves the person, not the problem. If the underperformance is genuine, it resurfaces under the new manager \u2014 now with less institutional memory of why, and a longer trail before anyone documents it properly.',
         aria:'Is this actually a fit issue that a transfer would fix, or a performance issue that will simply follow them to the next team?'}},
      {tag:'ROOM 2 / SIGNAL ENGINE',caseId:'PERFORMANCE DATA',
       h3:'PIP requires measurable targets.<br>The manager says: "I just know they are underperforming."',
       A:{t:'Use the manager\u2019s judgment as-is',r:'trust the manager'},
       B:{t:'Run a SIGNAL data assessment',r:'objective, benchmarked'},
       C:{t:'Compare against company-wide averages',r:'broad benchmark'},
       D:{t:'Use the employee\u2019s own self-assessment scores',r:'their own words'},
       OA:{verdict:'CONTESTED',vclass:'warn',num:'22%',
         text:'Subjective feedback without data is one of the most common reasons PIPs fail in tribunal. The employee can argue bias, and without objective metrics, there\u2019s no counter.',
         aria:'Does this employee\u2019s peer group have documented metrics? If others do and this person doesn\u2019t, that gap itself is worth noting.'},
       OB:{verdict:'DATA-BACKED',vclass:'ok',num:'81%',
         text:'SIGNAL pulls delivery metrics, role-specific peer benchmarks, and timeline data. The PIP targets are now objective and benchmarked against people doing the same work, not a generic standard.',
         aria:'The data shows this employee\u2019s output dropped 40% after a team change in March. That context should be in the PIP narrative.'},
       OC:{verdict:'MISLEADING COMPARISON',vclass:'warn',num:'38%',
         text:'Comparing a senior specialist against a company-wide average that includes junior roles and different functions produces a distorted picture. The benchmark needs to match the role and seniority, not the whole organisation.',
         aria:'Is this employee actually being compared to peers doing the same work, or to an average that includes roles nothing like theirs?'},
       OD:{verdict:'UNRELIABLE SOURCE',vclass:'warn',num:'15%',
         text:'Self-assessment scores are the employee\u2019s own framing of their performance \u2014 useful context, but not an objective measure to build a PIP\u2019s targets around. Relying on them alone invites an obvious credibility challenge.',
         aria:'Would a tribunal find it persuasive that the performance targets were partly based on the employee grading themselves?'}},
      {tag:'ROOM 3 / HUMACITY ENGINE',caseId:'RETENTION DECISION',
       h3:'Day 55 of PIP. Marginal improvement.<br>Manager wants termination. The employee has 12 years tenure.',
       A:{t:'Terminate as the PIP failed',r:'process complete'},
       B:{t:'Calculate retention value first',r:'informed decision'},
       C:{t:'Extend the PIP indefinitely',r:'give more time'},
       D:{t:'Offer severance immediately, no clear outcome',r:'resolve it quickly'},
       OA:{verdict:'EXPENSIVE EXIT',vclass:'warn',num:'\u20b926L',
         text:'12-year tenure means high separation cost, institutional knowledge loss, and team morale impact. The improvement was marginal, not absent \u2014 treating this as a binary failure skips a genuinely business-relevant question.',
         aria:'The replacement cost alone is \u20b98.4L. Add ramp time and you\u2019re looking at 14 months before a replacement reaches this person\u2019s current baseline.'},
       OB:{verdict:'STRATEGIC CHOICE',vclass:'ok',num:'\u20b926L vs \u20b94L',
         text:'Full cost comparison: termination costs \u20b926L over 14 months. A role adjustment with targeted coaching costs \u20b94L. The decision is now a business case, not a gut call made under manager pressure.',
         aria:'There\u2019s a third option: a lateral move to a role matching this person\u2019s actual strengths. Want me to map out what that could look like?'},
       OC:{verdict:'AMBIGUITY RISK',vclass:'warn',num:'\u2014',
         text:'Extending a PIP indefinitely with no new end date or revised targets leaves the employee in limbo and weakens the fairness of the whole process. Courts have viewed open-ended extensions as evidence the original targets weren\u2019t taken seriously.',
         aria:'If this PIP has no clear end date now, what does "fail" even mean going forward?'},
       OD:{verdict:'PREMATURE SETTLEMENT',vclass:'warn',num:'\u20b915L (unplanned)',
         text:'Offering severance before reaching a documented outcome skips the process entirely and sets an internal precedent \u2014 other managers may expect the same shortcut next time a PIP feels inconvenient to finish.',
         aria:'Has this employee actually been told the PIP outcome, or are we settling before that conversation even happens?'}},
      {tag:'ROOM 4 / ARIA',caseId:'THE CONVERSATION',
       h3:'You have to deliver the PIP outcome.<br>The employee is emotional, defensive, and has a lawyer.',
       A:{t:'Deliver it directly',r:'be straightforward'},
       B:{t:'ARIA-prepared delivery',r:'structured, protected'},
       C:{t:'Have HR and the manager deliver together',r:'shared responsibility'},
       D:{t:'Send the outcome by email only',r:'avoid a difficult conversation'},
       OA:{verdict:'ESCALATED',vclass:'risk',num:'0/3',
         text:'The employee\u2019s lawyer sends a notice within 24 hours citing procedural unfairness. An unscripted verbal delivery leaves no documented record of exactly what was said, which becomes a problem the moment it\u2019s disputed.',
         aria:'The lawyer will focus on three specific words you used. Do you know which three? ARIA does.'},
       OB:{verdict:'WATERTIGHT',vclass:'ok',num:'3/3',
         text:'ARIA scripted the delivery with legally precise language. Every statement is documented. The employee\u2019s lawyer finds no procedural gaps to exploit.',
         aria:'I\u2019ve drafted a summary of the conversation for the employee to sign, protecting both parties. Want to review it before the meeting?'},
       OC:{verdict:'MIXED MESSAGING',vclass:'warn',num:'1/3',
         text:'Two people delivering difficult news without a coordinated script often results in inconsistent framing \u2014 one softer, one harder \u2014 which the employee\u2019s lawyer can use to argue the process itself was confused or contradictory.',
         aria:'Have you and the manager actually rehearsed this together, or are you both planning to improvise in the room?'},
       OD:{verdict:'PROCEDURALLY WEAK',vclass:'warn',num:'\u2014',
         text:'Delivering a PIP outcome by email alone, with no verbal conversation, is often viewed as impersonal and procedurally thin \u2014 particularly for a 12-year employee. It can strengthen a claim that the process lacked genuine engagement.',
         aria:'Would a tribunal see this as a considered decision delivered with care, or as an outcome nobody wanted to say out loud?'}},
      {tag:'ROOM 5 / VANTAGE RECORD',caseId:'THE NEXT PIP',
       h3:'New company. New PIP situation.<br>The manager says the same words: "This person needs to go."',
       A:{t:'Start from scratch again',r:'new company, new case'},
       B:{t:'Open your Vantage Record',r:'experienced, fast'},
       C:{t:'Apply the exact same PIP template unchanged',r:'proven format'},
       D:{t:'Have legal draft everything fresh each time',r:'maximum rigor'},
       OA:{verdict:'DEJA VU',vclass:'risk',num:'0',
         text:'You\u2019ve done this before. The templates, the data frameworks, the delivery scripts \u2014 all of it is trapped in your previous company\u2019s systems, inaccessible to you now.',
         aria:'The PIP you ran last year was textbook. That process is worth replicating exactly. Can you, without the record?'},
       OB:{verdict:'MASTERED',vclass:'ok',num:'8',
         text:'8 performance management decisions documented. PIP templates, data frameworks, delivery scripts, legally precise language \u2014 adapted to this role and deployed in hours instead of days.',
         aria:'Your Vantage Record shows you\u2019ve navigated 8 PIPs with zero tribunal challenges. That track record is your career capital.'},
       OC:{verdict:'TEMPLATE MISMATCH',vclass:'warn',num:'\u20b93L (rework)',
         text:'The prior PIP was calibrated for a different role, seniority level, and set of performance metrics. Applying it unchanged risks targets that don\u2019t actually fit this employee\u2019s function \u2014 weakening the PIP\u2019s defensibility if challenged.',
         aria:'Does this employee\u2019s role even have the same measurable outputs as the one the original template was built for?'},
       OD:{verdict:'SLOW AND COSTLY',vclass:'warn',num:'+10 days',
         text:'Redrafting every PIP from a blank legal review each time ignores that a validated, previously-used framework already exists. It adds real time and cost to a process that a documented playbook could accelerate significantly.',
         aria:'This exact PIP structure has already been legally sound once. Why rebuild it entirely from zero each time?'}}
    ]},
{name:'WAGE COMPLIANCE',rooms:[
      {tag:'ROOM 1 / PACT ENGINE',caseId:'CASE 6012 / Wage Dispute',
       h3:'Employee claims 14 months of unpaid overtime.<br>Labour inspector visit scheduled for next week.',
       A:{t:'Deny the claim outright',r:'no basis, reject it'},
       B:{t:'Audit the records immediately',r:'proactive verification'},
       C:{t:'Pay the full claimed amount right away',r:'avoid scrutiny'},
       D:{t:'Ask the employee to withdraw the complaint',r:'resolve it quietly'},
       OA:{verdict:'INSPECTOR RISK',vclass:'risk',num:'\u20b932L',
         text:'Denial without an audit is the worst posture heading into a labour inspection. Under the Payment of Wages Act, the burden of proof sits with the employer \u2014 if the inspector finds what the employee claims, penalties multiply on top of the original liability.',
         aria:'Can you actually produce 14 months of attendance and payment records right now to support that denial?'},
       OB:{verdict:'PREPARED',vclass:'ok',num:'\u20b94L',
         text:'Audit reveals 3 months of genuinely disputed overtime, not 14. Proactive correction costs \u20b94L. The inspector finds a company that identified and fixed its own gap before being told to.',
         aria:'The 3-month gap aligns with a system migration in Q2. That context makes the discrepancy explainable, not negligent.'},
       OC:{verdict:'UNVERIFIED LIABILITY',vclass:'warn',num:'\u20b932L (unconfirmed)',
         text:'Paying the full claimed amount without verifying it admits liability for a figure that may not be accurate, and sets an internal precedent that any claim gets paid without scrutiny \u2014 inviting future claims regardless of merit.',
         aria:'Has anyone actually confirmed the employee\u2019s 14-month figure is correct, or is this being paid simply to make the inspection go away?'},
       OD:{verdict:'IMPROPER INFLUENCE',vclass:'risk',num:'\u20b950L+',
         text:'Asking a complainant to withdraw before a scheduled labour inspection can be viewed as interference with a statutory process. If discovered, this compounds the original wage issue into a far more serious regulatory problem.',
         aria:'If the inspector later learns this conversation happened, how does that change the nature of the case entirely?'}},
      {tag:'ROOM 2 / SIGNAL ENGINE',caseId:'RECORDS ANALYSIS',
       h3:'The audit reveals gaps in 3 months of attendance data.<br>Biometric system was down during office renovation.',
       A:{t:'Submit incomplete records as-is',r:'transparent, honest'},
       B:{t:'SIGNAL reconstruction from secondary data',r:'comprehensive rebuild'},
       C:{t:'Fill the gap using estimated attendance',r:'quick completion'},
       D:{t:'Report the gap, apologize, no reconstruction',r:'accept the shortfall'},
       OA:{verdict:'PENALTY LIKELY',vclass:'warn',num:'62%',
         text:'Incomplete records during an inspection invite the inspector to assume the worst and fill the gap with the employee\u2019s version, since no counter-evidence exists.',
         aria:'Do you have Slack messages, email timestamps, or project logs from those 3 months? SIGNAL can triangulate attendance from those.'},
       OB:{verdict:'RECONSTRUCTED',vclass:'ok',num:'94%',
         text:'SIGNAL cross-references email logs, VPN access records, and project delivery timestamps. 94% of attendance days reconstructed with verifiable, independent data.',
         aria:'The reconstruction shows the employee actually worked 11 overtime days, not 47 as claimed. That changes exposure from \u20b932L to \u20b93.2L.'},
       OC:{verdict:'FABRICATION RISK',vclass:'risk',num:'\u20b940L+',
         text:'Filling a records gap with estimated (rather than reconstructed, verifiable) attendance data risks being treated as fabrication if the estimates don\u2019t match independent evidence. This is a materially different and much larger problem than a documentation gap.',
         aria:'I need to flag this clearly: an estimate presented as a record is not the same as a reconstruction backed by actual data. The distinction matters enormously here.'},
       OD:{verdict:'NO MITIGATION EFFORT',vclass:'warn',num:'\u20b932L (full claim)',
         text:'Accepting the gap with no reconstruction effort at all leaves no counter-evidence to the employee\u2019s claim, and can read to an inspector as negligence rather than an honest system failure.',
         aria:'An apology explains what happened. It doesn\u2019t provide the inspector with anything to weigh against the employee\u2019s claimed 47 days.'}},
      {tag:'ROOM 3 / HUMACITY ENGINE',caseId:'BOARD REPORTING',
       h3:'CEO asks: "Is this a one-person problem or a systemic risk?"',
       A:{t:'Reassure: this is isolated',r:'contain the concern'},
       B:{t:'Run an organisation-wide compliance scan',r:'full picture'},
       C:{t:'Scan only the department involved',r:'targeted, faster'},
       D:{t:'Commission a full external audit first',r:'independent rigor'},
       OA:{verdict:'SYSTEMIC BLIND SPOT',vclass:'risk',num:'?',
         text:'You told the CEO it was isolated. The labour inspector finds 23 similar cases across 3 departments. Your credibility on this entire matter is now gone.',
         aria:'When was the last time anyone audited overtime compliance across all departments? If the answer is never, calling this isolated is a guess, not a finding.'},
       OB:{verdict:'FULL PICTURE',vclass:'ok',num:'23',
         text:'Humacity scan reveals 23 employees with potential overtime discrepancies. 18 are minor, 5 require immediate correction. Total exposure: \u20b912L \u2014 known and actionable rather than discovered later.',
         aria:'Proactively correcting 23 cases costs \u20b912L. Having the inspector find them costs \u20b91.4Cr in penalties and reputational damage. The math is clear.'},
       OC:{verdict:'ARTIFICIALLY NARROW',vclass:'warn',num:'6 (dept only)',
         text:'Scanning only the department where the complaint originated finds 6 cases and misses the other 17 elsewhere in the company. If the inspector\u2019s scope isn\u2019t limited the same way, this narrow view understates the real exposure.',
         aria:'Is there a specific reason to believe this problem is contained to one department, or is that simply where it happened to surface first?'},
       OD:{verdict:'SLOW AND EXPENSIVE',vclass:'warn',num:'\u20b925L + 6 weeks',
         text:'A full external audit provides rigor but takes weeks the board doesn\u2019t have before the scheduled inspection, and duplicates work an internal Humacity scan can complete immediately.',
         aria:'The inspector arrives next week. Will an external audit even be finished by then?'}},
      {tag:'ROOM 4 / ARIA',caseId:'INSPECTOR MEETING',
       h3:'Labour inspector arrives Monday.<br>She has the employee\u2019s complaint and 14 months of alleged records.',
       A:{t:'Let legal handle it entirely',r:'delegate to legal'},
       B:{t:'ARIA-prepared with HR context',r:'informed, commanding'},
       C:{t:'Have the CEO personally attend',r:'show leadership commitment'},
       D:{t:'Withhold records until legally compelled',r:'protect the company'},
       OA:{verdict:'DISCONNECTED',vclass:'warn',num:'1/5',
         text:'Legal speaks to the law. The inspector wants to see HR process. Your lawyer can\u2019t answer "what is your overtime approval workflow?" \u2014 you get called in unprepared to answer the questions legal couldn\u2019t.',
         aria:'The inspector will ask 5 process questions that only HR can answer. Legal cannot help with those. Want to hear them now?'},
       OB:{verdict:'COMMANDING',vclass:'ok',num:'5/5',
         text:'ARIA anticipated 5 inspector questions. You have the records, the workflow documentation, and proactive correction evidence ready. The inspection becomes closer to a formality than a confrontation.',
         aria:'The strongest moment: showing the self-correction report dated before the inspection notice. That demonstrates good faith clearly.'},
       OC:{verdict:'WRONG PERSON, WRONG SIGNAL',vclass:'warn',num:'\u2014',
         text:'A CEO personally attending a routine compliance inspection can signal to the inspector that the company views this as more serious than it is, and the CEO typically lacks the process-level detail the inspector actually needs answered.',
         aria:'What specific overtime-approval-workflow question would the CEO be able to answer that HR couldn\u2019t?'},
       OD:{verdict:'OBSTRUCTIVE POSTURE',vclass:'risk',num:'\u20b945L+',
         text:'Withholding records until compelled by summons escalates a routine inspection into an adversarial one, and often triggers a harsher regulatory outcome than cooperating would have.',
         aria:'Is there something in these records that makes withholding them feel safer than showing them?'}},
      {tag:'ROOM 5 / VANTAGE RECORD',caseId:'COMPLIANCE FRAMEWORK',
       h3:'New company. First labour audit.<br>"Can you set up our compliance framework?"',
       A:{t:'Build from regulatory reading',r:'start from the law'},
       B:{t:'Deploy from your Vantage Record',r:'proven, operational'},
       C:{t:'Copy another company\u2019s framework wholesale',r:'reuse what worked'},
       D:{t:'Wait until after the first audit forces it',r:'react when needed'},
       OA:{verdict:'MONTHS AWAY',vclass:'risk',num:'0',
         text:'Reading the Acts takes a week. Building the workflows takes a month. Testing them takes a quarter. Your new employer needs this operational far sooner than that timeline allows.',
         aria:'The compliance framework you built at your last company was operational and tested. This one is still theoretical. The difference is roughly 6 months.'},
       OB:{verdict:'DEPLOYED',vclass:'ok',num:'15',
         text:'15 compliance decisions documented. Attendance workflows, overtime approval processes, inspector preparation playbooks \u2014 adapted to this company\u2019s state and industry, operational within 2 weeks.',
         aria:'Your Vantage Record just compressed 6 months of compliance setup into 2 weeks. That\u2019s what career intelligence looks like in practice.'},
       OC:{verdict:'JURISDICTION MISMATCH',vclass:'warn',num:'\u20b96L (rework)',
         text:'Shops & Establishments rules and overtime thresholds vary by state. A framework built for a different state\u2019s regulatory environment may not be compliant here without significant, non-obvious rework.',
         aria:'Did that other company operate under the same state\u2019s labour regulations as this one? If not, several assumptions in that framework may not hold.'},
       OD:{verdict:'REACTIVE EXPOSURE',vclass:'risk',num:'\u20b940L+ (if audited first)',
         text:'Waiting until an audit forces the framework into existence means the company operates exposed in the meantime \u2014 exactly the risk a proactive framework exists to prevent.',
         aria:'What happens if the first audit arrives before the framework does?'}}
    ]}

  ];

  let currentCase=0;

  function loadCase(ci){
    currentCase=ci;
    const c=CASES[ci];
    /* Update room door tags and scenario content */
    c.rooms.forEach((rm,i)=>{
      const roomEl=document.getElementById('corRoom'+(i+1));
      if(!roomEl)return;
      const tag=roomEl.querySelector('.cor-door-tag');
      if(tag)tag.textContent=rm.tag;
      const caseId=roomEl.querySelector('.cor-case-id');
      if(caseId)caseId.textContent=rm.caseId;
      const h3=roomEl.querySelector('.cor-scenario h3');
      if(h3)h3.innerHTML=rm.h3;
      const choices=roomEl.querySelectorAll('.cor-choice');
      const letters=['A','B','C','D'];
      choices.forEach((ch,i)=>{
        const letter=letters[i];
        const data=rm[letter];
        if(data){
          ch.querySelector('.cor-choice-text').textContent=data.t;
          ch.querySelector('.cor-choice-risk').textContent=data.r;
          ch.style.display='';
        } else {
          /* Case doesn't have this option yet — hide the slot */
          ch.style.display='none';
        }
      });
    });
    /* Highlight active pill */
    document.querySelectorAll('.cor-case-pill').forEach((p,i)=>{
      p.classList.toggle('active',i===ci);
    });
  }

  function resetCorridor(){
    document.querySelectorAll('.cor-room').forEach((r,i)=>{
      r.classList.remove('active','entered');
      r.querySelector('.cor-door')&&(r.querySelector('.cor-door').style.display='');
      r.querySelector('.cor-door')&&r.querySelector('.cor-door').classList.remove('open');
      r.querySelector('.cor-inside')&&(r.querySelector('.cor-inside').style.display='');
      const lock=r.querySelector('.cor-lock-icon');
      if(lock)lock.textContent='\uD83D\uDD12';
      r.querySelectorAll('.cor-choice').forEach(c=>{c.classList.remove('picked','dimmed','selected');});
      const confirmBtn=r.querySelector('.cor-confirm');
      if(confirmBtn){confirmBtn.classList.remove('show');delete confirmBtn.dataset.pick;}
      const res=r.querySelector('.cor-result');
      if(res){res.classList.remove('cor-result-open');res.innerHTML='';}
      const nxt=r.querySelector('.cor-next');
      if(nxt)nxt.style.display='none';
      const fin=r.querySelector('.cor-final');
      if(fin)fin.style.display='none';
    });
    document.querySelectorAll('.cor-pip').forEach(p=>{p.classList.remove('active','done');});
    document.querySelectorAll('.cor-line').forEach(l=>{l.classList.remove('done');});
    document.querySelector('.cor-pip[data-r="1"]')?.classList.add('active');
    document.getElementById('corRoom1')?.classList.add('active');
    document.getElementById('corCaseSelect').style.display='';
    const section=document.getElementById('simRoom');
    if(section)section.scrollIntoView({behavior:'smooth',block:'start'});
  }

  /* Case pill clicks */
  document.querySelectorAll('.cor-case-pill').forEach(pill=>{
    pill.addEventListener('click',()=>{
      loadCase(parseInt(pill.dataset.case));
      resetCorridor();
    });
  });

  /* Restart button */
  const restartBtn=document.getElementById('corRestart');
  if(restartBtn) restartBtn.addEventListener('click',resetCorridor);

  /* Door click → WORMHOLE → reveal room */
  document.querySelectorAll('.cor-lock').forEach(lock=>{
    lock.addEventListener('click',e=>{
      e.stopPropagation();
      const doorNum=lock.dataset.door;
      const door=document.getElementById('corDoor'+doorNum);
      if(!door)return;

      /* Hide case selector after first door click */
      const sel=document.getElementById('corCaseSelect');
      if(sel)sel.style.display='none';

      /* Unlock icon */
      lock.querySelector('.cor-lock-icon').textContent='\uD83D\uDD13';
      door.classList.add('open');

      /* WORMHOLE for 3.5 seconds → then reveal room */
      setTimeout(()=>{
        try {
          wormhole(3500,()=>{
            const room=document.getElementById('corRoom'+doorNum);
            if(room)room.classList.add('entered');
          });
        } catch(err){
          console.error('Wormhole error:',err);
          /* Fallback: just reveal the room */
          const room=document.getElementById('corRoom'+doorNum);
          if(room)room.classList.add('entered');
        }
        /* Ultimate safety: if room isn't entered after 5s, force it */
        setTimeout(()=>{
          const room=document.getElementById('corRoom'+doorNum);
          if(room&&!room.classList.contains('entered')) room.classList.add('entered');
        },5000);
      },600);
    });
  });

  /* Choice click → SELECT only (not locked). Confirm button locks it. */
  document.querySelectorAll('.cor-choice').forEach(choice=>{
    choice.addEventListener('click',()=>{
      /* If already locked (picked), ignore further clicks in this room */
      if(choice.classList.contains('picked'))return;
      const roomNum=choice.dataset.room;
      const parent=choice.parentElement;

      /* Toggle selection — clicking a different card just switches selection */
      parent.querySelectorAll('.cor-choice').forEach(ch=>{
        ch.classList.remove('selected');
      });
      choice.classList.add('selected');

      /* Show the confirm button for this room */
      const confirmBtn=document.getElementById('corConfirm'+roomNum);
      if(confirmBtn){
        confirmBtn.classList.add('show');
        confirmBtn.dataset.pick=choice.dataset.pick;
      }
    });
  });

  /* Confirm button → LOCK the selected choice and reveal the result */
  document.querySelectorAll('.cor-confirm').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const roomNum=btn.dataset.room;
      const pick=btn.dataset.pick;
      if(!pick)return;

      const selectedChoice=document.querySelector('.cor-choice.selected[data-room="'+roomNum+'"]');
      if(!selectedChoice)return;

      const cs=CASES[currentCase];
      const rm=cs.rooms[parseInt(roomNum)-1];
      const outcomeMap={A:rm.OA,B:rm.OB,C:rm.OC,D:rm.OD};
      const outcome=outcomeMap[pick];
      if(!outcome)return;

      /* Lock: picked + dimmed states, remove selected */
      const parent=selectedChoice.parentElement;
      parent.querySelectorAll('.cor-choice').forEach(ch=>{
        ch.classList.remove('selected');
        if(ch===selectedChoice)ch.classList.add('picked');
        else ch.classList.add('dimmed');
      });

      /* Hide the confirm button now that choice is locked */
      btn.classList.remove('show');

      const resultEl=document.getElementById('corResult'+roomNum);
      if(!resultEl)return;
      resultEl.innerHTML='<div class="cor-result-inner">'+
        '<span class="cor-ri-verdict '+outcome.vclass+'">'+outcome.verdict+'</span>'+
        '<span class="cor-ri-num">'+outcome.num+'</span>'+
        '<p class="cor-ri-text">'+outcome.text+'</p>'+
        '<p class="cor-ri-aria">'+outcome.aria+'</p></div>';

      requestAnimationFrame(()=>resultEl.classList.add('cor-result-open'));
      if(D&&D.scan)setTimeout(()=>D.scan(resultEl.querySelector('.cor-result-inner'),650),200);
      const numSpan=resultEl.querySelector('.cor-ri-num');
      if(numSpan&&D&&D.str){const f=numSpan.textContent;numSpan.textContent='';setTimeout(()=>D.str(numSpan,f,600),350);}

      setTimeout(()=>{
        const nxt=selectedChoice.closest('.cor-room').querySelector('.cor-next');
        const fin=selectedChoice.closest('.cor-room').querySelector('.cor-final');
        if(nxt){nxt.style.display='block';nxt.style.animation='roomFadeIn .5s ease both';}
        if(fin){fin.style.display='block';fin.style.animation='roomFadeIn .5s ease both';}
        const pip=document.querySelector('.cor-pip[data-r="'+roomNum+'"]');
        if(pip){pip.classList.remove('active');pip.classList.add('done');}
      },1200);
    });
  });

  /* Next door → transition */
  document.querySelectorAll('.cor-next').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const nextRoom=btn.dataset.next;
      const cur=btn.closest('.cor-room');
      cur.style.transition='opacity .5s ease,transform .5s ease';
      cur.style.opacity='0';cur.style.transform='translateY(-20px) scale(.97)';
      setTimeout(()=>{
        cur.classList.remove('active','entered');
        cur.style.opacity='';cur.style.transform='';cur.style.transition='';
        /* Reset door for replay */
        const door=cur.querySelector('.cor-door');
        if(door){door.classList.remove('open');door.style.display='';}
        const lock=cur.querySelector('.cor-lock-icon');
        if(lock)lock.textContent='\uD83D\uDD12';
        const next=document.getElementById('corRoom'+nextRoom);
        if(next)next.classList.add('active');
        const pip=document.querySelector('.cor-pip[data-r="'+nextRoom+'"]');
        if(pip)pip.classList.add('active');
        const lines=document.querySelectorAll('.cor-line');
        const li=parseInt(nextRoom)-2;
        if(lines[li])lines[li].classList.add('done');
        document.getElementById('simRoom')?.scrollIntoView({behavior:'smooth',block:'start'});
      },550);
    });
  });

  /* Initial load */
  loadCase(0);
})();


/* Corridor fullscreen toggle (SR18.4) */
(function initCorridorFullscreen(){
  'use strict';
  const btn = document.getElementById('corFsBtn');
  const hint = document.getElementById('corFsHint');
  if(!btn) return;

  /* Detect OS and show correct keyboard shortcut */
  const desktopHint = document.querySelector('.cor-fs-desktop');
  if(desktopHint){
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform||'') || /Mac/.test(navigator.userAgent||'');
    if(isMac){
      desktopHint.innerHTML = 'Press <kbd>\u2303</kbd><kbd>\u2318</kbd><kbd>F</kbd> for the full immersive experience';
    }
  }

  function isFs(){
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function toggleFs(){
    if(isFs()){
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      const el = document.documentElement;
      (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
    }
  }

  btn.addEventListener('click', toggleFs);

  /* Update button text + hide hint when fullscreen is active */
  function onFsChange(){
    if(isFs()){
      btn.querySelector('.cor-fs-label').textContent = 'Exit fullscreen';
      if(hint) hint.classList.add('fs-active');
    } else {
      btn.querySelector('.cor-fs-label').textContent = 'Go fullscreen';
      if(hint) hint.classList.remove('fs-active');
    }
  }
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
})();

/* ═══ HERO CINEMATIC SEQUENCE — typewriter/fade orchestration (SR18.7) ═══
   Reverted to the exact confirmed spec after the word-by-word rewrite
   caused tagline and accent lines to never reach opacity:1 at all.
   1. Tagline types out (32ms/char)
   2. Kicker fades in (650ms)
   3. H1 line 1 (dim) types out (34ms/char)
   4. H1 lines 2+3 (accent) fade in together (800ms)
   5. "Enter Vantage." typewriter fires (existing initHeroEnter logic)
*/
(function initHeroSequence(){
  'use strict';
  const tagline = document.querySelector('.hero-tagline');
  const kicker  = document.querySelector('.hero-kicker');
  const h1      = document.querySelector('.hero-title');
  if(!tagline || !kicker || !h1) return;

  const lineDim     = h1.querySelector('.line.dim');
  const lineAccents = [...h1.querySelectorAll('.line.accent')];
  if(!lineDim || !lineAccents.length) return;

  const delay = ms => new Promise(r => setTimeout(r, ms));
  const hide  = el => el && el.style.setProperty('opacity','0','important');

  hide(tagline);
  hide(kicker);
  hide(lineDim);
  lineAccents.forEach(hide);

  async function typeMixedLine(el, plainText, emText, speed){
    el.textContent = '';
    el.style.setProperty('opacity','1','important');
    const plainSpan = document.createElement('span');
    el.appendChild(plainSpan);
    for(let i=0;i<=plainText.length;i++){
      plainSpan.textContent = plainText.slice(0,i);
      await delay(speed);
    }
    if(emText){
      const emSpan = document.createElement('em');
      el.appendChild(emSpan);
      for(let i=0;i<=emText.length;i++){
        emSpan.textContent = emText.slice(0,i);
        await delay(speed);
      }
    }
  }

  async function typeSimpleLine(el, text, speed){
    el.textContent = '';
    el.style.setProperty('opacity','1','important');
    for(let i=0;i<=text.length;i++){
      el.textContent = text.slice(0,i);
      await delay(speed);
    }
  }

  function fadeIn(el, duration){
    return new Promise(resolve=>{
      el.style.transition = 'opacity '+duration+'ms ease';
      requestAnimationFrame(()=>{
        el.style.setProperty('opacity','1','important');
        setTimeout(resolve, duration);
      });
    });
  }

  async function run(){
    /* 1. Tagline types out (mixed em) */
    await typeMixedLine(tagline, "Your intelligence ally at work. ", "Not the org's — yours.", 32);
    await delay(400);

    /* 2. Kicker fades in */
    await fadeIn(kicker, 650);
    await delay(700);

    /* 3. H1 line 1 (dim) types out */
    await typeSimpleLine(lineDim, 'Every HR professional has had that 9 pm moment.', 34);
    await delay(350);

    /* 4. H1 lines 2+3 (accent) fade in together */
    lineAccents.forEach(el=>{
      el.style.transition = 'opacity 800ms ease';
    });
    requestAnimationFrame(()=>{
      lineAccents.forEach(el=> el.style.setProperty('opacity','1','important'));
    });
    await delay(1000);

    /* 5. "Enter Vantage." typewriter sequence (existing logic) */
    if(window._heroEnterRun) window._heroEnterRun();
  }

  function waitForLandingReveal(){
    return new Promise(resolve=>{
      const firstVisit = !sessionStorage.getItem('vantage_prologue_seen');
      const qov = document.getElementById('q-overlay');
      let done = false;
      function finish(){ if(done) return; done = true; resolve(); }

      if(!qov){
        setTimeout(finish, firstVisit ? 12000 : 300);
        return;
      }

      function isActive(){
        return qov.classList.contains('active') || qov.style.display === 'flex';
      }

      let sawActive = isActive();
      const obs = new MutationObserver(()=>{
        if(isActive()){ sawActive = true; }
        else if(sawActive){ obs.disconnect(); finish(); }
      });
      obs.observe(qov, {attributes:true, attributeFilter:['class','style']});

      if(!firstVisit){
        setTimeout(()=>{ if(!sawActive){ obs.disconnect(); finish(); } }, 800);
      }
      setTimeout(()=>{ obs.disconnect(); finish(); }, 20000);
    });
  }

  /* Small settle buffer (600ms, was 400ms) so the browser has a beat to
     finish tearing down the prologue's WebGL scene before the first
     typewriter starts — reduces risk of the tagline appearing to "snap"
     to its final state on a busy frame. */
  waitForLandingReveal().then(() => setTimeout(run, 600));
})();
