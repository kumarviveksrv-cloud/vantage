/* VANTAGE // ARIA VOLUMETRIC INTELLIGENCE
   Back to a single, dominant particle-face — the scroll-triggered
   word dissolve (PEOPLE/POLICY/BUSINESS/CONTEXT) was tried and
   pulled back out: it made a small canvas do too much at once, and
   the priority is giving the face itself room to actually read as a
   presence rather than splitting attention across five shapes in a
   tight box.

   What's here:
   - EYE-PULL: particles near the two approximate eye positions get
     extra displacement toward the cursor, on top of the whole-field
     parallax every particle already has.
   - COHERENCE: idle cursor -> the field gradually loses cohesion
     (particles drift along their own seed direction) and dims;
     moving the mouse back over her eases it back to fully formed.
     Never drops below .55 on idle alone, so she always reads as a
     face, just less "settled" when idle.
   - DECISION-REACTIVITY: a MutationObserver watches #caseMachine's
     data-outcome attribute — the same one the site's own case-
     navigator logic sets on A/B/C/D — and shifts her color mix,
     field agitation, and coherence ceiling accordingly. A second
     observer mirrors #resultTitle's real text into a caption near
     her, so what she "says" is always the actual computed result.

   Sizing: the .aria-figure container itself was grown substantially
   (see vantage-cinematic.css) rather than pushing the 3D camera/scale
   numbers further — growing the container scales everything up
   proportionally with zero clipping risk, since the framing ratio
   inside the canvas doesn't change.
*/
(function(){
  'use strict';
  if(!window.THREE)return;
  const figure=document.querySelector('.aria-figure');
  const canvas=document.getElementById('ariaVolumetricCanvas');
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

  const EYE_L=[-0.42,0.8],EYE_R=[0.42,0.8],EYE_SIGMA=0.28;

  const STATE_COLOR={
    defensible:new THREE.Color(0x75f5bb),
    risk:new THREE.Color(0xff4d6d),
    partial:new THREE.Color(0xffb547)
  };

  function build(tex){
    const img=tex.image,w=180,h=180;
    const sample=document.createElement('canvas');
    sample.width=w;sample.height=h;
    const ctx=sample.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(img,0,0,w,h);
    const d=ctx.getImageData(0,0,w,h).data;
    // Brightness alone gives a soft, evenly-filled cloud with no
    // legible structure — it can't tell smooth cheek skin from the
    // edge of an eyelid. What actually reads as a facial FEATURE is
    // local contrast: the boundary where dark meets light. Precompute
    // brightness for every pixel once so each pixel can be compared
    // against its neighbors below.
    const bright=new Float32Array(w*h);
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const i=(y*w+x)*4;
        bright[y*w+x]=.2126*d[i]/255+.7152*d[i+1]/255+.0722*d[i+2]/255;
      }
    }
    const pos=[],col=[],seed=[],eyeW=[];
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const idx=y*w+x,i=idx*4,r=d[i]/255,g=d[i+1]/255,b=d[i+2]/255;
        const br=bright[idx];
        const brL=x>0?bright[idx-1]:br,brR=x<w-1?bright[idx+1]:br;
        const brU=y>0?bright[idx-w]:br,brD=y<h-1?bright[idx+w]:br;
        const contrast=Math.abs(br-brL)+Math.abs(br-brR)+Math.abs(br-brU)+Math.abs(br-brD);
        const nx=(x/(w-1)-.5)*3.15,ny=(.5-y/(h-1))*4.0;
        const radial=Math.sqrt((nx/1.65)**2+(ny/2.0)**2);
        const central=Math.max(0,1-radial*.72);
        const dL=Math.hypot(nx-EYE_L[0],ny-EYE_L[1]),dR=Math.hypot(nx-EYE_R[0],ny-EYE_R[1]);
        const wL=Math.exp(-(dL*dL)/(2*EYE_SIGMA*EYE_SIGMA)),wR=Math.exp(-(dR*dR)/(2*EYE_SIGMA*EYE_SIGMA));
        const eyeWeight=Math.max(wL,wR);
        // This system uses additive blending, so a "darker" particle
        // colour just renders fainter — there's no way to paint an
        // actually dark shape by lowering colour values. A dark, ominous
        // eye instead has to be an actual VOID in the particle field: a
        // small gap with almost nothing in it, ringed by a bright, dense
        // boundary (the eyelid/socket edge). ringWeight peaks in a thin
        // band around each eye (not at its exact centre) to build that
        // boundary; the pupilVoid multiplier then actively suppresses
        // whatever density remains in the very centre, carving the hole.
        // General edge-contrast is also pulled back from before so the
        // jawline and other facial edges stop competing with the eyes
        // for attention.
        const eyeCenterDist=Math.min(dL,dR);
        const ringWeight=Math.exp(-((eyeCenterDist-.22)**2)/(2*.09*.09));
        let a=central*.18+br*.34+Math.min(1,contrast*2.6)*.28+ringWeight*.58;
        if(eyeCenterDist<.09)a*=.12;
        if(a<.28||Math.random()>Math.min(1,.24+a*.9))continue;
        const depth=(br-.45)*.9+(1-radial)*.7+(Math.random()-.5)*.32;
        pos.push(nx,ny,depth);
        seed.push(Math.random()*Math.PI*2,.5+Math.random()*1.5,depth);
        col.push(.5+.3*b,.32+.22*b,.92+.06*r);
        eyeW.push(eyeWeight);
      }
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
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
        uStateMix:{value:0}
      },
      vertexShader:`attribute vec3 aSeed;attribute float aEyeWeight;varying vec3 vColor;
        uniform float uTime;uniform vec2 uMouse;uniform float uCoherence;
        uniform vec3 uStateColor;uniform float uStateMix;
        void main(){
          vec3 p=position;
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

  let onScreen=false,leaveTimer=null,hintShown=false;
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
        if(!hintShown){hintShown=true;showHint();}
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

  // A nudge so people realize the box is interactive at all — text
  // rather than an animated gimmick, since a clear one-line invitation
  // is more reliably understood than a self-playing demo motion. Shown
  // once the section first comes into view; disappears for good the
  // moment the cursor actually enters the box, or immediately if a
  // real decision result already exists (that always takes priority).
  let hintDismissed=false;
  function hasRealResult(){
    return !!(resultTitle&&resultTitle.textContent.trim()&&resultTitle.textContent.trim()!=='The system is waiting.');
  }
  function showHint(){
    if(hintDismissed||!reaction||hasRealResult())return;
    reactionBadge.textContent='ARIA';
    reactionText.textContent='Move your cursor over her — she notices.';
    reaction.classList.add('live');
  }
  figure.addEventListener('pointerenter',()=>{
    if(hintDismissed)return;
    hintDismissed=true;
    if(!hasRealResult())reaction.classList.remove('live');
  },{once:true});

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

  function animate(){
    requestAnimationFrame(animate);
    if(!onScreen)return;
    t+=.012;
    mouse.lerp(target,.055);

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
