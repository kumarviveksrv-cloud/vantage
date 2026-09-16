/* VANTAGE // ARIA VOLUMETRIC INTELLIGENCE
   ARIA PARTICLE HOLOGRAM v2

   Surgical replacement for aria-volumetric.js.
   Uses aria-reference.png as the source image and reconstructs it as
   a deeper, denser, more dimensional Three.js particle presence.

   Preserved:
   - #ariaVolumetricCanvas / .aria-figure integration
   - cursor response
   - coherence / idle behaviour
   - ER decision reactivity
   - ariaReaction / result mirroring
   - halo field + orbital rings

   Changed:
   - higher-resolution source sampling
   - softer but denser particle acceptance
   - luminance + local-contrast facial structure
   - stronger eye / mouth / nose feature retention
   - luminance-derived depth
   - layered particle scales
   - subtle volumetric breathing and parallax
*/

(function(){
  'use strict';

  if(!window.THREE) return;

  const figure = document.querySelector('.aria-figure');
  const canvas = document.getElementById('ariaVolumetricCanvas');
  if(!figure || !canvas) return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, .1, 100);
  camera.position.set(0, 0, 6.7);

  const group = new THREE.Group();
  scene.add(group);

  function resize(){
    const w = figure.clientWidth || 560;
    const h = figure.clientHeight || 600;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const mouse = new THREE.Vector2();
  const target = new THREE.Vector2();

  let facePoints = null;
  let faceHalo = null;
  let haloPoints = null;
  let rings = [];
  let built = false;
  let onScreen = false;
  let t = 0;

  const EYE_L = [-0.42, 0.80];
  const EYE_R = [ 0.42, 0.80];
  const EYE_SIGMA = 0.30;

  const STATE_COLOR = {
    defensible: new THREE.Color(0x8cf8d0),
    risk:       new THREE.Color(0xff6680),
    partial:    new THREE.Color(0xffc56b)
  };

  function build(tex){
    const img = tex.image;

    /*
      The reference is intentionally sampled at a higher resolution than
      the old 180x180 pass. The extra pixels matter because ARIA's source
      contains very soft gradients rather than hard photographic edges.
    */
    const w = 240;
    const h = 240;

    const sample = document.createElement('canvas');
    sample.width = w;
    sample.height = h;

    const ctx = sample.getContext('2d', {willReadFrequently:true});
    ctx.drawImage(img, 0, 0, w, h);

    const d = ctx.getImageData(0, 0, w, h).data;
    const bright = new Float32Array(w * h);

    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const i = (y*w+x)*4;
        bright[y*w+x] =
          .2126*(d[i]/255) +
          .7152*(d[i+1]/255) +
          .0722*(d[i+2]/255);
      }
    }

    const pos = [];
    const col = [];
    const seed = [];
    const eyeW = [];

    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const idx = y*w+x;
        const i = idx*4;

        const r = d[i]/255;
        const g = d[i+1]/255;
        const b = d[i+2]/255;
        const br = bright[idx];

        const brL = x>0   ? bright[idx-1] : br;
        const brR = x<w-1 ? bright[idx+1] : br;
        const brU = y>0   ? bright[idx-w] : br;
        const brD = y<h-1 ? bright[idx+w] : br;

        const contrast =
          Math.abs(br-brL) +
          Math.abs(br-brR) +
          Math.abs(br-brU) +
          Math.abs(br-brD);

        /*
          Preserve the portrait's central geometry while suppressing most
          of the typography / background that lives outside the face.
        */
        const nx = (x/(w-1)-.5) * 3.15;
        const ny = (.5-y/(h-1)) * 4.0;

        const radial = Math.sqrt(
          (nx/1.66)**2 +
          (ny/2.02)**2
        );

        const central = Math.max(0, 1-radial*.70);

        const dL = Math.hypot(nx-EYE_L[0], ny-EYE_L[1]);
        const dR = Math.hypot(nx-EYE_R[0], ny-EYE_R[1]);

        const wL = Math.exp(
          -(dL*dL)/(2*EYE_SIGMA*EYE_SIGMA)
        );
        const wR = Math.exp(
          -(dR*dR)/(2*EYE_SIGMA*EYE_SIGMA)
        );

        const eyeWeight = Math.max(wL, wR);

        /*
          A soft-image mask:
          brightness keeps the luminous face/hair,
          contrast keeps eyes/nose/lips,
          central keeps the portrait dominant.
        */
        const edge = Math.min(1, contrast*3.5);

        let a =
          central*.22 +
          br*.38 +
          edge*(.20 + .34*central) +
          eyeWeight*.22;

        /*
          Slightly favour the lower central face so the jaw / neck don't
          disappear into the surrounding holographic field.
        */
        const lowerFace =
          Math.max(0, 1-Math.abs(nx)*.85) *
          Math.max(0, 1-Math.abs(ny+.15)*.62);

        a += lowerFace*.06;

        /*
          Keep the source soft, but dramatically less sparse than the
          original pass. The random term prevents a uniform digital mesh.
        */
        if(
          a < .105 ||
          Math.random() > Math.min(1, .53 + a*1.02)
        ) continue;

        /*
          Depth is inferred from source luminance plus portrait position.
          Bright facial planes sit slightly forward, while hair and
          surrounding particles recede.
        */
        const facialDepth =
          (br-.42)*1.10 +
          (1-radial)*.76 +
          edge*.18;

        const depth =
          facialDepth +
          (Math.random()-.5)*.24;

        pos.push(nx, ny, depth);

        seed.push(
          Math.random()*Math.PI*2,
          .55+Math.random()*1.55,
          depth
        );

        /*
          Keep ARIA predominantly blue-white with a very restrained
          violet/cyan separation derived from the source image.
        */
        const glow = .88 + br*.12;

        col.push(
          (.42+.34*b)*glow,
          (.31+.28*b)*glow,
          (.86+.11*r)*glow
        );

        eyeW.push(eyeWeight);
      }
    }

    const geo = new THREE.BufferGeometry();

    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(pos, 3)
    );

    geo.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(col, 3)
    );

    geo.setAttribute(
      'aSeed',
      new THREE.Float32BufferAttribute(seed, 3)
    );

    geo.setAttribute(
      'aEyeWeight',
      new THREE.Float32BufferAttribute(eyeW, 1)
    );

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      blending: THREE.AdditiveBlending,

      uniforms: {
        uTime:       {value:0},
        uMouse:      {value:mouse},
        uCoherence:  {value:1},
        uStateColor: {value:new THREE.Color(0xc4b5fd)},
        uStateMix:   {value:0}
      },

      vertexShader: `
        attribute vec3 aSeed;
        attribute float aEyeWeight;

        varying vec3 vColor;

        uniform float uTime;
        uniform vec2 uMouse;
        uniform float uCoherence;
        uniform vec3 uStateColor;
        uniform float uStateMix;

        void main(){

          vec3 p = position;

          /*
            Very small continuous movement keeps the face alive without
            turning it into a generic particle cloud.
          */
          float wave =
            sin(
              uTime*aSeed.y +
              aSeed.x +
              p.y*1.75
            )*.020;

          p.z += wave;

          /*
            Whole-field parallax.
          */
          p.x += uMouse.x*(.055 + abs(p.z)*.018);
          p.y += uMouse.y*(.040 + abs(p.z)*.014);

          /*
            Eyes respond slightly more strongly, giving ARIA the feeling
            of actually noticing the visitor.
          */
          p.x += uMouse.x*aEyeWeight*.105;
          p.y += uMouse.y*aEyeWeight*.072;

          /*
            Idle coherence becomes a controlled volumetric relaxation.
          */
          float scatter = 1.0-uCoherence;

          vec3 dir = normalize(
            vec3(
              sin(aSeed.x*3.1),
              cos(aSeed.x*2.3+aSeed.y),
              sin(aSeed.y*1.7)
            ) + .0001
          );

          p += dir*scatter*.48;

          /*
            Gentle breathing in depth. Different particles breathe at
            different phases, creating a volumetric rather than flat look.
          */
          p.z += sin(
            uTime*.65 +
            aSeed.x*1.7 +
            p.y*.8
          )*.012;

          vec4 mv = modelViewMatrix * vec4(p, 1.0);

          gl_Position = projectionMatrix * mv;

          /*
            Slightly larger core particles, with depth attenuation and
            subtle temporal variation.
          */
          float depthScale =
            1.0/(1.0+abs(mv.z)*.82);

          float pulse =
            .72 +
            .28*sin(aSeed.x + uTime*1.55);

          gl_PointSize =
            (3.25 + 5.35*depthScale*pulse) *
            (.91 + .09*uCoherence);

          vColor = mix(
            color,
            uStateColor,
            uStateMix
          );
        }
      `,

      fragmentShader: `
        varying vec3 vColor;

        void main(){

          float d = length(gl_PointCoord-.5);

          /*
            Soft luminous particle core with a tiny brighter centre.
          */
          float outer = smoothstep(.50,.035,d);
          float core  = smoothstep(.24,0.0,d);

          float alpha =
            outer*.72 +
            core*.34;

          gl_FragColor =
            vec4(vColor, alpha*.94);
        }
      `
    });

    facePoints = new THREE.Points(geo, mat);

    /*
      This is the key framing change: the portrait occupies more of the
      560x600 stage without changing the camera or container.
    */
    facePoints.position.y = .02;
    facePoints.scale.set(1.16, 1.16, 1.16);

    group.add(facePoints);

    /*
      A second, much smaller particle layer gives the silhouette a
      volumetric "projection" edge. It is deliberately sparse so it
      doesn't compete with the face.
    */
    const faceCount = Math.min(
      5200,
      Math.max(1800, Math.floor(pos.length*.25))
    );

    const fp = new Float32Array(faceCount*3);
    const fc = new Float32Array(faceCount*3);

    for(let i=0;i<faceCount;i++){
      const j =
        Math.floor(Math.random()*(pos.length/3))*3;

      const spread = .035 + Math.random()*.075;

      fp[i*3]   = pos[j]   + (Math.random()-.5)*spread;
      fp[i*3+1] = pos[j+1] + (Math.random()-.5)*spread;
      fp[i*3+2] = pos[j+2] + (Math.random()-.5)*.16;

      fc[i*3]   = .32 + Math.random()*.25;
      fc[i*3+1] = .55 + Math.random()*.25;
      fc[i*3+2] = .92 + Math.random()*.08;
    }

    const fg = new THREE.BufferGeometry();

    fg.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(fp,3)
    );

    fg.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(fc,3)
    );

    const fm = new THREE.PointsMaterial({
      size:.010,
      transparent:true,
      opacity:.26,
      vertexColors:true,
      blending:THREE.AdditiveBlending,
      depthWrite:false
    });

    faceHalo = new THREE.Points(fg,fm);
    faceHalo.scale.set(1.16,1.16,1.16);
    faceHalo.position.y=.02;

    group.add(faceHalo);

    /*
      Ambient volumetric field.
    */
    const count = 7600;
    const hp = new Float32Array(count*3);
    const hc = new Float32Array(count*3);

    for(let i=0;i<count;i++){
      const u = Math.random();
      const a = Math.random()*Math.PI*2;
      const rr = 1.72 + Math.pow(u,.52)*2.0;

      hp[i*3] =
        Math.cos(a)*rr;

      hp[i*3+1] =
        (Math.random()-.5)*4.5;

      hp[i*3+2] =
        (Math.random()-.5)*2.2;

      const gold = Math.random()>.91;

      hc[i*3] =
        gold ? .95 : .50+Math.random()*.22;

      hc[i*3+1] =
        gold ? .65 : .40+Math.random()*.22;

      hc[i*3+2] =
        gold ? .38 : .84+Math.random()*.16;
    }

    const hg = new THREE.BufferGeometry();

    hg.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(hp,3)
    );

    hg.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(hc,3)
    );

    const hm = new THREE.PointsMaterial({
      size:.017,
      transparent:true,
      opacity:.43,
      vertexColors:true,
      blending:THREE.AdditiveBlending,
      depthWrite:false
    });

    haloPoints = new THREE.Points(hg,hm);
    group.add(haloPoints);

    /*
      Projection rings. These remain understated so ARIA herself is the
      intelligence, not a decorative dashboard.
    */
    rings = [];

    [1.48,1.82,2.16,2.52].forEach((r,j)=>{

      const g = new THREE.TorusGeometry(
        r,
        .0055,
        5,
        192
      );

      const m = new THREE.MeshBasicMaterial({
        color:j%2 ? 0x6366f1 : 0xc4b5fd,
        transparent:true,
        opacity:j===1 ? .30 : .14,
        blending:THREE.AdditiveBlending,
        depthWrite:false
      });

      const o = new THREE.Mesh(g,m);

      o.rotation.x =
        Math.PI/2-.42;

      o.position.z =
        -.42+j*.13;

      group.add(o);
      rings.push(o);
    });

    canvas.classList.add('is-ready');
  }

  let lastMoveAt = performance.now();

  addEventListener('pointermove', e=>{
    const r = figure.getBoundingClientRect();

    if(
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    ) return;

    target.x =
      ((e.clientX-r.left)/r.width-.5)*2;

    target.y =
      ((e.clientY-r.top)/r.height-.5)*-2;

    lastMoveAt = performance.now();
  }, {passive:true});

  addEventListener('resize', resize);

  let leaveTimer = null;
  let hintShown = false;

  const io = new IntersectionObserver(entries=>{
    entries.forEach(entry=>{

      if(entry.isIntersecting){

        if(leaveTimer){
          clearTimeout(leaveTimer);
          leaveTimer = null;
        }

        if(!onScreen){

          onScreen = true;
          resize();

          if(!built){

            built = true;

            new THREE.TextureLoader().load(
              'aria-reference.png',
              build,
              undefined,
              ()=>{}
            );
          }

          if(!hintShown){
            hintShown = true;
            showHint();
          }
        }

      }else if(onScreen && !leaveTimer){

        leaveTimer = setTimeout(()=>{
          onScreen = false;
          leaveTimer = null;
        }, 250);
      }
    });
  }, {threshold:.15});

  io.observe(figure);

  let targetStateMix = 0;
  let currentStateMix = 0;
  let currentStateColor =
    new THREE.Color(0xc4b5fd);

  let targetAgitation = 0;
  let currentAgitation = 0;
  let stateCoherenceCap = 1;

  const caseMachine =
    document.getElementById('caseMachine');

  const reaction =
    document.getElementById('ariaReaction');

  const reactionBadge =
    document.getElementById('ariaReactionBadge');

  const reactionText =
    document.getElementById('ariaReactionText');

  function applyOutcome(outcome){

    if(outcome === 'C'){

      targetStateMix = .22;
      currentStateColor =
        STATE_COLOR.defensible;

      targetAgitation = 0;
      stateCoherenceCap = 1;

    }else if(outcome === 'A' || outcome === 'D'){

      targetStateMix = .40;
      currentStateColor =
        STATE_COLOR.risk;

      targetAgitation = 1;
      stateCoherenceCap = .60;

    }else if(outcome === 'B'){

      targetStateMix = .30;
      currentStateColor =
        STATE_COLOR.partial;

      targetAgitation = .5;
      stateCoherenceCap = .80;

    }else{

      targetStateMix = 0;
      targetAgitation = 0;
      stateCoherenceCap = 1;
    }
  }

  if(caseMachine){

    applyOutcome(
      caseMachine.dataset.outcome || ''
    );

    new MutationObserver(()=>{
      applyOutcome(
        caseMachine.dataset.outcome || ''
      );
    }).observe(
      caseMachine,
      {
        attributes:true,
        attributeFilter:['data-outcome']
      }
    );
  }

  const resultTitle =
    document.getElementById('resultTitle');

  const resultBadge =
    document.getElementById('resultBadge');

  function hasRealResult(){

    return !!(
      resultTitle &&
      resultTitle.textContent.trim() &&
      resultTitle.textContent.trim() !==
      'The system is waiting.'
    );
  }

  function showHint(){

    if(!reaction || hasRealResult()) return;

    reactionBadge.textContent = 'ARIA';
    reactionText.textContent =
      'Move your cursor over her — she notices.';

    reaction.classList.add('live');
  }

  function hideHint(){

    if(!reaction || hasRealResult()) return;

    reaction.classList.remove('live');
  }

  function mirrorReaction(){

    if(
      !resultTitle ||
      !resultBadge ||
      !reaction
    ) return;

    const title =
      resultTitle.textContent.trim();

    const badge =
      resultBadge.textContent.trim();

    if(
      !title ||
      title === 'The system is waiting.'
    ){

      reaction.classList.remove('live');
      return;
    }

    reactionBadge.textContent =
      'ARIA · ' + badge;

    reactionText.textContent = title;
    reaction.classList.add('live');
  }

  figure.addEventListener(
    'pointerenter',
    hideHint
  );

  figure.addEventListener(
    'pointerleave',
    showHint
  );

  if(resultTitle){

    new MutationObserver(
      mirrorReaction
    ).observe(
      resultTitle,
      {
        childList:true,
        characterData:true,
        subtree:true
      }
    );

    mirrorReaction();
  }

  function animate(){

    requestAnimationFrame(animate);

    if(!onScreen) return;

    t += .012;

    mouse.lerp(target,.055);

    const idleMs =
      performance.now()-lastMoveAt;

    const idleTarget =
      idleMs > 1400 ? .55 : 1;

    const coherenceTarget =
      Math.min(
        idleTarget,
        stateCoherenceCap
      );

    currentAgitation +=
      (targetAgitation-currentAgitation)*.02;

    currentStateMix +=
      (targetStateMix-currentStateMix)*.03;

    /*
      Slightly deeper parallax than the old version.
      The face should feel spatial, not like a flat sprite.
    */
    group.rotation.y +=
      (mouse.x*.105-group.rotation.y)*.035;

    group.rotation.x +=
      (mouse.y*.065-group.rotation.x)*.035;

    group.position.x +=
      (mouse.x*.13-group.position.x)*.025;

    group.position.y +=
      (mouse.y*.085-group.position.y)*.025;

    if(facePoints){

      const u =
        facePoints.material.uniforms;

      u.uTime.value = t;

      u.uCoherence.value +=
        (coherenceTarget-u.uCoherence.value)*.04;

      u.uStateMix.value =
        currentStateMix;

      u.uStateColor.value.copy(
        currentStateColor
      );
    }

    if(faceHalo){

      faceHalo.rotation.y =
        t*.018;

      faceHalo.rotation.x =
        Math.sin(t*.25)*.012;

      faceHalo.material.opacity =
        .19 +
        Math.sin(t*1.15)*.045 +
        currentAgitation*.035;
    }

    if(haloPoints){

      haloPoints.rotation.y =
        t*.030*(1+currentAgitation*1.4);

      haloPoints.rotation.z =
        Math.sin(
          t*.2*(1+currentAgitation)
        )*.025;
    }

    if(rings){

      rings.forEach((r,i)=>{

        const speed =
          1+currentAgitation*1.6;

        r.rotation.z =
          t*(.045+i*.012)*
          speed*
          (i%2 ? 1 : -1);

        r.rotation.x =
          Math.PI/2-.42+
          Math.sin(t*.25+i)*.025;

        r.material.opacity =
          .10 +
          (
            .10*
            Math.sin(
              t*(1.25+currentAgitation*1.2)
              +i*.7
            )+
            .10
          );
      });
    }

    renderer.render(
      scene,
      camera
    );
  }

  requestAnimationFrame(animate);

})();
