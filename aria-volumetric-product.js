/* VANTAGE // ARIA VOLUMETRIC INTELLIGENCE — Product Page (aria.html)
   Ditto port of aria-volumetric.js for the product page.
   Only differences from the landing-page original:
   - Canvas:  #aria-canvas  (not #ariaVolumetricCanvas)
   - Figure:  .face-area    (not .aria-figure)
   - States:  #slbl className (idle/listening/thinking/speaking)
              replaces the caseMachine / data-outcome system
   - No IntersectionObserver — face-area is always on-screen
   - Touch support added for mobile
   Everything else — shader, sampling algo, eye-pull, coherence,
   halo, torus rings — is pixel-identical to the landing page.
*/
(function(){
  'use strict';
  if(!window.THREE)return;

  const figure = document.querySelector('.face-area');
  const canvas  = document.getElementById('aria-canvas');
  if(!figure||!canvas)return;
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;

  // Fade-in on first render
  canvas.style.opacity   = '0';
  canvas.style.transition= 'opacity 1.8s ease';

  const renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0,0);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34,1,.1,100);
  camera.position.set(0,0,6.9);
  const group  = new THREE.Group();
  scene.add(group);

  function resize(){
    const w=figure.clientWidth||560, h=figure.clientHeight||650;
    renderer.setSize(w,h,false); // CSS (100%) owns the display size
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
    if(field)field.material.uniforms.uAspect.value=w/h;
  }
  let field;
  resize();
  addEventListener('resize',resize);
  if(window.ResizeObserver)new ResizeObserver(resize).observe(figure); // full screen, sidebar hide, etc.
  document.addEventListener('fullscreenchange',()=>setTimeout(resize,60));

  const mouse  = new THREE.Vector2();
  const tgt    = new THREE.Vector2();
  let facePoints,haloPoints,rings,t=0;

  // Eye positions in normalised scene space — identical to landing page
  const EYE_L=[-0.42,0.8], EYE_R=[0.42,0.8], EYE_SIGMA=0.28;

  // ── STATE COLOURS ────────────────────────────────────────
  const SCOLS = {
    idle:      new THREE.Color(0xc4b5fd),
    listening: new THREE.Color(0x7c3aed),
    thinking:  new THREE.Color(0x6366f1),
    speaking:  new THREE.Color(0xe879f9),
  };
  const SCFG = {
    idle:      {mix:0,    agitation:0,    cap:1.0},
    listening: {mix:0.28, agitation:0.30, cap:0.82},
    thinking:  {mix:0.32, agitation:0.65, cap:0.68},
    speaking:  {mix:0.38, agitation:0.22, cap:0.92},
  };
  let tStateMix=0, cStateMix=0;
  let cStateColor=new THREE.Color(0xc4b5fd);
  let tAgitation=0, cAgitation=0;
  let coherenceCap=1;

  function applyState(s){
    const cfg=SCFG[s]||SCFG.idle;
    tStateMix=cfg.mix; tAgitation=cfg.agitation; coherenceCap=cfg.cap;
    cStateColor.copy(SCOLS[s]||SCOLS.idle);
  }
  // Watch #slbl className
  const slbl=document.getElementById('slbl');
  if(slbl){
    const watchSlbl=()=>{
      const c=slbl.className;
      applyState(c.includes('listening')?'listening':c.includes('thinking')?'thinking':c.includes('speaking')?'speaking':'idle');
    };
    new MutationObserver(watchSlbl).observe(slbl,{attributes:true,attributeFilter:['class']});
    watchSlbl();
  }
  // Also hookable from aria.html's setState()
  window._ariaSetState=applyState;

  // ── IMAGE SAMPLING ───────────────────────────────────────
  // Identical algorithm to aria-volumetric.js — local contrast
  // gives legible facial features instead of a flat brightness blob.
  function build(tex){
    const img=tex.image, W=180, H=180;
    const smp=document.createElement('canvas');
    smp.width=W; smp.height=H;
    const sctx=smp.getContext('2d',{willReadFrequently:true});
    sctx.drawImage(img,0,0,W,H);
    const d=sctx.getImageData(0,0,W,H).data;

    const bright=new Float32Array(W*H);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const i=(y*W+x)*4;
      bright[y*W+x]=.2126*d[i]/255+.7152*d[i+1]/255+.0722*d[i+2]/255;
    }

    const pos=[],col=[],seed=[],eyeW=[];
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const idx=y*W+x, i=idx*4;
      const r=d[i]/255, g=d[i+1]/255, b=d[i+2]/255;
      const br=bright[idx];
      const brL=x>0?bright[idx-1]:br, brR=x<W-1?bright[idx+1]:br;
      const brU=y>0?bright[idx-W]:br, brD=y<H-1?bright[idx+W]:br;
      const contrast=Math.abs(br-brL)+Math.abs(br-brR)+Math.abs(br-brU)+Math.abs(br-brD);
      const nx=(x/(W-1)-.5)*3.15, ny=(.5-y/(H-1))*4.0;
      const radial=Math.sqrt((nx/1.65)**2+(ny/2.0)**2);
      const central=Math.max(0,1-radial*.72);
      const dL=Math.hypot(nx-EYE_L[0],ny-EYE_L[1]);
      const dR=Math.hypot(nx-EYE_R[0],ny-EYE_R[1]);
      const wL=Math.exp(-(dL*dL)/(2*EYE_SIGMA**2));
      const wR=Math.exp(-(dR*dR)/(2*EYE_SIGMA**2));
      const eyeWeight=Math.max(wL,wR);
      const a=central*.18+br*.32+Math.min(1,contrast*2.8)*(.2+.34*central)+eyeWeight*.18;
      if(a<.28||Math.random()>Math.min(1,.24+a*.9))continue;
      const depth=(br-.45)*.9+(1-radial)*.7+(Math.random()-.5)*.32;
      pos.push(nx,ny,depth);
      seed.push(Math.random()*Math.PI*2,.5+Math.random()*1.5,depth);
      col.push(.5+.3*b,.32+.22*b,.92+.06*r);
      eyeW.push(eyeWeight);
    }

    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
    geo.setAttribute('color',    new THREE.Float32BufferAttribute(col,3));
    geo.setAttribute('aSeed',    new THREE.Float32BufferAttribute(seed,3));
    geo.setAttribute('aEyeWeight',new THREE.Float32BufferAttribute(eyeW,1));

    // Shader — pixel-identical to landing page
    const mat=new THREE.ShaderMaterial({
      transparent:true,depthWrite:false,vertexColors:true,
      blending:THREE.AdditiveBlending,
      uniforms:{
        uTime:      {value:0},
        uMouse:     {value:mouse},
        uCoherence: {value:1},
        uStateColor:{value:new THREE.Color(0xc4b5fd)},
        uStateMix:  {value:0},
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
          gl_PointSize=1.5*(1.75+2.6*(1.0/(1.0+abs(mv.z)))*(0.7+0.3*sin(aSeed.x+uTime*1.7)))*(0.85+0.15*uCoherence);
          vColor=mix(color,uStateColor,uStateMix);}`,
      fragmentShader:`varying vec3 vColor;
        void main(){
          float d=length(gl_PointCoord-.5);
          float core=smoothstep(.36,.02,d);
          float glow=smoothstep(.5,.0,d)*.4;
          gl_FragColor=vec4(vColor,(core+glow)*.94);}`
    });

    facePoints=new THREE.Points(geo,mat);
    facePoints.position.y=.05;
    facePoints.scale.set(.94,.94,.94);
    group.add(facePoints);

    // Halo — identical
    const N=9000,hp=new Float32Array(N*3),hc=new Float32Array(N*3);
    for(let i=0;i<N;i++){
      const u=Math.random(),a=Math.random()*Math.PI*2,rr=1.7+Math.pow(u,.5)*2.2;
      hp[i*3]=Math.cos(a)*rr;hp[i*3+1]=(Math.random()-.5)*4.4;hp[i*3+2]=(Math.random()-.5)*1.8;
      hc[i*3]=.55+Math.random()*.25;hc[i*3+1]=.35+Math.random()*.2;hc[i*3+2]=.85+Math.random()*.15;
    }
    const hg=new THREE.BufferGeometry();
    hg.setAttribute('position',new THREE.Float32BufferAttribute(hp,3));
    hg.setAttribute('color',new THREE.Float32BufferAttribute(hc,3));
    haloPoints=new THREE.Points(hg,new THREE.PointsMaterial({
      size:.018,transparent:true,opacity:.55,vertexColors:true,
      blending:THREE.AdditiveBlending,depthWrite:false}));
    group.add(haloPoints);

    // Torus rings — identical
    rings=[];

    canvas.style.opacity='1'; // fade in
  }

  // ── AMBIENT FIELD ────────────────────────────────────────
  // Small glowing particles that fill the whole canvas box and drift
  // slowly toward the viewer, fading in at the back and out at the front.
  (function buildField(){
    const N=3600, pos=new Float32Array(N*3), sd=new Float32Array(N*2), col=new Float32Array(N*3);
    for(let i=0;i<N;i++){
      const ang=Math.random()*6.2832, rad=.18+Math.pow(Math.random(),.65)*4.2;
      pos[i*3]=Math.cos(ang)*rad;            // world x (scaled by aspect in shader)
      pos[i*3+1]=Math.sin(ang)*rad;          // world y
      pos[i*3+2]=Math.random();              // depth phase 0..1
      sd[i*2]=Math.random()*6.283; sd[i*2+1]=.6+Math.random()*.8;
      col[i*3]=.62+Math.random()*.2; col[i*3+1]=.5+Math.random()*.2; col[i*3+2]=.95+Math.random()*.05;
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(pos,3));
    g.setAttribute('aSeed',new THREE.BufferAttribute(sd,2));
    g.setAttribute('color',new THREE.BufferAttribute(col,3));
    const m=new THREE.ShaderMaterial({
      transparent:true,depthWrite:false,depthTest:false,vertexColors:true,
      blending:THREE.AdditiveBlending,
      uniforms:{uTime:{value:0},uAspect:{value:(figure.clientWidth||560)/(figure.clientHeight||650)},
                uPR:{value:renderer.getPixelRatio()}},
      vertexShader:`attribute vec2 aSeed;varying vec3 vColor;varying float vA;
        uniform float uTime;uniform float uAspect;uniform float uPR;
        void main(){
          float d=fract(position.z+uTime*0.042*aSeed.y);
          float z=mix(-13.0,5.7,d);
          vec3 p=vec3(position.x*max(uAspect,1.0),position.y,z);
          
          vec4 mv=viewMatrix*vec4(p,1.);
          gl_Position=projectionMatrix*mv;
          float near=1.0/max(0.6,-mv.z);
          gl_PointSize=min(11.0,(2.4+10.0*near))*uPR;
          vA=smoothstep(0.0,0.25,d)*(1.0-smoothstep(0.9,1.0,d))*(0.65+0.3*sin(uTime*1.3+aSeed.x));
          vColor=color;}`,
      fragmentShader:`varying vec3 vColor;varying float vA;
        void main(){
          float d=length(gl_PointCoord-.5);
          float a=smoothstep(.5,.0,d);
          a=a*a*.55+smoothstep(.2,.0,d)*.45;
          gl_FragColor=vec4(vColor,a*vA*1.0);}`
    });
    field=new THREE.Points(g,m);
    field.frustumCulled=false;
    scene.add(field);
  })();

  // ── CURSOR / TOUCH INPUT ─────────────────────────────────
  let lastMoveAt=performance.now();

  figure.addEventListener('pointermove',e=>{
    const r=figure.getBoundingClientRect();
    tgt.x=((e.clientX-r.left)/r.width-.5)*2;
    tgt.y=((e.clientY-r.top)/r.height-.5)*-2;
    lastMoveAt=performance.now();
  },{passive:true});

  figure.addEventListener('touchmove',e=>{
    const touch=e.touches[0];
    const r=figure.getBoundingClientRect();
    tgt.x=((touch.clientX-r.left)/r.width-.5)*2;
    tgt.y=((touch.clientY-r.top)/r.height-.5)*-2;
    lastMoveAt=performance.now();
  },{passive:true});

  // ── BOOT ─────────────────────────────────────────────────
  new THREE.TextureLoader().load('aria-reference.png',build);

  // ── RENDER LOOP ──────────────────────────────────────────
  function animate(){
    requestAnimationFrame(animate);
    t+=.012;
    mouse.lerp(tgt,.055);

    const idleMs=performance.now()-lastMoveAt;
    // Product page: never drop below 0.72 coherence —
    // user is mid-conversation, face should stay legible
    const idleFloor=({'idle':.72,'listening':.82,'thinking':.68,'speaking':.88})[
      slbl?( slbl.className.includes('listening')?'listening':
             slbl.className.includes('thinking')?'thinking':
             slbl.className.includes('speaking')?'speaking':'idle' ):'idle'
    ]||.72;
    const idleTarget=idleMs>1400?idleFloor:1;
    const coherenceTarget=Math.min(idleTarget,coherenceCap);

    cAgitation+=(tAgitation-cAgitation)*.025;
    cStateMix +=(tStateMix -cStateMix )*.04;

    group.rotation.y+=(mouse.x*.09 -group.rotation.y)*.035;
    group.rotation.x+=(mouse.y*.055-group.rotation.x)*.035;
    group.position.x+=(mouse.x*.12 -group.position.x)*.025;
    group.position.y+=(mouse.y*.08 -group.position.y)*.025;

    if(facePoints){
      const u=facePoints.material.uniforms;
      u.uTime.value=t;
      u.uCoherence.value+=(coherenceTarget-u.uCoherence.value)*.04;
      u.uStateMix.value=cStateMix;
      u.uStateColor.value.copy(cStateColor);
    }
    if(field)field.material.uniforms.uTime.value=t;
    if(haloPoints){
      haloPoints.rotation.y=t*.035*(1+cAgitation*1.4);
      haloPoints.rotation.z=Math.sin(t*.2*(1+cAgitation))*.025;
    }
    if(rings)rings.forEach((r,i)=>{
      const sp=1+cAgitation*1.6;
      r.rotation.z=t*(.045+i*.012)*sp*(i%2?1:-1);
      r.rotation.x=Math.PI/2-.4+Math.sin(t*.25+i)*.03;
      r.material.opacity=.12+(.12*Math.sin(t*(1.4+cAgitation*1.2)+i*.7)+.12);
    });

    renderer.render(scene,camera);
  }
  requestAnimationFrame(animate);
})();
