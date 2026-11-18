/* Title-screen smoke and embers. Requires three.js and cannon.js on the page. */
(function (root) {
  'use strict';

  const THREE = root.THREE;
  const CANNON = root.CANNON;

  function createSmokeEmbers(scene, camera) {
    function rr(lo, hi) { return lo + Math.random() * (hi - lo); }
    function vis(z) {
      const h = 2 * (camera.position.z - z) * Math.tan((camera.fov * Math.PI) / 360);
      return { w: h * camera.aspect, h };
    }
    /** Viewport left edge minus sprite half-size (puffs recycle fully off-screen). */
    function pastLeftEdge(x, v, halfExtent, pad) {
      return x < -v.w * 0.5 - halfExtent - (pad == null ? 4 : pad);
    }
    function edgeFadeLeft(x, v, halfExtent) {
      const fadeStart = -v.w * 0.5 + halfExtent * 0.35;
      if (x >= fadeStart) return 1;
      const fadeEnd = -v.w * 0.5 - halfExtent;
      if (x <= fadeEnd) return 0;
      return (x - fadeEnd) / (fadeStart - fadeEnd);
    }

    const PACE = 0.55;

    const world = new CANNON.World();
    world.gravity.set(0, 0.04 * PACE, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 2;

    const WIND = new CANNON.Vec3(-0.8 * PACE, 0, 0);

    function makeSmokeTex(seed) {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const g = c.getContext('2d');
      const cx = 128;
      const cy = 128;
      const rng = (function (s) {
        return function () { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
      })(seed || 1);
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 120);
      gr.addColorStop(0, 'rgba(255,255,255,0.6)');
      gr.addColorStop(0.35, 'rgba(255,255,255,0.35)');
      gr.addColorStop(0.7, 'rgba(255,255,255,0.1)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 8; i++) {
        const bx = cx + (rng() - 0.5) * 100;
        const by = cy + (rng() - 0.5) * 80;
        const br = 30 + rng() * 60;
        const bg = g.createRadialGradient(bx, by, 0, bx, by, br);
        bg.addColorStop(0, 'rgba(255,255,255,' + (0.12 + rng() * 0.14) + ')');
        bg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = bg;
        g.beginPath();
        g.arc(bx, by, br, 0, Math.PI * 2);
        g.fill();
      }
      return new THREE.CanvasTexture(c);
    }

    const smokeTex = [makeSmokeTex(42), makeSmokeTex(137), makeSmokeTex(991), makeSmokeTex(2077)];

    function makeEmberTex() {
      const c = document.createElement('canvas');
      c.width = c.height = 32;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.12, 'rgba(255,240,200,0.95)');
      gr.addColorStop(0.3, 'rgba(255,160,60,0.5)');
      gr.addColorStop(0.6, 'rgba(200,80,20,0.15)');
      gr.addColorStop(1, 'rgba(150,40,10,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 32, 32);
      return new THREE.CanvasTexture(c);
    }
    const emberTex = makeEmberTex();

    const SMOKE_N = 50;
    const smokePool = [];
    const smokeMat = new THREE.SpriteMaterial({
      map: smokeTex[0],
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    function holdParticle(body, x, y, z) {
      body.position.set(x, y, z);
      body.velocity.set(0, 0, 0);
      body.angularVelocity.set(0, 0, 0);
    }

    function spawnSmoke(s, stagger) {
      const v = vis(0);
      const startX = v.w * 0.55 + rr(0, 3);
      const startY = rr(-v.h * 0.5, -v.h * 0.22);
      const startZ = rr(-3, -0.5);
      holdParticle(s.body, startX, startY, startZ);
      s.anchorX = startX;
      s.anchorY = startY;
      s.anchorZ = startZ;
      s.launchVx = rr(-1.2, -0.5) * PACE;
      s.launchVy = rr(0.02, 0.14) * PACE;
      s.launchSpin = rr(-0.3, 0.3) * PACE;
      if (!stagger) {
        s.body.velocity.set(s.launchVx, s.launchVy, 0);
        s.body.angularVelocity.set(0, 0, s.launchSpin);
      }
      s.life = stagger ? -rr(0, 7) : 0;
      s.maxLife = rr(14, 22);
      s.baseScale = rr(3, 6.5);
      s.maxAlpha = rr(0.12, 0.28);
      s.sprite.material.rotation = rr(0, Math.PI * 2);
      s.rotSpeed = rr(-0.08, 0.08) * PACE;
    }

    const EMBER_N = 36;
    const emberPool = [];

    function spawnEmber(e, stagger) {
      const v = vis(0);
      const startX = v.w * 0.55 + rr(0, 2);
      const startY = rr(-v.h * 0.5, -v.h * 0.08);
      const startZ = rr(-2, 1);
      holdParticle(e.body, startX, startY, startZ);
      e.anchorX = startX;
      e.anchorY = startY;
      e.anchorZ = startZ;
      e.launchVx = rr(-1.8, -0.7) * PACE;
      e.launchVy = rr(0.05, 0.35) * PACE;
      e.launchVz = rr(-0.1, 0.1) * PACE;
      if (!stagger) {
        e.body.velocity.set(e.launchVx, e.launchVy, e.launchVz);
      }
      e.life = stagger ? -rr(0, 3) : 0;
      e.maxLife = rr(6, 12);
      e.bright = rr(0.85, 1);
      e.flicker = rr(2.5, 6);
      e.size = rr(0.1, 0.26);
    }

    function turbulence(x, y, t) {
      return Math.sin(x * 0.7 + t * 0.6) * Math.cos(y * 0.9 + t * 0.4) * 0.5;
    }

    function initParticles() {
      for (let i = 0; i < SMOKE_N; i++) {
        const body = new CANNON.Body({
          mass: 0.01,
          position: new CANNON.Vec3(50, 0, -1),
          linearDamping: 0.15,
          angularDamping: 0.9,
          collisionResponse: false,
        });
        body.addShape(new CANNON.Sphere(0.5));
        world.addBody(body);
        const mat = smokeMat.clone();
        mat.map = smokeTex[i % smokeTex.length];
        const sprite = new THREE.Sprite(mat);
        sprite.scale.setScalar(3);
        scene.add(sprite);
        const s = { body, sprite, life: 0, maxLife: 12, baseScale: 3, maxAlpha: 0.1, rotSpeed: 0 };
        smokePool.push(s);
        spawnSmoke(s, true);
      }
      for (let i = 0; i < EMBER_N; i++) {
        const body = new CANNON.Body({
          mass: 0.002,
          position: new CANNON.Vec3(50, 0, 0),
          linearDamping: 0.06,
          collisionResponse: false,
        });
        body.addShape(new CANNON.Sphere(0.02));
        world.addBody(body);
        const mat = new THREE.SpriteMaterial({
          map: emberTex,
          color: 0xffaa44,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.setScalar(0.08);
        scene.add(sprite);
        const e = { body, sprite, life: 0, maxLife: 5, bright: 1, flicker: 6, size: 0.08 };
        emberPool.push(e);
        spawnEmber(e, true);
      }
    }

    function updateParticles(dt, t) {
      const v = vis(0);
      for (let i = 0; i < SMOKE_N; i++) {
        const s = smokePool[i];
        const smokeWasWaiting = s.life < 0;
        s.life += dt;
        if (s.life < 0) {
          holdParticle(s.body, s.anchorX, s.anchorY, s.anchorZ);
          s.sprite.position.set(s.anchorX, s.anchorY, s.anchorZ);
          s.sprite.material.opacity = 0;
          continue;
        }
        if (smokeWasWaiting) {
          s.body.velocity.set(s.launchVx, s.launchVy, 0);
          s.body.angularVelocity.set(0, 0, s.launchSpin);
        }
        const growPre = 1 + (s.life / s.maxLife) * 1.2;
        const smokeHalf = s.baseScale * growPre * 0.52;
        if (s.life > s.maxLife || pastLeftEdge(s.body.position.x, v, smokeHalf)) {
          spawnSmoke(s, false);
          continue;
        }
        const ceil = -v.h * 0.1;
        if (s.body.position.y > ceil) {
          const over = (s.body.position.y - ceil) * 0.02;
          s.body.applyForce(new CANNON.Vec3(0, -over, 0), s.body.position);
        }
        const ts = t * PACE;
        const tx = turbulence(s.body.position.x, s.body.position.y, ts);
        const ty = turbulence(s.body.position.y, s.body.position.x, ts * 0.7);
        s.body.applyForce(
          new CANNON.Vec3(WIND.x * 0.005 + tx * 0.002 * PACE, WIND.y * 0.005 + ty * 0.001 * PACE, 0),
          s.body.position
        );
        s.sprite.position.set(s.body.position.x, s.body.position.y, s.body.position.z);
        s.sprite.scale.setScalar(s.baseScale * growPre);
        s.sprite.material.rotation += s.rotSpeed * dt;
        const p = s.life / s.maxLife;
        const fade = p < 0.06 ? p / 0.06 : p > 0.55 ? 1 - (p - 0.55) / 0.45 : 1;
        const edge = edgeFadeLeft(s.body.position.x, v, smokeHalf);
        s.sprite.material.opacity = s.maxAlpha * fade * edge;
      }
      for (let i = 0; i < EMBER_N; i++) {
        const e = emberPool[i];
        const emberWasWaiting = e.life < 0;
        e.life += dt;
        if (e.life < 0) {
          holdParticle(e.body, e.anchorX, e.anchorY, e.anchorZ);
          e.sprite.position.set(e.anchorX, e.anchorY, e.anchorZ);
          e.sprite.material.opacity = 0;
          continue;
        }
        if (emberWasWaiting) {
          e.body.velocity.set(e.launchVx, e.launchVy, e.launchVz);
        }
        const pEarly = e.life / e.maxLife;
        const emberHalf = e.size * (1 - pEarly * 0.5) * 0.5;
        if (e.life > e.maxLife || pastLeftEdge(e.body.position.x, v, emberHalf, 2)) {
          spawnEmber(e, false);
          continue;
        }
        const ts = t * PACE;
        const tx = turbulence(e.body.position.x * 2, e.body.position.y * 2, ts * 1.3);
        e.body.applyForce(
          new CANNON.Vec3(WIND.x * 0.0003 + tx * 0.00015 * PACE, 0.0002 * PACE, 0),
          e.body.position
        );
        e.sprite.position.set(e.body.position.x, e.body.position.y, e.body.position.z);
        const p = pEarly;
        const emberScale = e.size * (1 - p * 0.5);
        const fade = p < 0.05 ? p / 0.05 : p > 0.65 ? 1 - (p - 0.65) / 0.35 : 1;
        const flick = 0.75 + 0.25 * Math.sin(ts * e.flicker + i * 2.3);
        const edge = edgeFadeLeft(e.body.position.x, v, emberHalf);
        const a = fade * e.bright * flick * edge;
        e.sprite.material.opacity = a;
        e.sprite.scale.setScalar(emberScale);
        const g = 0.55 + 0.4 * (1 - p);
        const b = 0.15 + 0.6 * Math.max(0, 1 - p * 2.5);
        e.sprite.material.color.setRGB(1, g, b);
      }
    }

    return { initParticles, updateParticles, world, WIND };
  }

  root.CorhavenSmokeEmbers = { createSmokeEmbers };
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : self);