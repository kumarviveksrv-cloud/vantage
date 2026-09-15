/* VANTAGE // ARIA VOLUMETRIC INTELLIGENCE — Phase 2
   Adds scroll-triggered dissolution on top of Phase 1's decision-
   reactivity, coherence, and eye-pull.

   HOW THE MORPH WORKS
   Every shape ARIA can take — her face, and each of the words PEOPLE,
   POLICY, BUSINESS, CONTEXT — is sampled down to the exact same fixed
   particle count (PARTICLE_COUNT). Each particle keeps a fixed
   identity (its color, its "seed" for the idle wave motion, its
   eye-weight) for the whole session; only its POSITION changes
   depending on which shape is currently showing. This is what makes
   it a dissolve rather than a cross-fade: it's the same particles
   relocating, not one cloud fading out while another fades in.

   The words are sampled the same way the face is — rendered to an
   offscreen canvas, then the lit-up (alpha) pixels become candidate
   points, exactly parallel to how the face sampler uses brightness.

   Scroll position within the .aria section maps to a continuous
   "stage" value across 4 segments: face→PEOPLE→POLICY→BUSINESS→
   CONTEXT. Only two shapes are ever bound to the GPU at once (the
   current segment's start and end); blending between them is a
   single mix() in the vertex shader driven by a uniform, so nothing
   is recomputed per-frame except that one number. The position
   buffers themselves only get rewritten on the (rare) frame where
   you cross from one segment into the next.

   Scrolling past the section leaves her resting as CONTEXT — this is
   meant to read as a one-way dissolve into the underlying concepts,
   not a loop back to her face.
*/
(function(){
  'use strict';
  if(!window.THREE)return;
  const figure=document.querySelector('.aria-figure');
  const canvas=document.getElementById('ariaVolumetricCanvas');
  const ariaSection=document.querySelector('.aria');
  if(!figure||!canvas)return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;

  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.setClearColor(0,0);

  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(34,1,.1,100);
  camera.position.set(0,0,6.9);
  const group=new THREE.Group();
  scene.add(group);

  function resize(){
    const w=figure.clientWidth||260,h=figure.clientHeight||350;
    renderer.setSize(w,h);
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
  }

  const mouse=new THREE.Vector2();
  const target=new THREE.Vector2();
  let facePoints,haloPoints,rings,built=false,t=0;

  const PARTICLE_COUNT=6000;
  const WORDS=['PEOPLE','POLICY','BUSINESS','CONTEXT'];
  const EYE_L=[-0.42,0.8],EYE_R=[0.42,0.8],EYE_SIGMA=0.28;

  const STATE_COLOR={
    defensible:new THREE.Color(0x75f5bb),
    risk:new THREE.Color(0xff4d6d),
    partial:new THREE.Color(0xffb547)
  };

  // Renders one word to an offscreen canvas and returns exactly
  // `count` sampled positions from its lit pixels, in the same
  // normalized coordinate space the face sampler uses.
  function sampleWordPositions(text,count){
    const w=600,h=160;
    const c=document.createElement('canvas');
    c.width=w;c.height=h;
    const ctx=c.getContext('2d');
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#fff';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    let size=130;
    ctx.font=`700 ${size}px 'Space Grotesk',sans-serif`;
    while(ctx.measureText(text).width>w*0.86&&size>24){
      size-=2;
      ctx.font=`700 ${size}px 'Space Grotesk',sans-serif`;
    }
    ctx.fillText(text,w/2,h/2);
    const d=ctx.getImageData(0,0,w,h).data;
    const cand=[];
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const a=d[(y*w+x)*4+3];
        if(a>120){
          const nx=(x/(w-1)-.5)*3.3;
          const ny=(.5-y/(h-1))*.9;
          cand.push(nx,ny,(Math.random()-.5)*.3);
        }
      }
    }
    const n=cand.length/3;
    const out=new Float32Array(count*3);
    if(n===0)return out;
    for(let i=0;i<count;i++){
      const j=Math.floor(Math.random()*n)*3;
      out[i*3]=cand[j];out[i*3+1]=cand[j+1];out[i*3+2]=cand[j+2];
    }
    return out;
  }

  let shapePositions=null; // [face, PEOPLE, POLICY, BUSINESS, CONTEXT]
  let currentSeg=-1;

  function build(tex){
    const img=tex.image,w=180,h=180;
    const sample=document.createElement('canvas');
    sample.width=w;sample.height=h;
    const ctx=sample.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(img,0,0,w,h);
    const d=ctx.getImageData(0,0,w,h).data;
    // Collect every eligible face pixel first (same brightness/central
    // filtering as before), THEN sample a fixed count from that pool —
    // this is what makes the face's particle count match the words'.
    const cand=[];
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const i=(y*w+x)*4,r=d[i]/255,g=d[i+1]/255,b=d[i+2]/255;
        const br=.2126*r+.7152*g+.0722*b;
        const nx=(x/(w-1)-.5)*3.15,ny=(.5-y/(h-1))*4.0;
        const radial=Math.sqrt((nx/1.65)**2+(ny/2.0)**2);
        const central=Math.max(0,1-radial*.72);
        const a=br*.75+central*.22;
        if(a<.28||Math.random()>Math.min(1,.24+a*.9))continue;
        const depth=(br-.45)*.9+(1-radial)*.7+(Math.random()-.5)*.32;
        const dL=Math.hypot(nx-EYE_L[0],ny-EYE_L[1]),dR=Math.hypot(nx-EYE_R[0],ny-EYE_R[1]);
        const wL=Math.exp(-(dL*dL)/(2*EYE_SIGMA*EYE_SIGMA)),wR=Math.exp(-(dR*dR)/(2*EYE_SIGMA*EYE_SIGMA));
        cand.push([nx,ny,depth,.5+.3*b,.32+.22*b,.92+.06*r,Math.random()*Math.PI*2,.5+Math.random()*1.5,depth,Math.max(wL,wR)]);
      }
    }
    const N=PARTICLE_COUNT;
    const facePos=new Float32Array(N*3),col=new Float32Array(N*3),seed=new Float32Array(N*3),eyeW=new Float32Array(N);
    const idxPool=cand.length?Array.from({length:cand.length},(_,i)=>i):[0];
    for(let i=idxPool.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      const tmp=idxPool[i];idxPool[i]=idxPool[j];idxPool[j]=tmp;
    }
    for(let i=0;i<N;i++){
      const c=cand.length?cand[idxPool[i%idxPool.length]]:[0,0,0,.6,.4,.9,0,1,0,0];
      facePos[i*3]=c[0];facePos[i*3+1]=c[1];facePos[i*3+2]=c[2];
      col[i*3]=c[3];col[i*3+1]=c[4];col[i*3+2]=c[5];
      seed[i*3]=c[6];seed[i*3+1]=c[7];seed[i*3+2]=c[8];
      eyeW[i]=c[9];
    }

    shapePositions=[facePos];
    WORDS.forEach(word=>shapePositions.push(sampleWordPositions(word,N)));

    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(facePos.slice(),3));
    geo.setAttribute('aPosA',new THREE.Float32BufferAttribute(facePos.slice(),3));
    geo.setAttribute('aPosB',new THREE.Float32BufferAttribute(shapePositions[1].slice(),3));
    geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
    geo.setAttribute('aSeed',new THREE.Float32BufferAttribute(seed,3));
    geo.setAttribute('aEyeWeight',new THREE.Float32BufferAttribute(eyeW,1));

    const mat=new THREE.ShaderMaterial({
      transparent:true,depthWrite:false,vertexColors:true,blending:THREE.AdditiveBlending,
      uniforms:{
        uTime:{value:0},
        uMouse:{value:mouse},
        uCoherence:{value:1},
        uStateColor:{value:new THREE.Color(0xc4b5fd)},
        uStateMix:{value:0},
        uMorph:{value:0}
      },
      vertexShader:`attribute vec3 aPosA;attribute vec3 aPosB;attribute vec3 aSeed;attribute float aEyeWeight;
        varying vec3 vColor;
        uniform float uTime;uniform vec2 uMouse;uniform float uCoherence;
        uniform vec3 uStateColor;uniform float uStateMix;uniform float uMorph;
        void main(){
          vec3 p=mix(aPosA,aPosB,uMorph);
          float wave=sin(uTime*aSeed.y+aSeed.x+p.y*1.7)*.018;
          p.z+=wave;
          p.x+=uMouse.x*(0.05+abs(p.z)*.015);
          p.y+=uMouse.y*(0.035+abs(p.z)*.012);
          p.x+=uMouse.x*aEyeWeight*0.09;
          p.y+=uMouse.y*aEyeWeight*0.06;
          float scatter=1.0-uCoherence;
          vec3 dir=normalize(vec3(sin(aSeed.x*3.1),cos(aSeed.x*2.3+aSeed.y),sin(aSeed.y*1.7))+0.0001);
          p+=dir*scatter*0.55;
          vec4 mv=modelViewMatrix*vec4(p,1.);
          gl_Position=projectionMatrix*mv;
          gl_PointSize=(1.75+2.6*(1.0/(1.0+abs(mv.z)))*(0.7+0.3*sin(aSeed.x+uTime*1.7)))*(0.85+0.15*uCoherence);
          vColor=mix(color,uStateColor,uStateMix);
        }`,
      fragmentShader:`varying vec3 vColor;
        void main(){
          float d=length(gl_PointCoord-.5);
          float a=smoothstep(.5,.02,d);
          gl_FragColor=vec4(vColor,a*.94);
        }`
    });
    facePoints=new THREE.Points(geo,mat);
    facePoints.position.y=.05;
    facePoints.scale.set(.94,.94,.94);
    group.add(facePoints);

    const count=9000,hp=new Float32Array(count*3),hc=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      const u=Math.random(),a=Math.random()*Math.PI*2,rr=1.7+Math.pow(u,.5)*2.2;
      hp[i*3]=Math.cos(a)*rr;hp[i*3+1]=(Math.random()-.5)*4.4;hp[i*3+2]=(Math.random()-.5)*1.8;
      hc[i*3]=.55+Math.random()*.25;hc[i*3+1]=.35+Math.random()*.2;hc[i*3+2]=.85+Math.random()*.15;
    }
    const hg=new THREE.BufferGeometry();
    hg.setAttribute('position',new THREE.Float32BufferAttribute(hp,3));
    hg.setAttribute('color',new THREE.Float32BufferAttribute(hc,3));
    const hm=new THREE.PointsMaterial({size:.018,transparent:true,opacity:.55,vertexColors:true,blending:THREE.AdditiveBlending,depthWrite:false});
    haloPoints=new THREE.Points(hg,hm);
    group.add(haloPoints);

    rings=[];
    [1.5,1.85,2.2,2.65].forEach((r,j)=>{
      const g=new THREE.TorusGeometry(r,.006,5,180);
      const m=new THREE.MeshBasicMaterial({color:j%2?0x6366f1:0xc4b5fd,transparent:true,opacity:j===1?.32:.18,blending:THREE.AdditiveBlending});
      const o=new THREE.Mesh(g,m);
      o.rotation.x=Math.PI/2-.4;
      o.position.z=-.35+j*.12;
      group.add(o);
      rings.push(o);
    });

    const core=new THREE.Group();
    const coreDot=new THREE.Mesh(new THREE.SphereGeometry(.08,20,20),new THREE.MeshBasicMaterial({color:0xc4b5fd,transparent:true,opacity:.8,blending:THREE.AdditiveBlending}));
    core.add(coreDot);
    const coreRing=new THREE.Mesh(new THREE.TorusGeometry(.22,.006,6,80),new THREE.MeshBasicMaterial({color:0xe6ddff,transparent:true,opacity:.55,blending:THREE.AdditiveBlending}));
    coreRing.rotation.x=Math.PI/2-.4;
    core.add(coreRing);
    core.position.set(0,-1.93,.2);
    group.add(core);

    canvas.classList.add('is-ready');
  }

  let lastMoveAt=performance.now();
  addEventListener('pointermove',e=>{
    const r=figure.getBoundingClientRect();
    target.x=((e.clientX-r.left)/r.width-.5)*2;
    target.y=((e.clientY-r.top)/r.height-.5)*-2;
    lastMoveAt=performance.now();
  },{passive:true});
  addEventListener('resize',resize);

  let onScreen=false,leaveTimer=null;
  const io=new IntersectionObserver(es=>{es.forEach(e=>{
    if(e.isIntersecting){
      if(leaveTimer){clearTimeout(leaveTimer);leaveTimer=null;}
      if(!onScreen){
        onScreen=true;
        resize();
        if(!built){
          built=true;
          new THREE.TextureLoader().load('aria-reference.png',build);
        }
      }
    }else if(onScreen&&!leaveTimer){
      leaveTimer=setTimeout(()=>{onScreen=false;leaveTimer=null;},250);
    }
  });},{threshold:.15});
  io.observe(figure);

  let targetStateMix=0,currentStateMix=0,currentStateColor=new THREE.Color(0xc4b5fd);
  let targetAgitation=0,currentAgitation=0;
  let stateCoherenceCap=1;
  const caseMachine=document.getElementById('caseMachine');
  const reaction=document.getElementById('ariaReaction');
  const reactionBadge=document.getElementById('ariaReactionBadge');
  const reactionText=document.getElementById('ariaReactionText');

  function applyOutcome(outcome){
    if(outcome==='C'){
      targetStateMix=.22;currentStateColor=STATE_COLOR.defensible;targetAgitation=0;stateCoherenceCap=1;
    }else if(outcome==='A'||outcome==='D'){
      targetStateMix=.4;currentStateColor=STATE_COLOR.risk;targetAgitation=1;stateCoherenceCap=.6;
    }else if(outcome==='B'){
      targetStateMix=.3;currentStateColor=STATE_COLOR.partial;targetAgitation=.5;stateCoherenceCap=.8;
    }else{
      targetStateMix=0;targetAgitation=0;stateCoherenceCap=1;
    }
  }

  if(caseMachine){
    applyOutcome(caseMachine.dataset.outcome||'');
    new MutationObserver(()=>applyOutcome(caseMachine.dataset.outcome||''))
      .observe(caseMachine,{attributes:true,attributeFilter:['data-outcome']});
  }

  const resultTitle=document.getElementById('resultTitle');
  const resultBadge=document.getElementById('resultBadge');
  function mirrorReaction(){
    if(!resultTitle||!resultBadge||!reaction)return;
    const title=resultTitle.textContent.trim();
    const badge=resultBadge.textContent.trim();
    if(!title||title==='The system is waiting.'){
      reaction.classList.remove('live');
      return;
    }
    reactionBadge.textContent='ARIA · '+badge;
    reactionText.textContent=title;
    reaction.classList.add('live');
  }
  if(resultTitle){
    new MutationObserver(mirrorReaction).observe(resultTitle,{childList:true,characterData:true,subtree:true});
    mirrorReaction();
  }

  function updateMorph(){
    if(!shapePositions||!facePoints)return;
    let progress=0;
    if(ariaSection){
      const r=ariaSection.getBoundingClientRect();
      const total=r.height+innerHeight;
      const scrolled=innerHeight-r.top;
      progress=Math.min(1,Math.max(0,scrolled/total));
    }
    const stage=progress*(shapePositions.length-1);
    const segIndex=Math.min(shapePositions.length-2,Math.floor(stage));
    const segFrac=stage-segIndex;
    if(segIndex!==currentSeg){
      currentSeg=segIndex;
      const attrA=facePoints.geometry.attributes.aPosA;
      const attrB=facePoints.geometry.attributes.aPosB;
      attrA.array.set(shapePositions[segIndex]);
      attrA.needsUpdate=true;
      attrB.array.set(shapePositions[segIndex+1]);
      attrB.needsUpdate=true;
    }
    facePoints.material.uniforms.uMorph.value=segFrac;
  }

  function animate(){
    requestAnimationFrame(animate);
    if(!onScreen)return;
    t+=.012;
    mouse.lerp(target,.055);

    updateMorph();

    const idleMs=performance.now()-lastMoveAt;
    const idleTarget=idleMs>1400?.55:1;
    const coherenceTarget=Math.min(idleTarget,stateCoherenceCap);
    currentAgitation+=(targetAgitation-currentAgitation)*.02;
    currentStateMix+=(targetStateMix-currentStateMix)*.03;

    group.rotation.y+=(mouse.x*.09-group.rotation.y)*.035;
    group.rotation.x+=(mouse.y*.055-group.rotation.x)*.035;
    group.position.x+=(mouse.x*.12-group.position.x)*.025;
    group.position.y+=(mouse.y*.08-group.position.y)*.025;

    if(facePoints){
      const u=facePoints.material.uniforms;
      u.uTime.value=t;
      u.uCoherence.value+=(coherenceTarget-u.uCoherence.value)*.04;
      u.uStateMix.value=currentStateMix;
      u.uStateColor.value.copy(currentStateColor);
    }
    if(haloPoints){
      haloPoints.rotation.y=t*.035*(1+currentAgitation*1.4);
      haloPoints.rotation.z=Math.sin(t*.2*(1+currentAgitation))*.025;
    }
    if(rings)rings.forEach((r,i)=>{
      const speed=1+currentAgitation*1.6;
      r.rotation.z=t*(.045+i*.012)*speed*(i%2?1:-1);
      r.rotation.x=Math.PI/2-.4+Math.sin(t*.25+i)*.03;
      r.material.opacity=.12+(.12*Math.sin(t*(1.4+currentAgitation*1.2)+i*.7)+.12);
    });
    renderer.render(scene,camera);
  }
  requestAnimationFrame(animate);
})();
