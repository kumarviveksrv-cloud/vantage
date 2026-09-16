/* VANTAGE // ARIA VOLUMETRIC v7
   FACE RECONSTRUCTION + MAGNETIC COHERENCE

   The reference image is used only as a coordinate/color source.
   It is never drawn into the visible canvas.

   Behaviour:
   - Cursor away: the face dissolves into a living particle field.
   - Cursor over ARIA: particles are magnetically pulled into her face.
   - Cursor leaves: the face breaks apart and disperses again.

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
    canvas,antialias:true,alpha:true,powerPreference:'high-performance'
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.setClearColor(0,0);

  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(31,1,.1,100);
  camera.position.set(0,0,7.2);

  const root=new THREE.Group();
  const faceRoot=new THREE.Group();
  const fieldRoot=new THREE.Group();
  root.add(faceRoot,fieldRoot);
  scene.add(root);

  const pointer=new THREE.Vector2();
  const pointerTarget=new THREE.Vector2();
  let pointerInside=false;
  let coherence=0;
  let t=0;
  let onScreen=false;
  let built=false;
  let particles=null;
  let ambient=null;
  const rings=[];

  const STATE_COLOR={
    defensible:new THREE.Color(0x72f6bd),
    risk:new THREE.Color(0xff526f),
    partial:new THREE.Color(0xffb95c),
    neutral:new THREE.Color(0x9bc8ff)
  };
  let targetStateMix=0,currentStateMix=0;
  let currentStateColor=STATE_COLOR.neutral.clone();
  let targetAgitation=0,currentAgitation=0,coherenceLimit=1;

  function resize(){
    const w=Math.max(1,figure.clientWidth||560);
    const h=Math.max(1,figure.clientHeight||600);
    renderer.setSize(w,h,false);
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
  }
  function hash(n){
    const x=Math.sin(n*127.1+311.7)*43758.5453123;
    return x-Math.floor(x);
  }
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function smoothstep(a,b,x){
    const q=clamp((x-a)/(b-a),0,1);
    return q*q*(3-2*q);
  }

  function build(texture){
    const img=texture.image;
    const iw=img.naturalWidth||img.width||1;
    const ih=img.naturalHeight||img.height||1;
    const aspect=iw/ih;

    // Square sampling keeps the facial geometry faithful to the supplied
    // portrait and gives us enough resolution for eyes, lips and jawline.
    const SW=360;
    const SH=Math.max(360,Math.round(SW/aspect));
    const source=document.createElement('canvas');
    source.width=SW; source.height=SH;
    const ctx=source.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(img,0,0,SW,SH);
    const data=ctx.getImageData(0,0,SW,SH).data;

    const lum=new Float32Array(SW*SH);
    for(let y=0;y<SH;y++){
      for(let x=0;x<SW;x++){
        const i=(y*SW+x)*4;
        lum[y*SW+x]=.2126*(data[i]/255)+.7152*(data[i+1]/255)+.0722*(data[i+2]/255);
      }
    }

    const candidates=[];
    const faceCx=SW*.5;
    const faceCy=SH*.50;
    const faceRx=SW*.43;
    const faceRy=SH*.49;

    // Main photographic sampling. Reject the black studio background, but
    // retain hair and facial contours through an elliptical portrait mask.
    for(let y=2;y<SH-2;y++){
      for(let x=2;x<SW-2;x++){
        const idx=y*SW+x;
        const l=lum[idx];
        const dx=(x-faceCx)/faceRx;
        const dy=(y-faceCy)/faceRy;
        const ellipse=dx*dx+dy*dy;
        if(ellipse>1.08 || l<.045)continue;

        const gx=lum[idx+2]-lum[idx-2];
        const gy=lum[idx+SW*2]-lum[idx-SW*2];
        const edge=clamp(Math.sqrt(gx*gx+gy*gy)*5.5,0,1);
        const local=(
          Math.abs(l-lum[idx-2])+Math.abs(l-lum[idx+2])+
          Math.abs(l-lum[idx-SW*2])+Math.abs(l-lum[idx+SW*2])
        )*.25;

        // Skin volume gets a steady baseline. Contrast gives eyes, brows,
        // nostrils, lips and hair edges additional representation.
        const interior=clamp(1-ellipse,0,1);
        const score=.25+interior*.34+l*.46+edge*.92+local*.65;
        const probability=clamp(.10+score*.28,0,.72);
        if(hash(idx*1.731)>probability)continue;

        candidates.push({x,y,l,edge,score});
      }
    }

    // Deterministic feature anchors. These do not draw a fake face. They
    // simply guarantee that the small canvas retains the identity-bearing
    // regions of the real supplied portrait.
    function addZone(cx,cy,rx,ry,count,seed,weight){
      for(let i=0;i<count;i++){
        const a=hash(seed+i*2.31)*Math.PI*2;
        const r=Math.sqrt(hash(seed+i*4.73));
        const x=Math.round(clamp(cx+Math.cos(a)*rx*r,2,SW-3));
        const y=Math.round(clamp(cy+Math.sin(a)*ry*r,2,SH-3));
        const idx=y*SW+x;
        candidates.push({x,y,l:lum[idx],edge:1,score:weight});
      }
    }
    // Reference portrait: eyes around 39% height, brows above, nose center,
    // lips around 62% height. Values intentionally track the supplied image.
    addZone(SW*.385,SH*.395,SW*.075,SH*.032,520,101,.98);
    addZone(SW*.615,SH*.395,SW*.075,SH*.032,520,202,.98);
    addZone(SW*.385,SH*.350,SW*.090,SH*.024,260,303,.88);
    addZone(SW*.615,SH*.350,SW*.090,SH*.024,260,404,.88);
    addZone(SW*.500,SH*.495,SW*.042,SH*.105,480,505,.92);
    addZone(SW*.500,SH*.615,SW*.100,SH*.038,420,606,.96);

    const MAX=14500;
    if(candidates.length>MAX){
      candidates.sort((a,b)=>b.score-a.score);
      candidates.length=MAX;
    }

    const count=candidates.length;
    const targetPos=new Float32Array(count*3);
    const scatterPos=new Float32Array(count*3);
    const colors=new Float32Array(count*3);
    const seedAttr=new Float32Array(count*4);
    const lightAttr=new Float32Array(count);

    // The portrait fills most of the ARIA window without becoming a flat
    // photograph. Z is derived from luminance and edge strength, creating
    // actual volumetric depth when the particles lock together.
    const imageHeight=5.10;
    const imageWidth=imageHeight*aspect;

    for(let i=0;i<count;i++){
      const p=candidates[i];
      const nx=p.x/(SW-1)-.5;
      const ny=.5-p.y/(SH-1);
      const depth=(p.l-.42)*.72+p.edge*.22+(hash(i*17.7)-.5)*.12;

      targetPos[i*3]=nx*imageWidth;
      targetPos[i*3+1]=ny*imageHeight-.04;
      targetPos[i*3+2]=depth;

      // Every particle gets its own destination in the loose field.
      const a=hash(i*7.31)*Math.PI*2;
      const r=.28+Math.pow(hash(i*13.17),.48)*2.65;
      scatterPos[i*3]=Math.cos(a)*r*(.78+hash(i*23.1)*.62);
      scatterPos[i*3+1]=(hash(i*19.43)-.5)*5.35;
      scatterPos[i*3+2]=-.75+(hash(i*29.7)-.5)*2.15;

      const src=(p.y*SW+p.x)*4;
      const rr=data[src]/255,gg=data[src+1]/255,bb=data[src+2]/255;
      // Cool luminous cyan/violet palette, preserving source brightness.
      const brightness=.62+p.l*.72;
      colors[i*3]=clamp((rr*.10+bb*.46)*brightness,.06,1);
      colors[i*3+1]=clamp((gg*.20+bb*.68)*brightness,.10,1);
      colors[i*3+2]=clamp((bb*.82+rr*.10)*brightness,.22,1);

      seedAttr[i*4]=hash(i*31.1)*Math.PI*2;
      seedAttr[i*4+1]=hash(i*37.2);
      seedAttr[i*4+2]=hash(i*41.3);
      seedAttr[i*4+3]=hash(i*43.7);
      lightAttr[i]=clamp(.22+p.score*.72,0.15,1.5);
    }

    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('aTarget',new THREE.Float32BufferAttribute(targetPos,3));
    geometry.setAttribute('aScatter',new THREE.Float32BufferAttribute(scatterPos,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    geometry.setAttribute('aSeed',new THREE.Float32BufferAttribute(seedAttr,4));
    geometry.setAttribute('aLight',new THREE.Float32BufferAttribute(lightAttr,1));

    const material=new THREE.ShaderMaterial({
      transparent:true,
      depthWrite:false,
      vertexColors:true,
      blending:THREE.AdditiveBlending,
      uniforms:{
        uTime:{value:0},
        uCoherence:{value:0},
        uMouse:{value:pointer},
        uStateColor:{value:currentStateColor.clone()},
        uStateMix:{value:0},
        uAgitation:{value:0}
      },
      vertexShader:`
        attribute vec3 aTarget;
        attribute vec3 aScatter;
        attribute vec4 aSeed;
        attribute float aLight;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vLight;
        uniform float uTime;
        uniform float uCoherence;
        uniform vec2 uMouse;
        uniform vec3 uStateColor;
        uniform float uStateMix;
        uniform float uAgitation;

        void main(){
          vec3 p=mix(aScatter,aTarget,uCoherence);
          float scatter=1.0-uCoherence;

          // Loose-field motion becomes calmer as ARIA reconstructs.
          float drift=.025+.075*scatter;
          p.x+=sin(uTime*.53+aSeed.x+p.y*.72)*drift;
          p.y+=cos(uTime*.47+aSeed.x+p.x*.58)*drift*.78;
          p.z+=sin(uTime*.71+aSeed.y*7.0)*(.018+.040*scatter);

          // Subtle parallax, strongest once the face is assembled.
          p.x+=uMouse.x*(.018+.052*uCoherence);
          p.y+=uMouse.y*(.014+.040*uCoherence);

          if(uAgitation>.001){
            vec3 dir=normalize(vec3(
              sin(aSeed.x*2.1),
              cos(aSeed.x*1.7),
              sin(aSeed.y*5.0)
            )+.0001);
            p+=dir*uAgitation*(.012+.050*scatter)*sin(uTime*2.1+aSeed.z*6.28);
          }

          vec4 mv=modelViewMatrix*vec4(p,1.0);
          gl_Position=projectionMatrix*mv;
          float depth=1.0/(1.0+abs(mv.z)*.50);
          float pulse=.88+.12*sin(uTime*1.7+aSeed.x);
          gl_PointSize=(1.45+3.15*depth)*(0.68+aLight*.70)*pulse;
          gl_PointSize*=.90+.24*uCoherence;

          vColor=mix(color,uStateColor,uStateMix*.34);
          vLight=aLight;
        }
      `,
      fragmentShader:`
        varying vec3 vColor;
        varying float vLight;
        void main(){
          float d=length(gl_PointCoord-.5);
          float soft=1.0-smoothstep(.03,.50,d);
          float core=1.0-smoothstep(0.0,.20,d);
          float alpha=(soft*.52+core*.34)*(.30+vLight*.56);
          if(alpha<.012)discard;
          gl_FragColor=vec4(vColor,alpha);
        }
      `
    });

    particles=new THREE.Points(geometry,material);
    particles.position.y=.02;
    particles.scale.set(1.02,1.02,1.02);
    faceRoot.add(particles);

    // Secondary field gives the dispersed state enough presence that ARIA
    // does not simply vanish when the cursor leaves.
    const ambientCount=1750;
    const ap=new Float32Array(ambientCount*3);
    const ac=new Float32Array(ambientCount*3);
    for(let i=0;i<ambientCount;i++){
      const a=hash(i*3.3)*Math.PI*2;
      const r=1.05+Math.pow(hash(i*5.7),.46)*2.45;
      ap[i*3]=Math.cos(a)*r;
      ap[i*3+1]=(hash(i*8.1)-.5)*5.0;
      ap[i*3+2]=-.95+(hash(i*9.9)-.5)*2.0;
      const q=.30+hash(i*11.2)*.62;
      ac[i*3]=.08*q; ac[i*3+1]=.30*q; ac[i*3+2]=.82*q;
    }
    const ag=new THREE.BufferGeometry();
    ag.setAttribute('position',new THREE.Float32BufferAttribute(ap,3));
    ag.setAttribute('color',new THREE.Float32BufferAttribute(ac,3));
    ambient=new THREE.Points(ag,new THREE.PointsMaterial({
      size:.011,transparent:true,opacity:.19,vertexColors:true,
      blending:THREE.AdditiveBlending,depthWrite:false
    }));
    fieldRoot.add(ambient);

    [1.78,2.18,2.58].forEach((radius,index)=>{
      const g=new THREE.TorusGeometry(radius,.0045,5,180);
      const m=new THREE.MeshBasicMaterial({
        color:index===1?0x78a9ff:0xb9caff,
        transparent:true,
        opacity:index===1?.10:.035,
        blending:THREE.AdditiveBlending,
        depthWrite:false
      });
      const ring=new THREE.Mesh(g,m);
      ring.rotation.x=Math.PI/2-.38;
      ring.position.y=-.04;
      ring.position.z=-.82+index*.11;
      fieldRoot.add(ring);
      rings.push(ring);
    });

    canvas.classList.add('is-ready');
  }

  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      onScreen=entry.isIntersecting;
      if(onScreen&&!built){
        built=true;
        resize();
        new THREE.TextureLoader().load(
          'aria-reference.png',
          tex=>{
            tex.colorSpace=THREE.SRGBColorSpace;
            build(tex);
          },
          undefined,
          err=>{
            console.warn('ARIA reference image failed to load.',err);
          }
        );
      }
    });
  },{threshold:.12});
  observer.observe(figure);

  addEventListener('resize',resize);

  figure.addEventListener('pointerenter',()=>{
    pointerInside=true;
  });
  figure.addEventListener('pointerleave',()=>{
    pointerInside=false;
    pointerTarget.set(0,0);
  });
  figure.addEventListener('pointermove',e=>{
    const r=figure.getBoundingClientRect();
    pointerTarget.x=((e.clientX-r.left)/r.width-.5)*2;
    pointerTarget.y=((e.clientY-r.top)/r.height-.5)*-2;
  },{passive:true});

  // Preserve existing ER decision reactivity.
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
      coherenceLimit=.82;
    }else if(outcome==='B'){
      targetStateMix=.28;
      currentStateColor=STATE_COLOR.partial;
      targetAgitation=.48;
      coherenceLimit=.90;
    }else{
      targetStateMix=0;
      targetAgitation=0;
      coherenceLimit=1;
    }
  }
  if(caseMachine){
    applyOutcome(caseMachine.dataset.outcome||'');
    new MutationObserver(()=>applyOutcome(caseMachine.dataset.outcome||''))
      .observe(caseMachine,{attributes:true,attributeFilter:['data-outcome']});
  }

  // Preserve ARIA result mirror and interaction hint.
  const reaction=document.getElementById('ariaReaction');
  const reactionBadge=document.getElementById('ariaReactionBadge');
  const reactionText=document.getElementById('ariaReactionText');
  const resultTitle=document.getElementById('resultTitle');
  const resultBadge=document.getElementById('resultBadge');

  function hasRealResult(){
    return !!(resultTitle&&resultTitle.textContent.trim()&&
      resultTitle.textContent.trim()!=='The system is waiting.');
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
    if(!title||title==='The system is waiting.'){showHint();return;}
    reactionBadge.textContent='ARIA · '+badge;
    reactionText.textContent=title;
    reaction.classList.add('live');
  }
  figure.addEventListener('pointerenter',hideHint);
  figure.addEventListener('pointerleave',showHint);
  if(resultTitle){
    new MutationObserver(mirrorReaction).observe(
      resultTitle,{childList:true,characterData:true,subtree:true}
    );
    mirrorReaction();
  }
  showHint();

  function animate(){
    requestAnimationFrame(animate);
    if(!onScreen)return;
    t+=.012;
    pointer.lerp(pointerTarget,.085);

    // Magnetic face field. The cursor can assemble ARIA from anywhere inside
    // the portrait zone, rather than requiring pixel-perfect positioning.
    const px=pointerTarget.x;
    const py=pointerTarget.y;
    const radial=Math.sqrt((px/.88)*(px/.88)+(py/.92)*(py/.92));
    const proximity=pointerInside ? 1-smoothstep(.35,1.0,radial) : 0;
    const targetCoherence=proximity*coherenceLimit;
    coherence+=(targetCoherence-coherence)*.075;

    currentAgitation+=(targetAgitation-currentAgitation)*.025;
    currentStateMix+=(targetStateMix-currentStateMix)*.035;

    root.rotation.y+=(pointer.x*.035-root.rotation.y)*.028;
    root.rotation.x+=(pointer.y*.022-root.rotation.x)*.028;
    root.position.x+=(pointer.x*.035-root.position.x)*.025;
    root.position.y+=(pointer.y*.025-root.position.y)*.025;

    if(particles){
      const u=particles.material.uniforms;
      u.uTime.value=t;
      u.uCoherence.value=coherence;
      u.uMouse.value=pointer;
      u.uStateMix.value=currentStateMix;
      u.uAgitation.value=currentAgitation;
      u.uStateColor.value.lerp(currentStateColor,.035);
    }
    if(ambient){
      ambient.rotation.y=t*.012*(1+currentAgitation*.8);
      ambient.rotation.x=Math.sin(t*.15)*.018;
      ambient.material.opacity=.13+.09*(1-coherence);
    }
    rings.forEach((ring,index)=>{
      ring.rotation.z=t*(.024+index*.008)*(index%2?1:-1);
      ring.rotation.x=Math.PI/2-.38+Math.sin(t*.20+index)*.012;
      ring.material.opacity=(index===1?.035:.014)+
        coherence*(index===1?.085:.032);
    });

    renderer.render(scene,camera);
  }

  resize();
  requestAnimationFrame(animate);
})();
