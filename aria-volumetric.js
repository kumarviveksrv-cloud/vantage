/* VANTAGE // ARIA
   ARIA VOLUMETRIC v11
   Identity-preserving particle reconstruction.

   IMPORTANT:
   - aria-reference.png is used only as an analysis source.
   - The source image is never rendered into the scene.
   - Only this file should be replaced.

   Interaction:
   - Idle: the identity dissolves into a loose particle field.
   - Cursor approaches ARIA: particles converge toward the reference geometry.
   - Cursor settles over ARIA: the face resolves with greater detail.
   - Cursor leaves: the reconstruction physically disperses.
*/
(function () {
  'use strict';

  if (!window.THREE) return;

  const figure = document.querySelector('.aria-figure');
  const canvas = document.getElementById('ariaVolumetricCanvas');
  if (!figure || !canvas) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

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
  const VIEW_H = 6.0;
  let viewW = VIEW_H;
  const camera = new THREE.OrthographicCamera(-3, 3, 3, -3, -20, 20);
  camera.position.z = 10;

  const root = new THREE.Group();
  const identityRoot = new THREE.Group();
  const fieldRoot = new THREE.Group();
  root.add(identityRoot, fieldRoot);
  scene.add(root);

  const pointer = new THREE.Vector2();
  const pointerTarget = new THREE.Vector2();
  let pointerInside = false;
  let coherence = 0;
  let targetCoherence = 0;
  let t = 0;
  let onScreen = false;
  let built = false;

  let particles = null;
  let ambient = null;
  let particleData = null;
  const rings = [];

  const STATE_COLOR = {
    defensible: new THREE.Color(0x72f6bd),
    risk: new THREE.Color(0xff526f),
    partial: new THREE.Color(0xffb95c),
    neutral: new THREE.Color(0x8fc9ff)
  };
  let targetStateMix = 0;
  let currentStateMix = 0;
  let currentStateColor = STATE_COLOR.neutral.clone();
  let targetAgitation = 0;
  let currentAgitation = 0;
  let coherenceLimit = 1;

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function smoothstep(a, b, x) {
    const q = clamp((x - a) / (b - a), 0, 1);
    return q * q * (3 - 2 * q);
  }

  function hash(n) {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  }

  function resize() {
    const w = Math.max(1, figure.clientWidth || 560);
    const h = Math.max(1, figure.clientHeight || 600);
    renderer.setSize(w, h, false);
    viewW = VIEW_H * (w / h);
    camera.left = -viewW / 2;
    camera.right = viewW / 2;
    camera.top = VIEW_H / 2;
    camera.bottom = -VIEW_H / 2;
    camera.updateProjectionMatrix();
  }

  function disposePoints(points) {
    if (!points) return;
    if (points.geometry) points.geometry.dispose();
    if (points.material) points.material.dispose();
  }

  /*
     The reference contains its own orbital environment. V10 sampled the entire
     square, so those environmental lines competed with the woman's geometry.
     V11 first isolates the central portrait window, then builds two signals:
       1. low-frequency luminance = facial volume
       2. local contrast/edge energy = eyes, brows, nose, lips and jaw detail
     The combination preserves the photographic geometry without ever drawing
     the photograph itself.
  */
  function build(texture) {
    if (particles) {
      identityRoot.remove(particles);
      disposePoints(particles);
      particles = null;
    }
    if (ambient) {
      fieldRoot.remove(ambient);
      disposePoints(ambient);
      ambient = null;
    }
    rings.forEach(r => {
      fieldRoot.remove(r);
      if (r.geometry) r.geometry.dispose();
      if (r.material) r.material.dispose();
    });
    rings.length = 0;

    const img = texture.image;
    const iw = img.naturalWidth || img.width || 1;
    const ih = img.naturalHeight || img.height || 1;

    /* Portrait window calibrated to the supplied ARIA reference.
       It excludes most of the surrounding environment while retaining hair,
       face contour and the upper neck. The source aspect ratio is preserved. */
    const CROP_X0 = 0.20;
    const CROP_X1 = 0.80;
    const CROP_Y0 = 0.12;
    const CROP_Y1 = 0.75;

    const SW = 360;
    const SH = 360;
    const source = document.createElement('canvas');
    source.width = SW;
    source.height = SH;
    const ctx = source.getContext('2d', { willReadFrequently: true });

    const sx = iw * CROP_X0;
    const sy = ih * CROP_Y0;
    const sw = iw * (CROP_X1 - CROP_X0);
    const sh = ih * (CROP_Y1 - CROP_Y0);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, SW, SH);

    const rgba = ctx.getImageData(0, 0, SW, SH).data;
    const lum = new Float32Array(SW * SH);
    const soft = new Float32Array(SW * SH);
    const edge = new Float32Array(SW * SH);

    for (let y = 0; y < SH; y++) {
      for (let x = 0; x < SW; x++) {
        const i = (y * SW + x) * 4;
        const r = rgba[i] / 255;
        const g = rgba[i + 1] / 255;
        const b = rgba[i + 2] / 255;
        lum[y * SW + x] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }
    }

    /* A tiny blur gives us facial mass rather than only bright pixels. */
    for (let y = 1; y < SH - 1; y++) {
      for (let x = 1; x < SW - 1; x++) {
        const i = y * SW + x;
        soft[i] = (
          lum[i] * 4 +
          lum[i - 1] + lum[i + 1] +
          lum[i - SW] + lum[i + SW]
        ) / 8;
      }
    }

    for (let y = 2; y < SH - 2; y++) {
      for (let x = 2; x < SW - 2; x++) {
        const i = y * SW + x;
        const gx = (
          -soft[i - 2 * SW - 2] - 2 * soft[i - SW - 2] - soft[i + 2] +
          soft[i - 2 * SW + 2] + 2 * soft[i - SW + 2] + soft[i + 2 * SW + 2]
        );
        const gy = (
          -soft[i - 2 * SW - 2] - 2 * soft[i - 2] - soft[i + 2 * SW - 2] +
          soft[i - 2 * SW + 2] + 2 * soft[i + 2] + soft[i + 2 * SW + 2]
        );
        edge[i] = clamp(Math.sqrt(gx * gx + gy * gy) * 6.5, 0, 1);
      }
    }

    const candidates = [];

    for (let y = 2; y < SH - 2; y++) {
      for (let x = 2; x < SW - 2; x++) {
        const i = y * SW + x;
        const l = lum[i];
        const s = soft[i];
        const e = edge[i];

        const nx = x / (SW - 1) - 0.5;
        const ny = 0.5 - y / (SH - 1);

        /* Portrait prior. It is deliberately soft so hair and jaw remain intact. */
        const portraitD = Math.sqrt(
          Math.pow(nx / 0.455, 2) + Math.pow((ny + 0.015) / 0.535, 2)
        );
        const portrait = 1 - smoothstep(0.63, 1.0, portraitD);

        /* Tighter central prior makes facial detail win over orbital artefacts. */
        const faceD = Math.sqrt(
          Math.pow(nx / 0.325, 2) + Math.pow((ny + 0.015) / 0.425, 2)
        );
        const face = 1 - smoothstep(0.56, 1.0, faceD);

        /* Very dark pixels alone are usually environment. Edge energy can still
           resurrect dark eyes/hair, but only inside the portrait prior. */
        const visible = smoothstep(0.018, 0.105, s);
        const surface = Math.pow(clamp(s, 0, 1), 0.68) * visible;
        const detail = Math.pow(e, 0.72);

        const score = (
          surface * (0.36 + face * 0.42) +
          detail * (0.62 + face * 0.72)
        ) * portrait;

        if (score < 0.075) continue;

        /* Deterministic sampling. More points are granted to internal facial
           structure than to the surrounding hair/environment. */
        const probability = clamp(0.028 + score * 0.52, 0, 0.92);
        if (hash(i * 1.173 + 17) < probability) {
          candidates.push({ x, y, score, l: s, e });
        }
      }
    }

    /* Hard cap for stable frame time on desktop and mobile. */
    const MAX = 22000;
    if (candidates.length > MAX) {
      candidates.sort((a, b) => b.score - a.score);
      const trimmed = [];
      const stride = candidates.length / MAX;
      for (let i = 0; i < MAX; i++) {
        const idx = Math.min(candidates.length - 1, Math.floor(i * stride));
        trimmed.push(candidates[idx]);
      }
      candidates.length = 0;
      Array.prototype.push.apply(candidates, trimmed);
    }

    const count = candidates.length;
    const positions = new Float32Array(count * 3);
    const targets = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 4);
    const lights = new Float32Array(count);

    /* Keep the portrait slightly narrower than the room. */
    const targetW = 4.35;
    const targetH = 4.72;

    for (let i = 0; i < count; i++) {
      const p = candidates[i];
      const nx = p.x / (SW - 1) - 0.5;
      const ny = 0.5 - p.y / (SH - 1);

      targets[i * 3] = nx * targetW;
      targets[i * 3 + 1] = ny * targetH;

      /* Tiny depth derived from brightness and local detail. This is enough to
         make the face feel volumetric without breaking its 2D identity. */
      targets[i * 3 + 2] = (p.l - 0.46) * 0.16 + p.e * 0.055;

      /* Idle positions are deliberately unrelated to the face. This prevents
         a recognizable face from lingering when the cursor leaves. */
      const a = hash(i * 7.31 + 91) * Math.PI * 2;
      const radial = 0.55 + Math.pow(hash(i * 13.17 + 31), 0.48) * 2.65;
      const vertical = (hash(i * 19.43 + 53) - 0.5) * 5.2;
      positions[i * 3] = Math.cos(a) * radial * (0.75 + hash(i * 23.1 + 11) * 0.7);
      positions[i * 3 + 1] = vertical;
      positions[i * 3 + 2] = -0.65 + (hash(i * 29.7 + 7) - 0.5) * 1.7;

      const src = (p.y * SW + p.x) * 4;
      const rr = rgba[src] / 255;
      const gg = rgba[src + 1] / 255;
      const bb = rgba[src + 2] / 255;

      /* Preserve the reference's blue identity, with a restrained warm accent
         where the source actually contains it. */
      const warm = clamp((rr - bb) * 2.2, 0, 1);
      const brightness = 0.74 + p.l * 0.46;
      colors[i * 3] = clamp((0.07 + bb * 0.22 + warm * 0.32) * brightness, 0.055, 0.95);
      colors[i * 3 + 1] = clamp((0.30 + bb * 0.48 + warm * 0.16) * brightness, 0.14, 1);
      colors[i * 3 + 2] = clamp((0.62 + bb * 0.48) * brightness, 0.28, 1);

      seeds[i * 4] = hash(i * 31.1 + 4) * Math.PI * 2;
      seeds[i * 4 + 1] = hash(i * 37.2 + 5);
      seeds[i * 4 + 2] = hash(i * 41.3 + 6);
      seeds[i * 4 + 3] = hash(i * 43.7 + 7);
      lights[i] = clamp(p.score, 0.15, 1.45);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.85,
      transparent: true,
      opacity: 0.60,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: false
    });

    particles = new THREE.Points(geometry, material);
    identityRoot.add(particles);
    particleData = { count, positions, targets, seeds, lights };

    /* Environmental field. Kept intentionally subordinate to the face. */
    const ambientCount = 1050;
    const ap = new Float32Array(ambientCount * 3);
    const ac = new Float32Array(ambientCount * 3);
    for (let i = 0; i < ambientCount; i++) {
      const a = hash(i * 3.3 + 101) * Math.PI * 2;
      const r = 1.25 + Math.pow(hash(i * 5.7 + 101), 0.48) * 2.4;
      ap[i * 3] = Math.cos(a) * r;
      ap[i * 3 + 1] = (hash(i * 8.1 + 101) - 0.5) * 5.1;
      ap[i * 3 + 2] = -1.0 + (hash(i * 9.9 + 101) - 0.5) * 1.6;
      const q = 0.24 + hash(i * 11.2 + 101) * 0.52;
      ac[i * 3] = 0.06 * q;
      ac[i * 3 + 1] = 0.27 * q;
      ac[i * 3 + 2] = 0.72 * q;
    }
    const ag = new THREE.BufferGeometry();
    ag.setAttribute('position', new THREE.Float32BufferAttribute(ap, 3));
    ag.setAttribute('color', new THREE.Float32BufferAttribute(ac, 3));
    ambient = new THREE.Points(ag, new THREE.PointsMaterial({
      size: 1.0,
      transparent: true,
      opacity: 0.12,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: false
    }));
    fieldRoot.add(ambient);

    [1.95, 2.42, 2.88].forEach((radius, index) => {
      const g = new THREE.TorusGeometry(radius, 0.0055, 5, 180);
      const m = new THREE.MeshBasicMaterial({
        color: index === 1 ? 0x78a9ff : 0xb9caff,
        transparent: true,
        opacity: index === 1 ? 0.025 : 0.010,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const ring = new THREE.Mesh(g, m);
      ring.rotation.x = Math.PI / 2 - 0.38;
      ring.position.y = -0.06;
      ring.position.z = -0.78 + index * 0.1;
      fieldRoot.add(ring);
      rings.push(ring);
    });

    canvas.classList.add('is-ready');
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      onScreen = entry.isIntersecting;
      if (onScreen && !built) {
        built = true;
        resize();
        new THREE.TextureLoader().load(
          'aria-reference.png',
          tex => {
            tex.colorSpace = THREE.SRGBColorSpace;
            build(tex);
          },
          undefined,
          () => { built = false; }
        );
      }
    });
  }, { threshold: 0.10 });
  observer.observe(figure);

  window.addEventListener('resize', resize);

  figure.addEventListener('pointerenter', () => {
    pointerInside = true;
  });

  figure.addEventListener('pointerleave', () => {
    pointerInside = false;
    pointerTarget.set(0, 0);
  });

  figure.addEventListener('pointermove', e => {
    const r = figure.getBoundingClientRect();
    pointerTarget.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    pointerTarget.y = ((e.clientY - r.top) / r.height - 0.5) * -2;
  }, { passive: true });

  /* Existing ER decision reactivity. */
  const caseMachine = document.getElementById('caseMachine');
  function applyOutcome(outcome) {
    if (outcome === 'C') {
      targetStateMix = 0.20;
      currentStateColor = STATE_COLOR.defensible;
      targetAgitation = 0;
      coherenceLimit = 1;
    } else if (outcome === 'A' || outcome === 'D') {
      targetStateMix = 0.38;
      currentStateColor = STATE_COLOR.risk;
      targetAgitation = 1;
      coherenceLimit = 0.82;
    } else if (outcome === 'B') {
      targetStateMix = 0.28;
      currentStateColor = STATE_COLOR.partial;
      targetAgitation = 0.48;
      coherenceLimit = 0.90;
    } else {
      targetStateMix = 0;
      targetAgitation = 0;
      currentStateColor = STATE_COLOR.neutral;
      coherenceLimit = 1;
    }
  }
  if (caseMachine) {
    applyOutcome(caseMachine.dataset.outcome || '');
    new MutationObserver(() => applyOutcome(caseMachine.dataset.outcome || ''))
      .observe(caseMachine, { attributes: true, attributeFilter: ['data-outcome'] });
  }

  /* Existing ARIA result mirror. */
  const reaction = document.getElementById('ariaReaction');
  const reactionBadge = document.getElementById('ariaReactionBadge');
  const reactionText = document.getElementById('ariaReactionText');
  const resultTitle = document.getElementById('resultTitle');
  const resultBadge = document.getElementById('resultBadge');

  function hasRealResult() {
    return !!(
      resultTitle &&
      resultTitle.textContent.trim() &&
      resultTitle.textContent.trim() !== 'The system is waiting.'
    );
  }
  function showHint() {
    if (!reaction || hasRealResult()) return;
    reactionBadge.textContent = 'ARIA';
    reactionText.textContent = 'Move your cursor over her — she notices.';
    reaction.classList.add('live');
  }
  function hideHint() {
    if (!reaction || hasRealResult()) return;
    reaction.classList.remove('live');
  }
  function mirrorReaction() {
    if (!resultTitle || !resultBadge || !reaction) return;
    const title = resultTitle.textContent.trim();
    const badge = resultBadge.textContent.trim();
    if (!title || title === 'The system is waiting.') {
      showHint();
      return;
    }
    reactionBadge.textContent = 'ARIA · ' + badge;
    reactionText.textContent = title;
    reaction.classList.add('live');
  }
  figure.addEventListener('pointerenter', hideHint);
  figure.addEventListener('pointerleave', showHint);
  if (resultTitle) {
    new MutationObserver(mirrorReaction).observe(resultTitle, {
      childList: true,
      characterData: true,
      subtree: true
    });
    mirrorReaction();
  }
  showHint();

  function animate() {
    requestAnimationFrame(animate);
    if (!onScreen) return;

    t += 0.011;
    pointer.lerp(pointerTarget, 0.08);

    /* A wider magnetic field makes the interaction feel continuous rather than
       like a binary hover trigger. The face fully resolves only near centre. */
    const d = Math.sqrt(
      pointerTarget.x * pointerTarget.x +
      Math.pow(pointerTarget.y * 0.92, 2)
    );
    const proximity = pointerInside
      ? 1 - smoothstep(0.10, 0.78, d)
      : 0;
    targetCoherence = proximity * coherenceLimit;
    coherence += (targetCoherence - coherence) * 0.060;

    currentAgitation += (targetAgitation - currentAgitation) * 0.025;
    currentStateMix += (targetStateMix - currentStateMix) * 0.035;

    identityRoot.rotation.y +=
      (pointer.x * 0.028 - identityRoot.rotation.y) * 0.030;
    identityRoot.rotation.x +=
      (pointer.y * 0.018 - identityRoot.rotation.x) * 0.030;
    identityRoot.position.x +=
      (pointer.x * 0.035 - identityRoot.position.x) * 0.028;
    identityRoot.position.y +=
      (pointer.y * 0.025 - identityRoot.position.y) * 0.028;

    if (particles && particleData) {
      const p = particleData.positions;
      const target = particleData.targets;
      const seed = particleData.seeds;
      const light = particleData.lights;
      const c = coherence;
      const magnetic = 0.055 + c * 0.075;

      for (let i = 0; i < particleData.count; i++) {
        const k = i * 3;
        const s = i * 4;
        const phase = seed[s];
        const agitation = currentAgitation;

        /* Loose idle motion. As coherence rises this energy collapses, leaving
           the reference geometry clean and readable. */
        const spread = (1 - c) * (0.018 + light[i] * 0.040) * (1 + agitation * 0.28);
        const dx = Math.sin(t * (0.52 + seed[s + 1] * 0.24) + phase) * spread;
        const dy = Math.cos(t * (0.43 + seed[s + 2] * 0.20) + phase) * spread;
        const dz = Math.sin(t * 0.66 + seed[s + 3] * 6.283) * spread;

        /* A faint curl follows the cursor during convergence. It gives the
           particles a magnetic, causal motion instead of a simple fade. */
        const cursorPull = c * 0.020;
        const tx = target[k] + pointer.x * cursorPull * (0.45 + seed[s + 1] * 0.55) + dx;
        const ty = target[k + 1] + pointer.y * cursorPull * (0.45 + seed[s + 2] * 0.55) + dy;
        const tz = target[k + 2] + dz;

        p[k] += (tx - p[k]) * magnetic;
        p[k + 1] += (ty - p[k + 1]) * magnetic;
        p[k + 2] += (tz - p[k + 2]) * magnetic;

        if (c < 0.30) {
          p[k] += Math.sin(t * 0.31 + seed[s + 2] * 6.28) * 0.005 * (1 - c);
          p[k + 1] += Math.cos(t * 0.27 + seed[s + 3] * 6.28) * 0.005 * (1 - c);
        }
      }

      particles.geometry.attributes.position.needsUpdate = true;
      particles.material.opacity = 0.42 + c * 0.45;
      particles.material.size = 1.55 + c * 1.15;
    }

    if (ambient) {
      ambient.rotation.y = t * 0.010 * (1 + currentAgitation * 0.7);
      ambient.material.opacity = 0.10 + 0.08 * (1 - coherence);
    }

    rings.forEach((ring, index) => {
      ring.rotation.z = t * (0.020 + index * 0.007) * (index % 2 ? 1 : -1);
      ring.rotation.x = Math.PI / 2 - 0.38 + Math.sin(t * 0.20 + index) * 0.010;
      ring.material.opacity =
        (index === 1 ? 0.018 : 0.008) +
        coherence * (index === 1 ? 0.042 : 0.018);
    });

    renderer.render(scene, camera);
  }

  resize();
  requestAnimationFrame(animate);
})();
