/* VANTAGE // ARIA
   ARIA VOLUMETRIC v6

   Particle reconstruction architecture.
   The reference image is used ONLY as a source map for particle targets.
   The photograph itself is never rendered.

   Interaction:
   - Cursor away: ARIA dissolves into a loose, animated particle cloud.
   - Cursor over the face: particles are attracted into the photographic face.
   - Cursor leaves: the face disperses back into the field.

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
    canvas, antialias:true, alpha:true, powerPreference:'high-performance'
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.setClearColor(0,0);

  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(29,1,.1,100);
  camera.position.set(0,0,7.4);

  const root=new THREE.Group();
  const particleRoot=new THREE.Group();
  const fieldRoot=new THREE.Group();
  root.add(particleRoot,fieldRoot);
  scene.add(root);

  const pointer=new THREE.Vector2(0,0);
  const pointerTarget=new THREE.Vector2(0,0);
  let pointerInside=false, targetCoherence=0, coherence=0;
  let t=0, onScreen=false, built=false, particles=null, ambient=null;
  const rings=[];

  const STATE_COLOR={
    defensible:new THREE.Color(0x72f6bd),
    risk:new THREE.Color(0xff526f),
    partial:new THREE.Color(0xffb95c),
    neutral:new THREE.Color(0x8fc9ff)
  };
  let targetStateMix=0, currentStateMix=0;
  let currentStateColor=STATE_COLOR.neutral.clone();
  let targetAgitation=0, currentAgitation=0, coherenceLimit=1;

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

    const SW=300, SH=Math.max(300,Math.round(SW/aspect));
    const source=document.createElement('canvas');
    source.width=SW; source.height=SH;
    const ctx=source.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(img,0,0,SW,SH);
    const data=ctx.getImageData(0,0,SW,SH).data;

    const lum=new Float32Array(SW*SH);
    for(let y=0;y<SH;y++) for(let x=0;x<SW;x++){
      const i=(y*SW+x)*4;
      lum[y*SW+x]=.2126*(data[i]/255)+.7152*(data[i+1]/255)+.0722*(data[i+2]/255);
    }

    /*
      Sample both luminous facial volume and high-contrast structure.
      This preserves eyes, brows, nostrils, lips and hair boundaries.
    */
    const candidates=[];
    for(let y=2;y<SH-2;y++) for(let x=2;x<SW-2;x++){
      const idx=y*SW+x, l=lum[idx];
      const gx=Math.abs(lum[idx+2]-lum[idx-2]);
      const gy=Math.abs(lum[idx+SW*2]-lum[idx-SW*2]);
      const edge=Math.min(1,Math.sqrt(gx*gx+gy*gy)*4.6);
      const local=(
        Math.abs(l-lum[idx-2])+Math.abs(l-lum[idx+2])+
        Math.abs(l-lum[idx-SW*2])+Math.abs(l-lum[idx+SW*2])
      )*.25;
      const score=l*.70+edge*.72+local*.75;
      if(score<.055)continue;

      const cx=x/(SW-1)-.5, cy=.5-y/(SH-1);
      const central=1-Math.min(1,Math.sqrt((cx/.58)**2+(cy/.63)**2));
      const probability=clamp(.045+score*.24+Math.max(0,central)*.055,0,.42);
      if(hash(idx*1.17)>probability)continue;
      candidates.push({x,y,score,l,edge});
    }

    /*
      A small deterministic facial-detail pass makes the target robust at
      the relatively small 560x600 display size.
    */
    function addZone(cx,cy,rx,ry,count,seed){
      for(let i=0;i<count;i++){
        const a=hash(seed+i*2.31)*Math.PI*2;
        const r=Math.sqrt(hash(seed+i*4.73));
        const x=Math.round(clamp(cx+Math.cos(a)*rx*r,2,SW-3));
        const y=Math.round(clamp(cy+Math.sin(a)*ry*r,2,SH-3));
        const idx=y*SW+x;
        candidates.push({x,y,score:.95,l:lum[idx],edge:1});
      }
    }
    addZone(SW*.385,SH*.392,SW*.070,SH*.027,280,101);
    addZone(SW*.615,SH*.392,SW*.070,SH*.027,280,202);
    addZone(SW*.385,SH*.350,SW*.085,SH*.022,180,303);
    addZone(SW*.615,SH*.350,SW*.085,SH*.022,180,404);
    addZone(SW*.500,SH*.485,SW*.038,SH*.095,260,505);
    addZone(SW*.500,SH*.620,SW*.090,SH*.035,260,606);

    const MAX=10500;
    if(candidates.length>MAX){
      candidates.sort((a,b)=>b.score-a.score);
      candidates.length=MAX;
    }

    const count=candidates.length;
    const targetPos=new Float32Array(count*3);
    const scatterPos=new Float32Array(count*3);
    const color=new Float32Array(count*3);
    const seedAttr=new Float32Array(count*4);
    const lightAttr=new Float32Array(count);
    const imageHeight=4.75, imageWidth=imageHeight*aspect;

    for(let i=0;i<count;i++){
      const p=candidates[i];
      const nx=p.x/(SW-1)-.5, ny=.5-p.y/(SH-1);
      const depth=(p.l-.5)*.24+p.edge*.08;

      targetPos[i*3]=nx*imageWidth;
      targetPos[i*3+1]=ny*imageHeight-.02;
      targetPos[i*3+2]=depth;

      /* Completely independent cloud coordinates. */
      const a=hash(i*7.31)*Math.PI*2;
      const r=.35+Math.pow(hash(i*13.17),.45)*2.25;
      scatterPos[i*3]=Math.cos(a)*r*(.78+hash(i*23.1)*.55);
      scatterPos[i*3+1]=(hash(i*19.43)-.5)*4.9;
      scatterPos[i*3+2]=-.65+(hash(i*29.7)-.5)*1.9;

      const src=(p.y*SW+p.x)*4;
      const rr=data[src]/255, gg=data[src+1]/255, bb=data[src+2]/255;
      const brightness=.72+p.l*.48;
      color[i*3]=clamp((rr*.18+bb*.40)*brightness,.08,1);
      color[i*3+1]=clamp((gg*.28+bb*.62)*brightness,.14,1);
      color[i*3+2]=clamp((bb*.72+rr*.12)*brightness,.32,1);

      seedAttr[i*4]=hash(i*31.1)*Math.PI*2;
      seedAttr[i*4+1]=hash(i*37.2);
      seedAttr[i*4+2]=hash(i*41.3);
      seedAttr[i*4+3]=hash(i*43.7);
      lightAttr[i]=clamp(p.score,.05,1.35);
    }

    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('aTarget',new THREE.Float32BufferAttribute(targetPos,3));
    geometry.setAttribute('aScatter',new THREE.Float32BufferAttribute(scatterPos,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(color,3));
    geometry.setAttribute('aSeed',new THREE.Float32BufferAttribute(seedAttr,4));
    geometry.setAttribute('aLight',new THREE.Float32BufferAttribute(lightAttr,1));

    const material=new THREE.ShaderMaterial({
      transparent:true, depthWrite:false, vertexColors:true,
      blending:THREE.AdditiveBlending,
      uniforms:{
        uTime:{value:0}, uCoherence:{value:0}, uMouse:{value:pointer},
        uStateColor:{value:currentStateColor.clone()},
        uStateMix:{value:0}, uAgitation:{value:0}
      },
      vertexShader:`
        attribute vec3 aTarget;
        attribute vec3 aScatter;
        attribute vec4 aSeed;
        attribute float aLight;
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

          p.x+=sin(uTime*.58+aSeed.x+p.y*.8)*(.025+.055*scatter);
          p.y+=cos(uTime*.47+aSeed.x+p.x*.65)*(.022+.045*scatter);
          p.z+=sin(uTime*.72+aSeed.y*7.0)*(.018+.035*scatter);

          p.x+=uMouse.x*.035*(.35+.65*uCoherence);
          p.y+=uMouse.y*.028*(.35+.65*uCoherence);

          if(uAgitation>.001){
            vec3 d=normalize(vec3(
              sin(aSeed.x*2.1),cos(aSeed.x*1.7),sin(aSeed.y*5.0)
            )+.0001);
            p+=d*uAgitation*(.018+.04*scatter)*sin(uTime*2.0+aSeed.z*6.28);
          }

          vec4 mv=modelViewMatrix*vec4(p,1.0);
          gl_Position=projectionMatrix*mv;
          float depth=1.0/(1.0+abs(mv.z)*.55);
          float size=(1.05+2.15*depth)*(0.72+aLight*.76);
          size*=.86+.32*uCoherence;
          gl_PointSize=size;

          vColor=mix(color,uStateColor,uStateMix*.34);
          vLight=aLight;
        }
      `,
      fragmentShader:`
        varying vec3 vColor;
        varying float vLight;
        void main(){
          float d=length(gl_PointCoord-.5);
          float soft=1.0-smoothstep(.05,.5,d);
          float core=1.0-smoothstep(0.0,.22,d);
          float alpha=(soft*.48+core*.28)*(.34+vLight*.56);
          gl_FragColor=vec4(vColor,alpha);
        }
      `
    });

    particles=new THREE.Points(geometry,material);
    particleRoot.add(particles);

    const ambientCount=1450;
    const ap=new Float32Array(ambientCount*3);
    const ac=new Float32Array(ambientCount*3);
    for(let i=0;i<ambientCount;i++){
      const a=hash(i*3.3)*Math.PI*2;
      const r=1.15+Math.pow(hash(i*5.7),.48)*2.15;
      ap[i*3]=Math.cos(a)*r;
      ap[i*3+1]=(hash(i*8.1)-.5)*4.7;
      ap[i*3+2]=-.85+(hash(i*9.9)-.5)*1.8;
      const q=.35+hash(i*11.2)*.55;
      ac[i*3]=.10*q; ac[i*3+1]=.34*q; ac[i*3+2]=.82*q;
    }
    const ag=new THREE.BufferGeometry();
    ag.setAttribute('position',new THREE.Float32BufferAttribute(ap,3));
    ag.setAttribute('color',new THREE.Float32BufferAttribute(ac,3));
    ambient=new THREE.Points(ag,new THREE.PointsMaterial({
      size:.010,transparent:true,opacity:.16,vertexColors:true,
      blending:THREE.AdditiveBlending,depthWrite:false
    }));
    fieldRoot.add(ambient);

    [1.72,2.10,2.48].forEach((radius,index)=>{
      const g=new THREE.TorusGeometry(radius,.004,5,180);
      const m=new THREE.MeshBasicMaterial({
        color:index===1?0x78a9ff:0xb9caff,
        transparent:true,opacity:index===1?.10:.035,
        blending:THREE.AdditiveBlending,depthWrite:false
      });
      const ring=new THREE.Mesh(g,m);
      ring.rotation.x=Math.PI/2-.38;
      ring.position.y=-.02;
      ring.position.z=-.70+index*.10;
      fieldRoot.add(ring);
      rings.push(ring);
    });
    canvas.classList.add('is-ready');
  }

  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      onScreen=entry.isIntersecting;
      if(onScreen&&!built){
        built=true; resize();
        new THREE.TextureLoader().load(
          'aria-reference.png',
          tex=>{tex.colorSpace=THREE.SRGBColorSpace;build(tex);},
          undefined, ()=>{}
        );
      }
    });
  },{threshold:.12});
  observer.observe(figure);

  addEventListener('resize',resize);
  figure.addEventListener('pointerenter',()=>{pointerInside=true;});
  figure.addEventListener('pointerleave',()=>{
    pointerInside=false; pointerTarget.set(0,0);
  });
  figure.addEventListener('pointermove',e=>{
    const r=figure.getBoundingClientRect();
    pointerTarget.x=((e.clientX-r.left)/r.width-.5)*2;
    pointerTarget.y=((e.clientY-r.top)/r.height-.5)*-2;
  },{passive:true});

  /* Preserve existing ER decision reactivity. */
  const caseMachine=document.getElementById('caseMachine');
  function applyOutcome(outcome){
    if(outcome==='C'){
      targetStateMix=.20; currentStateColor=STATE_COLOR.defensible;
      targetAgitation=0; coherenceLimit=1;
    }else if(outcome==='A'||outcome==='D'){
      targetStateMix=.38; currentStateColor=STATE_COLOR.risk;
      targetAgitation=1; coherenceLimit=.82;
    }else if(outcome==='B'){
      targetStateMix=.28; currentStateColor=STATE_COLOR.partial;
      targetAgitation=.48; coherenceLimit=.90;
    }else{
      targetStateMix=0; targetAgitation=0;
      currentStateColor=STATE_COLOR.neutral; coherenceLimit=1;
    }
  }
  if(caseMachine){
    applyOutcome(caseMachine.dataset.outcome||'');
    new MutationObserver(()=>applyOutcome(caseMachine.dataset.outcome||''))
      .observe(caseMachine,{attributes:true,attributeFilter:['data-outcome']});
  }

  /* Preserve ARIA result mirror and interaction hint. */
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
    pointer.lerp(pointerTarget,.075);

    /* Hover near the face = assemble. Move away = dissolve. */
    const d=Math.sqrt(pointerTarget.x*pointerTarget.x+
      Math.pow(pointerTarget.y-.02,2));
    const proximity=pointerInside ? 1-smoothstep(.25,.78,d) : 0;
    targetCoherence=proximity*coherenceLimit;
    coherence+=(targetCoherence-coherence)*.065;

    currentAgitation+=(targetAgitation-currentAgitation)*.025;
    currentStateMix+=(targetStateMix-currentStateMix)*.035;

    particleRoot.rotation.y+=(pointer.x*.045-particleRoot.rotation.y)*.028;
    particleRoot.rotation.x+=(pointer.y*.028-particleRoot.rotation.x)*.028;
    particleRoot.position.x+=(pointer.x*.045-particleRoot.position.x)*.025;
    particleRoot.position.y+=(pointer.y*.032-particleRoot.position.y)*.025;

    if(particles){
      const u=particles.material.uniforms;
      u.uTime.value=t; u.uCoherence.value=coherence; u.uMouse.value=pointer;
      u.uStateMix.value=currentStateMix; u.uAgitation.value=currentAgitation;
      u.uStateColor.value.lerp(currentStateColor,.035);
    }
    if(ambient){
      ambient.rotation.y=t*.012*(1+currentAgitation*.8);
      ambient.material.opacity=.13+.09*(1-coherence);
    }
    rings.forEach((ring,index)=>{
      ring.rotation.z=t*(.024+index*.008)*(index%2?1:-1);
      ring.rotation.x=Math.PI/2-.38+Math.sin(t*.20+index)*.012;
      ring.material.opacity=(index===1?.045:.018)+
        coherence*(index===1?.085:.035);
    });
    renderer.render(scene,camera);
  }

  resize();
  requestAnimationFrame(animate);
})();
