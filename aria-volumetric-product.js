/* VANTAGE // ARIA — PRODUCT PAGE VOLUMETRIC FACE
   Replaces the old static aria-face.png image + 2D "Matrix rain" canvas
   overlay with a real particle-sampled face — the same core technique
   built for the landing page's ARIA teaser (aria-volumetric.js):
   contrast-weighted density so eyes/nose/lips read as actual features
   rather than a soft blob, jawline de-emphasized, cursor-reactive
   eye-pull, additive-blended halo and orbital rings.

   The meaningful difference from the landing-page version: THIS page
   has a real, working state machine already (idle / listening /
   thinking / speaking, driven by the mic and the ARIA API calls). A
   MutationObserver watches #slbl's class — the exact same element the
   page's own setState() function already updates — and drives the
   particle field's coherence, agitation, and color tint from that
   real state, instead of a page-scroll decision outcome like the
   landing page uses. This never touches or duplicates the mic/chat/
   speech logic; it only reads a class name that logic already sets.

   Color choices for each state reuse the exact RGB values the page's
   own setState() already uses for _ariaSetColor and the mic button's
   CSS, so this stays visually consistent with everything else on the
   page rather than introducing a separate palette.
*/
(function(){
  'use strict';
  if(!window.THREE)return;
  const faceArea=document.querySelector('.face-area');
  const canvas=document.getElementById('aria-canvas');
  if(!faceArea||!canvas)return;
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
    const w=faceArea.clientWidth||600,h=faceArea.clientHeight||600;
    renderer.setSize(w,h);
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize',resize);

  const mouse=new THREE.Vector2();
  const target=new THREE.Vector2();
  let facePoints,haloPoints,rings,built=false,t=0;

  const EYE_L=[-0.42,0.8],EYE_R=[0.42,0.8],EYE_SIGMA=0.28;

  // Exact RGB values already used by this page's own setState() —
  // kept identical so this stays visually consistent with the mic
  // button and status label colors rather than introducing a new set.
  const STATE_COLOR={
    listening:new THREE.Color(0x7c3aed),
    thinking:new THREE.Color(0xa5b4fc),
    speaking:new THREE.Color(0xc4b5fd)
  };

  function build(tex){
    const img=tex.image,w=180,h=180;
    const sample=document.createElement('canvas');
    sample.width=w;sample.height=h;
    const ctx=sample.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(img,0,0,w,h);
    const d=ctx.getImageData(0,0,w,h).data;
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
        const a=central*.18+br*.32+Math.min(1,contrast*2.8)*(.2+.34*central)+eyeWeight*.18;
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
        uStateMix:{value:0},
        uPulse:{value:0}
      },
      vertexShader:`attribute vec3 aSeed;attribute float aEyeWeight;varying vec3 vColor;
        uniform float uTime;uniform vec2 uMouse;uniform float uCoherence;
        uniform vec3 uStateColor;uniform float uStateMix;uniform float uPulse;
        void main(){
          vec3 p=position*(1.0+uPulse);
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

    canvas.style.opacity='1';
  }
  canvas.style.transition='opacity 1.4s ease';
  canvas.style.opacity='0';
  new THREE.TextureLoader().load('aria-reference.png',build);

  addEventListener('pointermove',e=>{
    const r=faceArea.getBoundingClientRect();
    target.x=((e.clientX-r.left)/r.width-.5)*2;
    target.y=((e.clientY-r.top)/r.height-.5)*-2;
  },{passive:true});

  // Real page state -> particle reactivity. #slbl is the exact element
  // this page's own setState() already updates (class + text), so this
  // never duplicates or guesses at state — it reads what's already there.
  const slbl=document.getElementById('slbl');
  let currentState='idle';
  let targetCoherence=.88,currentCoherence=.88;
  let targetAgitation=0,currentAgitation=0;
  let targetStateMix=0,currentStateMix=0;
  let currentStateColor=new THREE.Color(0xc4b5fd);
  let pulsePhase=0;

  function applyState(s){
    currentState=s;
    if(s==='listening'){
      targetCoherence=1;targetAgitation=0;targetStateMix=.18;currentStateColor=STATE_COLOR.listening;
    }else if(s==='thinking'){
      targetCoherence=.68;targetAgitation=1;targetStateMix=.22;currentStateColor=STATE_COLOR.thinking;
    }else if(s==='speaking'){
      targetCoherence=1;targetAgitation=.35;targetStateMix=.16;currentStateColor=STATE_COLOR.speaking;
    }else{
      targetCoherence=.88;targetAgitation=0;targetStateMix=0;
    }
  }
  function readState(){
    if(!slbl)return 'idle';
    if(slbl.classList.contains('listening'))return 'listening';
    if(slbl.classList.contains('thinking'))return 'thinking';
    if(slbl.classList.contains('speaking'))return 'speaking';
    return 'idle';
  }
  if(slbl){
    applyState(readState());
    new MutationObserver(()=>applyState(readState())).observe(slbl,{attributes:true,attributeFilter:['class']});
  }

  // Pause rendering while the tab itself isn't visible — no need for
  // the scroll-based on/off gating the landing page uses, since this
  // canvas is the main content of a dedicated page, not a section
  // scrolled past.
  let tabVisible=!document.hidden;
  document.addEventListener('visibilitychange',()=>{tabVisible=!document.hidden;});

  function animate(){
    requestAnimationFrame(animate);
    if(!tabVisible)return;
    t+=.012;
    mouse.lerp(target,.055);
    currentCoherence+=(targetCoherence-currentCoherence)*.04;
    currentAgitation+=(targetAgitation-currentAgitation)*.02;
    currentStateMix+=(targetStateMix-currentStateMix)*.03;

    group.rotation.y+=(mouse.x*.09-group.rotation.y)*.035;
    group.rotation.x+=(mouse.y*.055-group.rotation.x)*.035;
    group.position.x+=(mouse.x*.12-group.position.x)*.025;
    group.position.y+=(mouse.y*.08-group.position.y)*.025;

    if(facePoints){
      const u=facePoints.material.uniforms;
      u.uTime.value=t;
      u.uCoherence.value=currentCoherence;
      u.uStateMix.value=currentStateMix;
      u.uStateColor.value.copy(currentStateColor);
      if(currentState==='speaking'){
        pulsePhase+=.045;
        u.uPulse.value=Math.sin(pulsePhase)*.02;
      }else{
        pulsePhase=0;
        u.uPulse.value+=(0-u.uPulse.value)*.05;
      }
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
