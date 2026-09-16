/* VANTAGE // ARIA VOLUMETRIC v8
   CPU PARTICLE RECONSTRUCTION
   Reference image is sampled only. It is never rendered.
*/
(function(){
  'use strict';
  if(!window.THREE) return;

  const figure=document.querySelector('.aria-figure');
  const canvas=document.getElementById('ariaVolumetricCanvas');
  if(!figure || !canvas) return;
  if(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const renderer=new THREE.WebGLRenderer({
    canvas, antialias:true, alpha:true, powerPreference:'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  if('outputColorSpace' in renderer) renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.setClearColor(0,0);

  const scene=new THREE.Scene();
  const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,20);
  camera.position.z=5;

  const root=new THREE.Group();
  scene.add(root);

  const pointer=new THREE.Vector2();
  const pointerTarget=new THREE.Vector2();
  let pointerInside=false;
  let onScreen=false, built=false;
  let t=0, coherence=0;
  let particles=null, ambient=null;
  let targetPositions=null, scatterPositions=null, currentPositions=null;
  let targetColors=null, particleSeeds=null;
  const rings=[];

  const STATE_COLOR={
    defensible:new THREE.Color(0x72f6bd),
    risk:new THREE.Color(0xff526f),
    partial:new THREE.Color(0xffb95c),
    neutral:new THREE.Color(0x8fc9ff)
  };
  let currentStateColor=STATE_COLOR.neutral.clone();
  let targetStateColor=STATE_COLOR.neutral.clone();
  let stateMix=0, targetStateMix=0;
  let agitation=0, targetAgitation=0;
  let coherenceLimit=1;

  function resize(){
    const w=Math.max(1,figure.clientWidth||560);
    const h=Math.max(1,figure.clientHeight||600);
    renderer.setSize(w,h,false);
    const aspect=w/h;
    camera.left=-aspect;
    camera.right=aspect;
    camera.top=1;
    camera.bottom=-1;
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
    const W=180, H=180;
    const src=document.createElement('canvas');
    src.width=W; src.height=H;
    const ctx=src.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(img,0,0,W,H);
    const data=ctx.getImageData(0,0,W,H).data;
    const lum=new Float32Array(W*H);

    for(let y=0;y<H;y++){
      for(let x=0;x<W;x++){
        const i=(y*W+x)*4;
        lum[y*W+x]=(.2126*data[i]+.7152*data[i+1]+.0722*data[i+2])/255;
      }
    }

    const candidates=[];
    for(let y=2;y<H-2;y++){
      for(let x=2;x<W-2;x++){
        const idx=y*W+x, l=lum[idx];
        const gx=lum[idx+2]-lum[idx-2];
        const gy=lum[idx+W*2]-lum[idx-W*2];
        const edge=clamp(Math.sqrt(gx*gx+gy*gy)*5.5,0,1);

        // The portrait has a black studio background. Brightness carries the
        // face volume; edges preserve eyes, brows, lips and hair boundaries.
        const cx=x/(W-1)-.5;
        const cy=.5-y/(H-1);
        const portrait=1-Math.min(1,Math.sqrt((cx/.49)*(cx/.49)+(cy/.51)*(cy/.51)));
        if(portrait<=0 && l<.12) continue;

        const score=l*.72+edge*1.15+Math.max(0,portrait)*.18;
        if(score<.07) continue;
        const p=clamp(.10+score*.38,0,.78);
        if(hash(idx*1.173)>p) continue;
        candidates.push({x,y,l,edge,score});
      }
    }

    // Identity anchors. These reinforce the real photograph's eyes, brows,
    // nose and lips at the small display size.
    function addZone(cx,cy,rx,ry,count,seed){
      for(let i=0;i<count;i++){
        const a=hash(seed+i*2.31)*Math.PI*2;
        const r=Math.sqrt(hash(seed+i*4.73));
        const x=Math.round(clamp(cx+Math.cos(a)*rx*r,1,W-2));
        const y=Math.round(clamp(cy+Math.sin(a)*ry*r,1,H-2));
        const idx=y*W+x;
        candidates.push({
          x,y,l:lum[idx],edge:1,score:.92
        });
      }
    }
    addZone(W*.385,H*.398,W*.075,H*.030,420,101);
    addZone(W*.615,H*.398,W*.075,H*.030,420,202);
    addZone(W*.385,H*.355,W*.090,H*.024,240,303);
    addZone(W*.615,H*.355,W*.090,H*.024,240,404);
    addZone(W*.500,H*.500,W*.045,H*.105,360,505);
    addZone(W*.500,H*.620,W*.105,H*.040,330,606);

    // Keep the point count manageable for CPU interpolation.
    const MAX=9000;
    if(candidates.length>MAX){
      candidates.sort((a,b)=>b.score-a.score);
      candidates.length=MAX;
    }

    const n=candidates.length;
    targetPositions=new Float32Array(n*3);
    scatterPositions=new Float32Array(n*3);
    currentPositions=new Float32Array(n*3);
    targetColors=new Float32Array(n*3);
    particleSeeds=new Float32Array(n*4);

    // Face is deliberately scaled to fit the actual ARIA panel.
    // Coordinates are in orthographic world space.
    const faceScale=1.72;

    for(let i=0;i<n;i++){
      const p=candidates[i];
      const nx=p.x/(W-1)-.5;
      const ny=.5-p.y/(H-1);

      // Slight luminance/depth relief.
      const z=(p.l-.45)*.10+p.edge*.045;

      targetPositions[i*3]=nx*faceScale;
      targetPositions[i*3+1]=ny*faceScale;
      targetPositions[i*3+2]=z;

      // Scatter state: broad 3D field around the eventual portrait.
      const a=hash(i*7.31)*Math.PI*2;
      const r=.25+Math.pow(hash(i*13.17),.48)*1.38;
      scatterPositions[i*3]=Math.cos(a)*r*(.72+hash(i*23.1)*.75);
      scatterPositions[i*3+1]=(hash(i*19.43)-.5)*1.85;
      scatterPositions[i*3+2]=-.25+(hash(i*29.7)-.5)*.90;

      currentPositions[i*3]=scatterPositions[i*3];
      currentPositions[i*3+1]=scatterPositions[i*3+1];
      currentPositions[i*3+2]=scatterPositions[i*3+2];

      const s=(p.y*W+p.x)*4;
      const rr=data[s]/255, gg=data[s+1]/255, bb=data[s+2]/255;
      const b=.55+p.l*.90;
      targetColors[i*3]=clamp((rr*.12+bb*.55)*b,.05,1);
      targetColors[i*3+1]=clamp((gg*.18+bb*.72)*b,.08,1);
      targetColors[i*3+2]=clamp((bb*.88+rr*.08)*b,.18,1);

      particleSeeds[i*4]=hash(i*31.1)*Math.PI*2;
      particleSeeds[i*4+1]=hash(i*37.2);
      particleSeeds[i*4+2]=hash(i*41.3);
      particleSeeds[i*4+3]=hash(i*43.7);
    }

    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(currentPositions,3));
    geometry.setAttribute('color',new THREE.BufferAttribute(targetColors,3));

    const material=new THREE.PointsMaterial({
      size:.0125,
      vertexColors:true,
      transparent:true,
      opacity:.86,
      depthWrite:false,
      blending:THREE.AdditiveBlending,
      sizeAttenuation:true
    });

    particles=new THREE.Points(geometry,material);
    root.add(particles);

    // Secondary particles make the dissolved state feel alive.
    const ambientCount=1100;
    const ap=new Float32Array(ambientCount*3);
    const ac=new Float32Array(ambientCount*3);
    for(let i=0;i<ambientCount;i++){
      const a=hash(i*3.3)*Math.PI*2;
      const r=.75+Math.pow(hash(i*5.7),.48)*1.45;
      ap[i*3]=Math.cos(a)*r;
      ap[i*3+1]=(hash(i*8.1)-.5)*1.85;
      ap[i*3+2]=-.45+(hash(i*9.9)-.5)*.8;
      const q=.25+hash(i*11.2)*.70;
      ac[i*3]=.04*q; ac[i*3+1]=.24*q; ac[i*3+2]=.72*q;
    }
    const ag=new THREE.BufferGeometry();
    ag.setAttribute('position',new THREE.BufferAttribute(ap,3));
    ag.setAttribute('color',new THREE.BufferAttribute(ac,3));
    ambient=new THREE.Points(ag,new THREE.PointsMaterial({
      size:.009, transparent:true, opacity:.15,
      vertexColors:true, blending:THREE.AdditiveBlending, depthWrite:false
    }));
    root.add(ambient);

    [0.72,0.88,1.04].forEach((r,i)=>{
      const g=new THREE.TorusGeometry(r,.0028,5,160);
      const m=new THREE.MeshBasicMaterial({
        color:i===1?0x78a9ff:0xb9caff,
        transparent:true,
        opacity:i===1?.065:.018,
        blending:THREE.AdditiveBlending,
        depthWrite:false
      });
      const ring=new THREE.Mesh(g,m);
      ring.rotation.x=Math.PI/2-.32;
      ring.position.z=-.55+i*.06;
      root.add(ring);
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
            if('colorSpace' in tex) tex.colorSpace=THREE.SRGBColorSpace;
            build(tex);
          },
          undefined,
          err=>console.warn('ARIA reference failed to load',err)
        );
      }
    });
  },{threshold:.08});
  observer.observe(figure);
  window.addEventListener('resize',resize);

  figure.addEventListener('pointerenter',()=>{pointerInside=true;});
  figure.addEventListener('pointerleave',()=>{
    pointerInside=false;
    pointerTarget.set(0,0);
  });
  figure.addEventListener('pointermove',e=>{
    const r=figure.getBoundingClientRect();
    pointerTarget.x=((e.clientX-r.left)/r.width-.5)*2;
    pointerTarget.y=((e.clientY-r.top)/r.height-.5)*-2;
  },{passive:true});

  const caseMachine=document.getElementById('caseMachine');
  function applyOutcome(outcome){
    if(outcome==='C'){
      targetStateColor=STATE_COLOR.defensible;
      targetStateMix=.18; targetAgitation=0; coherenceLimit=1;
    }else if(outcome==='A'||outcome==='D'){
      targetStateColor=STATE_COLOR.risk;
      targetStateMix=.32; targetAgitation=.8; coherenceLimit=.84;
    }else if(outcome==='B'){
      targetStateColor=STATE_COLOR.partial;
      targetStateMix=.25; targetAgitation=.38; coherenceLimit=.92;
    }else{
      targetStateColor=STATE_COLOR.neutral;
      targetStateMix=0; targetAgitation=0; coherenceLimit=1;
    }
  }
  if(caseMachine){
    applyOutcome(caseMachine.dataset.outcome||'');
    new MutationObserver(()=>applyOutcome(caseMachine.dataset.outcome||''))
      .observe(caseMachine,{attributes:true,attributeFilter:['data-outcome']});
  }

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
    if(!reaction||hasRealResult()) return;
    reactionBadge.textContent='ARIA';
    reactionText.textContent='Move your cursor over her — she notices.';
    reaction.classList.add('live');
  }
  function hideHint(){
    if(!reaction||hasRealResult()) return;
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
    t+=.016;

    pointer.lerp(pointerTarget,.12);

    // Cursor must actually be over the face area. Moving away immediately
    // releases the particles back into the field.
    const dx=pointerTarget.x/1.0;
    const dy=pointerTarget.y/1.0;
    const radial=Math.sqrt(dx*dx+dy*dy);
    const hoverField=pointerInside ? 1-smoothstep(.16,.72,radial) : 0;
    const targetC=hoverField*coherenceLimit;
    coherence+=(targetC-coherence)*.10;

    stateMix+=(targetStateMix-stateMix)*.035;
    agitation+=(targetAgitation-agitation)*.025;
    currentStateColor.lerp(targetStateColor,.035);

    if(particles){
      const pos=particles.geometry.attributes.position.array;
      const cols=particles.geometry.attributes.color.array;

      // A cursor-local "assembly wave": particles near the cursor's
      // corresponding facial location lock first, followed by the rest.
      const cursorX=pointerTarget.x;
      const cursorY=pointerTarget.y;

      for(let i=0;i<pos.length/3;i++){
        const j=i*3;
        const tx=targetPositions[j];
        const ty=targetPositions[j+1];
        const sx=scatterPositions[j];
        const sy=scatterPositions[j+1];
        const sz=scatterPositions[j+2];

        const localD=Math.sqrt(
          Math.pow((tx-cursorX)/1.45,2)+
          Math.pow((ty-cursorY)/1.45,2)
        );
        const local=pointerInside ? 1-smoothstep(.10,.95,localD) : 0;
        const amount=clamp(coherence*(.72+.28*local),0,1);

        const drift=.004+.012*(1-coherence);
        const seed=particleSeeds[i*4];

        const desiredX=sx+(tx-sx)*amount+
          Math.sin(t*.9+seed)*drift;
        const desiredY=sy+(ty-sy)*amount+
          Math.cos(t*.8+seed)*drift;
        const desiredZ=sz+(targetPositions[j+2]-sz)*amount;

        // Smooth physical movement rather than a hard shader morph.
        pos[j]+=(desiredX-pos[j])*.12;
        pos[j+1]+=(desiredY-pos[j+1])*.12;
        pos[j+2]+=(desiredZ-pos[j+2])*.12;

        // Tiny chromatic lift when particles lock.
        const baseR=targetColors[j], baseG=targetColors[j+1], baseB=targetColors[j+2];
        cols[j]=baseR*(.78+.22*amount);
        cols[j+1]=baseG*(.78+.22*amount);
        cols[j+2]=baseB*(.82+.30*amount);
      }

      particles.geometry.attributes.position.needsUpdate=true;
      particles.geometry.attributes.color.needsUpdate=true;
      particles.material.opacity=.70+.22*coherence;
      particles.rotation.y+=(pointer.x*.035-particles.rotation.y)*.025;
      particles.rotation.x+=(pointer.y*.025-particles.rotation.x)*.025;
    }

    if(ambient){
      ambient.rotation.z=t*.018;
      ambient.rotation.y=t*.010;
      ambient.material.opacity=.12+.10*(1-coherence);
    }
    rings.forEach((ring,i)=>{
      ring.rotation.z=t*(.022+i*.009)*(i%2?1:-1);
      ring.material.opacity=(i===1?.035:.012)+coherence*(i===1?.06:.025);
    });

    renderer.render(scene,camera);
  }

  resize();
  requestAnimationFrame(animate);
})();
