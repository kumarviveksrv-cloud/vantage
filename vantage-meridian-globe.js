/* VANTAGE // MERIDIAN GLOBE
   Replaces the old CSS-only "orbit" illustration (flat circles faked
   into ellipses via a single rotateX transform, with no real depth or
   occlusion) with an actual Three.js 3D scene: a wireframe sphere with
   three independently-tilted rings genuinely rotating in 3D space, so
   parts of each ring correctly pass in front of and behind the sphere
   as they turn — the depth cue a flat CSS shape can never produce.

   The floating labels (STATE, INDUSTRY, etc.) and the "MERIDIAN /
   PRECISION ADVICE" text stay exactly as they were, as CSS-positioned
   HUD overlays sitting above this canvas (z-index handled in CSS) —
   only the decorative ring/glow illustration underneath them changed.
*/
(function(){
  'use strict';
  if(!window.THREE)return;
  const root=document.getElementById('meridianOrbit');
  const canvas=document.getElementById('meridianGlobeCanvas');
  if(!root||!canvas)return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;

  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  renderer.setClearColor(0,0);

  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(40,1,.1,100);
  camera.position.set(0,0,6.4);
  const group=new THREE.Group();
  scene.add(group);

  function resize(){
    const w=root.clientWidth||400,h=root.clientHeight||400;
    renderer.setSize(w,h);
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
  }

  // Central globe: a translucent glowing sphere plus a wireframe overlay,
  // so it reads as a faceted 3D object rather than a flat glowing disc.
  const sphereGeo=new THREE.SphereGeometry(1.35,24,18);
  const sphereMat=new THREE.MeshBasicMaterial({color:0x6366f1,transparent:true,opacity:.12,blending:THREE.AdditiveBlending,depthWrite:false});
  const sphere=new THREE.Mesh(sphereGeo,sphereMat);
  group.add(sphere);

  const wireGeo=new THREE.WireframeGeometry(new THREE.SphereGeometry(1.36,16,12));
  const wireMat=new THREE.LineBasicMaterial({color:0xc4b5fd,transparent:true,opacity:.28});
  const wire=new THREE.LineSegments(wireGeo,wireMat);
  group.add(wire);

  // Three independently-tilted rings — genuine 3D rotation, not a faked
  // ellipse, so each one correctly passes behind/in front of the sphere
  // as it turns.
  const rings=[];
  [
    {r:2.05,tiltX:1.15,tiltZ:.3,speed:.18,color:0x6366f1,opacity:.5},
    {r:2.55,tiltX:1.35,tiltZ:-.5,speed:-.13,color:0xc4b5fd,opacity:.4},
    {r:3.0,tiltX:1.5,tiltZ:.9,speed:.09,color:0x7c3aed,opacity:.32}
  ].forEach(cfg=>{
    const g=new THREE.TorusGeometry(cfg.r,.012,8,120);
    const m=new THREE.MeshBasicMaterial({color:cfg.color,transparent:true,opacity:cfg.opacity,blending:THREE.AdditiveBlending});
    const ring=new THREE.Mesh(g,m);
    ring.rotation.x=cfg.tiltX;
    ring.rotation.z=cfg.tiltZ;
    ring.userData.speed=cfg.speed;
    group.add(ring);
    rings.push(ring);
  });

  // A few small bright points riding along the outermost ring, echoing
  // the floating data-label markers around it.
  const markerCount=8;
  const markers=[];
  for(let i=0;i<markerCount;i++){
    const m=new THREE.Mesh(new THREE.SphereGeometry(.035,10,8),new THREE.MeshBasicMaterial({color:0xe0d9ff,transparent:true,opacity:.85,blending:THREE.AdditiveBlending}));
    m.userData.angle=(i/markerCount)*Math.PI*2;
    group.add(m);
    markers.push(m);
  }

  const mouse=new THREE.Vector2();
  const target=new THREE.Vector2();
  addEventListener('pointermove',e=>{
    const r=root.getBoundingClientRect();
    target.x=((e.clientX-r.left)/r.width-.5)*2;
    target.y=((e.clientY-r.top)/r.height-.5)*-2;
  },{passive:true});
  addEventListener('resize',resize);

  let onScreen=false,leaveTimer=null,t=0;
  const io=new IntersectionObserver(es=>{es.forEach(e=>{
    if(e.isIntersecting){
      if(leaveTimer){clearTimeout(leaveTimer);leaveTimer=null;}
      if(!onScreen){onScreen=true;resize();canvas.classList.add('is-ready');}
    }else if(onScreen&&!leaveTimer){
      leaveTimer=setTimeout(()=>{onScreen=false;leaveTimer=null;},250);
    }
  });},{threshold:.15});
  io.observe(root);

  function animate(){
    requestAnimationFrame(animate);
    if(!onScreen)return;
    t+=.01;
    mouse.lerp(target,.05);
    group.rotation.y+=(mouse.x*.35-group.rotation.y)*.03;
    group.rotation.x+=(mouse.y*.2-group.rotation.x)*.03;
    wire.rotation.y=t*.06;
    rings.forEach(r=>{r.rotation.z+=r.userData.speed*.02;});
    markers.forEach((m,i)=>{
      const ring=rings[2];
      const a=m.userData.angle+t*.4;
      const r3=3.0;
      const lx=Math.cos(a)*r3,ly=Math.sin(a)*r3;
      m.position.set(lx,0,ly).applyEuler(ring.rotation);
    });
    sphere.material.opacity=.1+Math.sin(t*.8)*.03;
    renderer.render(scene,camera);
  }
  requestAnimationFrame(animate);
})();
