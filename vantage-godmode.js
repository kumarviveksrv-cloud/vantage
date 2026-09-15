/* VANTAGE // GOD MODE / THE INTELLIGENCE FIELD
   A contained experimental layer over the V7 intelligence engine. */
(function(){
  'use strict';
  const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>[...p.querySelectorAll(s)];
  let root=$('#godField');
  if(!root){
    const link=document.createElement('link');link.rel='stylesheet';link.href='vantage-godmode.css';document.head.appendChild(link);
    const signal=document.querySelector('.signal-strip');
    if(signal){
      const section=document.createElement('section');section.className='god-field cinematic-panel';section.id='intelligence-field';section.setAttribute('aria-label','Vantage intelligence field');
      section.innerHTML=`<canvas id="godCanvas" aria-hidden="true"></canvas><div class="god-scan" aria-hidden="true"></div><div class="god-noise" aria-hidden="true"></div><div class="god-top"><div class="god-kicker">VANTAGE / INTELLIGENCE FIELD<b>THE SYSTEM DOES NOT WAIT FOR THE ANSWER.</b></div><div class="god-phase">FIELD STATE / <b id="godPhase">OBSERVING</b><br>MODEL / LIVE</div></div><div class="god-copy"><p class="eyebrow">02 / THE INTELLIGENCE</p><h2>Watch a decision<br><em>become intelligence.</em></h2><p>Context enters the field. Signals connect. Consequences separate. Move through the system and see what changes when one variable changes.</p></div><div class="god-readout"><div class="god-readout-head"><span>FIELD / LIVE</span><b>●</b></div><div class="god-readout-row"><span>SIGNAL</span><strong id="godSignal">LISTENING</strong></div><div class="god-readout-row"><span>RISK</span><strong id="godRisk">UNRESOLVED</strong></div><div class="god-readout-row"><span>ENERGY</span><strong id="godEnergy">.50</strong></div><div class="god-readout-row"><span>MEMORY</span><strong id="godMemory">LISTENING</strong></div></div><div class="god-node-ui" id="godNodeUI"><button id="godNodeButton"><b id="godNodeLabel">CONTEXT</b><span id="godNodeSub">07 VARIABLES</span></button></div><div class="god-insight" id="godInsight"><small id="godInsightSmall">FIELD / INTERPRETATION</small><strong id="godInsightStrong">The system is observing the variables around the decision.</strong></div><div class="god-command"><i></i><span id="godCommandText">FIELD / AWAITING DECISION</span></div>`;
      signal.parentNode.insertBefore(section,signal);root=section;
    }
  }
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!root||!window.THREE||reduce)return;
  const canvas=$('#godCanvas');
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
  renderer.setSize(innerWidth,innerHeight);
  renderer.setClearColor(0,0);

  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(38,innerWidth/innerHeight,.1,100);
  camera.position.set(0,0,12);
  const world=new THREE.Group(); scene.add(world);

  const state={energy:.5,locked:null,mx:0,my:0,scroll:0,onScreen:false};
  const palette={base:new THREE.Color('#8ea0ff'),cyan:new THREE.Color('#7dd3fc'),lav:new THREE.Color('#c4b5fd'),green:new THREE.Color('#75f5bb'),amber:new THREE.Color('#ffb547'),red:new THREE.Color('#ff6b81')};

  // Central intelligence core: nested shells, not a literal glowing ball.
  const core=new THREE.Group(); world.add(core);
  const coreMat=new THREE.MeshBasicMaterial({color:palette.lav,transparent:true,opacity:.8,wireframe:true});
  const coreShell=new THREE.Mesh(new THREE.IcosahedronGeometry(1.08,3),coreMat); core.add(coreShell);
  const coreInner=new THREE.Mesh(new THREE.IcosahedronGeometry(.62,2),new THREE.MeshBasicMaterial({color:palette.cyan,transparent:true,opacity:.16,wireframe:true})); core.add(coreInner);
  const coreAura=new THREE.Mesh(new THREE.SphereGeometry(1.7,32,24),new THREE.MeshBasicMaterial({color:palette.base,transparent:true,opacity:.035,blending:THREE.AdditiveBlending,depthWrite:false})); core.add(coreAura);

  const rings=[];
  [[1.55,.12,0],[2.05,-.28,.8],[2.65,.08,-.55]].forEach((r,i)=>{
    const m=new THREE.MeshBasicMaterial({color:i===1?palette.cyan:palette.lav,transparent:true,opacity:.22,wireframe:true});
    const mesh=new THREE.Mesh(new THREE.TorusGeometry(r[0],.008,8,180),m); mesh.rotation.x=Math.PI*.5+r[1]; mesh.rotation.y=r[2]; core.add(mesh); rings.push(mesh);
  });

  // Seven contextual nodes. Each node has mass, orbit and a visible information trail.
  const data=[
    {id:'people',label:'PEOPLE',sub:'EMPLOYEE / MANAGER',detail:'The human stakes are already in the field.',angle:-Math.PI*.5,r:3.25,y:.7,color:palette.lav},
    {id:'policy',label:'POLICY',sub:'PROCESS / RULE',detail:'The decision inherits a process burden.',angle:-Math.PI*.05,r:3.5,y:1.35,color:palette.cyan},
    {id:'business',label:'BUSINESS',sub:'IMPACT / PRESSURE',detail:'Closure speed is not the same as business safety.',angle:Math.PI*.38,r:3.3,y:.2,color:palette.base},
    {id:'finance',label:'FINANCE',sub:'EXPOSURE / ₹',detail:'Consequences can be expressed in money.',angle:Math.PI*.82,r:3.65,y:-1.05,color:palette.amber},
    {id:'context',label:'CONTEXT',sub:'07 VARIABLES',detail:'State, industry, size and role alter the answer.',angle:Math.PI*1.18,r:3.45,y:-.25,color:palette.cyan},
    {id:'memory',label:'MEMORY',sub:'RECORD / TRACE',detail:'The decision should leave a professional trace.',angle:Math.PI*1.62,r:3.7,y:-1.15,color:palette.lav},
    {id:'voice',label:'VOICE',sub:'ARIA / REHEARSAL',detail:'The right intelligence arrives before the conversation.',angle:Math.PI*1.95,r:3.2,y:.9,color:palette.green}
  ];
  const nodes=[];
  const lineGroup=new THREE.Group(); world.add(lineGroup);
  const trailGroup=new THREE.Group(); world.add(trailGroup);
  const nodeMat=(c)=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.9});
  data.forEach((d,i)=>{
    const g=new THREE.Group(); g.userData={...d,index:i,baseX:0,baseY:0,baseZ:0,phase:Math.random()*6}; world.add(g);
    const orb=new THREE.Mesh(new THREE.IcosahedronGeometry(.18+(i%3)*.025,1),nodeMat(d.color)); g.add(orb);
    const halo=new THREE.Mesh(new THREE.SphereGeometry(.34,16,12),new THREE.MeshBasicMaterial({color:d.color,transparent:true,opacity:.035,blending:THREE.AdditiveBlending,depthWrite:false})); g.add(halo);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.28,.006,6,48),new THREE.MeshBasicMaterial({color:d.color,transparent:true,opacity:.35})); ring.rotation.x=Math.PI*.5; g.add(ring);
    const trail=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:d.color,transparent:true,opacity:.16})); trailGroup.add(trail); g.userData.trail=trail;
    nodes.push(g);
  });

  // Fine-grain information dust.
  const dustCount=Math.min(1300,Math.floor(innerWidth*innerHeight/1000));
  const dustPos=new Float32Array(dustCount*3), dustCol=new Float32Array(dustCount*3);
  for(let i=0;i<dustCount;i++){
    const a=Math.random()*Math.PI*2, r=2+Math.pow(Math.random(),.6)*6.5;
    dustPos[i*3]=Math.cos(a)*r; dustPos[i*3+1]=(Math.random()-.5)*5.6; dustPos[i*3+2]=Math.sin(a)*r*.55;
    const c=Math.random()>.72?palette.cyan:palette.lav; dustCol[i*3]=c.r;dustCol[i*3+1]=c.g;dustCol[i*3+2]=c.b;
  }
  const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.BufferAttribute(dustPos,3));dg.setAttribute('color',new THREE.BufferAttribute(dustCol,3));
  const dust=new THREE.Points(dg,new THREE.PointsMaterial({size:.022,transparent:true,opacity:.35,vertexColors:true,blending:THREE.AdditiveBlending,depthWrite:false}));world.add(dust);

  // Long thin arcs make the field feel computational rather than decorative.
  const arcGroup=new THREE.Group();world.add(arcGroup);
  for(let i=0;i<9;i++){
    const pts=[];const rr=4.2+i*.22;for(let j=0;j<100;j++){const a=-Math.PI*.8+(j/99)*Math.PI*1.6;pts.push(new THREE.Vector3(Math.cos(a)*rr,(Math.sin(a)*rr*.18)+(i-4)*.18,Math.sin(a)*rr*.42));}
    const geo=new THREE.BufferGeometry().setFromPoints(pts);
    const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:i%3===0?palette.cyan:palette.lav,transparent:true,opacity:.05+(i%2)*.025}));arcGroup.add(line);
  }

  const nodeUI=$('#godNodeUI'), nodeButton=$('#godNodeButton'), nodeLabel=$('#godNodeLabel'), nodeSub=$('#godNodeSub');
  const insight=$('#godInsight'), insightSmall=$('#godInsightSmall'), insightStrong=$('#godInsightStrong');
  const phaseEl=$('#godPhase'), signalEl=$('#godSignal'), riskEl=$('#godRisk'), energyEl=$('#godEnergy'), memoryEl=$('#godMemory');
  const command=$('#godCommandText');
  let hovered=null;

  function setAccent(color){coreMat.color.copy(color);coreInner.material.color.copy(color);coreAura.material.color.copy(color);rings.forEach((r,i)=>r.material.color.copy(i===1?palette.cyan:color));nodes.forEach(n=>{if(n.userData.index===state.locked||n===hovered)n.children[0].material.color.copy(color);});}
  function showNode(n){
    hovered=n;
    nodeLabel.textContent=n.userData.label;
    nodeSub.textContent=n.userData.sub;
    nodeUI.classList.add('show');
    insight.classList.add('show');
    insightSmall.textContent=n.userData.label+' / FIELD INTERPRETATION';
    insightStrong.textContent=n.userData.detail;
    setAccent(n.userData.color);
  }
  function hideNode(){if(state.locked!==null)return;hovered=null;nodeUI.classList.remove('show');insight.classList.remove('show');setAccent(palette.lav)}
  nodeButton?.addEventListener('click',()=>{if(!hovered)return;state.locked=hovered.userData.index;command.textContent='NODE LOCKED / '+hovered.userData.label;nodeUI.classList.add('show');insight.classList.add('show');});

  function decisionUpdate(detail){
    const map={A:['risk','HIGH','0.91',palette.red,'EXPOSURE FIELD / EXPANDING'],B:['partial','MATERIAL','0.63',palette.amber,'PROCESS FIELD / OPEN'],C:['defensible','LOW','0.71',palette.green,'FIELD RESOLVED / DEFENSIBLE'],D:['risk','HIGH','0.88',palette.red,'PROCEDURAL RISK / EXPANDING']};
    const d=map[detail.key]||map.B;
    root.dataset.state=d[0];state.energy=parseFloat(d[2]);
    phaseEl.textContent='CONSEQUENCE';signalEl.textContent=d[4];riskEl.textContent=d[1];energyEl.textContent=d[2];
    command.textContent='DECISION SIGNAL / PROPAGATING';
    setAccent(d[3]);
    // Causal pulse through every connection.
    nodes.forEach((n,i)=>{n.userData.pulseAt=performance.now()+i*55;n.scale.setScalar(1)});
    insight.classList.add('show');insightSmall.textContent='DECISION FIELD / '+detail.key;insightStrong.textContent=detail.key==='C'?'The system has found a defensible path.':'The field is carrying more risk than the decision surface suggests.';
  }
  $$('#choices button').forEach(btn=>btn.addEventListener('click',()=>{decisionUpdate({key:btn.dataset.choice});window.dispatchEvent(new CustomEvent('vantage:decision',{detail:{key:btn.dataset.choice}}));}));
  $('#caseReset')?.addEventListener('click',()=>{root.dataset.state='';state.energy=.5;state.locked=null;phaseEl.textContent='OBSERVING';signalEl.textContent='LISTENING';riskEl.textContent='UNRESOLVED';energyEl.textContent='.50';memoryEl.textContent='LISTENING';command.textContent='FIELD / AWAITING DECISION';setAccent(palette.lav);});
  addEventListener('vantage:decision',e=>decisionUpdate(e.detail||{}));

  function resize(){const w=root.clientWidth||innerWidth,h=root.clientHeight||innerHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()}
  addEventListener('resize',resize);
  addEventListener('pointermove',e=>{const r=root.getBoundingClientRect();state.mx=(e.clientX-r.left)/r.width-.5;state.my=(e.clientY-r.top)/r.height-.5},{passive:true});
  resize();
  addEventListener('scroll',()=>{const r=root.getBoundingClientRect();state.scroll=Math.max(0,Math.min(1,(innerHeight-r.top)/(innerHeight+r.height)));},{passive:true});

  // Debounced: entering triggers instantly, but leaving only actually
  // removes .is-awake after a short sustained absence. Without this, any
  // noisy source of repeated intersection callbacks (smooth-scroll
  // libraries like Lenis do continuous micro-adjustments even at rest)
  // toggles .is-awake many times a second, which yanks the CSS opacity
  // transition back and forth before it ever completes — visible as a
  // flicker instead of a fade, and as the section appearing to blink
  // in and out while the page hasn't actually scrolled anywhere.
  let awakeLeaveTimer=null;
  const io=new IntersectionObserver(es=>{es.forEach(e=>{
    if(e.isIntersecting){
      if(awakeLeaveTimer){clearTimeout(awakeLeaveTimer);awakeLeaveTimer=null;}
      if(!state.onScreen){state.onScreen=true;root.classList.add('is-awake');resize();}
    }else if(state.onScreen&&!awakeLeaveTimer){
      awakeLeaveTimer=setTimeout(()=>{state.onScreen=false;root.classList.remove('is-awake');awakeLeaveTimer=null;},250);
    }
  });}, {threshold:.1});
  io.observe(root);

  function projectNode(n){
    const v=n.position.clone();v.project(camera);
    const w=root.clientWidth||innerWidth,h=root.clientHeight||innerHeight;
    return {x:(v.x*.5+.5)*w,y:(-v.y*.5+.5)*h};
  }
  function nearestNode(){let best=null,dist=Infinity;const w=root.clientWidth||innerWidth,h=root.clientHeight||innerHeight;nodes.forEach(n=>{const p=projectNode(n),dx=state.mx*w+w/2-p.x,dy=state.my*h+h/2-p.y,d=Math.hypot(dx,dy);if(d<dist){dist=d;best=n;}});return dist<170?best:null}

  let last=performance.now();
  function animate(now){
    const dt=Math.min(.05,(now-last)/1000);last=now;const t=now*.001;
    const active=state.onScreen;
    if(active){
      world.rotation.y+=(state.mx*.13-world.rotation.y)*.025;
      world.rotation.x+=(-state.my*.07-world.rotation.x)*.025;
      world.position.x+=(state.mx*.22-world.position.x)*.02;
      world.position.y+=(-state.my*.12-world.position.y)*.02;
      core.rotation.x=t*.18;core.rotation.y=t*.27;
      coreShell.scale.setScalar(1+Math.sin(t*1.8)*.035*state.energy);
      coreAura.scale.setScalar(1+Math.sin(t*1.2)*.08*state.energy);
      rings.forEach((r,i)=>{r.rotation.z=t*(.05+i*.025)*(i===1?-1:1);r.rotation.x+=dt*(.02+i*.01)});
      dust.rotation.y=t*.006;arcGroup.rotation.y=-t*.012;
      nodes.forEach((n,i)=>{
        const d=n.userData;const a=d.angle+t*(.035+(i%2)*.012);const wob=Math.sin(t*.7+d.phase)*.08;
        const bx=Math.cos(a)*(d.r+wob), by=d.y+Math.sin(t*.8+d.phase)*.12, bz=Math.sin(a)*(d.r*.42);
        n.userData.baseX=bx;n.userData.baseY=by;n.userData.baseZ=bz;
        const isHot=n===hovered || n.userData.index===state.locked;
        const attract=isHot?.28:0;
        n.position.x+=(bx*(1-attract)+state.mx*attract-n.position.x)*.055;
        n.position.y+=(by*(1-attract)-state.my*attract-n.position.y)*.055;
        n.position.z+=(bz*(1-attract)+8*attract-n.position.z)*.055;
        const s=isHot?1.8:1+Math.sin(t*1.5+d.phase)*.08; n.scale.lerp(new THREE.Vector3(s,s,s),.12);
        const tr=d.trail;const arr=tr.geometry.attributes.position.array;arr[0]=n.position.x;arr[1]=n.position.y;arr[2]=n.position.z;arr[3]=n.position.x*.38;arr[4]=n.position.y*.38;arr[5]=n.position.z*.38;tr.geometry.attributes.position.needsUpdate=true;tr.material.opacity=isHot?.42:.12;
        if(d.pulseAt&&now>d.pulseAt&&now<d.pulseAt+500){const q=(now-d.pulseAt)/500;n.scale.setScalar(1+(1-q)*1.4);}
      });
      const near=nearestNode();if(near!==hovered&&state.locked===null){if(near)showNode(near);else hideNode();}
      if(hovered){const p=projectNode(hovered);nodeUI.style.left=p.x+'px';nodeUI.style.top=p.y+'px';}
      const scrollBoost=.5+state.scroll*.5;state.energy=Math.max(state.energy,scrollBoost*.55);
      energyEl.textContent=state.energy.toFixed(2);memoryEl.textContent=state.scroll>.72?'PERSISTENT':'LISTENING';
      if(state.scroll>.78&&root.dataset.state==='')phaseEl.textContent='MEMORY';else if(state.scroll>.48&&root.dataset.state==='')phaseEl.textContent='CAUSALITY';
      // Only pay the GPU draw cost while this section is actually visible.
      // Off-screen, the loop keeps ticking (cheap) but stops computing node
      // positions and stops rendering entirely (the expensive parts) — this
      // is what actually caps the always-on cost, not the old dead is-awake class.
      renderer.render(scene,camera);
    }
    requestAnimationFrame(animate);
  }
  phaseEl.textContent='OBSERVING';signalEl.textContent='LISTENING';riskEl.textContent='UNRESOLVED';energyEl.textContent='.50';memoryEl.textContent='LISTENING';
  requestAnimationFrame(animate);
})();
