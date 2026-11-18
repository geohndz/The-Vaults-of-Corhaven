/* Fate card stage. A full-window dim over the board, and the cards from the draft prototype.
   The hand peeks from the left. The hint chip keeps the right edge. */
(function (root) {
  'use strict';

  const R = () => root.CorhavenRules;
  const CAT = {
    Blessing: { label: 'BLESSING', light: '#e6bd5e', color: '#b8892b', dark: '#6b4c10' },
    Tactical: { label: 'TACTICAL', light: '#5ea6c6', color: '#2f6f8f', dark: '#163b4f' },
    Curse: { label: 'CURSE', light: '#c65463', color: '#8f2b3a', dark: '#4b121b' }
  };
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII'];
  const DISPLAY = 'Cinzel, "Times New Roman", serif';
  const BODY = '"EB Garamond", Georgia, "Times New Roman", serif';
  const PW = 640, PH = 960, PR = 44;
  const CAM_Z = 10, W = 1.6, H = 2.4, PEEK = 0.62;
  const GOLD = 0xffcf6a, RED = 0xff5a50;

  function mount(THREE) {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stage = document.createElement('div');
    stage.id = 'fate';
    stage.innerHTML = '<div class="fatehit"></div><p class="fateprompt"></p><button type="button" class="fatedone">Done</button>';
    document.body.appendChild(stage);
    const promptEl = stage.querySelector('.fateprompt');
    const doneEl = stage.querySelector('.fatedone');
    const hitEl = stage.querySelector('.fatehit');

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    if (renderer.outputEncoding !== undefined && THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    stage.insertBefore(renderer.domElement, stage.firstChild);
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, CAM_Z);
    const dimmer = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshBasicMaterial({ color: 0x0a080e, transparent: true, opacity: 0, depthWrite: false }));
    dimmer.visible = false;
    scene.add(dimmer);
    let dimTarget = 0;
    function dimTo(z, amt) { dimmer.position.z = z - 0.7; dimTarget = amt == null ? 0.72 : amt; }

    function rr(g, x, y, w, h, r) {
      g.beginPath(); g.moveTo(x + r, y);
      g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
    }
    function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
    const spaced = (s) => s.split('').join('\u200A');
    function wrap(g, text, maxW) {
      const words = String(text || '').split(' '), lines = []; let line = '';
      for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
      if (line) lines.push(line); return lines;
    }
    function star(g, cx, cy, ro, ri, n, rot) {
      g.beginPath();
      for (let i = 0; i < n * 2; i++) { const rad = i % 2 ? ri : ro, a = rot + i * Math.PI / n; g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); }
      g.closePath(); g.fill();
    }
    function strokeLine(g, x1, y1, x2, y2) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
    function makeCanvas() { const c = document.createElement('canvas'); c.width = 768; c.height = 1152; const g = c.getContext('2d'); g.scale(1.2, 1.2); return [c, g]; }
    function toTex(c) { const t = new THREE.CanvasTexture(c); if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; return t; }
    function seedOf(id) { let n = 0; const s = String(id); for (let i = 0; i < s.length; i++) n = (n * 33 + s.charCodeAt(i)) | 0; return n || 1; }

    function emblem(g, catName, cat, cx, cy) {
      const rad = 84;
      const gr = g.createRadialGradient(cx, cy - 24, 8, cx, cy, rad);
      gr.addColorStop(0, cat.light); gr.addColorStop(1, cat.dark);
      g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.fillStyle = gr; g.fill();
      g.lineWidth = 4; g.strokeStyle = cat.color; g.stroke();
      g.beginPath(); g.arc(cx, cy, rad - 10, 0, Math.PI * 2); g.lineWidth = 1.5; g.strokeStyle = 'rgba(251,243,226,.55)'; g.stroke();
      g.fillStyle = '#fbf3e2'; g.strokeStyle = '#fbf3e2';
      if (catName === 'Blessing') {
        for (let i = 0; i < 16; i++) {
          const a = i / 16 * Math.PI * 2, len = i % 2 ? 54 : 68;
          g.beginPath();
          g.moveTo(cx + Math.cos(a - 0.13) * 30, cy + Math.sin(a - 0.13) * 30);
          g.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
          g.lineTo(cx + Math.cos(a + 0.13) * 30, cy + Math.sin(a + 0.13) * 30);
          g.closePath(); g.fill();
        }
        g.beginPath(); g.arc(cx, cy, 24, 0, Math.PI * 2); g.fill();
      } else if (catName === 'Tactical') {
        g.lineWidth = 2;
        g.beginPath(); g.arc(cx, cy, 58, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.arc(cx, cy, 38, 0, Math.PI * 2); g.stroke();
        star(g, cx, cy, 68, 11, 4, -Math.PI / 2);
        g.globalAlpha = 0.7; star(g, cx, cy, 42, 8, 4, -Math.PI / 4); g.globalAlpha = 1;
        g.fillStyle = cat.dark; g.beginPath(); g.arc(cx, cy, 6, 0, Math.PI * 2); g.fill();
      } else {
        const o = document.createElement('canvas'); o.width = o.height = 200; const q = o.getContext('2d');
        q.fillStyle = '#fbf3e2'; q.beginPath(); q.arc(100, 100, 54, 0, Math.PI * 2); q.fill();
        q.globalCompositeOperation = 'destination-out'; q.beginPath(); q.arc(126, 84, 47, 0, Math.PI * 2); q.fill();
        g.drawImage(o, cx - 100, cy - 100);
        star(g, cx + 30, cy - 22, 10, 3, 4, 0);
        star(g, cx + 44, cy + 14, 7, 2, 4, 0);
        star(g, cx + 16, cy + 30, 5, 1.6, 4, 0);
      }
    }
    function drawFront(d, numeral) {
      const pair = makeCanvas(); const c = pair[0], g = pair[1]; const cat = CAT[d.cat] || CAT.Blessing; const rnd = mulberry(seedOf(d.id));
      rr(g, 0, 0, PW, PH, PR); g.save(); g.clip();
      let gr = g.createLinearGradient(0, 0, PW, PH); gr.addColorStop(0, '#f7eedb'); gr.addColorStop(1, '#e2cea3');
      g.fillStyle = gr; g.fillRect(0, 0, PW, PH);
      for (let i = 0; i < 1100; i++) { g.fillStyle = 'rgba(110,75,30,' + (rnd() * 0.09) + ')'; g.fillRect(rnd() * PW, rnd() * PH, 1 + rnd() * 2, 1 + rnd() * 2); }
      gr = g.createRadialGradient(PW / 2, PH * 0.45, PH * 0.2, PW / 2, PH / 2, PH * 0.72);
      gr.addColorStop(0, 'rgba(120,80,30,0)'); gr.addColorStop(1, 'rgba(105,66,22,0.34)');
      g.fillStyle = gr; g.fillRect(0, 0, PW, PH); g.restore();
      g.lineWidth = 16; g.strokeStyle = cat.color; rr(g, 8, 8, PW - 16, PH - 16, PR - 8); g.stroke();
      g.lineWidth = 2; g.strokeStyle = cat.dark; rr(g, 26, 26, PW - 52, PH - 52, 26); g.stroke();
      g.save(); rr(g, 26, 26, PW - 52, PH - 52, 26); g.clip();
      gr = g.createLinearGradient(0, 26, 0, 104); gr.addColorStop(0, cat.color); gr.addColorStop(1, cat.dark);
      g.fillStyle = gr; g.fillRect(26, 26, PW - 52, 78); g.restore();
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fbf3e2'; g.font = '500 25px ' + DISPLAY;
      g.fillText(spaced('✦   ' + cat.label + '   ✦'), PW / 2, 66);
      g.textBaseline = 'alphabetic'; g.fillStyle = '#2a1c0e';
      let fs = 56; do { g.font = '700 ' + fs + 'px ' + DISPLAY; fs -= 2; } while (g.measureText(d.title).width > 540 && fs > 28);
      g.fillText(d.title, PW / 2, 178);
      g.strokeStyle = cat.color; g.lineWidth = 2;
      strokeLine(g, 110, 206, 296, 206); strokeLine(g, 344, 206, 530, 206);
      g.fillStyle = cat.color; g.beginPath(); g.moveTo(320, 196); g.lineTo(330, 206); g.lineTo(320, 216); g.lineTo(310, 206); g.closePath(); g.fill();
      emblem(g, d.cat, cat, PW / 2, 320);
      g.font = 'italic 500 27px ' + BODY;
      const dl = wrap(g, d.duration, 470);
      const bt = 432, bh = 58 + dl.length * 32;
      g.fillStyle = hexA(cat.color, 0.12); rr(g, 60, bt, 520, bh, 14); g.fill();
      g.strokeStyle = hexA(cat.color, 0.7); g.lineWidth = 2; g.stroke();
      g.fillStyle = cat.dark; g.font = '700 17px ' + DISPLAY; g.fillText(spaced('DURATION'), PW / 2, bt + 32);
      g.fillStyle = '#3a2a16'; g.font = 'italic 500 27px ' + BODY;
      dl.forEach((l, i) => g.fillText(l, PW / 2, bt + 66 + i * 32));
      const top = bt + bh + 40, bottom = 878;
      let size = 31, lines, lh;
      do { g.font = '400 ' + size + 'px ' + BODY; lines = wrap(g, d.desc, 500); lh = size * 1.32; size--; } while (lines.length * lh > bottom - top && size > 19);
      const off = Math.max(0, ((bottom - top) - lines.length * lh) * 0.35);
      g.textBaseline = 'top'; g.fillStyle = '#2b1f12';
      lines.forEach((l, i) => g.fillText(l, PW / 2, top + off + i * lh));
      g.textBaseline = 'middle'; g.fillStyle = cat.dark; g.font = '500 18px ' + DISPLAY;
      g.fillText(numeral, PW / 2, 908);
      g.strokeStyle = hexA(cat.color, 0.6); g.lineWidth = 1.5;
      strokeLine(g, 220, 908, 285, 908); strokeLine(g, 355, 908, 420, 908);
      return toTex(c);
    }
    function drawBack() {
      const pair = makeCanvas(); const c = pair[0], g = pair[1];
      rr(g, 0, 0, PW, PH, PR); g.save(); g.clip();
      let gr = g.createLinearGradient(0, 0, PW, PH); gr.addColorStop(0, '#22305a'); gr.addColorStop(1, '#0b1126');
      g.fillStyle = gr; g.fillRect(0, 0, PW, PH);
      g.strokeStyle = 'rgba(212,175,95,0.15)'; g.lineWidth = 1.5;
      for (let k = -PH; k < PW + PH; k += 46) { strokeLine(g, k, 0, k + PH, PH); strokeLine(g, k, 0, k - PH, PH); }
      gr = g.createRadialGradient(PW / 2, PH / 2, 20, PW / 2, PH / 2, PH * 0.55);
      gr.addColorStop(0, 'rgba(212,175,95,0.22)'); gr.addColorStop(1, 'rgba(212,175,95,0)');
      g.fillStyle = gr; g.fillRect(0, 0, PW, PH); g.restore();
      g.strokeStyle = '#c9a24f'; g.lineWidth = 14; rr(g, 7, 7, PW - 14, PH - 14, PR - 7); g.stroke();
      g.lineWidth = 2; rr(g, 28, 28, PW - 56, PH - 56, 24); g.stroke();
      g.globalAlpha = 0.5; rr(g, 40, 40, PW - 80, PH - 80, 18); g.stroke(); g.globalAlpha = 1;
      g.fillStyle = '#d4af5f';
      [[64, 64], [PW - 64, 64], [64, PH - 64], [PW - 64, PH - 64]].forEach((p) => star(g, p[0], p[1], 12, 4, 4, 0));
      const cx = PW / 2, cy = PH / 2 - 20;
      g.beginPath(); g.arc(cx, cy, 132, 0, Math.PI * 2); g.lineWidth = 3; g.strokeStyle = '#d4af5f'; g.stroke();
      gr = g.createRadialGradient(cx, cy, 10, cx, cy, 114); gr.addColorStop(0, '#2c3d6e'); gr.addColorStop(1, '#0e1631');
      g.beginPath(); g.arc(cx, cy, 114, 0, Math.PI * 2); g.fillStyle = gr; g.fill(); g.lineWidth = 1.5; g.stroke();
      gr = g.createLinearGradient(cx, cy - 96, cx, cy + 96); gr.addColorStop(0, '#f2d892'); gr.addColorStop(1, '#a77f2f');
      g.fillStyle = gr; star(g, cx, cy, 96, 34, 8, -Math.PI / 2);
      g.fillStyle = '#101a38'; star(g, cx, cy, 52, 22, 8, -Math.PI / 2 + Math.PI / 8);
      g.fillStyle = '#d4af5f'; g.beginPath(); g.arc(cx, cy, 13, 0, Math.PI * 2); g.fill();
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 44px ' + DISPLAY;
      g.fillText(spaced('FATE'), cx, cy + 196);
      return toTex(c);
    }
    function drawGlow() {
      const c = document.createElement('canvas'); c.width = 420; c.height = 580; const g = c.getContext('2d');
      g.shadowColor = '#fff'; g.shadowBlur = 34; g.fillStyle = '#fff';
      rr(g, 50, 50, 320, 480, 26); g.fill(); g.fill();
      g.shadowBlur = 0; g.globalCompositeOperation = 'destination-out'; rr(g, 53, 53, 314, 474, 24); g.fill();
      return new THREE.CanvasTexture(c);
    }

    const FRONT = {};
    let BACK = null, GLOW = null, built = false;
    function buildTextures() {
      if (built) return;
      const deck = (R() && R().FATE) || [];
      deck.forEach((d, i) => { FRONT[d.id] = drawFront(d, ROMAN[i + 1] || ''); });
      BACK = drawBack(); GLOW = drawGlow(); built = true;
    }
    function cardData(id) {
      const deck = (R() && R().FATE) || [];
      return deck.find((d) => d.id === id) || { id: id, cat: 'Blessing', title: id, duration: '', desc: '' };
    }

    function roundedShape(w, h, r) {
      const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
    }
    const planeGeo = new THREE.PlaneGeometry(W, H);
    const glowGeo = new THREE.PlaneGeometry(2.1, 2.9);
    const edgeGeo = new THREE.ExtrudeGeometry(roundedShape(W - 0.014, H - 0.014, 0.12), { depth: 0.007, bevelEnabled: false, curveSegments: 6 });
    edgeGeo.translate(0, 0, -0.0035);

    const live = new Set();
    function makeCard(data) {
      buildTextures();
      const group = new THREE.Group(), inner = new THREE.Group(); group.add(inner);
      const frontMat = new THREE.MeshBasicMaterial({ map: FRONT[data.id] || BACK, transparent: true, alphaTest: 0.05 });
      const backMat = new THREE.MeshBasicMaterial({ map: BACK, transparent: true, alphaTest: 0.05 });
      const edgeMat = new THREE.MeshBasicMaterial({ color: 0x2c1f08, transparent: true });
      const glowMat = new THREE.MeshBasicMaterial({ map: GLOW, transparent: true, opacity: 0, depthWrite: false, color: GOLD, side: THREE.DoubleSide });
      const front = new THREE.Mesh(planeGeo, frontMat); front.position.z = 0.004;
      const back = new THREE.Mesh(planeGeo, backMat); back.rotation.y = Math.PI; back.position.z = -0.004;
      const edge = new THREE.Mesh(edgeGeo, edgeMat);
      const glow = new THREE.Mesh(glowGeo, glowMat); glow.position.z = -0.02;
      inner.add(glow, edge, front, back);
      const card = { data, group, inner, glowMat, edge, front, mats: [frontMat, backMat, edgeMat], hits: [front, back], opacity: 1, hover: 0, hoverT: 0, glowT: 0, glowCur: 0, pulse: false, inSlot: false, phase: Math.random() * 6 };
      front.userData.card = back.userData.card = card;
      scene.add(group); live.add(card);
      return card;
    }
    function disposeCard(c) {
      scene.remove(c.group); live.delete(c);
      c.mats.forEach((m) => m.dispose()); c.glowMat.dispose();
    }

    const E = {
      inOut: (p) => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2,
      out: (p) => 1 - Math.pow(1 - p, 3),
      in: (p) => p * p * p,
      back: (p) => { const c1 = 1.3, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); }
    };
    const tweens = [];
    function tweenCard(card, to, dur, opt) {
      const o = opt || {};
      for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].card === card) { tweens[i].res(); tweens.splice(i, 1); }
      if (reduce) dur = Math.min(dur, 160);
      return new Promise((res) => tweens.push({ card, to, dur, ease: o.ease || E.inOut, lift: o.lift || 0, res, start: performance.now() + (o.delay || 0), from: null }));
    }
    const lerp = (a, b, t) => a + (b - a) * t;
    function updateTweens(now) {
      for (let i = tweens.length - 1; i >= 0; i--) {
        const t = tweens[i]; if (now < t.start) continue;
        const g = t.card.group;
        if (!t.from) t.from = { pos: g.position.toArray(), rot: [g.rotation.x, g.rotation.y, g.rotation.z], scale: g.scale.x, opacity: t.card.opacity };
        const p = Math.min(1, (now - t.start) / t.dur), e = t.ease(p);
        const tp = t.to.pos || (t.lift ? t.from.pos : null);
        if (tp) g.position.set(lerp(t.from.pos[0], tp[0], e), lerp(t.from.pos[1], tp[1], e), lerp(t.from.pos[2], tp[2], e));
        if (t.lift) g.position.z += Math.sin(Math.PI * p) * t.lift;
        if (t.to.rot) g.rotation.set(lerp(t.from.rot[0], t.to.rot[0], e), lerp(t.from.rot[1], t.to.rot[1], e), lerp(t.from.rot[2], t.to.rot[2], e));
        if (t.to.scale !== undefined) g.scale.setScalar(lerp(t.from.scale, t.to.scale, e));
        if (t.to.opacity !== undefined) t.card.opacity = lerp(t.from.opacity, t.to.opacity, Math.min(1, p * 1.2));
        if (p >= 1) { tweens.splice(i, 1); t.res(); }
      }
    }
    const sleep = (ms) => new Promise((res) => setTimeout(res, reduce ? Math.min(ms, 40) : ms));
    function animate(dur, fn) {
      if (reduce) dur = Math.min(dur, 280);
      return new Promise((res) => {
        const s = performance.now();
        function step(now) { const p = Math.min(1, Math.max(0, (now - s) / dur)); fn(p); if (p < 1) requestAnimationFrame(step); else res(); }
        requestAnimationFrame(step);
      });
    }

    const vis = (z) => { const h = 2 * (CAM_Z - z) * Math.tan(camera.fov * Math.PI / 360); return { h: h, w: h * camera.aspect }; };
    const portrait = () => camera.aspect < 0.85;
    const handScale = () => portrait() ? 0.72 : Math.min(1, vis(0).h / 7.2);
    function offerTarget(i, n) {
      const v = vis(0), gap = 0.32, count = n || 4;
      const reserve = PEEK * handScale() + (portrait() ? 0.55 : 0.7);
      const s = Math.min(portrait() ? 1.05 : 1.15, (v.w - reserve - 0.3) / (count * W + (count - 1) * gap), (v.h * 0.62) / H);
      const step = (W + gap) * s;
      const right = v.w / 2 - reserve - (W / 2) * s;
      return { pos: [right - (count - 1 - i) * step, -v.h * 0.03, 0], rot: [0, 0, 0], scale: s };
    }
    function slotTarget(i) {
      const v = vis(0), s = handScale();
      const x = v.w / 2 + (H / 2) * s - PEEK * s;
      const y = (i === 0 ? 1 : -1) * (W / 2 + 0.14) * s - v.h * 0.16;
      return { pos: [x, y, 0], rot: [0, 0, Math.PI / 2], scale: s };
    }
    function zoomTarget() {
      const t = Math.tan(camera.fov * Math.PI / 360);
      const d = Math.max(H / (0.6 * 2 * t), W / (0.82 * 2 * t * camera.aspect));
      const z = CAM_Z - d, v = vis(z);
      return { pos: [0, v.h * 0.04, z], rot: [0, 0, 0], scale: 1 };
    }
    function replaceLayout() {
      const z = 1.2, v = vis(z), gap = 0.3, count = 3;
      const s = Math.min(1.05, (v.w * 0.9) / (count * W + (count - 1) * gap), (v.h * 0.55) / H);
      const step = (W + gap) * s, total = (count - 1) * step;
      return { z: z, items: [0, 1, 2].map((i) => ({ pos: [-total / 2 + i * step, -v.h * 0.02, z], rot: [0, 0, 0], scale: s })) };
    }

    const DISSOLVE_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
    const DISSOLVE_FS = [
      'uniform sampler2D map; uniform float progress; uniform float flash; varying vec2 vUv;',
      'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
      'float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);',
      '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }',
      'float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int k = 0; k < 5; k++){ v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }',
      'void main(){',
      '  vec4 tex = texture2D(map, vUv); if (tex.a < 0.05) discard;',
      '  float n = fbm(vUv * vec2(4.0, 6.0)) * 0.7 + (1.0 - distance(vUv, vec2(0.5)) * 1.6) * 0.3;',
      '  float p = progress * 1.15 - 0.08; if (n < p) discard;',
      '  float e = 1.0 - smoothstep(p, p + 0.08, n);',
      '  vec3 col = tex.rgb + flash * vec3(1.0, 0.85, 0.5);',
      '  col = mix(col, vec3(1.0, 0.72, 0.25), smoothstep(0.0, 0.6, e));',
      '  col = mix(col, vec3(1.0, 0.97, 0.85), smoothstep(0.6, 1.0, e));',
      '  gl_FragColor = vec4(col, tex.a); }'
    ].join('\n');

    let state = 'idle', offers = [], hand = [], picked = null, viewing = null, chooser = null, discarder = null, scripted = null, fly = Promise.resolve();
    function setPrompt(text) { promptEl.textContent = text || ''; }
    function showDone(label, fn) { doneEl.textContent = label; doneEl.onclick = fn; doneEl.classList.add('show'); }
    function hideDone() { doneEl.classList.remove('show'); doneEl.onclick = null; }
    function paint() {
      const open = state !== 'idle';
      stage.classList.toggle('open', open);
      stage.classList.toggle('peek', !open && hand.length > 0);
    }
    function setState(s) { state = s; paint(); }

    function placeHandHit() {
      const n = hand.length;
      if (!n) { hitEl.style.width = '0px'; hitEl.style.height = '0px'; return; }
      const v = vis(0);
      const w = stage.clientWidth || window.innerWidth, h = stage.clientHeight || window.innerHeight;
      let left = Infinity, right = -Infinity, top = -Infinity, bottom = Infinity;
      for (let i = 0; i < n; i++) {
        const t = slotTarget(i);
        const hw = (H / 2) * t.scale, hh = (W / 2) * t.scale;
        left = Math.min(left, t.pos[0] - hw); right = Math.max(right, t.pos[0] + hw);
        top = Math.max(top, t.pos[1] + hh); bottom = Math.min(bottom, t.pos[1] - hh);
      }
      const x0 = (left / (v.w / 2) * 0.5 + 0.5) * w, x1 = (right / (v.w / 2) * 0.5 + 0.5) * w;
      const y0 = (0.5 - top / v.h) * h, y1 = (0.5 - bottom / v.h) * h;
      const xStart = Math.max(0, Math.floor(x0) - 10), xEnd = Math.min(w, Math.ceil(x1) + 10);
      const yStart = Math.max(0, Math.floor(y0) - 10), yEnd = Math.min(h, Math.ceil(y1) + 10);
      hitEl.style.left = xStart + 'px';
      hitEl.style.top = yStart + 'px';
      hitEl.style.width = Math.max(0, xEnd - xStart) + 'px';
      hitEl.style.height = Math.max(0, yEnd - yStart) + 'px';
    }
    async function toSlot(c, i) {
      c.inSlot = false;
      const t = slotTarget(i, hand.length);
      await tweenCard(c, { pos: t.pos, rot: t.rot, scale: t.scale }, 520);
      c.inSlot = true;
    }
    function layoutHand() { return Promise.all(hand.map((c, i) => toSlot(c, i))).then(() => { placeHandHit(); }); }

    function setHand(ids) {
      if (state !== 'idle') return;
      buildTextures();
      const want = (ids || []).slice(0, 2);
      hand.filter((c) => want.indexOf(c.data.id) < 0).forEach(disposeCard);
      hand = hand.filter((c) => want.indexOf(c.data.id) >= 0);
      want.forEach((id) => { if (!hand.some((c) => c.data.id === id)) hand.push(makeCard(cardData(id))); });
      hand.sort((a, b) => want.indexOf(a.data.id) - want.indexOf(b.data.id));
      paint();
      hand.forEach((c, i) => { const t = slotTarget(i, hand.length); c.group.position.set(t.pos[0], t.pos[1], t.pos[2]); c.group.rotation.set(t.rot[0], t.rot[1], t.rot[2]); c.group.scale.setScalar(t.scale); c.inSlot = true; });
      placeHandHit();
    }

    async function burnCard(card) {
      if (!card) return;
      card.inSlot = false;
      const z = zoomTarget(); dimTo(z.pos[2]);
      await tweenCard(card, { pos: z.pos, rot: [0, 0, 0], scale: 1 }, 420);
      const map = card.front.material.map;
      const dm = new THREE.ShaderMaterial({
        uniforms: { map: { value: map }, progress: { value: 0 }, flash: { value: 0 } },
        vertexShader: DISSOLVE_VS, fragmentShader: DISSOLVE_FS, transparent: true
      });
      card.front.material = dm;
      card.glowMat.color.set(GOLD);
      await animate(420, (p) => { card.glowT = p; dm.uniforms.flash.value = p * 0.55; card.group.scale.setScalar(1 + 0.05 * p); });
      card.edge.visible = false;
      await animate(900, (p) => { dm.uniforms.progress.value = p; dm.uniforms.flash.value = 0.55 * (1 - p); card.glowT = 1 - p; });
      dm.dispose();
    }
    async function burn(id) {
      const card = hand.find((c) => c.data.id === id);
      if (!card || state !== 'idle') return;
      setState('busy');
      hand = hand.filter((c) => c !== card);
      await burnCard(card);
      disposeCard(card);
      dimTarget = 0;
      await layoutHand();
      setState('idle');
    }

    async function openDeal(ids) {
      buildTextures();
      offers.forEach(disposeCard);
      offers = [];
      picked = null; viewing = null; scripted = null;
      setState('dealing');
      setPrompt('The shrine offers four fates. Choose one.');
      const v = vis(0);
      offers = ids.map((id, i) => {
        const c = makeCard(cardData(id));
        c.group.position.set((i - 1.5) * 0.5, -v.h / 2 - H, 2.5);
        c.group.rotation.set(-1.1, Math.PI, (Math.random() - 0.5) * 0.9);
        c.group.scale.setScalar(0.8);
        return c;
      });
      await Promise.all(offers.map((c, i) => {
        const t = offerTarget(i, offers.length);
        return tweenCard(c, { pos: t.pos, rot: [0, Math.PI, (Math.random() - 0.5) * 0.05], scale: t.scale }, 850, { delay: i * 120, ease: E.back });
      }));
    }

    function deal(ids, handIds, interactive) {
      setHand(handIds || []);
      fly = openDeal(ids || []);
      if (!interactive) {
        return fly.then(() => { setState('watching'); return null; });
      }
      return fly.then(() => new Promise((res) => { chooser = res; setState('choosing'); }));
    }

    async function discardOffers(keep) {
      const v = vis(0);
      const gone = offers.filter((c) => c !== keep);
      await Promise.all(gone.map((c, i) => tweenCard(c, { pos: [c.group.position.x * 0.7, -v.h * 0.85, -1], rot: [0.9, 0, (Math.random() - 0.5)], opacity: 0 }, 520, { delay: i * 60, ease: E.in }).then(() => disposeCard(c))));
      offers = keep ? [keep] : [];
    }
    async function finishKeep(card, drop) {
      hideDone(); dimTarget = 0;
      const instant = !!(R() && R().fateCard && R().fateCard(card.data.id) && R().fateCard(card.data.id).instant) || card.data.instant;
      if (instant) {
        await discardOffers(card);
        offers = [];
        await burnCard(card);
        disposeCard(card);
        dimTarget = 0;
        return { pick: card.data.id, drop: null };
      }
      if (hand.length < 2 && !drop) {
        await discardOffers(card);
        offers = [];
        hand.push(card);
        await layoutHand();
        return { pick: card.data.id, drop: null };
      }
      const dropId = drop || (scripted && scripted.drop);
      if (!dropId) {
        await discardOffers(card);
        offers = [];
        picked = card;
        const L = replaceLayout(); dimTo(L.z, 0.5);
        const items = hand.concat([card]);
        items.forEach((c) => { c.inSlot = false; });
        await Promise.all(items.map((c, i) => tweenCard(c, L.items[i], 700, { delay: i * 80 })));
        card.pulse = true; card.glowMat.color.set(GOLD);
        setPrompt('Your hand is full. Choose the fate to give up.');
        setState('replacing');
        const dumped = await new Promise((res) => { discarder = res; });
        card.pulse = false; dimTarget = 0;
        const lost = dumped === card ? card : hand.find((c) => c.data.id === dumped);
        const give = lost ? lost.data.id : hand[0].data.id;
        const victim = hand.find((c) => c.data.id === give) || lost;
        if (victim) {
          const p = victim.group.position, vv = vis(p.z);
          tweenCard(victim, { pos: [p.x, -vv.h * 0.9, p.z - 1.5], rot: [1, Math.PI, 0], opacity: 0 }, 640, { ease: E.in }).then(() => disposeCard(victim));
        }
        if (victim && victim !== card) { hand = hand.filter((c) => c !== victim); hand.push(card); }
        picked = null;
        await sleep(180);
        await layoutHand();
        return { pick: card.data.id, drop: give };
      }
      await discardOffers(card);
      offers = [];
      const victim = hand.find((c) => c.data.id === dropId);
      if (victim) {
        const p = victim.group.position, vv = vis(p.z);
        tweenCard(victim, { pos: [p.x, -vv.h * 0.9, -1], rot: [1, Math.PI, 0], opacity: 0 }, 560, { ease: E.in }).then(() => disposeCard(victim));
        hand = hand.filter((c) => c !== victim);
      }
      hand.push(card);
      await layoutHand();
      return { pick: card.data.id, drop: dropId };
    }

    async function readOffer(card) {
      setState('busy');
      picked = card;
      const order = [card].concat(offers.filter((c) => c !== card));
      await Promise.all(order.map((c, i) => tweenCard(c, { rot: [0, 0, 0] }, 560, { delay: i === 0 ? 0 : 160 + i * 70, lift: 0.8 })));
      const z = zoomTarget(); dimTo(z.pos[2]);
      await tweenCard(card, { pos: z.pos, rot: [0, 0, 0], scale: 1 }, 680);
      setPrompt(card.data.title);
      if (scripted) { await sleep(320); return afterRead(card); }
      setState('reading');
      showDone('Done', () => afterRead(card));
    }
    async function afterRead(card) {
      setState('busy');
      const drop = scripted ? scripted.drop : null;
      const result = await finishKeep(card, drop);
      scripted = null;
      setState('idle');
      setPrompt('');
      const done = chooser; chooser = null;
      if (done) done(result);
      return result;
    }

    function commit(pick, drop) {
      scripted = { pick: pick, drop: drop || null };
      return fly.then(async () => {
        const card = offers.find((c) => c.data.id === pick) || (offers[0] || null);
        if (!card) { setState('idle'); return null; }
        return readOffer(card);
      });
    }

    async function viewHand(card) {
      const prev = state;
      setState('busy');
      card.inSlot = false; viewing = card;
      const z = zoomTarget(); dimTo(z.pos[2]);
      await tweenCard(card, { pos: z.pos, rot: [0, 0, 0], scale: 1 }, 640);
      setState('viewing');
      viewingPrev = prev;
      showDone('Return', closeView);
      setPrompt(card.data.title);
    }
    let viewingPrev = 'idle';
    async function closeView() {
      hideDone(); setState('busy'); dimTarget = 0; setPrompt(state === 'choosing' ? 'The shrine offers four fates. Choose one.' : '');
      const c = viewing; viewing = null;
      if (c && hand.indexOf(c) >= 0) await toSlot(c, hand.indexOf(c));
      setState(viewingPrev || 'idle');
      if (state === 'choosing') setPrompt('The shrine offers four fates. Choose one.');
      if (state === 'replacing') setPrompt('Your hand is full. Choose the fate to give up.');
    }

    function reset() {
      hideDone(); setPrompt(''); dimTarget = 0;
      offers.forEach(disposeCard); hand.forEach(disposeCard);
      offers = []; hand = []; picked = null; viewing = null; scripted = null;
      if (chooser) { const c = chooser; chooser = null; c(null); }
      if (discarder) { const d = discarder; discarder = null; d(null); }
      setState('idle');
    }
    function dealing() { return state !== 'idle'; }

    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    function interactive() {
      if (state === 'choosing' || state === 'watching') return offers.concat(hand);
      if (state === 'replacing') return hand.concat(picked ? [picked] : []);
      if (state === 'idle') return hand;
      return [];
    }
    function pickAt(e) {
      const r = renderer.domElement.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(interactive().flatMap((c) => c.hits), false)[0];
      return hit ? hit.object.userData.card : null;
    }
    function onPointer(e) {
      const c = pickAt(e);
      if (!c) return;
      if (state === 'choosing' && offers.indexOf(c) >= 0) readOffer(c);
      else if ((state === 'choosing' || state === 'idle') && hand.indexOf(c) >= 0) viewHand(c);
      else if (state === 'replacing' && discarder) { const d = discarder; discarder = null; d(c.data.id); }
    }
    stage.addEventListener('pointerdown', (e) => { if (state === 'idle') return; if (e.target === doneEl) return; onPointer(e); });
    hitEl.addEventListener('pointerdown', (e) => { if (state !== 'idle') return; onPointer(e); });

    function resize() {
      const w = stage.clientWidth || window.innerWidth, h = stage.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
      if (state === 'idle' && hand.length) {
        hand.forEach((c, i) => { const t = slotTarget(i, hand.length); c.group.position.set(t.pos[0], t.pos[1], t.pos[2]); c.group.rotation.set(t.rot[0], t.rot[1], t.rot[2]); c.group.scale.setScalar(t.scale); });
        placeHandHit();
      }
    }
    resize();
    window.addEventListener('resize', resize);

    let last = performance.now();
    function frame(now) {
      requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      updateTweens(now);
      const t = now / 1000;
      live.forEach((c) => {
        c.hover += (c.hoverT - c.hover) * 0.18;
        const bob = (!reduce && (state === 'choosing' || state === 'watching') && offers.indexOf(c) >= 0) ? Math.sin(t * 1.6 + c.phase) * 0.03 : 0;
        c.inner.position.y = c.hover * (c.inSlot ? 0.28 : 0.12) + bob;
        const gt = c.pulse ? 0.6 + 0.35 * Math.sin(t * 3.2) : c.glowT;
        c.glowCur += (gt - c.glowCur) * 0.15;
        c.glowMat.opacity = c.glowCur * c.opacity * 0.9;
        c.mats.forEach((m) => { m.opacity = c.opacity; });
        if (c.front.material !== c.mats[0] && c.front.material.opacity !== undefined) c.front.material.opacity = c.opacity;
      });
      const dm = dimmer.material;
      dm.opacity += (dimTarget - dm.opacity) * 0.12;
      dimmer.visible = dm.opacity > 0.01;
      if (live.size || dimmer.visible || state !== 'idle') renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);
    try { document.fonts && document.fonts.load('700 48px Cinzel'); document.fonts.load('italic 500 28px "EB Garamond"'); } catch (e) {}

    return { setHand, burn, deal, commit, reset, dealing };
  }

  const css = document.createElement('style');
  css.textContent = [
    '#fate{position:fixed;inset:0;z-index:12;pointer-events:none}',
    '#fate.open{pointer-events:auto}',
    '#fate canvas{position:absolute;inset:0;width:100%;height:100%;display:block}',
    '#fate .fatehit{display:none;position:absolute;left:0;top:0;width:0;height:0;pointer-events:auto}',
    '#fate.peek .fatehit{display:block}',
    '#fate .fateprompt{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 22px);transform:translateX(-50%);width:min(92%,560px);margin:0;text-align:center;font-family:"EB Garamond",Georgia,serif;font-style:italic;font-size:20px;line-height:1.35;color:rgba(243,234,214,.86);text-shadow:0 2px 8px rgba(0,0,0,.65);pointer-events:none}',
    '#fate .fatedone{position:absolute;left:50%;top:78%;transform:translateX(-50%);font-family:Cinzel,"Times New Roman",serif;font-weight:700;letter-spacing:.06em;font-size:15px;color:#1d1505;background:linear-gradient(180deg,#ecd08a,#d4af5f 55%,#9c7a32);border:1px solid #f6e3ad;border-radius:10px;padding:10px 22px;cursor:pointer;opacity:0;pointer-events:none}',
    '#fate .fatedone.show{opacity:1;pointer-events:auto}',
    '#fate:not(.open) .fateprompt,#fate:not(.open) .fatedone{visibility:hidden}'
  ].join('');
  document.head.appendChild(css);

  root.CorhavenFateView = { mount: mount };
})(globalThis);
