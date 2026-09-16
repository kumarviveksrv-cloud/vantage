/* VANTAGE // ARIA
   ARIA VOLUMETRIC v10
   Deterministic CPU particle reconstruction.

   The reference image is a coordinate/color source only.
   It is never rendered into the scene.

   Interaction:
   - Cursor away: particles dissolve into a loose field.
   - Cursor over ARIA: particles are attracted into the face.
   - Cursor leaves: the face disperses again.

   Only this file should be replaced.
*/
(function () {
  'use strict';

  if (!window.THREE) return;

  const figure = document.querySelector('.aria-figure');
  const canvas = document.getElementById('ariaVolumetricCanvas');
  if (!figure || !canvas) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

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

  // Orthographic projection keeps the photograph's 2D facial geometry stable.
  const VIEW_H = 6.0;
  let viewW = 6.0;
  const camera = new THREE.OrthographicCamera(-3, 3, 3, -3, -20, 20);
  camera.position.z = 10;

  const root = new THREE.Group();
  const particleRoot = new THREE.Group();
  const fieldRoot = new THREE.Group();
  root.add(particleRoot, fieldRoot);
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

  function addCandidate(list, x, y, score, lum, edge, SW, SH) {
    x = Math.max(1, Math.min(SW - 2, Math.round(x)));
    y = Math.max(1, Math.min(SH - 2, Math.round(y)));
    const idx = y * SW + x;
    list.push({ x, y, score, l: lum[idx], edge });
  }

  function build(texture) {
    if (particles) {
      particleRoot.remove(particles);
      particles.geometry.dispose();
      particles.material.dispose();
      particles = null;
    }

    const img = texture.image;
    const iw = img.naturalWidth || img.width || 1;
    const ih = img.naturalHeight || img.height || 1;

    // Fixed square source because the current ARIA reference is square.
    const SW = 320;
    const SH = 320;

    const source = document.createElement('canvas');
    source.width = SW;
    source.height = SH;
    const ctx = source.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, SW, SH);

    const data = ctx.getImageData(0, 0, SW, SH).data;
    const lum = new Float32Array(SW * SH);

    for (let y = 0; y < SH; y++) {
      for (let x = 0; x < SW; x++) {
        const i = (y * SW + x) * 4;
        lum[y * SW + x] =
          0.2126 * data[i] / 255 +
          0.7152 * data[i + 1] / 255 +
          0.0722 * data[i + 2] / 255;
      }
    }

    const candidates = [];

    // Main luminance/edge sampling. The black background is strongly rejected.
    for (let y = 2; y < SH - 2; y++) {
      for (let x = 2; x < SW - 2; x++) {
        const idx = y * SW + x;
        const l = lum[idx];

        if (l < 0.055) continue;

        const gx = Math.abs(lum[idx + 2] - lum[idx - 2]);
        const gy = Math.abs(lum[idx + SW * 2] - lum[idx - SW * 2]);
        const edge = clamp(Math.sqrt(gx * gx + gy * gy) * 5.5, 0, 1);

        // Prefer facial/hair volume while retaining edges.
        const cx = x / (SW - 1) - 0.5;
        const cy = 0.5 - y / (SH - 1);
        const central = 1 - clamp(
          Math.sqrt((cx / 0.48) ** 2 + (cy / 0.52) ** 2),
          0, 1
        );

        const score =
          Math.pow(l, 1.35) * 0.95 +
          edge * 0.95 +
          central * 0.16;

        // Deterministic density.
        const probability = clamp(0.035 + score * 0.30, 0, 0.78);

        if (hash(idx * 1.173) < probability) {
          candidates.push({ x, y, score, l, edge });
        }
      }
    }

    // Explicit feature passes. These are target coordinates, not a rendered face.
    // They make the eyes/lips/nose survive at the small on-page display size.
    function addZone(cx, cy, rx, ry, count, seed) {
      for (let i = 0; i < count; i++) {
        const a = hash(seed + i * 2.31) * Math.PI * 2;
        const r = Math.sqrt(hash(seed + i * 4.73));
        const x = cx + Math.cos(a) * rx * r;
        const y = cy + Math.sin(a) * ry * r;
        addCandidate(candidates, x, y, 1.45, lum, 1, SW, SH);
      }
    }

    // Current reference image landmarks.
    addZone(SW * 0.365, SH * 0.405, SW * 0.085, SH * 0.035, 520, 101);
    addZone(SW * 0.635, SH * 0.405, SW * 0.085, SH * 0.035, 520, 202);
    addZone(SW * 0.365, SH * 0.355, SW * 0.105, SH * 0.026, 300, 303);
    addZone(SW * 0.635, SH * 0.355, SW * 0.105, SH * 0.026, 300, 404);
    addZone(SW * 0.500, SH * 0.505, SW * 0.055, SH * 0.125, 500, 505);
    addZone(SW * 0.500, SH * 0.635, SW * 0.105, SH * 0.045, 420, 606);

    // Hair shell, but intentionally less dense than the facial volume.
    addZone(SW * 0.27, SH * 0.24, SW * 0.19, SH * 0.22, 300, 707);
    addZone(SW * 0.73, SH * 0.24, SW * 0.19, SH * 0.22, 300, 808);

    const MAX = 12500;
    if (candidates.length > MAX) {
      candidates.sort((a, b) => b.score - a.score);
      candidates.length = MAX;
    }

    const count = candidates.length;
    const positions = new Float32Array(count * 3);
    const targets = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 4);
    const lights = new Float32Array(count);

    // Target portrait occupies ~5.15 world units of the 6-unit view.
    const faceSize = 5.15;

    for (let i = 0; i < count; i++) {
      const p = candidates[i];

      const nx = p.x / (SW - 1) - 0.5;
      const ny = 0.5 - p.y / (SH - 1);

      targets[i * 3] = nx * faceSize;
      targets[i * 3 + 1] = ny * faceSize;
      targets[i * 3 + 2] = (p.l - 0.5) * 0.22 + p.edge * 0.06;

      // Dispersed state. The cloud is intentionally much wider than the face.
      const a = hash(i * 7.31) * Math.PI * 2;
      const r = 0.45 + Math.pow(hash(i * 13.17), 0.42) * 2.75;

      positions[i * 3] =
        Math.cos(a) * r * (0.75 + hash(i * 23.1) * 0.65);
      positions[i * 3 + 1] =
        (hash(i * 19.43) - 0.5) * 5.35;
      positions[i * 3 + 2] =
        -0.45 + (hash(i * 29.7) - 0.5) * 1.8;

      const src = (p.y * SW + p.x) * 4;
      const rr = data[src] / 255;
      const gg = data[src + 1] / 255;
      const bb = data[src + 2] / 255;

      // Cool holographic palette while preserving source brightness.
      const brightness = 0.78 + p.l * 0.42;
      colors[i * 3] = clamp((rr * 0.12 + bb * 0.42) * brightness, 0.08, 1);
      colors[i * 3 + 1] = clamp((gg * 0.26 + bb * 0.62) * brightness, 0.12, 1);
      colors[i * 3 + 2] = clamp((bb * 0.76 + rr * 0.10) * brightness, 0.28, 1);

      seeds[i * 4] = hash(i * 31.1) * Math.PI * 2;
      seeds[i * 4 + 1] = hash(i * 37.2);
      seeds[i * 4 + 2] = hash(i * 41.3);
      seeds[i * 4 + 3] = hash(i * 43.7);

      lights[i] = clamp(p.score, 0.18, 1.45);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 2.15,
      transparent: true,
      opacity: 0.76,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: false
    });

    particles = new THREE.Points(geometry, material);
    particleRoot.add(particles);

    particleData = {
      count,
      positions,
      targets,
      seeds,
      lights
    };

    // Background field.
    const ambientCount = 1250;
    const ap = new Float32Array(ambientCount * 3);
    const ac = new Float32Array(ambientCount * 3);

    for (let i = 0; i < ambientCount; i++) {
      const a = hash(i * 3.3) * Math.PI * 2;
      const r = 1.25 + Math.pow(hash(i * 5.7), 0.48) * 2.35;

      ap[i * 3] = Math.cos(a) * r;
      ap[i * 3 + 1] = (hash(i * 8.1) - 0.5) * 5.0;
      ap[i * 3 + 2] = -0.9 + (hash(i * 9.9) - 0.5) * 1.8;

      const q = 0.30 + hash(i * 11.2) * 0.55;
      ac[i * 3] = 0.08 * q;
      ac[i * 3 + 1] = 0.30 * q;
      ac[i * 3 + 2] = 0.78 * q;
    }

    const ag = new THREE.BufferGeometry();
    ag.setAttribute('position', new THREE.Float32BufferAttribute(ap, 3));
    ag.setAttribute('color', new THREE.Float32BufferAttribute(ac, 3));

    ambient = new THREE.Points(
      ag,
      new THREE.PointsMaterial({
        size: 1.1,
        transparent: true,
        opacity: 0.15,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: false
      })
    );

    fieldRoot.add(ambient);

    // Subtle rings remain as environmental context, not the main event.
    [1.9, 2.35, 2.78].forEach((radius, index) => {
      const g = new THREE.TorusGeometry(radius, 0.006, 5, 180);
      const m = new THREE.MeshBasicMaterial({
        color: index === 1 ? 0x78a9ff : 0xb9caff,
        transparent: true,
        opacity: index === 1 ? 0.065 : 0.022,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const ring = new THREE.Mesh(g, m);
      ring.rotation.x = Math.PI / 2 - 0.38;
      ring.position.y = -0.04;
      ring.position.z = -0.75 + index * 0.10;
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
          () => {}
        );
      }
    });
  }, { threshold: 0.12 });

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
    new MutationObserver(() => {
      applyOutcome(caseMachine.dataset.outcome || '');
    }).observe(caseMachine, {
      attributes: true,
      attributeFilter: ['data-outcome']
    });
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

    t += 0.012;
    pointer.lerp(pointerTarget, 0.075);

    // The center of the panel is the ARIA attractor.
    const d = Math.sqrt(
      pointerTarget.x * pointerTarget.x +
      Math.pow(pointerTarget.y, 2)
    );

    // Inside the field, the closer the cursor is to ARIA's face,
    // the more completely the particles reconstruct her.
    const proximity = pointerInside
      ? 1 - smoothstep(0.18, 0.72, d)
      : 0;

    targetCoherence = proximity * coherenceLimit;
    coherence += (targetCoherence - coherence) * 0.055;

    currentAgitation += (targetAgitation - currentAgitation) * 0.025;
    currentStateMix += (targetStateMix - currentStateMix) * 0.035;

    particleRoot.rotation.y +=
      (pointer.x * 0.045 - particleRoot.rotation.y) * 0.028;

    particleRoot.rotation.x +=
      (pointer.y * 0.028 - particleRoot.rotation.x) * 0.028;

    particleRoot.position.x +=
      (pointer.x * 0.045 - particleRoot.position.x) * 0.025;

    particleRoot.position.y +=
      (pointer.y * 0.032 - particleRoot.position.y) * 0.025;

    // CPU interpolation. Deliberately simple and deterministic.
    // This is the critical change from the previous shader-heavy versions.
    if (particles && particleData) {
      const p = particleData.positions;
      const target = particleData.targets;
      const seed = particleData.seeds;
      const light = particleData.lights;

      const c = coherence;

      for (let i = 0; i < particleData.count; i++) {
        const k = i * 3;
        const s = i * 4;

        const drift =
          (1 - c) * (0.025 + light[i] * 0.035);

        const dx = Math.sin(t * 0.62 + seed[s]) * drift;
        const dy = Math.cos(t * 0.51 + seed[s]) * drift;
        const dz = Math.sin(t * 0.71 + seed[s + 1] * 6.28) * drift;

        p[k] += ((target[k] + dx) - p[k]) * (0.055 + c * 0.035);
        p[k + 1] += ((target[k + 1] + dy) - p[k + 1]) * (0.055 + c * 0.035);
        p[k + 2] += ((target[k + 2] + dz) - p[k + 2]) * (0.055 + c * 0.035);

        // Additional dispersion energy when coherence is low.
        if (c < 0.35) {
          p[k] += Math.sin(t * 0.38 + seed[s + 2] * 6.28) * 0.004 * (1 - c);
          p[k + 1] += Math.cos(t * 0.31 + seed[s + 3] * 6.28) * 0.004 * (1 - c);
        }
      }

      particles.geometry.attributes.position.needsUpdate = true;

      // Slightly brighter as the face locks into place.
      particles.material.opacity = 0.48 + c * 0.42;
      particles.material.size = 1.55 + c * 1.10;
    }

    if (ambient) {
      ambient.rotation.y = t * 0.012 * (1 + currentAgitation * 0.8);
      ambient.material.opacity = 0.12 + 0.10 * (1 - coherence);
    }

    rings.forEach((ring, index) => {
      ring.rotation.z =
        t * (0.024 + index * 0.008) * (index % 2 ? 1 : -1);

      ring.rotation.x =
        Math.PI / 2 - 0.38 + Math.sin(t * 0.20 + index) * 0.012;

      ring.material.opacity =
        (index === 1 ? 0.028 : 0.012) +
        coherence * (index === 1 ? 0.055 : 0.024);
    });

    renderer.render(scene, camera);
  }

  resize();
  requestAnimationFrame(animate);
})();
