/* VANTAGE // ARIA
   ARIA VOLUMETRIC v5

   Face-first architecture:
   The uploaded ARIA portrait is the identity source. We do NOT attempt
   to hallucinate facial geometry from luminance or hand-written landmarks.

   The portrait remains visible as a holographic image layer, while a
   restrained particle veil, scan shimmer, depth drift and orbital field
   create the volumetric treatment around it.

   Only this file should be replaced.
*/

(function(){
  'use strict';

  if(!window.THREE)return;

  const figure=document.querySelector('.aria-figure');
  const canvas=document.getElementById('ariaVolumetricCanvas');
  if(!figure||!canvas)return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;

  const renderer=new THREE.WebGLRenderer({
    canvas,
    antialias:true,
    alpha:true,
    powerPreference:'high-performance'
  });

  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.setClearColor(0,0);

  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(28,1,.1,100);
  camera.position.set(0,0,7.2);

  const root=new THREE.Group();
  const faceRoot=new THREE.Group();
  const fieldRoot=new THREE.Group();
  root.add(faceRoot);
  root.add(fieldRoot);
  scene.add(root);

  const mouse=new THREE.Vector2();
  const target=new THREE.Vector2();

  let portrait=null;
  let particles=null;
  let ambientPoints=null;
  let rings=[];
  let built=false;
  let onScreen=false;
  let t=0;
  let lastMoveAt=performance.now();

  const STATE_COLOR={
    defensible:new THREE.Color(0x72f6bd),
    risk:new THREE.Color(0xff526f),
    partial:new THREE.Color(0xffb95c),
    neutral:new THREE.Color(0x9fdcff)
  };

  let targetStateMix=0;
  let currentStateMix=0;
  let currentStateColor=STATE_COLOR.neutral.clone();
  let targetAgitation=0;
  let currentAgitation=0;
  let coherenceLimit=1;

  function resize(){
    const w=Math.max(1,figure.clientWidth||560);
    const h=Math.max(1,figure.clientHeight||600);
    renderer.setSize(w,h,false);
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
  }

  function hash(x,y){
    return Math.abs(Math.sin(x*127.1+y*311.7)*43758.5453)%1;
  }

  function build(texture){
    const img=texture.image;
    const iw=img.naturalWidth||img.videoWidth||img.width||1;
    const ih=img.naturalHeight||img.videoHeight||img.height||1;
    const aspect=iw/ih;

    /*
      The image itself is the face. This is deliberate. Facial identity is
      too important to reconstruct from guessed landmarks.
    */
    const imageMaterial=new THREE.ShaderMaterial({
      transparent:true,
      depthWrite:false,
      uniforms:{
        uMap:{value:texture},
        uTime:{value:0},
        uMouse:{value:mouse},
        uStateColor:{value:currentStateColor.clone()},
        uStateMix:{value:0},
        uAgitation:{value:0}
      },
      vertexShader:`
        varying vec2 vUv;
        uniform float uTime;
        uniform vec2 uMouse;

        void main(){
          vUv=uv;
          vec3 p=position;

          p.x += uMouse.x*.018;
          p.y += uMouse.y*.014;
          p.z += sin(uTime*.55 + uv.y*5.0)*.008;

          gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
        }
      `,
      fragmentShader:`
        uniform sampler2D uMap;
        uniform float uTime;
        uniform vec3 uStateColor;
        uniform float uStateMix;
        uniform float uAgitation;
        varying vec2 vUv;

        void main(){
          vec4 tex=texture2D(uMap,vUv);
          float lum=dot(tex.rgb,vec3(.2126,.7152,.0722));

          /* Remove the near-black photographic surround, not the face. */
          float bg=smoothstep(.012,.075,lum);

          /* Cool the photograph into ARIA's luminous blue/cyan language. */
          vec3 cool=vec3(
            lum*.42 + tex.b*.34,
            lum*.68 + tex.g*.22,
            lum*.96 + tex.r*.12
          );

          /* Keep enough original tonal information for a recognisable face. */
          vec3 hologram=mix(tex.rgb,cool,.68);
          hologram=mix(hologram,uStateColor,uStateMix*.22);

          /* Fine scan movement, intentionally subtle. */
          float scan=0.965 + 0.035*sin(vUv.y*900.0-uTime*5.0);
          float shimmer=0.975 + 0.025*sin(vUv.x*47.0+uTime*1.7);

          /* A little edge falloff keeps the rectangular source invisible. */
          float edgeX=smoothstep(.015,.09,vUv.x)*smoothstep(.015,.09,1.0-vUv.x);
          float edgeY=smoothstep(.01,.08,vUv.y)*smoothstep(.01,.08,1.0-vUv.y);
          float edge=edgeX*edgeY;

          float alpha=bg*.72*scan*shimmer*edge;
          alpha*=1.0-uAgitation*.055;

          gl_FragColor=vec4(hologram,alpha);
        }
      `
    });

    const imageHeight=4.72;
    const imageWidth=imageHeight*aspect;
    const plane=new THREE.Mesh(
      new THREE.PlaneGeometry(imageWidth,imageHeight,1,1),
      imageMaterial
    );

    plane.position.y=.10;
    plane.position.z=-.18;
    portrait=plane;
    faceRoot.add(plane);

    /*
      Particle veil sampled directly from the same photograph.
      Particles sit ON the photographic face, so they cannot invent a new
      anatomy. They simply add the volumetric / holographic surface.
    */
    const sampleCanvas=document.createElement('canvas');
    const SW=260;
    const SH=Math.max(260,Math.round(SW/aspect));
    sampleCanvas.width=SW;
    sampleCanvas.height=SH;

    const sctx=sampleCanvas.getContext('2d',{willReadFrequently:true});
    sctx.drawImage(img,0,0,SW,SH);
    const data=sctx.getImageData(0,0,SW,SH).data;

    const pp=[];
    const pc=[];
    const ps=[];
    const pf=[];

    /* Every visible source pixel has a chance to contribute. */
    for(let y=0;y<SH;y++){
      for(let x=0;x<SW;x++){
        const i=(y*SW+x)*4;
        const r=data[i]/255;
        const g=data[i+1]/255;
        const b=data[i+2]/255;
        const lum=.2126*r+.7152*g+.0722*b;

        if(lum<.045)continue;

        const edge=Math.min(x,SW-1-x,y,SH-1-y);
        const edgeFactor=Math.min(1,edge/18);
        const p=.075 + lum*.20 + edgeFactor*.025;
        if(hash(x,y)>p)continue;

        const nx=x/(SW-1)-.5;
        const ny=.5-y/(SH-1);
        const z=.02 + lum*.22 + (hash(x+9,y+3)-.5)*.055;

        pp.push(nx*imageWidth,ny*imageHeight+.10,z+.02);

        const sparkle=.72+lum*.42;
        pc.push(.34*sparkle,.72*sparkle,1.0*sparkle);
        ps.push(hash(x+17,y+7)*6.283, .7+hash(x+31,y+13)*1.4, hash(x+47,y+29));
        pf.push(lum);
      }
    }

    const pg=new THREE.BufferGeometry();
    pg.setAttribute('position',new THREE.Float32BufferAttribute(pp,3));
    pg.setAttribute('color',new THREE.Float32BufferAttribute(pc,3));
    pg.setAttribute('aSeed',new THREE.Float32BufferAttribute(ps,3));
    pg.setAttribute('aLight',new THREE.Float32BufferAttribute(pf,1));

    const pm=new THREE.ShaderMaterial({
      transparent:true,
      depthWrite:false,
      vertexColors:true,
      blending:THREE.AdditiveBlending,
      uniforms:{
        uTime:{value:0},
        uMouse:{value:mouse},
        uCoherence:{value:1},
        uStateColor:{value:currentStateColor.clone()},
        uStateMix:{value:0},
        uAgitation:{value:0}
      },
      vertexShader:`
        attribute vec3 aSeed;
        attribute float aLight;
        varying vec3 vColor;
        varying float vLight;
        uniform float uTime;
        uniform vec2 uMouse;
        uniform float uCoherence;
        uniform vec3 uStateColor;
        uniform float uStateMix;
        uniform float uAgitation;

        void main(){
          vec3 p=position;

          float drift=1.0-uCoherence;
          p.x += sin(uTime*.65+aSeed.x+p.y*1.3)*.008;
          p.y += cos(uTime*.52+aSeed.x+p.x*1.1)*.006;
          p.z += sin(uTime*.8+aSeed.y)*.012;

          vec3 dir=normalize(vec3(
            sin(aSeed.x*2.0),
            cos(aSeed.x*1.6),
            sin(aSeed.y*1.7)
          )+.0001);
          p += dir*drift*(.035+aLight*.035);

          p.x += uMouse.x*.028;
          p.y += uMouse.y*.020;

          if(uAgitation>.001){
            p += dir*uAgitation*.018*sin(uTime*2.0+aSeed.x);
          }

          vec4 mv=modelViewMatrix*vec4(p,1.0);
          gl_Position=projectionMatrix*mv;

          float depth=1.0/(1.0+abs(mv.z)*.55);
          gl_PointSize=(1.15+2.25*depth)*(0.72+aLight*.72);

          vColor=mix(color,uStateColor,uStateMix*.45);
          vLight=aLight;
        }
      `,
      fragmentShader:`
        varying vec3 vColor;
        varying float vLight;

        void main(){
          float d=length(gl_PointCoord-.5);
          float a=smoothstep(.5,.05,d);
          float core=smoothstep(.18,0.0,d);
          gl_FragColor=vec4(vColor,(a*.50+core*.24)*(.52+vLight*.40));
        }
      `
    });

    particles=new THREE.Points(pg,pm);
    faceRoot.add(particles);

    /* Sparse halo particles outside the face. */
    const ambientCount=1050;
    const ap=new Float32Array(ambientCount*3);
    const ac=new Float32Array(ambientCount*3);

    for(let i=0;i<ambientCount;i++){
      const a=Math.random()*Math.PI*2;
      const radius=2.05+Math.pow(Math.random(),.65)*1.0;
      ap[i*3]=Math.cos(a)*radius;
      ap[i*3+1]=(Math.random()-.5)*3.65;
      ap[i*3+2]=-.20+(Math.random()-.5)*.9;

      const bright=.45+Math.random()*.45;
      ac[i*3]=.20*bright;
      ac[i*3+1]=.48*bright;
      ac[i*3+2]=.95*bright;
    }

    const ag=new THREE.BufferGeometry();
    ag.setAttribute('position',new THREE.Float32BufferAttribute(ap,3));
    ag.setAttribute('color',new THREE.Float32BufferAttribute(ac,3));

    const am=new THREE.PointsMaterial({
      size:.009,
      transparent:true,
      opacity:.22,
      vertexColors:true,
      blending:THREE.AdditiveBlending,
      depthWrite:false
    });

    ambientPoints=new THREE.Points(ag,am);
    fieldRoot.add(ambientPoints);

    /* Three quiet orbital rings, kept behind the actual face. */
    [1.72,2.08,2.42].forEach((radius,index)=>{
      const g=new THREE.TorusGeometry(radius,.0045,5,180);
      const m=new THREE.MeshBasicMaterial({
        color:index===1?0x6f9dff:0xb9c8ff,
        transparent:true,
        opacity:index===1?.14:.055,
        blending:THREE.AdditiveBlending,
        depthWrite:false
      });
      const ring=new THREE.Mesh(g,m);
      ring.rotation.x=Math.PI/2-.38;
      ring.position.y=.08;
      ring.position.z=-.48+index*.08;
      fieldRoot.add(ring);
      rings.push(ring);
    });

    canvas.classList.add('is-ready');
  }

  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        onScreen=true;
        resize();
        if(!built){
          built=true;
          new THREE.TextureLoader().load(
            'aria-reference.png',
            tex=>{
              tex.colorSpace=THREE.SRGBColorSpace;
              build(tex);
            },
            undefined,
            ()=>{}
          );
        }
      }else{
        onScreen=false;
      }
    });
  },{threshold:.12});

  observer.observe(figure);
  addEventListener('resize',resize);

  addEventListener('pointermove',e=>{
    const r=figure.getBoundingClientRect();
    if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return;
    target.x=((e.clientX-r.left)/r.width-.5)*2;
    target.y=((e.clientY-r.top)/r.height-.5)*-2;
    lastMoveAt=performance.now();
  },{passive:true});

  /* Preserve existing ER decision reactivity. */
  const caseMachine=document.getElementById('caseMachine');

  function applyOutcome(outcome){
    if(outcome==='C'){
      targetStateMix=.20;
      currentStateColor=STATE_COLOR.defensible;
      targetAgitation=0;
      coherenceLimit=1;
    }else if(outcome==='A'||outcome==='D'){
      targetStateMix=.38;
      currentStateColor=STATE_COLOR.risk;
      targetAgitation=1;
      coherenceLimit=.62;
    }else if(outcome==='B'){
      targetStateMix=.28;
      currentStateColor=STATE_COLOR.partial;
      targetAgitation=.48;
      coherenceLimit=.82;
    }else{
      targetStateMix=0;
      targetAgitation=0;
      coherenceLimit=1;
    }
  }

  if(caseMachine){
    applyOutcome(caseMachine.dataset.outcome||'');
    new MutationObserver(()=>applyOutcome(caseMachine.dataset.outcome||'')).observe(
      caseMachine,{attributes:true,attributeFilter:['data-outcome']}
    );
  }

  /* Preserve ARIA result mirror. */
  const reaction=document.getElementById('ariaReaction');
  const reactionBadge=document.getElementById('ariaReactionBadge');
  const reactionText=document.getElementById('ariaReactionText');
  const resultTitle=document.getElementById('resultTitle');
  const resultBadge=document.getElementById('resultBadge');

  function hasRealResult(){
    return !!(resultTitle&&resultTitle.textContent.trim()&&resultTitle.textContent.trim()!=='The system is waiting.');
  }

  function showHint(){
    if(!reaction||hasRealResult())return;
    reactionBadge.textContent='ARIA';
    reactionText.textContent='Move your cursor over her — she notices.';
    reaction.classList.add('live');
  }

  function hideHint(){
    if(!reaction||hasRealResult())return;
    reaction.classList.remove('live');
  }

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

  figure.addEventListener('pointerenter',hideHint);
  figure.addEventListener('pointerleave',showHint);

  if(resultTitle){
    new MutationObserver(mirrorReaction).observe(resultTitle,{childList:true,characterData:true,subtree:true});
    mirrorReaction();
  }

  function animate(){
    requestAnimationFrame(animate);
    if(!onScreen)return;

    t+=.012;
    mouse.lerp(target,.055);

    const idle=performance.now()-lastMoveAt>1500;
    const coherenceTarget=Math.min(idle?.58:1,coherenceLimit);

    currentAgitation+=(targetAgitation-currentAgitation)*.025;
    currentStateMix+=(targetStateMix-currentStateMix)*.035;

    faceRoot.rotation.y+=(mouse.x*.055-faceRoot.rotation.y)*.032;
    faceRoot.rotation.x+=(mouse.y*.032-faceRoot.rotation.x)*.032;
    faceRoot.position.x+=(mouse.x*.055-faceRoot.position.x)*.025;
    faceRoot.position.y+=(.10+mouse.y*.035-faceRoot.position.y)*.025;

    if(portrait){
      const u=portrait.material.uniforms;
      u.uTime.value=t;
      u.uStateMix.value=currentStateMix;
      u.uAgitation.value=currentAgitation;
      u.uStateColor.value.lerp(currentStateColor,.035);
    }

    if(particles){
      const u=particles.material.uniforms;
      u.uTime.value=t;
      u.uCoherence.value+=(coherenceTarget-u.uCoherence.value)*.045;
      u.uStateMix.value=currentStateMix;
      u.uAgitation.value=currentAgitation;
      u.uStateColor.value.lerp(currentStateColor,.035);
    }

    if(ambientPoints){
      ambientPoints.rotation.y=t*.012*(1+currentAgitation);
      ambientPoints.material.opacity=.18+Math.sin(t*.70)*.018;
    }

    rings.forEach((ring,index)=>{
      const speed=1+currentAgitation*1.15;
      ring.rotation.z=t*(.028+index*.009)*speed*(index%2?1:-1);
      ring.rotation.x=Math.PI/2-.38+Math.sin(t*.20+index)*.012;
    });

    renderer.render(scene,camera);
  }

  resize();
  requestAnimationFrame(animate);
})();
