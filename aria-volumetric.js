/* VANTAGE // ARIA VOLUMETRIC INTELLIGENCE
   Adapted from the standalone prototype into the existing ARIA section.
   Changes from the original:
   - Recolored from the cyan/blue/amber palette to Vantage's lavender,
     violet and indigo family, to match the rest of the site.
   - Sized to its own container (.aria-figure) instead of the browser
     viewport — the original assumed a full-page #stage.
   - Mouse reactivity is scoped to this section's own bounding box,
     not the whole page, so it only responds when the pointer is
     actually near ARIA.
   - Texture load and rendering are both gated to the section being
     on-screen (same debounced IntersectionObserver pattern used for
     the intelligence-field globe), so this doesn't run — or even
     fetch the reference image — until the visitor scrolls to it.
   - All of the standalone prototype's full-page chrome (topline,
     side labels, identity block, prompt box, phrase-cycling
     interval) was left out entirely: the real ARIA section already
     has its own headline, lede and dialogue doing that narrative
     work in .aria-copy, so duplicating it here would just be noise.
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
  camera.position.set(0,0,7.8);
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

  function build(tex){
    const img=tex.image,w=180,h=180;
    const sample=document.createElement('canvas');
    sample.width=w;sample.height=h;
    const ctx=sample.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(img,0,0,w,h);
    const d=ctx.getImageData(0,0,w,h).data;
    const pos=[],col=[],seed=[];
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
        pos.push(nx,ny,depth);
        seed.push(Math.random()*Math.PI*2,.5+Math.random()*1.5,depth);
        // Recolored: boost red, pull green down, keep blue high — this
        // is what shifts the source image's tones from the prototype's
        // cyan/blue family into Vantage's lavender/violet family.
        col.push(.5+.3*b,.32+.22*b,.92+.06*r);
      }
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
    geo.setAttribute('aSeed',new THREE.Float32BufferAttribute(seed,3));
    const mat=new THREE.ShaderMaterial({
      transparent:true,depthWrite:false,vertexColors:true,blending:THREE.AdditiveBlending,
      uniforms:{uTime:{value:0},uMouse:{value:mouse}},
      vertexShader:`attribute vec3 aSeed;varying vec3 vColor;uniform float uTime;uniform vec2 uMouse;
        void main(){
          vec3 p=position;
          float wave=sin(uTime*aSeed.y+aSeed.x+p.y*1.7)*.018;
          p.z+=wave;
          p.x+=uMouse.x*(0.05+abs(p.z)*.015);
          p.y+=uMouse.y*(0.035+abs(p.z)*.012);
          vec4 mv=modelViewMatrix*vec4(p,1.);
          gl_Position=projectionMatrix*mv;
          gl_PointSize=1.35+2.1*(1.0/(1.0+abs(mv.z)))*(0.7+0.3*sin(aSeed.x+uTime*1.7));
          vColor=color;
        }`,
      fragmentShader:`varying vec3 vColor;
        void main(){
          float d=length(gl_PointCoord-.5);
          float a=smoothstep(.5,.02,d);
          gl_FragColor=vec4(vColor,a*.82);
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
      // Recolored halo: violet/lavender instead of cyan.
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
      // Recolored rings: indigo / lavender alternating, instead of the
      // original's cyan / amber (amber is reserved for Vantage's
      // warning states elsewhere on the site, so it stays out here).
      const m=new THREE.MeshBasicMaterial({color:j%2?0x6366f1:0xc4b5fd,transparent:true,opacity:j===1?.32:.18,blending:THREE.AdditiveBlending});
      const o=new THREE.Mesh(g,m);
      o.rotation.x=Math.PI/2;
      o.position.z=-.35+j*.12;
      group.add(o);
      rings.push(o);
    });

    const core=new THREE.Group();
    const coreDot=new THREE.Mesh(new THREE.SphereGeometry(.08,20,20),new THREE.MeshBasicMaterial({color:0xc4b5fd,transparent:true,opacity:.8,blending:THREE.AdditiveBlending}));
    core.add(coreDot);
    const coreRing=new THREE.Mesh(new THREE.TorusGeometry(.22,.006,6,80),new THREE.MeshBasicMaterial({color:0xe6ddff,transparent:true,opacity:.55,blending:THREE.AdditiveBlending}));
    coreRing.rotation.x=Math.PI/2;
    core.add(coreRing);
    core.position.set(0,-1.93,.2);
    group.add(core);

    canvas.classList.add('is-ready');
  }

  // Scoped to this section's own box, not the whole page — the
  // original prototype listened on the whole document, which meant
  // the face reacted to the mouse no matter where on the page it was.
  addEventListener('pointermove',e=>{
    const r=figure.getBoundingClientRect();
    target.x=((e.clientX-r.left)/r.width-.5)*2;
    target.y=((e.clientY-r.top)/r.height-.5)*-2;
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

  function animate(){
    requestAnimationFrame(animate);
    if(!onScreen)return;
    t+=.012;
    mouse.lerp(target,.055);
    group.rotation.y+=(mouse.x*.09-group.rotation.y)*.035;
    group.rotation.x+=(mouse.y*.055-group.rotation.x)*.035;
    group.position.x+=(mouse.x*.12-group.position.x)*.025;
    group.position.y+=(mouse.y*.08-group.position.y)*.025;
    if(facePoints)facePoints.material.uniforms.uTime.value=t;
    if(haloPoints){haloPoints.rotation.y=t*.035;haloPoints.rotation.z=Math.sin(t*.2)*.025;}
    if(rings)rings.forEach((r,i)=>{
      r.rotation.z=t*(.045+i*.012)*(i%2?1:-1);
      r.rotation.x=Math.PI/2+Math.sin(t*.25+i)*.03;
      r.material.opacity=.12+(.12*Math.sin(t*1.4+i*.7)+.12);
    });
    renderer.render(scene,camera);
  }
  requestAnimationFrame(animate);
})();
