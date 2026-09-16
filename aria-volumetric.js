/* VANTAGE // ARIA VOLUMETRIC INTELLIGENCE
   ARIA FACE RECONSTRUCTION v4

   This version is tuned for the new photographic aria-reference.png:
   a centered human portrait on a near-black background.

   Core rule:
   RECONSTRUCT THE FACE. DO NOT RECONSTRUCT THE POSTER.

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
  const camera=new THREE.PerspectiveCamera(31,1,.1,100);
  camera.position.set(0,.02,6.8);

  const root=new THREE.Group();
  const faceRoot=new THREE.Group();
  const fieldRoot=new THREE.Group();

  scene.add(root);
  root.add(faceRoot);
  root.add(fieldRoot);

  const mouse=new THREE.Vector2();
  const target=new THREE.Vector2();

  let facePoints=null;
  let featurePoints=null;
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
    neutral:new THREE.Color(0xc9d7ff)
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

  /*
    -----------------------------------------------------------------------
    SOURCE -> FACE PARTICLES

    The new reference is a clean human portrait on black. This is much
    easier to reconstruct than the old holographic poster.

    We use:
      1. black-background rejection
      2. central portrait geometry
      3. luminance for skin/hair volume
      4. local contrast for facial features
      5. deterministic-ish stratified sampling rather than a giant random
         cloud

    The face gets thousands of intentional samples.
    The background gets essentially none.
    -----------------------------------------------------------------------
  */

  function build(texture){

    const img=texture.image;

    const W=300;
    const H=300;

    const source=document.createElement('canvas');
    source.width=W;
    source.height=H;

    const ctx=source.getContext('2d',{
      willReadFrequently:true
    });

    /*
      The new image is already a portrait.
      Keep the central composition, with a tiny safety crop so the black
      margins cannot become particles.
    */
    ctx.drawImage(
      img,
      img.width*.035,
      img.height*.015,
      img.width*.93,
      img.height*.97,
      0,0,W,H
    );

    const pixels=
      ctx.getImageData(0,0,W,H).data;

    const lum=new Float32Array(W*H);

    for(let y=0;y<H;y++){
      for(let x=0;x<W;x++){

        const i=(y*W+x)*4;

        lum[y*W+x]=
          .2126*(pixels[i]/255)+
          .7152*(pixels[i+1]/255)+
          .0722*(pixels[i+2]/255);
      }
    }

    /*
      Small blur gives us the broad human form. The raw image is then
      used for feature contrast.
    */
    const broad=new Float32Array(W*H);

    for(let y=0;y<H;y++){

      for(let x=0;x<W;x++){

        let sum=0;
        let n=0;

        for(let oy=-5;oy<=5;oy+=2){
          const yy=y+oy;
          if(yy<0||yy>=H)continue;

          for(let ox=-5;ox<=5;ox+=2){
            const xx=x+ox;
            if(xx<0||xx>=W)continue;

            sum+=lum[yy*W+xx];
            n++;
          }
        }

        broad[y*W+x]=n?sum/n:lum[y*W+x];
      }
    }

    const pos=[];
    const col=[];
    const seed=[];
    const feature=[];

    /*
      The photograph is frontal and symmetrical.
      These normalized landmarks are intentionally approximate, not
      dependent on an external face-recognition library.
    */
    function featureField(nx,ny){

      const leftEye=Math.exp(
        -(
          ((nx+.34)/.205)**2+
          ((ny-.08)/.105)**2
        )
      );

      const rightEye=Math.exp(
        -(
          ((nx-.34)/.205)**2+
          ((ny-.08)/.105)**2
        )
      );

      const browL=Math.exp(
        -(
          ((nx+.34)/.25)**2+
          ((ny-.28)/.075)**2
        )
      );

      const browR=Math.exp(
        -(
          ((nx-.34)/.25)**2+
          ((ny-.28)/.075)**2
        )
      );

      const nose=Math.exp(
        -(
          (nx/.115)**2+
          ((ny+.10)/.36)**2
        )
      );

      const noseTip=Math.exp(
        -(
          (nx/.17)**2+
          ((ny+.28)/.10)**2
        )
      );

      const mouth=Math.exp(
        -(
          (nx/.27)**2+
          ((ny+.48)/.105)**2
        )
      );

      return {
        eye:Math.max(leftEye,rightEye),
        structure:Math.max(
          leftEye,rightEye,
          browL*.78,browR*.78,
          nose*.68,noseTip,
          mouth
        )
      };
    }

    /*
      Soft anatomical silhouette.
      x is wider through cheeks and temples and tapers into the jaw.
    */
    function silhouette(nx,ny){

      let width;

      if(ny>.10){
        width=.67;
      }else{
        const jaw=Math.max(
          0,
          Math.min(1,(-ny+.02)/.95)
        );

        width=.68-jaw*.20;
      }

      const ellipse=
        1-
        (nx/width)**2-
        ((ny-.01)/1.02)**2;

      return Math.max(
        0,
        Math.min(1,ellipse*2.8)
      );
    }

    /*
      Hair occupies a larger upper/side shell than skin.
      It is sampled at lower opacity/size later.
    */
    function hairShell(nx,ny){

      const outer=
        1-
        (nx/.82)**2-
        ((ny-.17)/1.02)**2;

      const inner=
        1-
        (nx/.60)**2-
        ((ny-.10)/.78)**2;

      return Math.max(
        0,
        Math.min(1,(outer-inner)*2.4)
      );
    }

    /*
      Shoulders are kept sparse so ARIA has a body presence without
      turning into a torso-shaped particle rectangle.
    */
    function shoulder(nx,ny){

      if(ny>-.66)return 0;

      const s=
        1-
        (nx/.95)**2-
        ((ny+.83)/.34)**2;

      return Math.max(
        0,
        Math.min(1,s*2.2)
      );
    }

    /*
      Main face pass.
    */
    for(let y=0;y<H;y++){

      for(let x=0;x<W;x++){

        const idx=y*W+x;
        const nx=(x/(W-1)-.5)*2;
        const ny=(.5-y/(H-1))*2;

        const b=lum[idx];
        const soft=broad[idx];

        /*
          Local contrast at a 2-pixel scale.
        */
        const l=x>2?lum[idx-2]:b;
        const r=x<W-3?lum[idx+2]:b;
        const u=y>2?lum[idx-W*2]:b;
        const d=y<H-3?lum[idx+W*2]:b;

        const contrast=
          Math.min(
            1,
            (
              Math.abs(b-l)+
              Math.abs(b-r)+
              Math.abs(b-u)+
              Math.abs(b-d)
            )*3.4
          );

        const mask=silhouette(nx,ny);
        const hair=hairShell(nx,ny);
        const shoulders=shoulder(nx,ny);
        const f=featureField(nx,ny);

        /*
          The photographic source has a black background. Reject it
          aggressively. This is the crucial difference from the old
          holographic-reference algorithm.
        */
        const illuminated=
          Math.max(
            0,
            (soft-.055)/.50
          );

        if(
          mask<.015 &&
          hair<.10 &&
          shoulders<.08
        )continue;

        /*
          Facial planes:
          broad luminance builds the cheek/forehead volume;
          contrast creates brows, eyes, nose and lips;
          feature priors guarantee continuity when photographic skin
          is very smooth.
        */
        let probability;

        if(mask>.015){

          probability=
            .12+
            illuminated*.50+
            contrast*.27+
            f.structure*.34;

          /*
            Extra continuity around actual facial features.
          */
          probability+=
            f.eye*.14;

        }else if(hair>.10){

          probability=
            .035+
            illuminated*.42+
            contrast*.20;

        }else{

          probability=
            .025+
            illuminated*.32;
        }

        /*
          Smooth central face gets a controlled fill. We deliberately
          don't require bright pixels everywhere, otherwise the cheek
          planes disappear and only the edges survive.
        */
        probability*=
          mask>.15
            ? .90+mask*.18
            : .58;

        probability=
          Math.max(
            0,
            Math.min(1,probability)
          );

        /*
          Fixed spatial jitter gives organic sampling while avoiding the
          giant stochastic cloud seen in previous versions.
        */
        const hash=
          Math.abs(
            Math.sin(
              x*12.9898+
              y*78.233
            )*43758.5453
          )%1;

        if(hash>probability)continue;

        /*
          Depth is mostly anatomical:
          central face forward, silhouette recedes,
          feature regions sit slightly forward.
        */
        const centre=
          Math.max(
            0,
            1-Math.sqrt(
              (nx/.70)**2+
              ((ny-.01)/1.02)**2
            )
          );

        const depth=
          mask*.42+
          centre*.34+
          (soft-.30)*.48+
          f.structure*.20+
          (hash-.5)*.06;

        /*
          Map portrait into the Three.js face volume.
        */
        pos.push(
          nx*1.52,
          ny*1.70,
          depth
        );

        /*
          Blue-white holographic coloration. Keep it bright enough to
          read, but don't turn every point into a bloom bomb.
        */
        const cyanBoost=
          Math.max(0,soft-.42);

        col.push(
          .46+
          soft*.28+
          cyanBoost*.06,

          .64+
          soft*.22+
          cyanBoost*.08,

          .92+
          soft*.08
        );

        seed.push(
          hash*Math.PI*2,
          .55+hash*1.45,
          hash
        );

        feature.push(
          f.eye
        );
      }
    }

    /*
      Dedicated feature pass.

      This is intentional redundancy. The eyes, brows, nose and lips are
      the parts a human viewer uses to recognize the face. Giving them a
      second fine particle layer means facial identity survives even when
      the larger volumetric field is moving.
    */
    const fp=[];
    const fc=[];
    const fs=[];
    const ff=[];

    function addFeatureEllipse(cx,cy,rx,ry,count,type){

      for(let i=0;i<count;i++){

        const a=
          Math.random()*
          Math.PI*2;

        const rr=
          Math.sqrt(Math.random());

        const x=
          cx+
          Math.cos(a)*rx*rr;

        const y=
          cy+
          Math.sin(a)*ry*rr;

        let z=.42;

        if(type==='eye'){
          z=.56+Math.random()*.20;
        }else if(type==='brow'){
          z=.48+Math.random()*.13;
        }else if(type==='mouth'){
          z=.50+Math.random()*.15;
        }else{
          z=.44+Math.random()*.18;
        }

        fp.push(
          x*1.52,
          y*1.70,
          z
        );

        const sparkle=
          .88+
          Math.random()*.12;

        fc.push(
          .55*sparkle,
          .78*sparkle,
          1*sparkle
        );

        fs.push(
          Math.random()*Math.PI*2,
          .8+Math.random()*1.2,
          Math.random()
        );

        ff.push(
          type==='eye'
            ? .95
            : .55
        );
      }
    }

    /*
      The new portrait is frontal, so these landmarks are stable.
    */
    addFeatureEllipse(
      -.34,.08,.115,.055,360,'eye'
    );

    addFeatureEllipse(
      .34,.08,.115,.055,360,'eye'
    );

    addFeatureEllipse(
      -.34,.28,.19,.045,250,'brow'
    );

    addFeatureEllipse(
      .34,.28,.19,.045,250,'brow'
    );

    addFeatureEllipse(
      0,-.43,.20,.045,220,'mouth'
    );

    /*
      Fine vertical nose ridge.
    */
    for(let i=0;i<420;i++){

      const q=Math.random();

      const x=
        (Math.random()-.5)*
        (.065+.055*q);

      const y=
        .18-q*.50;

      fp.push(
        x*1.52,
        y*1.70,
        .48+
        Math.random()*.16
      );

      fc.push(
        .55,
        .76,
        1
      );

      fs.push(
        Math.random()*6.28,
        .8+Math.random()*1.2,
        Math.random()
      );

      ff.push(.60);
    }

    const fg=
      new THREE.BufferGeometry();

    fg.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(fp,3)
    );

    fg.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(fc,3)
    );

    fg.setAttribute(
      'aSeed',
      new THREE.Float32BufferAttribute(fs,3)
    );

    fg.setAttribute(
      'aFeature',
      new THREE.Float32BufferAttribute(ff,1)
    );

    const featureMaterial=
      new THREE.ShaderMaterial({

        transparent:true,
        depthWrite:false,
        vertexColors:true,
        blending:THREE.AdditiveBlending,

        uniforms:{
          uTime:{value:0},
          uMouse:{value:mouse},
          uStateColor:{
            value:currentStateColor.clone()
          },
          uStateMix:{value:0}
        },

        vertexShader:`
          attribute vec3 aSeed;
          attribute float aFeature;

          varying vec3 vColor;

          uniform float uTime;
          uniform vec2 uMouse;
          uniform vec3 uStateColor;
          uniform float uStateMix;

          void main(){

            vec3 p=position;

            /*
              Features remain stable, with only microscopic motion.
            */
            p.z+=
              sin(
                uTime*.65+
                aSeed.x
              )*.008;

            p.x+=
              uMouse.x*
              (.035+aFeature*.035);

            p.y+=
              uMouse.y*
              (.025+aFeature*.025);

            vec4 mv=
              modelViewMatrix*
              vec4(p,1.);

            gl_Position=
              projectionMatrix*mv;

            float depth=
              1.0/
              (1.0+abs(mv.z)*.65);

            gl_PointSize=
              (1.55+
               2.65*depth+
               aFeature*.65);

            vColor=
              mix(
                color,
                uStateColor,
                uStateMix*.55
              );
          }
        `,

        fragmentShader:`
          varying vec3 vColor;

          void main(){

            float d=
              length(
                gl_PointCoord-.5
              );

            float a=
              smoothstep(
                .50,
                .04,
                d
              );

            float core=
              smoothstep(
                .20,
                0.0,
                d
              );

            gl_FragColor=
              vec4(
                vColor,
                (a*.68+core*.30)*.92
              );
          }
        `
      });

    featurePoints=
      new THREE.Points(
        fg,
        featureMaterial
      );

    faceRoot.add(featurePoints);

    /*
      Main volumetric face.
    */
    const geo=
      new THREE.BufferGeometry();

    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        pos,3
      )
    );

    geo.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(
        col,3
      )
    );

    geo.setAttribute(
      'aSeed',
      new THREE.Float32BufferAttribute(
        seed,3
      )
    );

    geo.setAttribute(
      'aFeature',
      new THREE.Float32BufferAttribute(
        feature,1
      )
    );

    const material=
      new THREE.ShaderMaterial({

        transparent:true,
        depthWrite:false,
        vertexColors:true,
        blending:THREE.AdditiveBlending,

        uniforms:{
          uTime:{value:0},
          uMouse:{value:mouse},
          uCoherence:{value:1},
          uStateColor:{
            value:currentStateColor.clone()
          },
          uStateMix:{value:0}
        },

        vertexShader:`
          attribute vec3 aSeed;
          attribute float aFeature;

          varying vec3 vColor;

          uniform float uTime;
          uniform vec2 uMouse;
          uniform float uCoherence;
          uniform vec3 uStateColor;
          uniform float uStateMix;

          void main(){

            vec3 p=position;

            /*
              Almost imperceptible movement.
              ARIA should feel alive, not turbulent.
            */
            p.z+=
              sin(
                uTime*.58+
                aSeed.x+
                p.y*1.45
              )*.014;

            /*
              Cursor parallax.
            */
            p.x+=
              uMouse.x*
              (.050+
               abs(p.z)*.015);

            p.y+=
              uMouse.y*
              (.038+
               abs(p.z)*.010);

            /*
              Eyes respond slightly more.
            */
            p.x+=
              uMouse.x*
              aFeature*.045;

            p.y+=
              uMouse.y*
              aFeature*.028;

            /*
              Idle dispersion.
            */
            float scatter=
              1.0-uCoherence;

            vec3 direction=
              normalize(
                vec3(
                  sin(aSeed.x*2.1),
                  cos(aSeed.x*1.7),
                  sin(aSeed.y*1.8)
                )+.0001
              );

            p+=
              direction*
              scatter*
              (.13+aFeature*.03);

            vec4 mv=
              modelViewMatrix*
              vec4(p,1.);

            gl_Position=
              projectionMatrix*mv;

            float depth=
              1.0/
              (1.0+abs(mv.z)*.68);

            float pulse=
              .90+
              .10*sin(
                aSeed.x+
                uTime*1.05
              );

            /*
              Small enough to preserve facial detail.
            */
            gl_PointSize=
              (1.45+
               3.15*depth*pulse+
               aFeature*.55);

            vColor=
              mix(
                color,
                uStateColor,
                uStateMix
              );
          }
        `,

        fragmentShader:`
          varying vec3 vColor;

          void main(){

            float d=
              length(
                gl_PointCoord-.5
              );

            float soft=
              smoothstep(
                .50,
                .07,
                d
              );

            float core=
              smoothstep(
                .20,
                0.0,
                d
              );

            gl_FragColor=
              vec4(
                vColor,
                (soft*.60+
                 core*.20)*.82
              );
          }
        `
      });

    facePoints=
      new THREE.Points(
        geo,
        material
      );

    /*
      The portrait should be large enough to read, but not so large that
      the forehead/jaw clip inside the existing 560x600 stage.
    */
    facePoints.scale.set(
      1.02,
      1.02,
      1.02
    );

    facePoints.position.y=.03;

    faceRoot.add(facePoints);

    /*
      Sparse peripheral holographic dust.
      This is deliberately tiny compared with previous versions.
    */
    const ambientCount=1500;

    const ap=
      new Float32Array(
        ambientCount*3
      );

    const ac=
      new Float32Array(
        ambientCount*3
      );

    for(let i=0;i<ambientCount;i++){

      const a=
        Math.random()*Math.PI*2;

      const radius=
        1.72+
        Math.pow(Math.random(),.7)*1.05;

      ap[i*3]=
        Math.cos(a)*radius;

      ap[i*3+1]=
        (Math.random()-.5)*3.7;

      ap[i*3+2]=
        (Math.random()-.5)*1.55;

      const gold=
        Math.random()>.94;

      ac[i*3]=
        gold?.92:.30+Math.random()*.18;

      ac[i*3+1]=
        gold?.64:.50+Math.random()*.20;

      ac[i*3+2]=
        gold?.38:.88+Math.random()*.12;
    }

    const ag=
      new THREE.BufferGeometry();

    ag.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        ap,3
      )
    );

    ag.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(
        ac,3
      )
    );

    const am=
      new THREE.PointsMaterial({
        size:.010,
        transparent:true,
        opacity:.23,
        vertexColors:true,
        blending:THREE.AdditiveBlending,
        depthWrite:false
      });

    ambientPoints=
      new THREE.Points(
        ag,
        am
      );

    fieldRoot.add(
      ambientPoints
    );

    /*
      Restrained orbital geometry.
    */
    [1.60,1.95,2.30].forEach(
      (radius,index)=>{

        const g=
          new THREE.TorusGeometry(
            radius,
            .0045,
            5,
            180
          );

        const m=
          new THREE.MeshBasicMaterial({
            color:
              index===1
                ?0x6f9dff
                :0xc7b8ff,
            transparent:true,
            opacity:
              index===1?.18:.075,
            blending:
              THREE.AdditiveBlending,
            depthWrite:false
          });

        const ring=
          new THREE.Mesh(g,m);

        ring.rotation.x=
          Math.PI/2-.38;

        ring.position.z=
          -.35+
          index*.12;

        fieldRoot.add(ring);
        rings.push(ring);
      }
    );

    canvas.classList.add('is-ready');
  }

  /*
    -----------------------------------------------------------------------
    VISIBILITY / LOADING
    -----------------------------------------------------------------------
  */

  const observer=
    new IntersectionObserver(
      entries=>{
        entries.forEach(entry=>{

          if(entry.isIntersecting){

            onScreen=true;
            resize();

            if(!built){

              built=true;

              new THREE.TextureLoader().load(
                'aria-reference.png',
                build,
                undefined,
                ()=>{}
              );
            }

          }else{

            onScreen=false;
          }
        });
      },
      {threshold:.12}
    );

  observer.observe(figure);

  addEventListener(
    'resize',
    resize
  );

  addEventListener(
    'pointermove',
    e=>{

      const r=
        figure.getBoundingClientRect();

      if(
        e.clientX<r.left||
        e.clientX>r.right||
        e.clientY<r.top||
        e.clientY>r.bottom
      )return;

      target.x=
        ((e.clientX-r.left)/r.width-.5)*2;

      target.y=
        ((e.clientY-r.top)/r.height-.5)*-2;

      lastMoveAt=
        performance.now();
    },
    {passive:true}
  );

  /*
    -----------------------------------------------------------------------
    ER DECISION REACTIVITY
    -----------------------------------------------------------------------
  */

  const caseMachine=
    document.getElementById(
      'caseMachine'
    );

  function applyOutcome(outcome){

    if(outcome==='C'){

      targetStateMix=.20;
      currentStateColor=
        STATE_COLOR.defensible;

      targetAgitation=0;
      coherenceLimit=1;

    }else if(
      outcome==='A'||
      outcome==='D'
    ){

      targetStateMix=.38;
      currentStateColor=
        STATE_COLOR.risk;

      targetAgitation=1;
      coherenceLimit=.62;

    }else if(outcome==='B'){

      targetStateMix=.28;
      currentStateColor=
        STATE_COLOR.partial;

      targetAgitation=.48;
      coherenceLimit=.82;

    }else{

      targetStateMix=0;
      targetAgitation=0;
      coherenceLimit=1;
    }
  }

  if(caseMachine){

    applyOutcome(
      caseMachine.dataset.outcome||''
    );

    new MutationObserver(
      ()=>{
        applyOutcome(
          caseMachine.dataset.outcome||''
        );
      }
    ).observe(
      caseMachine,
      {
        attributes:true,
        attributeFilter:[
          'data-outcome'
        ]
      }
    );
  }

  /*
    -----------------------------------------------------------------------
    ARIA RESULT MIRROR
    -----------------------------------------------------------------------
  */

  const reaction=
    document.getElementById(
      'ariaReaction'
    );

  const reactionBadge=
    document.getElementById(
      'ariaReactionBadge'
    );

  const reactionText=
    document.getElementById(
      'ariaReactionText'
    );

  const resultTitle=
    document.getElementById(
      'resultTitle'
    );

  const resultBadge=
    document.getElementById(
      'resultBadge'
    );

  function hasRealResult(){

    return !!(
      resultTitle&&
      resultTitle.textContent.trim()&&
      resultTitle.textContent.trim()!==
      'The system is waiting.'
    );
  }

  function showHint(){

    if(
      !reaction||
      hasRealResult()
    )return;

    reactionBadge.textContent='ARIA';
    reactionText.textContent=
      'Move your cursor over her — she notices.';

    reaction.classList.add('live');
  }

  function hideHint(){

    if(
      !reaction||
      hasRealResult()
    )return;

    reaction.classList.remove('live');
  }

  function mirrorReaction(){

    if(
      !resultTitle||
      !resultBadge||
      !reaction
    )return;

    const title=
      resultTitle.textContent.trim();

    const badge=
      resultBadge.textContent.trim();

    if(
      !title||
      title==='The system is waiting.'
    ){

      reaction.classList.remove(
        'live'
      );

      return;
    }

    reactionBadge.textContent=
      'ARIA · '+badge;

    reactionText.textContent=
      title;

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

  /*
    -----------------------------------------------------------------------
    ANIMATION
    -----------------------------------------------------------------------
  */

  function animate(){

    requestAnimationFrame(
      animate
    );

    if(!onScreen)return;

    t+=.012;

    mouse.lerp(
      target,
      .055
    );

    const idle=
      performance.now()-
      lastMoveAt>
      1500;

    const coherenceTarget=
      Math.min(
        idle?.58:1,
        coherenceLimit
      );

    currentAgitation+=
      (
        targetAgitation-
        currentAgitation
      )*.025;

    currentStateMix+=
      (
        targetStateMix-
        currentStateMix
      )*.035;

    /*
      Whole portrait parallax.
    */
    faceRoot.rotation.y+=
      (
        mouse.x*.075-
        faceRoot.rotation.y
      )*.032;

    faceRoot.rotation.x+=
      (
        mouse.y*.045-
        faceRoot.rotation.x
      )*.032;

    faceRoot.position.x+=
      (
        mouse.x*.085-
        faceRoot.position.x
      )*.025;

    faceRoot.position.y+=
      (
        .03+
        mouse.y*.050-
        faceRoot.position.y
      )*.025;

    if(facePoints){

      const u=
        facePoints.material.uniforms;

      u.uTime.value=t;

      u.uCoherence.value+=
        (
          coherenceTarget-
          u.uCoherence.value
        )*.045;

      u.uStateMix.value=
        currentStateMix;

      u.uStateColor.value.lerp(
        currentStateColor,
        .035
      );
    }

    if(featurePoints){

      const u=
        featurePoints.material.uniforms;

      u.uTime.value=t;

      u.uStateMix.value=
        currentStateMix;

      u.uStateColor.value.lerp(
        currentStateColor,
        .035
      );
    }

    if(ambientPoints){

      ambientPoints.rotation.y=
        t*.018*
        (1+currentAgitation);

      ambientPoints.material.opacity=
        .19+
        Math.sin(t*.70)*.025;
    }

    rings.forEach(
      (ring,index)=>{

        const speed=
          1+
          currentAgitation*1.25;

        ring.rotation.z=
          t*
          (.035+index*.010)*
          speed*
          (index%2?1:-1);

        ring.rotation.x=
          Math.PI/2-.38+
          Math.sin(
            t*.20+index
          )*.015;
      }
    );

    renderer.render(
      scene,
      camera
    );
  }

  resize();
  requestAnimationFrame(
    animate
  );

})();
