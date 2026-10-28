/* The March, played the way Ludo Under Siege plays it.
   One performance covers the whole board, castle yards included.
   The camera is never moved from here. */
(function (root) {
    const THREE = root.THREE;
    let reducedMotion = false;
    const yardCenters = [
        new THREE.Vector3(-4.8, 0, -4.8),
        new THREE.Vector3(4.8, 0, -4.8),
        new THREE.Vector3(4.8, 0, 4.8),
        new THREE.Vector3(-4.8, 0, 4.8)
    ];
    const boardCells = 14.4;
    const halfBoard = 7.2;
    const boardThickness = 0.6;
    const cellPixels = 96;
    const castleHalfSpan = 2.2;
    const playerHex = { red: "#d8433a", green: "#3e9a4d", yellow: "#e9b937", blue: "#3b70c6" };
    const playerOrder = ["red", "green", "yellow", "blue"];
    const castleSetups = {
        red: { centerX: -4.8, centerZ: -4.8, gateRotation: 0, trackCell: [6, 4] },
        green: { centerX: 4.8, centerZ: -4.8, gateRotation: -Math.PI / 2, trackCell: [4, 8] },
        yellow: { centerX: 4.8, centerZ: 4.8, gateRotation: Math.PI, trackCell: [8, 10] },
        blue: { centerX: -4.8, centerZ: 4.8, gateRotation: Math.PI / 2, trackCell: [10, 6] }
    };
    const courtyardSlots = [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9]];
    const safeStarCells = [[8, 2], [2, 6], [6, 12], [12, 8]];
    const startCells = { red: [6, 1], green: [1, 8], yellow: [8, 13], blue: [13, 6] };

    // ---------- Rendering ----------
    const maxPixelRatio = 1.75;
    const maxFrameSeconds = 0.05;
    const moodEasing = 1.4;
    const pieceFloatEasing = 3;

    // ---------- Camera ----------
    const orbitRotateSpeed = 0.005;
    const orbitZoomSpeed = 0.0012;
    const orbitMinPhi = 0.2;
    const orbitMaxPhi = 1.4;
    const orbitMinRadius = 9;
    const orbitMaxRadius = 60;
    const orbitEasing = 5;
    const defaultOrbitRadius = 24;
    const cameraShakeScale = 0.09;

    // ---------- Effect timing ----------
    const volcanoGrowSeconds = 2.8;
    const volcanoEruptSeconds = 3.0;
    const volcanoLeaveSeconds = 2.2;
    const tsunamiTravelSeconds = 5.5;
    const tsunamiLeaveSeconds = 2.2;
    const thornsLeaveSeconds = 1.8;
        const fogRollSeconds = 7;
        const fogLeaveSeconds = 2.5;
        /* Eight sheets instead of twelve. The shader below is a small value-noise,
           so the volume stays and the fill-rate cost drops. */
        const fogLayerCount = 8;
    const sunLanceLeaveSeconds = 2.4;
    const sunLanceTimes = {
        firstIgnite: 1.5,
        igniteGap: 0.7,
        wanderEnd: 10,
        sigilStart: 11.5,
        circleSeconds: 5,
        raySeconds: 1.5,
        rayDrawSeconds: 1.0,
        sealStart: 17.5,
        sealStrike: 18.2,
        sealEnd: 19,
        resumeEnd: 21
    };
    const sigilCircleRadius = 1.25;
    const sigilRayInner = 1.8;
    const sigilRayOuter = 3.0;
    const sunLanceSourceOffsets = [[-4.5, 24, -5.2], [-1.6, 24, -7.4], [-3.0, 24, -3.6]];
    const burnMapPixels = 512;
    const lanceHeatRadius = 0.95;
    const heatCoolStepSeconds = 0.12;
    const heatCoolRate = 0.55;
    // ---------- Moods: how the room is lit for each effect ----------
    const moods = {
        none: { background: 0x2f2722, fogDensity: 0.014, sunColor: 0xfff1de, sunIntensity: 1.25, hemiSky: 0xd9e4ff, hemiGround: 0x3a2a20, hemiIntensity: 0.55 },
        volcano: { background: 0x2a0c06, fogDensity: 0.022, sunColor: 0xffb08a, sunIntensity: 0.55, hemiSky: 0xff8a5c, hemiGround: 0x2a0a04, hemiIntensity: 0.38 },
        tsunami: { background: 0x22323e, fogDensity: 0.02, sunColor: 0xd8e8ff, sunIntensity: 1.0, hemiSky: 0x9fc0d8, hemiGround: 0x1a2630, hemiIntensity: 0.6 },
        thorns: { background: 0x1a2216, fogDensity: 0.022, sunColor: 0xe4f0c8, sunIntensity: 0.85, hemiSky: 0xa4b894, hemiGround: 0x241a12, hemiIntensity: 0.6 },
        fog: { background: 0x8e959b, fogDensity: 0.034, sunColor: 0xf2f4f6, sunIntensity: 0.4, hemiSky: 0xdfe6ec, hemiGround: 0x6a6f74, hemiIntensity: 0.9 },
        sunlances: { background: 0x1f140b, fogDensity: 0.02, sunColor: 0xffcf8a, sunIntensity: 0.32, hemiSky: 0xffb46a, hemiGround: 0x241206, hemiIntensity: 0.34 }
    };

    // ---------- Shared GLSL ----------
    const sharedGlsl = `
        uniform float uTime;
        uniform vec3 uFogColor;
        uniform float uFogDensity;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform vec3 uAmbientColor;
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        float snoise(vec3 v)
        {
            const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
            vec3 i = floor(v + dot(v, C.yyy));
            vec3 x0 = v - i + dot(i, C.xxx);
            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min(g.xyz, l.zxy);
            vec3 i2 = max(g.xyz, l.zxy);
            vec3 x1 = x0 - i1 + C.xxx;
            vec3 x2 = x0 - i2 + C.yyy;
            vec3 x3 = x0 - D.yyy;
            i = mod289(i);
            vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                + i.x + vec4(0.0, i1.x, i2.x, 1.0));
            float n_ = 0.142857142857;
            vec3 ns = n_ * D.wyz - D.xzx;
            vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_);
            vec4 x = x_ * ns.x + ns.yyyy;
            vec4 y = y_ * ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);
            vec4 b0 = vec4(x.xy, y.xy);
            vec4 b1 = vec4(x.zw, y.zw);
            vec4 s0 = floor(b0) * 2.0 + 1.0;
            vec4 s1 = floor(b1) * 2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));
            vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
            vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
            vec3 p0 = vec3(a0.xy, h.x);
            vec3 p1 = vec3(a0.zw, h.y);
            vec3 p2 = vec3(a1.xy, h.z);
            vec3 p3 = vec3(a1.zw, h.w);
            vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
            p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
            vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
            m = m * m;
            return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
        }
        float fbm(vec3 p)
        {
            float amplitude = 0.5;
            float total = 0.0;
            for (int i = 0; i < 4; i++)
            {
                total += amplitude * snoise(p);
                p *= 2.03;
                amplitude *= 0.5;
            }
            return total;
        }
        float fallOff(float low, float high, float x)
        {
            return 1.0 - smoothstep(low, high, x);
        }
        vec3 applyFog(vec3 color, vec3 worldPosition)
        {
            float d = length(worldPosition - cameraPosition) * uFogDensity;
            return mix(color, uFogColor, clamp(1.0 - exp(-d * d), 0.0, 1.0));
        }
        vec3 lavaRamp(float heat)
        {
            vec3 color = mix(vec3(0.03, 0.015, 0.015), vec3(0.38, 0.03, 0.0), smoothstep(0.0, 0.25, heat));
            color = mix(color, vec3(0.95, 0.25, 0.0), smoothstep(0.25, 0.55, heat));
            color = mix(color, vec3(1.0, 0.72, 0.18), smoothstep(0.55, 0.82, heat));
            color = mix(color, vec3(1.0, 0.96, 0.72), smoothstep(0.86, 1.0, heat));
            return color;
        }
    `;

    // ---------- Volcano shaders ----------
    const volcanoConeVertexShader = `
        ${sharedGlsl}
        uniform float uConeHeight;
        varying vec3 vWorld;
        varying vec3 vNormal;
        varying float vHeight;
        varying float vAngle;
        void main()
        {
            vec3 p = position;
            float rough = snoise(p * 1.4) * 0.14 + snoise(p * 4.0) * 0.04;
            float awayFromAxis = step(0.05, length(p.xz));
            p += normal * rough * awayFromAxis;
            vec4 worldPosition = modelMatrix * vec4(p, 1.0);
            vWorld = worldPosition.xyz;
            vNormal = normalize(mat3(modelMatrix) * normal);
            vHeight = position.y / uConeHeight;
            vAngle = atan(position.z, position.x);
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
    `;

    const volcanoConeFragmentShader = `
        ${sharedGlsl}
        uniform float uErupt;
        uniform float uFlowReach;
        varying vec3 vWorld;
        varying vec3 vNormal;
        varying float vHeight;
        varying float vAngle;
        void main()
        {
            vec3 n = normalize(vNormal);
            vec3 toCamera = normalize(cameraPosition - vWorld);
            if (dot(n, toCamera) < 0.0)
            {
                n = -n;
            }
            vec3 rock = mix(vec3(0.07, 0.055, 0.05), vec3(0.24, 0.18, 0.15), smoothstep(-0.4, 0.6, fbm(vWorld * 1.8)));
            float diffuse = max(dot(n, uSunDir), 0.0);
            vec3 color = rock * (uAmbientColor * 0.7 + uSunColor * diffuse);
            vec2 ring = vec2(cos(vAngle), sin(vAngle));
            float channelNoise = snoise(vec3(ring * 1.7, vHeight * 0.9));
            float channel = fallOff(0.0, 0.07, abs(channelNoise));
            float reach = smoothstep(0.95 - uFlowReach, 1.05 - uFlowReach, vHeight);
            float pulse = 0.65 + 0.35 * sin(vHeight * 22.0 + uTime * 5.0 + channelNoise * 4.0);
            float crater = smoothstep(0.82, 0.95, vHeight) * (0.75 + 0.25 * sin(uTime * 3.0));
            float heat = max(channel * reach * pulse, crater) * uErupt;
            color = mix(color, lavaRamp(heat) * 1.3, smoothstep(0.05, 0.3, heat));
            color += vec3(1.0, 0.32, 0.06) * 0.3 * uErupt * fallOff(0.0, 0.5, vHeight);
            gl_FragColor = vec4(applyFog(color, vWorld), 1.0);
        }
    `;

    const lavaEdgeGlsl = `
        float lavaEdge(vec2 xz)
        {
            float angle = atan(xz.y, xz.x);
            vec2 ring = vec2(cos(angle), sin(angle));
            return uSpread + 0.9 * snoise(vec3(ring * 1.4, uTime * 0.05)) + 0.45 * snoise(vec3(xz * 0.55, 3.0));
        }
    `;

    const lavaGroundVertexShader = `
        ${sharedGlsl}
        uniform float uSpread;
        varying vec3 vWorld;
        varying vec2 vBoard;
        ${lavaEdgeGlsl}
        void main()
        {
            vec3 local = position;
            float r = length(local.xz);
            float depthInside = lavaEdge(local.xz) - r;
            local.y += 0.12 * smoothstep(0.0, 2.0, depthInside) + 0.05 * snoise(vec3(local.xz * 0.5, uTime * 0.2)) * smoothstep(0.0, 2.0, depthInside);
            vBoard = local.xz;
            vec4 worldPosition = modelMatrix * vec4(local, 1.0);
            vWorld = worldPosition.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
    `;

    const lavaGroundFragmentShader = `
        ${sharedGlsl}
        uniform float uSpread;
        varying vec3 vWorld;
        varying vec2 vBoard;
        ${lavaEdgeGlsl}
        void main()
        {
            float r = length(vBoard);
            float edge = lavaEdge(vBoard);
            if (r > edge)
            {
                discard;
            }
            vec2 p = vBoard * 0.18 + vec2(uTime * 0.012, -uTime * 0.008);
            vec2 warp = vec2(fbm(vec3(p, uTime * 0.02)), fbm(vec3(p + vec2(4.1, 2.7), uTime * 0.02)));
            float molten = smoothstep(-0.15, 0.9, fbm(vec3(p * 1.1 + warp * 0.7, uTime * 0.03)));
            float cracks = fallOff(0.0, 0.28, abs(fbm(vec3(p * 1.4 + warp * 0.35, uTime * 0.018 + 3.0)) - 0.12));
            float front = fallOff(0.0, 1.6, edge - r);
            float heat = molten * (1.0 - front * 0.8) * 0.85 + cracks * (0.6 - front * 0.3);
            heat += 0.35 * fallOff(0.0, 3.0, r);
            heat = clamp(heat * (0.92 + 0.08 * sin(uTime * 1.7 + molten * 6.0)), 0.0, 1.0);
            vec3 color = lavaRamp(heat) * 1.15;
            vec3 surfaceNormal = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
            surfaceNormal *= sign(surfaceNormal.y);
            color += vec3(0.16, 0.1, 0.1) * max(dot(surfaceNormal, uSunDir), 0.0) * (1.0 - heat);
            gl_FragColor = vec4(applyFog(color, vWorld), 1.0);
        }
    `;

    // ---------- Tsunami shaders ----------
    const waveHeightGlsl = `
        uniform float uFront;
        uniform float uLevel;
        uniform float uCrest;
        uniform float uChop;
        float waveFrontX(float z)
        {
            return uFront + 0.6 * sin(z * 0.45 + uTime * 0.8) + 0.3 * sin(z * 1.1 - uTime * 1.3);
        }
        float waterHeight(vec2 xz)
        {
            float s = xz.x - waveFrontX(xz.y);
            float body = uLevel * fallOff(-1.2, 0.6, s);
            float crest = uCrest * exp(-pow(s + 0.4, 2.0) * 1.1);
            float chop = 0.08 * sin(xz.x * 1.7 - uTime * 2.3 + xz.y * 0.6)
                + 0.06 * sin(xz.y * 2.1 + uTime * 1.7)
                + 0.05 * sin((xz.x + xz.y) * 3.1 - uTime * 3.0);
            /* Ripples stay at the original strength. Only the standing depth uses uLevel. */
            chop *= fallOff(-2.0, 0.0, s) * uChop;
            return body + crest + chop;
        }
    `;

    const waterVertexShader = `
        ${sharedGlsl}
        ${waveHeightGlsl}
        varying vec3 vWorld;
        varying vec3 vNormal;
        varying float vTop;
        varying float vFrontDistance;
        varying float vDepth;
        varying vec2 vBoard;
        const float collapsedHeight = -0.04;
        const float sampleStep = 0.08;
        void main()
        {
            vec3 p = position;
            float h = waterHeight(p.xz);
            float surface = h > 0.03 ? h : collapsedHeight;
            p.y = position.y > 0.0 ? surface : collapsedHeight;
            float hx = waterHeight(p.xz + vec2(sampleStep, 0.0));
            float hz = waterHeight(p.xz + vec2(0.0, sampleStep));
            vNormal = normalize(vec3(-(hx - h) / sampleStep, 1.0, -(hz - h) / sampleStep));
            vTop = normal.y > 0.5 ? 1.0 : 0.0;
            vFrontDistance = p.x - waveFrontX(p.z);
            vDepth = max(h, 0.0);
            vBoard = p.xz;
            vec4 worldPosition = modelMatrix * vec4(p, 1.0);
            vWorld = worldPosition.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
    `;

    const waterFragmentShader = `
        ${sharedGlsl}
        uniform float uCrest;
        uniform vec3 uCastleCenters[4];
        varying vec3 vWorld;
        varying vec3 vNormal;
        varying float vTop;
        varying float vFrontDistance;
        varying float vDepth;
        varying vec2 vBoard;
        void main()
        {
            vec3 n = vTop > 0.5 ? normalize(vNormal) : normalize(cross(dFdx(vWorld), dFdy(vWorld)));
            vec3 v = normalize(cameraPosition - vWorld);
            if (dot(n, v) < 0.0)
            {
                n = -n;
            }
            float fresnel = 0.04 + 0.96 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
            vec3 r = reflect(-v, n);
            vec3 skyReflection = mix(uFogColor * 1.6, vec3(0.72, 0.8, 0.86), clamp(r.y, 0.0, 1.0));
            vec3 body = mix(vec3(0.14, 0.62, 0.62), vec3(0.04, 0.28, 0.36), smoothstep(0.0, 1.2, vDepth));
            body *= uAmbientColor * 0.8 + uSunColor * 0.7;
            vec3 color = mix(body, skyReflection, fresnel);
            color += uSunColor * pow(max(dot(r, uSunDir), 0.0), 120.0) * 1.5;
            float grain = 0.6 + 0.4 * snoise(vec3(vWorld.xz * 1.6, uTime * 1.2));
            float crestFoam = exp(-pow(vFrontDistance + 0.5, 2.0) * 0.7) * clamp(uCrest, 0.0, 1.0);
            float shallowFoam = fallOff(0.0, 0.25, vDepth) * 0.8;
            float castleFoam = 0.0;
            for (int i = 0; i < 4; i++)
            {
                    vec2 offset = abs(vBoard - uCastleCenters[i].xz);
                float squareDistance = max(offset.x, offset.y);
                castleFoam += fallOff(0.0, 0.35, abs(squareDistance - 2.45)) * smoothstep(0.2, 0.6, vDepth);
            }
            float foam = clamp((crestFoam + shallowFoam + castleFoam * 0.7) * grain, 0.0, 1.0) * vTop;
            color = mix(color, vec3(0.92, 0.94, 0.95) * (uAmbientColor * 0.5 + uSunColor * 0.6), foam * 0.85);
            float alpha = mix(mix(0.8, 0.97, fresnel), 1.0, foam);
            gl_FragColor = vec4(applyFog(color, vWorld), alpha);
        }
    `;

    // ---------- Thorn shaders ----------
    const vineVertexShader = `
        ${sharedGlsl}
        uniform float uGrowth;
        uniform float uRadius;
        varying vec3 vWorld;
        varying vec3 vNormal;
        varying float vAlong;
        void main()
        {
            float along = uv.x;
            float tipTaper = fallOff(uGrowth - 0.07, uGrowth, along);
            float lengthTaper = 1.0 - 0.45 * along;
            float shrink = 1.0 - tipTaper * lengthTaper;
            vec3 p = position - normal * uRadius * shrink;
            vec4 worldPosition = modelMatrix * vec4(p, 1.0);
            vWorld = worldPosition.xyz;
            vNormal = normalize(mat3(modelMatrix) * normal);
            vAlong = along;
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
    `;

    const vineFragmentShader = `
        ${sharedGlsl}
        uniform float uGrowth;
        varying vec3 vWorld;
        varying vec3 vNormal;
        varying float vAlong;
        void main()
        {
            if (vAlong > uGrowth)
            {
                discard;
            }
            vec3 n = normalize(vNormal);
            float bark = snoise(vWorld * 9.0);
            vec3 base = mix(vec3(0.14, 0.2, 0.07), vec3(0.3, 0.22, 0.1), smoothstep(-0.3, 0.6, bark));
            base = mix(base, vec3(0.3, 0.4, 0.12), fallOff(0.0, 0.08, uGrowth - vAlong) * 0.8);
            float diffuse = max(dot(n, uSunDir), 0.0);
            vec3 color = base * (uAmbientColor + uSunColor * diffuse * 1.2);
            float rim = pow(1.0 - max(dot(n, normalize(cameraPosition - vWorld)), 0.0), 3.0);
            color += vec3(0.06, 0.1, 0.03) * rim;
            gl_FragColor = vec4(applyFog(color, vWorld), 1.0);
        }
    `;

    // ---------- Fog shaders ----------
    const fogLayerVertexShader = `
        varying vec3 vWorld;
        varying vec2 vBoard;
        void main()
        {
            vBoard = position.xz;
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorld = worldPosition.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
    `;

    /* Value noise, not simplex. Soft fog does not need the four-octave simplex the
       lava uses, and that simplex was the cost of every fog sheet. */
    const fogLayerFragmentShader = `
        uniform float uTime;
        uniform float uFront;
        uniform float uAmount;
        uniform float uLayerHeight;
        uniform float uSeed;
        varying vec2 vBoard;
        float hash13(vec3 p)
        {
            p = fract(p * 0.1031);
            p += dot(p, p.yzx + 33.33);
            return fract((p.x + p.y) * p.z);
        }
        float vnoise(vec3 p)
        {
            vec3 i = floor(p);
            vec3 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            float n000 = hash13(i);
            float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
            float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
            float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
            float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
            float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
            float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
            float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
            return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
                       mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
        }
        float fallOff(float low, float high, float x)
        {
            return 1.0 - smoothstep(low, high, x);
        }
        void main()
        {
            float radial = fallOff(9.0, 19.0, length(vBoard));
            if (radial <= 0.001) discard;
            vec2 p = vBoard * 0.16 + vec2(uTime * 0.05, uTime * 0.015);
            float n = vnoise(vec3(p, uSeed + uTime * 0.03));
            n += 0.5 * vnoise(vec3(p * 2.3 - vec2(uTime * 0.04, 0.0), uSeed * 1.7));
            n /= 1.5;
            float density = smoothstep(0.38, 0.82, n);
            float heightFade = fallOff(0.0, 2.6, uLayerHeight);
            float frontWobble = 1.6 * (vnoise(vec3(vBoard.y * 0.15, uSeed, uTime * 0.1)) * 2.0 - 1.0);
            float rolling = fallOff(uFront - 7.0 + frontWobble, uFront + frontWobble, vBoard.x);
            float alpha = density * (0.3 + 0.7 * heightFade) * radial * rolling * uAmount * 0.48;
            gl_FragColor = vec4(vec3(0.86, 0.88, 0.9), alpha);
        }
    `;

    // ---------- Sun lance shaders ----------
    const lanceBeamVertexShader = `
        varying vec3 vViewNormal;
        varying vec3 vViewPosition;
        varying vec2 vUv;
        void main()
        {
            vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
            vViewPosition = viewPosition.xyz;
            vViewNormal = normalize(normalMatrix * normal);
            vUv = uv;
            gl_Position = projectionMatrix * viewPosition;
        }
    `;

    const lanceBeamFragmentShader = `
        ${sharedGlsl}
        uniform float uIntensity;
        uniform vec3 uBeamColor;
        varying vec3 vViewNormal;
        varying vec3 vViewPosition;
        varying vec2 vUv;
        void main()
        {
            float facing = abs(dot(normalize(vViewNormal), normalize(-vViewPosition)));
            float core = pow(facing, 2.2);
            float around = vUv.x * 6.28318;
            float shimmer = 0.7 + 0.3 * snoise(vec3(cos(around) * 1.5, sin(around) * 1.5 + vUv.y * 10.0 - uTime * 4.0, uTime * 0.7));
            float topFade = fallOff(0.55, 1.0, vUv.y);
            float groundBoost = 1.0 + 2.0 * fallOff(0.0, 0.08, vUv.y);
            gl_FragColor = vec4(uBeamColor, core * shimmer * topFade * groundBoost * uIntensity);
        }
    `;

    const lanceImpactVertexShader = `
        varying vec2 vUv;
        void main()
        {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const lanceImpactFragmentShader = `
        uniform float uTime;
        uniform float uIntensity;
        varying vec2 vUv;
        void main()
        {
            float d = length(vUv - 0.5) * 2.0;
            float glow = pow(max(1.0 - d, 0.0), 2.5);
            float ring = exp(-pow((d - 0.55) * 7.0, 2.0)) * 0.3 * (0.6 + 0.4 * sin(uTime * 20.0));
            gl_FragColor = vec4(vec3(1.0, 0.8, 0.45), (glow + ring) * uIntensity);
        }
    `;

    const scorchVertexShader = `
        varying vec2 vUv;
        varying vec3 vWorld;
        varying vec2 vBoard;
        void main()
        {
            vUv = uv;
            vBoard = position.xz;
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorld = worldPosition.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
    `;

    const scorchFragmentShader = `
        ${sharedGlsl}
        uniform sampler2D uBurnMap;
        uniform sampler2D uHeatMap;
        uniform float uPresence;
        uniform float uSigilGlow;
        varying vec2 vUv;
        varying vec3 vWorld;
        varying vec2 vBoard;
        void main()
        {
            vec4 burn = texture2D(uBurnMap, vUv);
            float heat = texture2D(uHeatMap, vUv).a;
            float grain = snoise(vec3(vWorld.xz * 3.0, 1.0)) * 0.5 + 0.5;
            float charAmount = clamp(burn.r * 1.8, 0.0, 1.0) * (0.8 + 0.2 * grain);
            float sigil = clamp(burn.g * 1.4, 0.0, 1.0);
            float smolder = smoothstep(0.25, 0.6, charAmount) * fallOff(0.6, 0.95, charAmount) * (0.5 + 0.5 * sin(uTime * 3.0 + grain * 9.0));
            vec3 color = mix(vec3(0.05, 0.03, 0.02), vec3(0.55, 0.12, 0.02), smolder * 0.6);
            float alpha = charAmount * 0.95;
            float flicker = 0.7 + 0.3 * grain + 0.15 * sin(uTime * 8.0 + grain * 6.0);
            vec3 hotColor = lavaRamp(clamp(heat * flicker, 0.0, 1.0)) * 1.4;
            float hotMix = smoothstep(0.05, 0.6, heat);
            color = mix(color, hotColor, hotMix);
            alpha = max(alpha, smoothstep(0.02, 0.4, heat));
            float sigilPulse = uSigilGlow * (0.75 + 0.25 * sin(uTime * 2.5));
            float sigilEdge = smoothstep(0.15, 0.6, sigil);
            color = mix(color, vec3(1.0, 0.8, 0.34) * 1.6, sigilEdge * sigilPulse);
            alpha = max(alpha, sigilEdge * sigilPulse);
            gl_FragColor = vec4(applyFog(color, vWorld), alpha * uPresence);
        }
    `;

    // ---------- Particle shaders ----------
    const particleVertexShader = `
        attribute float aLife;
        attribute float aSize;
        uniform float uScale;
        varying float vLife;
        void main()
        {
            vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * viewPosition;
            gl_PointSize = aSize * uScale / max(-viewPosition.z, 0.1);
            vLife = aLife;
        }
    `;

    const particleFragmentShader = `
        uniform vec3 uColorStart;
        uniform vec3 uColorEnd;
        uniform float uAlpha;
        uniform float uFadeMode;
        varying float vLife;
        void main()
        {
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5)
            {
                discard;
            }
            float soft = 1.0 - smoothstep(0.0, 0.5, d);
            float life = clamp(vLife, 0.0, 1.0);
            float envelope = mix(sin(life * 3.14159), 1.0 - life, uFadeMode);
            vec3 color = mix(uColorStart, uColorEnd, smoothstep(0.0, 0.4, life));
            gl_FragColor = vec4(color, soft * envelope * uAlpha);
        }
    `;

    // =====================================================================
    // Small helpers
    // =====================================================================

    /**
     * Creates a seeded random generator so the board and vines look the same on every load.
     * @param {number} seed Starting seed.
     * @returns {Function} Function returning numbers in [0, 1).
     */
    function createSeededRandom(seed)
    {
        let state = seed >>> 0;
        return function getNextRandom()
        {
            state = (state + 0x6D2B79F5) >>> 0;
            let mixed = state;
            mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
            mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
            return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
        };
    }

    const seededRandom = createSeededRandom(1987);

    /**
     * Picks a seeded number between two bounds.
     * @param {number} minimum Lower bound.
     * @param {number} maximum Upper bound.
     * @returns {number} Value in range.
     */
    function getSeededBetween(minimum, maximum)
    {
        return minimum + seededRandom() * (maximum - minimum);
    }

    /**
     * Picks an unseeded number between two bounds, for particles.
     * @param {number} minimum Lower bound.
     * @param {number} maximum Upper bound.
     * @returns {number} Value in range.
     */
    function getRandomBetween(minimum, maximum)
    {
        return minimum + Math.random() * (maximum - minimum);
    }

    /**
     * Hermite smoothstep matching GLSL.
     * @param {number} low Lower edge.
     * @param {number} high Upper edge.
     * @param {number} x Input.
     * @returns {number} Smoothed 0..1 value.
     */
    function getSmoothstep(low, high, x)
    {
        const t = Math.min(1, Math.max(0, (x - low) / (high - low)));
        return t * t * (3 - 2 * t);
    }

    /**
     * Clamps a number to 0..1.
     * @param {number} value Input.
     * @returns {number} Clamped value.
     */
    function getClamped01(value)
    {
        return Math.min(1, Math.max(0, value));
    }
    // =====================================================================
    // Particles
    // =====================================================================

    /**
     * Creates a ring-buffer particle system drawn as soft points.
     * @param {object} options Capacity, colours, alpha, fade mode and blending.
     * @returns {object} Particle system state.
     */
    function createParticleSystem(options)
    {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(options.capacity * 3);
        const lifeValues = new Float32Array(options.capacity).fill(1);
        const sizeValues = new Float32Array(options.capacity);
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("aLife", new THREE.BufferAttribute(lifeValues, 1));
        geometry.setAttribute("aSize", new THREE.BufferAttribute(sizeValues, 1));
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uScale: { value: 400 },
                uColorStart: { value: new THREE.Color(options.colorStart) },
                uColorEnd: { value: new THREE.Color(options.colorEnd) },
                uAlpha: { value: options.alpha },
                uFadeMode: { value: options.fadeMode }
            },
            vertexShader: particleVertexShader,
            fragmentShader: particleFragmentShader,
            transparent: true,
            depthWrite: false,
            blending: options.blending
        });
        const points = new THREE.Points(geometry, material);
        points.frustumCulled = false;
        points.renderOrder = 5;
        return {
            points: points,
            positions: positions,
            lifeValues: lifeValues,
            sizeValues: sizeValues,
            velocities: new Float32Array(options.capacity * 3),
            ages: new Float32Array(options.capacity).fill(1),
            lifetimes: new Float32Array(options.capacity).fill(1),
            baseSizes: new Float32Array(options.capacity),
            physics: options.physics,
            capacity: options.capacity,
            cursor: 0,
            spawnDebt: 0
        };
    }

    /**
     * Writes one particle into the next ring-buffer slot.
     * @param {object} system Particle system.
     * @param {object} particle Position, velocity, lifetime and size.
     */
    function spawnParticle(system, particle)
    {
        const index = system.cursor;
        const offset = index * 3;
        system.positions[offset] = particle.x;
        system.positions[offset + 1] = particle.y;
        system.positions[offset + 2] = particle.z;
        system.velocities[offset] = particle.velocityX;
        system.velocities[offset + 1] = particle.velocityY;
        system.velocities[offset + 2] = particle.velocityZ;
        system.ages[index] = 0;
        system.lifetimes[index] = particle.lifetime;
        system.baseSizes[index] = particle.size;
        system.cursor = (index + 1) % system.capacity;
    }

    /**
     * Returns how many particles to emit this frame for a continuous rate.
     * @param {object} system Particle system.
     * @param {number} perSecond Emission rate.
     * @param {number} deltaSeconds Frame time.
     * @returns {number} Whole particles to emit.
     */
    function getSpawnCount(system, perSecond, deltaSeconds)
    {
        system.spawnDebt += Math.max(0, perSecond) * deltaSeconds;
        const count = Math.floor(system.spawnDebt);
        system.spawnDebt -= count;
        return count;
    }

    /**
     * Advances every particle by one frame.
     * @param {object} system Particle system.
     * @param {number} deltaSeconds Frame time.
     */
    function updateParticleSystem(system, deltaSeconds)
    {
        const physics = system.physics;
        const dragFactor = 1 - physics.drag * deltaSeconds;
        for (let i = 0; i < system.capacity; i++)
        {
            const ageFraction = system.ages[i] / system.lifetimes[i];
            if (ageFraction >= 1)
            {
                system.sizeValues[i] = 0;
                continue;
            }
            const offset = i * 3;
            system.velocities[offset + 1] += physics.gravity * deltaSeconds;
            system.velocities[offset] *= dragFactor;
            system.velocities[offset + 1] *= dragFactor;
            system.velocities[offset + 2] *= dragFactor;
            system.positions[offset] += system.velocities[offset] * deltaSeconds;
            system.positions[offset + 1] += system.velocities[offset + 1] * deltaSeconds;
            system.positions[offset + 2] += system.velocities[offset + 2] * deltaSeconds;
            if (physics.floorY !== undefined && system.positions[offset + 1] < physics.floorY)
            {
                system.ages[i] = system.lifetimes[i];
            }
            system.ages[i] += deltaSeconds;
            system.lifeValues[i] = ageFraction;
            system.sizeValues[i] = system.baseSizes[i] * (physics.startScale + ageFraction * physics.growth);
        }
        const geometry = system.points.geometry;
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.aLife.needsUpdate = true;
        geometry.attributes.aSize.needsUpdate = true;
    }

    // =====================================================================
    // Effect timeline shared by all four effects
    // =====================================================================

    /**
     * Creates the start/stop timeline every effect uses.
     * @param {number} leaveSeconds How long the effect takes to clear away.
     * @returns {object} Timeline state.
     */
    function createEffectTimeline(leaveSeconds)
    {
        return { state: "idle", time: 0, leaveTime: 0, leaveSeconds: leaveSeconds };
    }

    /**
     * Advances a timeline and returns how present the effect is (0..1).
     * @param {object} timeline Timeline state.
     * @param {number} deltaSeconds Frame time.
     * @returns {number} Presence, 1 while running and falling to 0 while leaving.
     */
    function advanceTimeline(timeline, deltaSeconds)
    {
        switch (timeline.state)
        {
            case "running":
                timeline.time += deltaSeconds;
                return 1;
            case "leaving":
                timeline.time += deltaSeconds;
                timeline.leaveTime += deltaSeconds;
                if (timeline.leaveTime >= timeline.leaveSeconds)
                {
                    timeline.state = "idle";
                    return 0;
                }
                return 1 - getSmoothstep(0, timeline.leaveSeconds, timeline.leaveTime);
            default:
                return 0;
        }
    }

    /**
     * Restarts a timeline from the beginning.
     * @param {object} timeline Timeline state.
     */
    function startTimeline(timeline)
    {
        timeline.state = "running";
        timeline.time = reducedMotion ? 22 : 0;
        timeline.leaveTime = 0;
    }

    /**
     * Sends a running timeline into its leaving phase.
     * @param {object} timeline Timeline state.
     */
    function stopTimeline(timeline)
    {
        if (timeline.state === "running")
        {
            timeline.state = "leaving";
            timeline.leaveTime = 0;
        }
    }

    // =====================================================================
    // Volcano
    // =====================================================================

    /**
     * Builds the volcano: a cone that rises from the centre, lava that spreads over the board,
     * flying lava bombs and a smoke plume.
     * @param {object} context Scene, shared uniforms and particle systems.
     * @returns {object} Effect controller.
     */
    function createVolcanoEffect(context)
    {
        const timeline = createEffectTimeline(volcanoLeaveSeconds);
        const group = new THREE.Group();
        group.visible = false;
        context.scene.add(group);

        const coneHeight = 3.05;
        const profile = [[2.5, -0.2], [2.4, 0], [2.1, 0.3], [1.6, 0.9], [1.15, 1.7], [0.8, 2.5], [0.62, 2.95], [0.5, coneHeight], [0.42, 2.85], [0.3, 2.62], [0.0, 2.55]]
            .map(function toVector(point)
            {
                return new THREE.Vector2(point[0], point[1]);
            });
        const coneUniforms = Object.assign({}, context.sharedUniforms, {
            uErupt: { value: 0 },
            uFlowReach: { value: 0 },
            uConeHeight: { value: coneHeight }
        });
        const cone = new THREE.Mesh(
            new THREE.LatheGeometry(profile, 72),
            new THREE.ShaderMaterial({
                uniforms: coneUniforms,
                vertexShader: volcanoConeVertexShader,
                fragmentShader: volcanoConeFragmentShader,
                side: THREE.DoubleSide,
                extensions: { derivatives: true }
            })
        );
        group.add(cone);

        const lavaUniforms = Object.assign({}, context.sharedUniforms, { uSpread: { value: 0 } });
        const lavaGeometry = new THREE.PlaneGeometry(boardCells, boardCells, 190, 190);
        lavaGeometry.rotateX(-Math.PI / 2);
        const lava = new THREE.Mesh(lavaGeometry, new THREE.ShaderMaterial({
            uniforms: lavaUniforms,
            vertexShader: lavaGroundVertexShader,
            fragmentShader: lavaGroundFragmentShader,
            extensions: { derivatives: true }
        }));
        lava.position.y = 0.03;
        lava.frustumCulled = false;
        group.add(lava);

        const glowLight = new THREE.PointLight(0xff5a1e, 0, 26, 1.4);
        glowLight.position.set(0, 2.2, 0);
        context.scene.add(glowLight);

        let shake = 0;
        let pose = null;

        /**
         * Emits lava bombs and smoke from the crater.
         * @param {number} deltaSeconds Frame time.
         * @param {number} eruption Eruption strength 0..1.
         * @param {number} craterY World height of the crater.
         */
        function emitEruption(deltaSeconds, eruption, craterY)
        {
            const bombCount = getSpawnCount(context.embers, 70 * eruption, deltaSeconds);
            for (let i = 0; i < bombCount; i++)
            {
                const angle = Math.random() * Math.PI * 2;
                const outward = getRandomBetween(0.8, 3.6);
                spawnParticle(context.embers, {
                    x: Math.cos(angle) * 0.3, y: craterY, z: Math.sin(angle) * 0.3,
                    velocityX: Math.cos(angle) * outward, velocityY: getRandomBetween(5.5, 10), velocityZ: Math.sin(angle) * outward,
                    lifetime: getRandomBetween(1.6, 2.6), size: getRandomBetween(0.22, 0.42)
                });
            }
            const smokeCount = getSpawnCount(context.smoke, 26 * eruption, deltaSeconds);
            for (let i = 0; i < smokeCount; i++)
            {
                spawnParticle(context.smoke, {
                    x: getRandomBetween(-0.3, 0.3), y: craterY + 0.2, z: getRandomBetween(-0.3, 0.3),
                    velocityX: getRandomBetween(-0.4, 0.9), velocityY: getRandomBetween(1.8, 3.2), velocityZ: getRandomBetween(-0.5, 0.5),
                    lifetime: getRandomBetween(5, 8), size: getRandomBetween(1.2, 2.2)
                });
            }
        }

        /**
         * Kicks up dust around the base while the cone is pushing through the board.
         * @param {number} deltaSeconds Frame time.
         * @param {number} amount Dust strength 0..1.
         */
        function emitRisingDust(deltaSeconds, amount)
        {
            const dustCount = getSpawnCount(context.dust, 60 * amount, deltaSeconds);
            for (let i = 0; i < dustCount; i++)
            {
                const angle = Math.random() * Math.PI * 2;
                const radius = getRandomBetween(1.8, 2.6);
                spawnParticle(context.dust, {
                    x: Math.cos(angle) * radius, y: 0.1, z: Math.sin(angle) * radius,
                    velocityX: Math.cos(angle) * 0.8, velocityY: getRandomBetween(0.6, 1.6), velocityZ: Math.sin(angle) * 0.8,
                    lifetime: getRandomBetween(1.5, 2.8), size: getRandomBetween(0.5, 1.0)
                });
            }
        }

        return {
            start: function startVolcano()
            {
                startTimeline(timeline);
                group.visible = true;
            },
            stop: function stopVolcano()
            {
                stopTimeline(timeline);
            },
            getShake: function getVolcanoShake()
            {
                return shake;
            },
            getPose: function getVolcanoPose()
            {
                return pose;
            },
            update: function updateVolcano(deltaSeconds)
            {
                const presence = advanceTimeline(timeline, deltaSeconds);
                if (timeline.state === "idle")
                {
                    group.visible = false;
                    glowLight.intensity = 0;
                    shake = 0;
                    pose = null;
                    return;
                }
                const time = timeline.time;
                const growth = getSmoothstep(0, volcanoGrowSeconds, time) * presence;
                const eruption = getSmoothstep(volcanoGrowSeconds - 0.4, volcanoEruptSeconds + 0.4, time) * presence;
                cone.position.y = -3.4 * (1 - growth);
                const sideScale = 0.45 + 0.55 * growth;
                cone.scale.set(sideScale, 0.35 + 0.65 * growth, sideScale);
                coneUniforms.uErupt.value = eruption;
                coneUniforms.uFlowReach.value = getSmoothstep(volcanoEruptSeconds, volcanoEruptSeconds + 4, time);
                lavaUniforms.uSpread.value = (1.4 + 10 * getSmoothstep(volcanoEruptSeconds, volcanoEruptSeconds + 11, time)) * presence;
                glowLight.intensity = eruption * (2.4 + 0.5 * Math.sin(time * 9) * Math.sin(time * 3.7));
                const growingNow = timeline.state === "running" && time < volcanoGrowSeconds;
                shake = growingNow ? 0.6 : eruption * 0.12;
                const craterY = cone.position.y + coneHeight * cone.scale.y;
                const foot = 2.35 * sideScale;
                const lip = 0.58 * sideScale;
                const y0 = cone.position.y;
                const y1 = cone.position.y + 2.75 * cone.scale.y;
                pose = {
                    y: context.scene.position.y + (y0 + y1) * 0.5,
                    radiusBottom: foot,
                    radiusTop: lip,
                    height: Math.max(0.05, y1 - y0),
                    cover: growth
                };
                if (timeline.state === "running")
                {
                    emitEruption(deltaSeconds, eruption, craterY);
                    emitRisingDust(deltaSeconds, growingNow ? 1 : 0);
                }
            }
        };
    }

    // =====================================================================
    // Tsunami
    // =====================================================================

    /**
     * Builds the tsunami: a wave that sweeps across the board, crashes into the castles
     * and leaves the board flooded with the pawns bobbing.
     * @param {object} context Scene, shared uniforms and particle systems.
     * @returns {object} Effect controller.
     */
    function createTsunamiEffect(context)
    {
        const timeline = createEffectTimeline(tsunamiLeaveSeconds);
        const waveState = { front: -12, level: 0, crest: 0, chop: 0 };
        const castleCenters = playerOrder.map(function getCastleCenter(player)
        {
            return new THREE.Vector3(castleSetups[player].centerX, 0, castleSetups[player].centerZ);
        });
        const waterUniforms = Object.assign({}, context.sharedUniforms, {
            uFront: { value: -12 },
            uLevel: { value: 0 },
            uCrest: { value: 0 },
            uChop: { value: 0 },
            uCastleCenters: { value: castleCenters }
        });
        const water = new THREE.Mesh(
            new THREE.BoxGeometry(boardCells, 1, boardCells, 160, 1, 160),
            new THREE.ShaderMaterial({
                uniforms: waterUniforms,
                vertexShader: waterVertexShader,
                fragmentShader: waterFragmentShader,
                transparent: true,
                extensions: { derivatives: true }
            })
        );
        water.frustumCulled = false;
        water.visible = false;
        water.renderOrder = 2;
        context.scene.add(water);
        let shake = 0;

        /**
         * Mirrors the shader’s wave-front position in JavaScript.
         * @param {number} z World z.
         * @returns {number} Front x at that z.
         */
        function getWaveFrontX(z)
        {
            const time = context.sharedUniforms.uTime.value;
            return waveState.front + 0.6 * Math.sin(z * 0.45 + time * 0.8) + 0.3 * Math.sin(z * 1.1 - time * 1.3);
        }

        /**
         * Mirrors the shader’s water height (without small chop) so pawns can float.
         * @param {number} x World x.
         * @param {number} z World z.
         * @returns {number} Water height above the board.
         */
        function getWaterHeight(x, z)
        {
            if (water.visible === false || Math.abs(x) > halfBoard || Math.abs(z) > halfBoard)
            {
                return 0;
            }
            const s = x - getWaveFrontX(z);
            const body = waveState.level * (1 - getSmoothstep(-1.2, 0.6, s));
            const crest = waveState.crest * Math.exp(-Math.pow(s + 0.4, 2) * 1.1);
            return body + crest;
        }

        /**
         * Throws spray off the breaking crest and off castle walls the wave hits.
         * @param {number} deltaSeconds Frame time.
         */
        function emitSpray(deltaSeconds)
        {
            const crestStrength = getClamped01(waveState.crest);
            const crestCount = getSpawnCount(context.spray, 320 * crestStrength, deltaSeconds);
            for (let i = 0; i < crestCount; i++)
            {
                const z = getRandomBetween(-halfBoard, halfBoard);
                const x = getWaveFrontX(z);
                if (x < -halfBoard || x > halfBoard)
                {
                    continue;
                }
                spawnParticle(context.spray, {
                    x: x - 0.3, y: waveState.level + waveState.crest * 0.9, z: z,
                    velocityX: getRandomBetween(1.5, 4.5), velocityY: getRandomBetween(1.5, 4.5), velocityZ: getRandomBetween(-0.8, 0.8),
                    lifetime: getRandomBetween(0.7, 1.5), size: getRandomBetween(0.25, 0.6)
                });
            }
            castleCenters.forEach(function splashCastle(center)
            {
                const wallX = center.x - 2.5;
                if (Math.abs(waveState.front - wallX) > 1.2)
                {
                    return;
                }
                const splashCount = getSpawnCount(context.spray, 160 * crestStrength, deltaSeconds);
                for (let i = 0; i < splashCount; i++)
                {
                    spawnParticle(context.spray, {
                        x: wallX - 0.2, y: 0.8, z: center.z + getRandomBetween(-2.5, 2.5),
                        velocityX: getRandomBetween(-1.5, 1.0), velocityY: getRandomBetween(4, 8), velocityZ: getRandomBetween(-1.2, 1.2),
                        lifetime: getRandomBetween(0.8, 1.6), size: getRandomBetween(0.3, 0.7)
                    });
                }
            });
        }

        return {
            start: function startTsunami()
            {
                startTimeline(timeline);
                water.visible = true;
            },
            stop: function stopTsunami()
            {
                stopTimeline(timeline);
            },
            getShake: function getTsunamiShake()
            {
                return shake;
            },
            getWaterHeight: getWaterHeight,
            update: function updateTsunami(deltaSeconds)
            {
                const presence = advanceTimeline(timeline, deltaSeconds);
                if (timeline.state === "idle")
                {
                    water.visible = false;
                    shake = 0;
                    return;
                }
                const travel = getSmoothstep(0, tsunamiTravelSeconds, timeline.time);
                waveState.front = -12 + 24 * travel;
                const onBoard = getSmoothstep(-12, -8, waveState.front) * (1 - getSmoothstep(5.5, 10.5, waveState.front));
                waveState.crest = 1.9 * onBoard * presence;
                waveState.level = 0.52 * presence;
                waveState.chop = presence;
                waterUniforms.uFront.value = waveState.front;
                waterUniforms.uLevel.value = waveState.level;
                waterUniforms.uCrest.value = waveState.crest;
                waterUniforms.uChop.value = waveState.chop;
                shake = onBoard * presence * 0.35;
                if (timeline.state === "running")
                {
                    emitSpray(deltaSeconds);
                }
            }
        };
    }

    // =====================================================================
    // Thorns
    // =====================================================================

    /**
     * Builds the points of a vine that crawls in from the side and spirals up around a post.
     * @param {object} target Centre x/z, radius, top height and turn count of the spiral.
     * @returns {THREE.Vector3[]} Curve control points.
     */
    function listSpiralPoints(target)
    {
        const startAngle = getSeededBetween(0, Math.PI * 2);
        const leadDistance = target.leadDistance;
        const points = [
            new THREE.Vector3(target.x + Math.cos(startAngle) * leadDistance, 0.05, target.z + Math.sin(startAngle) * leadDistance),
            new THREE.Vector3(target.x + Math.cos(startAngle + 0.4) * target.radius * 1.7, 0.06, target.z + Math.sin(startAngle + 0.4) * target.radius * 1.7)
        ];
        const stepsPerTurn = 12;
        const totalSteps = Math.round(target.turns * stepsPerTurn);
        for (let step = 0; step <= totalSteps; step++)
        {
            const fraction = step / totalSteps;
            const angle = startAngle + 0.8 + fraction * target.turns * Math.PI * 2;
            const wobble = 1 + 0.08 * Math.sin(step * 1.7);
            points.push(new THREE.Vector3(
                target.x + Math.cos(angle) * target.radius * wobble,
                0.08 + fraction * target.topY,
                target.z + Math.sin(angle) * target.radius * wobble
            ));
        }
        return points;
    }

    /**
     * Builds the points of a vine creeping along one arm of the track toward the centre.
     * @param {number} armAngle Direction of the arm from the centre, in radians.
     * @param {number} lane Sideways offset inside the arm.
     * @returns {THREE.Vector3[]} Curve control points.
     */
    function listCreepingPoints(armAngle, lane)
    {
        const along = new THREE.Vector2(Math.cos(armAngle), Math.sin(armAngle));
        const across = new THREE.Vector2(-along.y, along.x);
        const points = [];
        const startDistance = halfBoard - 0.2;
        const endDistance = getSeededBetween(1.8, 3.6);
        const pointCount = 9;
        const phase = getSeededBetween(0, Math.PI * 2);
        for (let i = 0; i < pointCount; i++)
        {
            const fraction = i / (pointCount - 1);
            const distance = startDistance + (endDistance - startDistance) * fraction;
            const sideways = lane + 0.45 * Math.sin(fraction * 7 + phase);
            const lift = 0.06 + 0.12 * Math.max(0, Math.sin(fraction * 9 + phase));
            points.push(new THREE.Vector3(along.x * distance + across.x * sideways, lift, along.y * distance + across.y * sideways));
        }
        return points;
    }

    /**
     * Builds every thorny vine: creeping ones along the track and spirals around towers and pawns.
     * @param {object} context Scene, shared uniforms and board objects.
     * @returns {object} Effect controller.
     */
    function createThornsEffect(context)
    {
        const timeline = createEffectTimeline(thornsLeaveSeconds);
        const group = new THREE.Group();
        group.visible = false;
        context.scene.add(group);
        const vines = [];
        const vineDefinitions = [];

        [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach(function addArmVines(armAngle)
        {
            [-0.9, 0, 0.9].forEach(function addLaneVine(lane)
            {
                vineDefinitions.push({ points: listCreepingPoints(armAngle, lane), radius: 0.1, delay: getSeededBetween(0, 0.8), duration: getSeededBetween(2.8, 3.8), hasBud: false });
            });
        });
        [{ radius: 0.95, topY: 1.55, turns: 2.4, leadDistance: 0.55, delay: 0.35 }, { radius: 1.4, topY: 0.9, turns: 1.7, leadDistance: 0.95, delay: 0.8 }, { radius: 1.75, topY: 0.42, turns: 1.15, leadDistance: 1.25, delay: 1.15 }].forEach(function addChestVine(spec)
        {
            vineDefinitions.push({ points: listSpiralPoints({ x: 0, z: 0, radius: spec.radius, topY: spec.topY, turns: spec.turns, leadDistance: spec.leadDistance }), radius: 0.072, delay: spec.delay, duration: 3.4, hasBud: true });
        });
        context.towers.forEach(function addTowerVine(tower)
        {
            const outwardX = Math.sign(tower.x - tower.castleX);
            const outwardZ = Math.sign(tower.z - tower.castleZ);
            const points = listSpiralPoints({ x: tower.x, z: tower.z, radius: 0.68, topY: 2.15, turns: 3.4, leadDistance: 1.2 });
            points[0].set(tower.x + outwardX * 0.75, 0.05, tower.z + outwardZ * 0.75);
            vineDefinitions.push({ points: points, radius: 0.085, delay: getSeededBetween(0.6, 1.8), duration: getSeededBetween(3.2, 4.4), hasBud: true });
        });
        context.pieces.forEach(function addPieceVine(piece)
        {
            const points = listSpiralPoints({ x: piece.x, z: piece.z, radius: 0.36, topY: 0.78, turns: 2.6, leadDistance: 0.85 });
            vineDefinitions.push({ points: points, radius: 0.065, delay: getSeededBetween(1.2, 2.4), duration: getSeededBetween(2.4, 3.4), hasBud: true });
        });

        const budGeometry = new THREE.IcosahedronGeometry(0.1, 1);
        const budMaterial = new THREE.MeshStandardMaterial({ color: 0x8a1022, roughness: 0.5 });
        const thornRecords = [];

        vineDefinitions.forEach(function buildVine(definition, vineIndex)
        {
            const curve = new THREE.CatmullRomCurve3(definition.points);
            const curveLength = curve.getLength();
            const segments = Math.min(260, Math.max(40, Math.round(curveLength * 14)));
            const uniforms = Object.assign({}, context.sharedUniforms, {
                uGrowth: { value: 0 },
                uRadius: { value: definition.radius }
            });
            const mesh = new THREE.Mesh(
                new THREE.TubeGeometry(curve, segments, definition.radius, 7, false),
                new THREE.ShaderMaterial({ uniforms: uniforms, vertexShader: vineVertexShader, fragmentShader: vineFragmentShader })
            );
            mesh.frustumCulled = false;
            group.add(mesh);
            let bud = null;
            if (definition.hasBud)
            {
                bud = new THREE.Mesh(budGeometry, budMaterial);
                bud.position.copy(curve.getPointAt(1));
                bud.scale.setScalar(0);
                group.add(bud);
            }
            vines.push({ uniforms: uniforms, delay: definition.delay, duration: definition.duration, bud: bud, growth: 0 });

            const thornCount = Math.floor(curveLength / 0.17);
            for (let i = 1; i < thornCount; i++)
            {
                const along = i / thornCount;
                const point = curve.getPointAt(along);
                const tangent = curve.getTangentAt(along);
                const randomDirection = new THREE.Vector3(getSeededBetween(-1, 1), getSeededBetween(-1, 1), getSeededBetween(-1, 1));
                const outward = new THREE.Vector3().crossVectors(tangent, randomDirection).normalize();
                const radiusAtPoint = definition.radius * (1 - 0.45 * along);
                thornRecords.push({
                    vineIndex: vineIndex,
                    along: along,
                    position: point.add(outward.clone().multiplyScalar(radiusAtPoint * 0.8)),
                    rotation: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), outward),
                    size: getSeededBetween(0.7, 1.25) * (definition.radius / 0.065)
                });
            }
        });

        const thornGeometry = new THREE.ConeGeometry(1, 1, 5);
        thornGeometry.translate(0, 0.5, 0);
        const thorns = new THREE.InstancedMesh(thornGeometry, new THREE.MeshStandardMaterial({ color: 0x4a3a24, roughness: 0.55 }), thornRecords.length);
        thorns.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        thorns.frustumCulled = false;
        group.add(thorns);
        const thornMatrix = new THREE.Matrix4();
        const thornScale = new THREE.Vector3();

        /**
         * Sizes each thorn by whether its vine has grown past it yet.
         */
        function updateThornInstances()
        {
            thornRecords.forEach(function sizeThorn(record, index)
            {
                const growth = vines[record.vineIndex].growth;
                const visible = getClamped01((growth - record.along) / 0.06) * record.size;
                thornScale.set(0.05 * visible, 0.2 * visible, 0.05 * visible);
                thornMatrix.compose(record.position, record.rotation, thornScale);
                thorns.setMatrixAt(index, thornMatrix);
            });
            thorns.instanceMatrix.needsUpdate = true;
        }

        return {
            start: function startThorns()
            {
                startTimeline(timeline);
                group.visible = true;
            },
            stop: function stopThorns()
            {
                stopTimeline(timeline);
            },
            getShake: function getThornsShake()
            {
                return 0;
            },
            update: function updateThorns(deltaSeconds)
            {
                const presence = advanceTimeline(timeline, deltaSeconds);
                if (timeline.state === "idle")
                {
                    group.visible = false;
                    return;
                }
                vines.forEach(function growVine(vine)
                {
                    const progress = getClamped01((timeline.time - vine.delay) / vine.duration);
                    const eased = 1 - Math.pow(1 - progress, 2.2);
                    vine.growth = eased * presence;
                    vine.uniforms.uGrowth.value = vine.growth;
                    if (vine.bud !== null)
                    {
                        vine.bud.scale.setScalar(getSmoothstep(0.96, 1.0, vine.growth));
                    }
                });
                updateThornInstances();
            }
        };
    }

    // =====================================================================
    // Fog
    // =====================================================================

    /**
     * Builds rolling fog: stacked noisy layers that slide in from one side plus drifting puffs.
     * @param {object} context Scene, shared uniforms and particle systems.
     * @returns {object} Effect controller.
     */
    function createFogEffect(context)
    {
        const timeline = createEffectTimeline(fogLeaveSeconds);
        const group = new THREE.Group();
        group.name = "fog";
        group.visible = false;
        context.scene.add(group);
        const layerUniformSets = [];
        for (let i = 0; i < fogLayerCount; i++)
        {
            const fraction = i / (fogLayerCount - 1);
            const height = 0.06 + Math.pow(fraction, 1.6) * 2.8;
            const uniforms = Object.assign({}, context.sharedUniforms, {
                uFront: { value: -30 },
                uAmount: { value: 0 },
                uLayerHeight: { value: height },
                uSeed: { value: i * 3.17 }
            });
            const geometry = new THREE.PlaneGeometry(42, 42);
            geometry.rotateX(-Math.PI / 2);
            const layer = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: fogLayerVertexShader,
                fragmentShader: fogLayerFragmentShader,
                transparent: true,
                depthWrite: false,
                side: THREE.FrontSide
            }));
            layer.position.y = height;
            layer.renderOrder = 3;
            group.add(layer);
            layerUniformSets.push(uniforms);
        }
        let front = -30;

        /**
         * Releases drifting fog puffs behind the rolling front.
         * @param {number} deltaSeconds Frame time.
         */
        function emitFogPuffs(deltaSeconds)
        {
            const puffCount = getSpawnCount(context.fogPuffs, 8, deltaSeconds);
            for (let i = 0; i < puffCount; i++)
            {
                const x = getRandomBetween(-16, Math.min(front, 14));
                spawnParticle(context.fogPuffs, {
                    x: x, y: getRandomBetween(0.4, 2.6), z: getRandomBetween(-13, 13),
                    velocityX: getRandomBetween(0.4, 1.0), velocityY: getRandomBetween(-0.02, 0.08), velocityZ: getRandomBetween(-0.15, 0.15),
                    lifetime: getRandomBetween(6, 10), size: getRandomBetween(3.5, 7)
                });
            }
        }

        return {
            start: function startFog()
            {
                startTimeline(timeline);
                group.visible = true;
            },
            stop: function stopFog()
            {
                stopTimeline(timeline);
            },
            getShake: function getFogShake()
            {
                return 0;
            },
            getPresence: function getFogPresence()
            {
                return group.visible ? layerUniformSets[0].uAmount.value : 0;
            },
            update: function updateFog(deltaSeconds)
            {
                const presence = advanceTimeline(timeline, deltaSeconds);
                if (timeline.state === "idle")
                {
                    group.visible = false;
                    return;
                }
                front = -26 + 56 * getSmoothstep(0, fogRollSeconds, timeline.time);
                layerUniformSets.forEach(function syncLayer(uniforms)
                {
                    uniforms.uFront.value = front;
                    uniforms.uAmount.value = presence;
                });
                if (timeline.state === "running" && front > -16)
                {
                    emitFogPuffs(deltaSeconds);
                }
            }
        };
    }

    // =====================================================================
    // Sun lances (Solmere)
    // =====================================================================

    /**
     * Linearly blends two board points.
     * @param {{x: number, z: number}} from Start point.
     * @param {{x: number, z: number}} to End point.
     * @param {number} amount Blend 0..1.
     * @returns {{x: number, z: number}} Blended point.
     */
    function getBlendedPoint(from, to, amount)
    {
        return { x: from.x + (to.x - from.x) * amount, z: from.z + (to.z - from.z) * amount };
    }

    /**
     * Where a lance wanders while it sweeps freely across the board.
     * @param {number} lanceIndex Which lance.
     * @param {number} time Effect time.
     * @returns {{x: number, z: number}} Board point.
     */
    function getWanderPoint(lanceIndex, time)
    {
        const phase = 1.3 + lanceIndex * 2.1;
        const x = 6.0 * Math.sin(0.31 * (1 + 0.2 * lanceIndex) * time + phase) + 0.8 * Math.sin(1.3 * time + phase * 2);
        const z = 6.0 * Math.sin(0.23 * (1 + 0.15 * lanceIndex) * time + phase * 1.7) + 0.8 * Math.cos(1.1 * time + phase * 3);
        return { x: Math.max(-6.9, Math.min(6.9, x)), z: Math.max(-6.9, Math.min(6.9, z)) };
    }

    /**
     * Where a lance is while tracing the Solmere sun sigil. Lance 0 traces the ring,
     * lances 1 and 2 trace four rays each and dim while moving between rays.
     * @param {number} lanceIndex Which lance.
     * @param {number} sigilTime Seconds since tracing began.
     * @returns {{x: number, z: number, intensity: number, drawsSigil: boolean}} Lance state.
     */
    function getSigilPoint(lanceIndex, sigilTime)
    {
        if (lanceIndex === 0)
        {
            const fraction = Math.min(sigilTime / sunLanceTimes.circleSeconds, 1);
            const angle = fraction * Math.PI * 2;
            return { x: Math.cos(angle) * sigilCircleRadius, z: Math.sin(angle) * sigilCircleRadius, intensity: 1, drawsSigil: fraction < 1 };
        }
        const baseAngle = lanceIndex === 1 ? 0 : Math.PI / 4;
        const rayIndex = Math.min(Math.floor(sigilTime / sunLanceTimes.raySeconds), 3);
        const within = sigilTime - rayIndex * sunLanceTimes.raySeconds;
        const angle = baseAngle + rayIndex * Math.PI / 2;
        const rayEnd = { x: Math.cos(angle) * sigilRayOuter, z: Math.sin(angle) * sigilRayOuter };
        if (within < sunLanceTimes.rayDrawSeconds)
        {
            const radius = sigilRayInner + (sigilRayOuter - sigilRayInner) * (within / sunLanceTimes.rayDrawSeconds);
            return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius, intensity: 1, drawsSigil: true };
        }
        if (rayIndex === 3)
        {
            return { x: rayEnd.x, z: rayEnd.z, intensity: 1, drawsSigil: false };
        }
        const transit = (within - sunLanceTimes.rayDrawSeconds) / (sunLanceTimes.raySeconds - sunLanceTimes.rayDrawSeconds);
        const nextAngle = angle + Math.PI / 2;
        const nextStart = { x: Math.cos(nextAngle) * sigilRayInner, z: Math.sin(nextAngle) * sigilRayInner };
        const point = getBlendedPoint(rayEnd, nextStart, getSmoothstep(0, 1, transit));
        return { x: point.x, z: point.z, intensity: 0.15, drawsSigil: false };
    }

        /**
         * Keeps a lance on the road. A point that falls inside a castle yard is pushed
         * out to the side of that yard that faces the board.
         * Works out where a lance points and how strong it is at a given moment of the sequence:
     * ignite, sweep, gather, trace the sigil, strike the seal, then sweep again.
     * @param {number} lanceIndex Which lance.
     * @param {number} time Effect time.
     * @returns {{x: number, z: number, intensity: number, drawsSigil: boolean}} Lance state.
     */
    function getLanceState(lanceIndex, time)
    {
        const times = sunLanceTimes;
        const igniteAt = times.firstIgnite + lanceIndex * times.igniteGap;
        const ignition = getSmoothstep(igniteAt, igniteAt + 0.35, time);
        const ignitionFlash = Math.exp(-Math.pow(time - igniteAt - 0.35, 2) * 18) * 0.9;
        const center = { x: 0, z: 0 };
        let point;
        let intensity = 1;
        let drawsSigil = false;
        if (time < times.wanderEnd)
        {
            point = getWanderPoint(lanceIndex, time);
        }
        else if (time < times.sigilStart)
        {
            const gather = getSmoothstep(times.wanderEnd, times.sigilStart, time);
            point = getBlendedPoint(getWanderPoint(lanceIndex, times.wanderEnd), getSigilPoint(lanceIndex, 0), gather);
            intensity = 0.15;
        }
        else if (time < times.sealStart)
        {
            const sigilState = getSigilPoint(lanceIndex, time - times.sigilStart);
            point = sigilState;
            intensity = sigilState.intensity;
            drawsSigil = sigilState.drawsSigil;
        }
        else if (time < times.sealEnd)
        {
            const sigilEnd = getSigilPoint(lanceIndex, times.sealStart - times.sigilStart);
            point = getBlendedPoint(sigilEnd, center, getSmoothstep(times.sealStart, times.sealStrike, time));
            intensity = 1 + 0.8 * Math.exp(-Math.pow(time - times.sealStrike, 2) * 12);
        }
        else
        {
            point = getBlendedPoint(center, getWanderPoint(lanceIndex, time), getSmoothstep(times.sealEnd, times.resumeEnd, time));
            intensity = 0.85;
        }
            const parked = { x: point.x, z: point.z, clamped: false };
            return { x: parked.x, z: parked.z, clamped: parked.clamped, intensity: (intensity + ignitionFlash) * ignition, drawsSigil: drawsSigil };
    }

    /**
     * Creates the two canvases that record scorch marks: one for lasting char and the
     * sigil, one for fresh heat that cools over time.
     * @returns {object} Canvases, contexts and textures.
     */
    function createBurnMaps()
    {
        const burnCanvas = document.createElement("canvas");
        burnCanvas.width = burnMapPixels;
        burnCanvas.height = burnMapPixels;
        const heatCanvas = document.createElement("canvas");
        heatCanvas.width = burnMapPixels;
        heatCanvas.height = burnMapPixels;
        return {
            burnContext: burnCanvas.getContext("2d"),
            heatContext: heatCanvas.getContext("2d"),
            burnTexture: new THREE.CanvasTexture(burnCanvas),
            heatTexture: new THREE.CanvasTexture(heatCanvas),
            pendingCoolSeconds: 0
        };
    }

    /**
     * Wipes both scorch canvases back to an unburnt board.
     * @param {object} maps Burn maps.
     */
    function clearBurnMaps(maps)
    {
        maps.burnContext.globalCompositeOperation = "source-over";
        maps.burnContext.fillStyle = "#000000";
        maps.burnContext.fillRect(0, 0, burnMapPixels, burnMapPixels);
        maps.heatContext.clearRect(0, 0, burnMapPixels, burnMapPixels);
        maps.burnTexture.needsUpdate = true;
        maps.heatTexture.needsUpdate = true;
    }

    /**
     * Stamps one soft scorch mark at a board point.
     * @param {object} maps Burn maps.
     * @param {number} x World x.
     * @param {number} z World z.
     * @param {boolean} drawsSigil Whether this stamp is part of the sigil.
     */
    function stampScorch(maps, x, z, drawsSigil)
    {
        if (Math.abs(x) > halfBoard || Math.abs(z) > halfBoard)
        {
            return;
        }
        const canvasX = (x + halfBoard) / boardCells * burnMapPixels;
        const canvasY = (z + halfBoard) / boardCells * burnMapPixels;
        const burnContext = maps.burnContext;
        if (drawsSigil)
        {
            const burnRadius = 10;
            burnContext.globalCompositeOperation = "lighter";
            const charGradient = burnContext.createRadialGradient(canvasX, canvasY, 0, canvasX, canvasY, burnRadius);
            charGradient.addColorStop(0, "rgba(255, 255, 0, 0.32)");
            charGradient.addColorStop(1, "rgba(255, 255, 0, 0)");
            burnContext.fillStyle = charGradient;
            burnContext.fillRect(canvasX - burnRadius, canvasY - burnRadius, burnRadius * 2, burnRadius * 2);
        }

        const heatContext = maps.heatContext;
        heatContext.globalCompositeOperation = "source-over";
        const heatRadius = 16;
        const heatGradient = heatContext.createRadialGradient(canvasX, canvasY, 0, canvasX, canvasY, heatRadius);
        heatGradient.addColorStop(0, "rgba(255, 255, 255, 0.75)");
        heatGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
        heatContext.fillStyle = heatGradient;
        heatContext.fillRect(canvasX - heatRadius, canvasY - heatRadius, heatRadius * 2, heatRadius * 2);
    }

    /**
     * Lets fresh heat on the board cool down. Cooling is applied in steps of at least
     * heatCoolStepSeconds because tiny per-frame fades round to zero on an 8-bit canvas
     * and would leave trails glowing forever.
     * @param {object} maps Burn maps.
     * @param {number} deltaSeconds Frame time.
     */
    function coolHeatMap(maps, deltaSeconds)
    {
        maps.pendingCoolSeconds += deltaSeconds;
        if (maps.pendingCoolSeconds < heatCoolStepSeconds)
        {
            return;
        }
        const heatContext = maps.heatContext;
        heatContext.globalCompositeOperation = "destination-out";
        heatContext.fillStyle = "rgba(0, 0, 0, " + (1 - Math.exp(-maps.pendingCoolSeconds * heatCoolRate)).toFixed(4) + ")";
        heatContext.fillRect(0, 0, burnMapPixels, burnMapPixels);
        heatContext.globalCompositeOperation = "source-over";
        maps.pendingCoolSeconds = 0;
    }

    /**
     * Builds one lance: a wide outer cone of light, a bright inner core, a glowing
     * impact spot and a light that warms whatever it touches.
     * @param {object} context Scene and shared uniforms.
     * @param {THREE.Group} group Effect group.
     * @param {number} lanceIndex Which lance.
     * @returns {object} Lance record.
     */
    function createLance(context, group, lanceIndex)
    {
        const outerGeometry = new THREE.CylinderGeometry(1.2, 0.46, 1, 32, 24, true);
        outerGeometry.translate(0, 0.5, 0);
        const coreGeometry = new THREE.CylinderGeometry(0.36, 0.14, 1, 20, 24, true);
        coreGeometry.translate(0, 0.5, 0);
        const beamSettings = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide };
        const outerUniforms = Object.assign({}, context.sharedUniforms, { uIntensity: { value: 0 }, uBeamColor: { value: new THREE.Color(1.0, 0.72, 0.32) } });
        const coreUniforms = Object.assign({}, context.sharedUniforms, { uIntensity: { value: 0 }, uBeamColor: { value: new THREE.Color(1.0, 0.96, 0.84) } });
        const outer = new THREE.Mesh(outerGeometry, new THREE.ShaderMaterial(Object.assign({ uniforms: outerUniforms, vertexShader: lanceBeamVertexShader, fragmentShader: lanceBeamFragmentShader }, beamSettings)));
        const core = new THREE.Mesh(coreGeometry, new THREE.ShaderMaterial(Object.assign({ uniforms: coreUniforms, vertexShader: lanceBeamVertexShader, fragmentShader: lanceBeamFragmentShader }, beamSettings)));
        outer.renderOrder = 20;
        core.renderOrder = 21;
        outer.frustumCulled = false;
        core.frustumCulled = false;
        group.add(outer);
        group.add(core);

        const impactGeometry = new THREE.PlaneGeometry(1, 1);
        impactGeometry.rotateX(-Math.PI / 2);
        const impactUniforms = { uTime: context.sharedUniforms.uTime, uIntensity: { value: 0 } };
        const impact = new THREE.Mesh(impactGeometry, new THREE.ShaderMaterial({
            uniforms: impactUniforms,
            vertexShader: lanceImpactVertexShader,
            fragmentShader: lanceImpactFragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        }));
        impact.renderOrder = 19;
        group.add(impact);

        const light = new THREE.PointLight(0xffc070, 0, 9, 1.6);
        context.scene.add(light);
        const sourceOffset = sunLanceSourceOffsets[lanceIndex];
        return {
            outer: outer,
            core: core,
            impact: impact,
            light: light,
            outerUniforms: outerUniforms,
            coreUniforms: coreUniforms,
            impactUniforms: impactUniforms,
            source: new THREE.Vector3(sourceOffset[0], sourceOffset[1], sourceOffset[2]),
            current: { x: 0, z: 0, intensity: 0 },
            lastPaint: null
        };
    }

    /**
     * Points a lance at a board spot and sets its brightness.
     * @param {object} lance Lance record.
     * @param {object} state Lance state.
     * @param {number} time Effect time.
     * @param {number} lanceIndex Which lance, for flicker phase.
     */
    function aimLance(lance, state, time, lanceIndex)
    {
        const target = new THREE.Vector3(state.x, 0, state.z);
        const towardSource = lance.source.clone().sub(target);
        const distance = towardSource.length();
        const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), towardSource.normalize());
        const width = (0.45 + 0.55 * Math.min(state.intensity, 1)) * (0.93 + 0.07 * Math.sin(time * 13 + lanceIndex * 2));
        const isVisible = state.intensity > 0.01;
        [lance.outer, lance.core].forEach(function placeBeamMesh(mesh)
        {
            mesh.visible = isVisible;
            mesh.position.copy(target);
            mesh.quaternion.copy(rotation);
            mesh.scale.set(width, distance, width);
        });
        lance.outerUniforms.uIntensity.value = state.intensity * 0.55;
        lance.coreUniforms.uIntensity.value = state.intensity;
        lance.impact.visible = isVisible;
        lance.impact.position.set(state.x, 0.05, state.z);
        lance.impact.scale.setScalar(1.6 + 0.7 * Math.min(state.intensity, 1.6));
        lance.impactUniforms.uIntensity.value = Math.min(state.intensity, 1.6);
        lance.light.position.set(state.x, 0.8, state.z);
        lance.light.intensity = state.intensity * 3.2;
        lance.current.x = state.x;
        lance.current.z = state.z;
        lance.current.intensity = state.intensity;
    }

    /**
     * Burns a continuous trail from where the lance last painted to where it is now.
     * @param {object} maps Burn maps.
     * @param {object} lance Lance record.
     * @param {object} state Lance state.
     */
    function paintLanceTrail(maps, lance, state)
    {
        const from = lance.lastPaint ?? { x: state.x, z: state.z };
        const distance = Math.hypot(state.x - from.x, state.z - from.z);
        if (distance > 1.2)
        {
            stampScorch(maps, state.x, state.z, state.drawsSigil);
            lance.lastPaint = { x: state.x, z: state.z };
            return;
        }
        const steps = Math.max(1, Math.ceil(distance / 0.08));
        for (let step = 1; step <= steps; step++)
        {
            const point = getBlendedPoint(from, state, step / steps);
            stampScorch(maps, point.x, point.z, state.drawsSigil);
            if (state.drawsSigil)
            {
                stampScorch(maps, point.x, point.z, false);
            }
        }
        lance.lastPaint = { x: state.x, z: state.z };
    }

    /**
     * Throws sparks and smoke off the burn point and lets motes of light drift in the beam.
     * @param {object} context Particle systems.
     * @param {object} lance Lance record.
     * @param {number} deltaSeconds Frame time.
     */
    function emitLanceParticles(context, lance, deltaSeconds)
    {
        const strength = lance.current.intensity;
        const sparkCount = getSpawnCount(context.embers, 45 * strength, deltaSeconds);
        for (let i = 0; i < sparkCount; i++)
        {
            const angle = Math.random() * Math.PI * 2;
            const outward = getRandomBetween(0.8, 2.6);
            spawnParticle(context.embers, {
                x: lance.current.x, y: 0.12, z: lance.current.z,
                velocityX: Math.cos(angle) * outward, velocityY: getRandomBetween(2, 5), velocityZ: Math.sin(angle) * outward,
                lifetime: getRandomBetween(0.6, 1.2), size: getRandomBetween(0.12, 0.24)
            });
        }
        const smokeCount = getSpawnCount(context.smoke, 5 * strength, deltaSeconds);
        for (let i = 0; i < smokeCount; i++)
        {
            spawnParticle(context.smoke, {
                x: lance.current.x, y: 0.2, z: lance.current.z,
                velocityX: getRandomBetween(-0.3, 0.3), velocityY: getRandomBetween(1, 1.8), velocityZ: getRandomBetween(-0.3, 0.3),
                lifetime: getRandomBetween(3, 5), size: getRandomBetween(0.6, 1.2)
            });
        }
        const moteCount = getSpawnCount(context.motes, 30 * strength, deltaSeconds);
        for (let i = 0; i < moteCount; i++)
        {
            const along = Math.random() * 0.7;
            spawnParticle(context.motes, {
                x: lance.current.x + (lance.source.x - lance.current.x) * along + getRandomBetween(-0.4, 0.4),
                y: lance.source.y * along + 0.2,
                z: lance.current.z + (lance.source.z - lance.current.z) * along + getRandomBetween(-0.4, 0.4),
                velocityX: getRandomBetween(-0.2, 0.2), velocityY: getRandomBetween(0, 0.3), velocityZ: getRandomBetween(-0.2, 0.2),
                lifetime: getRandomBetween(1.5, 3), size: getRandomBetween(0.07, 0.15)
            });
        }
    }

    /**
     * Releases the burst of sparks and light when the three lances strike the sigil’s centre.
     * @param {object} context Particle systems.
     */
    function burstSealStrike(context)
    {
        for (let i = 0; i < 160; i++)
        {
            const angle = Math.random() * Math.PI * 2;
            const outward = getRandomBetween(1.5, 5);
            spawnParticle(context.embers, {
                x: 0, y: 0.15, z: 0,
                velocityX: Math.cos(angle) * outward, velocityY: getRandomBetween(3, 8), velocityZ: Math.sin(angle) * outward,
                lifetime: getRandomBetween(0.9, 1.8), size: getRandomBetween(0.18, 0.34)
            });
        }
        for (let i = 0; i < 140; i++)
        {
            const angle = Math.random() * Math.PI * 2;
            const radius = getRandomBetween(0.5, sigilRayOuter);
            spawnParticle(context.motes, {
                x: Math.cos(angle) * radius, y: getRandomBetween(0.1, 0.6), z: Math.sin(angle) * radius,
                velocityX: 0, velocityY: getRandomBetween(0.6, 1.8), velocityZ: 0,
                lifetime: getRandomBetween(2, 4), size: getRandomBetween(0.1, 0.2)
            });
        }
    }

    /**
     * Warms castle roofs and pawns that a lance passes over, and lets them cool after.
     * @param {object[]} heatables Roofs and pawns with their materials.
     * @param {object[]} lances Lance records.
     * @param {number} deltaSeconds Frame time.
     * @param {number} presence Effect presence 0..1.
     */
    function heatTouchedObjects(heatables, lances, deltaSeconds, presence)
    {
        heatables.forEach(function heatObject(item)
        {
            const isTouched = lances.some(function isLanceOnItem(lance)
            {
                return lance.current.intensity > 0.5 && Math.hypot(lance.current.x - item.x, lance.current.z - item.z) < lanceHeatRadius;
            });
            const change = isTouched ? deltaSeconds * 1.6 : -deltaSeconds * 0.35;
            item.heat = getClamped01(item.heat + change);
            const glow = item.heat * presence;
            item.material.emissive.setRGB(1.5 * glow, 0.95 * glow, 0.4 * glow);
        });
    }

    /**
     * Builds Solmere’s sun lances: focused beams that sweep the board and scorch it,
     * heat whatever they touch, then gather to burn the Solmere sun sigil into the centre.
     * @param {object} context Scene, shared uniforms, heatables and particle systems.
     * @returns {object} Effect controller.
     */
    function createSunLancesEffect(context)
    {
        const timeline = createEffectTimeline(sunLanceLeaveSeconds);
        const group = new THREE.Group();
        group.visible = false;
        context.scene.add(group);
        const maps = createBurnMaps();
        clearBurnMaps(maps);

        const scorchUniforms = Object.assign({}, context.sharedUniforms, {
            uBurnMap: { value: maps.burnTexture },
            uHeatMap: { value: maps.heatTexture },
            uPresence: { value: 0 },
            uSigilGlow: { value: 0 }
        });
        const scorchGeometry = new THREE.PlaneGeometry(boardCells, boardCells);
        scorchGeometry.rotateX(-Math.PI / 2);
        const scorch = new THREE.Mesh(scorchGeometry, new THREE.ShaderMaterial({
            uniforms: scorchUniforms,
            vertexShader: scorchVertexShader,
            fragmentShader: scorchFragmentShader,
            transparent: true,
            depthWrite: false
        }));
        scorch.position.y = 0.012;
        scorch.renderOrder = 1;
        group.add(scorch);

        const lances = [0, 1, 2].map(function buildLance(lanceIndex)
        {
            return createLance(context, group, lanceIndex);
        });
        let hasStruckSeal = false;
        let sigilGlow = 0;
        let isCooled = true;
        let shake = 0;

        /**
         * Switches every lance light and heated object off once the effect is gone.
         */
        function coolEverything()
        {
            lances.forEach(function darkenLance(lance)
            {
                lance.light.intensity = 0;
                lance.current.intensity = 0;
            });
            context.heatables.forEach(function coolObject(item)
            {
                item.heat = 0;
                item.material.emissive.setRGB(0, 0, 0);
            });
            isCooled = true;
        }

        /**
         * How hard the camera should rumble right now.
         * @param {number} time Effect time.
         * @param {number} presence Effect presence.
         * @returns {number} Shake amount.
         */
        function getLanceShake(time, presence)
        {
            let amount = 0.06 * presence;
            for (let lanceIndex = 0; lanceIndex < lances.length; lanceIndex++)
            {
                const igniteAt = sunLanceTimes.firstIgnite + lanceIndex * sunLanceTimes.igniteGap + 0.35;
                amount += 0.5 * Math.exp(-Math.pow(time - igniteAt, 2) * 18);
            }
            amount += 1.1 * Math.exp(-Math.pow(time - sunLanceTimes.sealStrike, 2) * 6);
            return amount * presence;
        }

        return {
            start: function startSunLances()
            {
                startTimeline(timeline);
                clearBurnMaps(maps);
                lances.forEach(function resetLance(lance)
                {
                    lance.lastPaint = null;
                });
                hasStruckSeal = false;
                sigilGlow = 0;
                isCooled = false;
                group.visible = true;
            },
            stop: function stopSunLances()
            {
                stopTimeline(timeline);
            },
            getShake: function getSunLancesShake()
            {
                return shake;
            },
            getBeams: function getSunLanceBeams()
            {
                return lances.map(function readLance(lance)
                {
                    return { x: lance.current.x, z: lance.current.z, intensity: lance.current.intensity };
                });
            },
            settled: function sunHasSettled()
            {
                return timeline.state === "running" && timeline.time > sunLanceTimes.sealEnd + 2;
            },
            /* 0 at the bright opening, 1 once the intro has eased the room down to dark. */
            dim: function sunDimAmount()
            {
                if (timeline.state === "idle") return 0;
                return getSmoothstep(0.6, sunLanceTimes.sealEnd, timeline.time);
            },
            update: function updateSunLances(deltaSeconds)
            {
                const presence = advanceTimeline(timeline, deltaSeconds);
                if (timeline.state === "idle")
                {
                    group.visible = false;
                    shake = 0;
                    if (isCooled === false)
                    {
                        coolEverything();
                    }
                    return;
                }
                const time = timeline.time;
                const isRunning = timeline.state === "running";
                /* The burn stays through the intro, then cools off. It does not wink out with the lights. */
                const scorchFade = 1 - getSmoothstep(sunLanceTimes.sealEnd + 1, sunLanceTimes.sealEnd + 9, time);
                lances.forEach(function updateLance(lance, lanceIndex)
                {
                    const state = getLanceState(lanceIndex, time);
                    state.intensity *= presence;
                    if (state.clamped && lance.current.intensity > 0.05)
                    {
                        state.x = lance.current.x;
                        state.z = lance.current.z;
                        lance.lastPaint = null;
                    }
                    aimLance(lance, state, time, lanceIndex);
                    const marking = scorchFade > 0.05 && state.clamped !== true;
                    if (isRunning && state.intensity > 0.35)
                    {
                        if (marking) paintLanceTrail(maps, lance, state);
                        else lance.lastPaint = null;
                        if (state.intensity > 0.5) emitLanceParticles(context, lance, deltaSeconds);
                    }
                    else
                    {
                        lance.lastPaint = null;
                    }
                });
                if (isRunning && hasStruckSeal === false && time >= sunLanceTimes.sealStrike)
                {
                    hasStruckSeal = true;
                    burstSealStrike(context);
                }
                const sigilTarget = time >= sunLanceTimes.sealStrike && scorchFade > 0.15 ? 1 : 0;
                sigilGlow += (sigilTarget - sigilGlow) * (1 - Math.exp(-deltaSeconds * 2.5));
                scorchUniforms.uSigilGlow.value = sigilGlow * scorchFade;
                scorchUniforms.uPresence.value = presence * scorchFade;
                coolHeatMap(maps, deltaSeconds);
                maps.burnTexture.needsUpdate = true;
                maps.heatTexture.needsUpdate = true;
                heatTouchedObjects(context.heatables, lances, deltaSeconds, presence);
                shake = getLanceShake(time, presence);
            }
        };
    }

    function createSharedParticles() {
        return {
            embers: createParticleSystem({ capacity: 900, colorStart: 0xfff0a0, colorEnd: 0xe0300a, alpha: 1, fadeMode: 1, blending: THREE.AdditiveBlending, physics: { gravity: -9.8, drag: 0.1, startScale: 1, growth: -0.5, floorY: 0.05 } }),
            smoke: createParticleSystem({ capacity: 400, colorStart: 0x7a3a22, colorEnd: 0x2a2523, alpha: 0.55, fadeMode: 0, blending: THREE.NormalBlending, physics: { gravity: 0.15, drag: 0.15, startScale: 0.6, growth: 2.6 } }),
            dust: createParticleSystem({ capacity: 300, colorStart: 0x8a705a, colorEnd: 0x5a4a3e, alpha: 0.4, fadeMode: 0, blending: THREE.NormalBlending, physics: { gravity: -0.3, drag: 0.6, startScale: 0.6, growth: 1.6 } }),
            spray: createParticleSystem({ capacity: 1600, colorStart: 0xffffff, colorEnd: 0xcfe6ee, alpha: 0.75, fadeMode: 1, blending: THREE.NormalBlending, physics: { gravity: -7, drag: 0.4, startScale: 0.8, growth: 1.2 } }),
            fogPuffs: createParticleSystem({ capacity: 260, colorStart: 0xe6eaee, colorEnd: 0xd0d6dc, alpha: 0.16, fadeMode: 0, blending: THREE.NormalBlending, physics: { gravity: 0, drag: 0.02, startScale: 0.7, growth: 0.8 } }),
            motes: createParticleSystem({ capacity: 700, colorStart: 0xfff3c4, colorEnd: 0xffb648, alpha: 0.9, fadeMode: 0, blending: THREE.AdditiveBlending, physics: { gravity: 0, drag: 0.3, startScale: 1, growth: -0.3 } })
        };
    }

    function create(options) {
        options = options || {};
        reducedMotion = !!options.reduced;
        const stage = new THREE.Group();
        stage.name = "siege";
        stage.userData.siege = true;
        stage.position.y = options.boardY || 0;
        stage.frustumCulled = false;
        options.parent.add(stage);

        const sharedUniforms = {
            uTime: { value: 0 },
            uFogColor: { value: new THREE.Color(0x22323e) },
            uFogDensity: { value: 0.004 },
            uSunDir: { value: new THREE.Vector3(-8, 18, 10).normalize() },
            uSunColor: { value: new THREE.Color(0xfff1de) },
            uAmbientColor: { value: new THREE.Color(0xd9e4ff) }
        };
        const particles = createSharedParticles();
        Object.keys(particles).forEach(function addParticles(key) {
            stage.add(particles[key].points);
        });
        const context = {
            scene: stage,
            sharedUniforms: sharedUniforms,
            towers: [],
            pieces: [],
            heatables: []
        };
        Object.keys(particles).forEach(function copyParticle(key) { context[key] = particles[key]; });
        const tsunami = createTsunamiEffect(context);
        const effects = {
            volcano: createVolcanoEffect(context),
            tsunami: tsunami,
            thorns: createThornsEffect(context),
            fog: createFogEffect(context),
            sunlances: createSunLancesEffect(context)
        };
        const names = { flood: "tsunami", ash: "volcano", wild: "thorns", mist: "fog", sun: "sunlances" };
        let active = null;

        function shade(key) {
            const mood = (key && moods[key]) || moods.none;
            sharedUniforms.uFogColor.value.set(mood.background);
            sharedUniforms.uFogDensity.value = 0.004;
            sharedUniforms.uSunColor.value.set(mood.sunColor).multiplyScalar(mood.sunIntensity);
            sharedUniforms.uAmbientColor.value.set(mood.hemiSky).multiplyScalar(mood.hemiIntensity * 0.8);
        }

        function start(id) {
            const key = names[id] || null;
            Object.keys(effects).forEach(function switchEffect(name) {
                if (name === key) effects[name].start();
                else effects[name].stop();
            });
            active = key;
            shade(key);
        }

        function stop() {
            Object.keys(effects).forEach(function leave(name) { effects[name].stop(); });
            active = null;
            shade(null);
        }

        function update(dt) {
            sharedUniforms.uTime.value += dt;
            if (options.sun) sharedUniforms.uSunDir.value.copy(options.sun.position).normalize();
            Object.keys(effects).forEach(function step(name) { effects[name].update(dt); });
            Object.keys(particles).forEach(function stepParticles(name) { updateParticleSystem(particles[name], dt); });
        }

        function resize(pixelHeight) {
            const pointScale = (pixelHeight || 800) * Math.min((root.devicePixelRatio || 1), 2) * 0.5;
            Object.keys(particles).forEach(function scaleParticles(name) {
                particles[name].points.material.uniforms.uScale.value = pointScale;
            });
        }

        function waterLift(x, z, phase) {
            const h = tsunami.getWaterHeight(x, z);
            if (h <= 0) return 0;
            const bob = reducedMotion ? 0 : 0.06 * Math.sin(sharedUniforms.uTime.value * 2 + (phase || 0));
            return Math.max(0, h - 0.32 + bob);
        }

        function settled() {
            return active === "sunlances" && effects.sunlances.settled();
        }

        function sunDim() {
            if (active !== "sunlances") return 0;
            return effects.sunlances.dim();
        }

        function volcanoPose() {
            if (active !== "volcano") return null;
            return effects.volcano.getPose();
        }

        function lanceHeat(x, z) {
            if (active !== "sunlances") return 0;
            const beams = effects.sunlances.getBeams();
            let heat = 0;
            for (let i = 0; i < beams.length; i++) {
                const beam = beams[i];
                if (Math.hypot(x - beam.x, z - beam.z) < 0.95) heat = Math.max(heat, beam.intensity);
            }
            return heat;
        }

        shade(null);
        return { start: start, stop: stop, update: update, resize: resize, waterLift: waterLift, lanceHeat: lanceHeat, settled: settled, sunDim: sunDim, volcanoPose: volcanoPose };
    }

    root.CorhavenSiege = { create: create };
})(typeof globalThis !== "undefined" ? globalThis : window);
