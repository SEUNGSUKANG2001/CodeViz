import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';
import { edgeTable, triTable } from '../planet/mcTriTable.js';

// ---------- utils ----------
function mulberry32(seed: number) {
    let t = seed >>> 0;
    return function () {
        t += 0x6d2b79f5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

function clamp(v: number, a: number, b: number) {
    return Math.max(a, Math.min(b, v));
}

function smooth01(t: number) {
    return t * t * (3 - 2 * t);
}

// ---------- density (SDF planet) ----------
function makePlanetDensity({ seed, radius }: { seed: number; radius: number }) {
    const rng = mulberry32(seed);
    const noise3 = createNoise3D(() => rng());

    const continentFreq = 0.55;
    const hillFreq = 1.3;
    const mountainFreq = 2.6;
    const heightAmp = 0.55;
    const seaLevel = 0.06;
    const plainLevel = 0.42;

    const ridge = (x: number, y: number, z: number) => 1 - Math.abs(noise3(x, y, z));

    function localHeight(nx: number, ny: number, nz: number) {
        const bigRaw = noise3(nx * continentFreq, ny * continentFreq, nz * continentFreq);
        const big = Math.pow((bigRaw + 1) * 0.5, 1.35);

        const landMask = smooth01(clamp((big - seaLevel) / (plainLevel - seaLevel), 0, 1));
        const mountMask = smooth01(clamp((big - plainLevel) / (1 - plainLevel), 0, 1));

        const shore = 1.0 - Math.abs(landMask * 2.0 - 1.0);
        const shoreRaw =
            noise3(nx * 3.6, ny * 3.6, nz * 3.6) * 0.06 +
            noise3(nx * 7.2, ny * 7.2, nz * 7.2) * 0.025;
        const shoreWarp = shoreRaw * shore;

        const ocean = noise3(nx * 0.9, ny * 0.9, nz * 0.9) * 0.03 - 0.08;
        const hills = noise3(nx * hillFreq, ny * hillFreq, nz * hillFreq) * 0.08;
        const plain = hills;

        const r1 = ridge(nx * mountainFreq, ny * mountainFreq, nz * mountainFreq);
        const r2 = ridge(nx * (mountainFreq * 1.8), ny * (mountainFreq * 1.8), nz * (mountainFreq * 1.8));
        const mountain = clamp(0.65 * r1 + 0.35 * r2, 0, 1) * 0.22;

        const micro =
            noise3(nx * 12.0, ny * 12.0, nz * 12.0) * 0.02 +
            noise3(nx * 24.0, ny * 24.0, nz * 24.0) * 0.01;
        const mountainDetail = micro * mountMask;

        const landBase = THREE.MathUtils.lerp(plain, plain + mountain, mountMask) + mountainDetail;

        const erode = 1.0 - shore * 0.45;
        const land = landBase * erode;

        const h = THREE.MathUtils.lerp(ocean, land, landMask);
        return (h + shoreWarp) * heightAmp;
    }

    return (x: number, y: number, z: number) => {
        const r = Math.sqrt(x * x + y * y + z * z);
        const inv = r > 1e-6 ? 1 / r : 0;
        const nx = x * inv,
            ny = y * inv,
            nz = z * inv;
        const h = localHeight(nx, ny, nz);
        return r - (radius + h);
    };
}

// ---------- marching cubes core ----------
function vertexInterp(isolevel: number, p1: THREE.Vector3, p2: THREE.Vector3, valp1: number, valp2: number) {
    if (Math.abs(isolevel - valp1) < 1e-7) return p1.clone();
    if (Math.abs(isolevel - valp2) < 1e-7) return p2.clone();
    if (Math.abs(valp1 - valp2) < 1e-7) return p1.clone();
    const mu = (isolevel - valp1) / (valp2 - valp1);
    return new THREE.Vector3(
        p1.x + mu * (p2.x - p1.x),
        p1.y + mu * (p2.y - p1.y),
        p1.z + mu * (p2.z - p1.z)
    );
}

function buildGeometry({
    density,
    gridSize,
    boxSize,
    isoLevel,
    radius,
    colorParams,
}: {
    density: (x: number, y: number, z: number) => number;
    gridSize: number;
    boxSize: number;
    isoLevel: number;
    radius: number;
    colorParams: any;
}) {
    const half = boxSize / 2;
    const n = gridSize;
    const step = boxSize / (n - 1);

    const values = new Float32Array(n * n * n);
    const idx = (x: number, y: number, z: number) => x + n * (y + n * z);

    let k = 0;
    for (let z = 0; z < n; z++) {
        const wz = -half + z * step;
        for (let y = 0; y < n; y++) {
            const wy = -half + y * step;
            for (let x = 0; x < n; x++) {
                const wx = -half + x * step;
                values[k++] = -density(wx, wy, wz);
            }
        }
    }

    const positions: number[] = [];
    const vertList = new Array(12);
    const p = new Array(8);
    const val = new Array(8);

    for (let z = 0; z < n - 1; z++) {
        for (let y = 0; y < n - 1; y++) {
            for (let x = 0; x < n - 1; x++) {
                const x0 = -half + x * step;
                const y0 = -half + y * step;
                const z0 = -half + z * step;

                p[0] = new THREE.Vector3(x0, y0, z0);
                p[1] = new THREE.Vector3(x0 + step, y0, z0);
                p[2] = new THREE.Vector3(x0 + step, y0 + step, z0);
                p[3] = new THREE.Vector3(x0, y0 + step, z0);
                p[4] = new THREE.Vector3(x0, y0, z0 + step);
                p[5] = new THREE.Vector3(x0 + step, y0, z0 + step);
                p[6] = new THREE.Vector3(x0 + step, y0 + step, z0 + step);
                p[7] = new THREE.Vector3(x0, y0 + step, z0 + step);

                val[0] = values[idx(x, y, z)];
                val[1] = values[idx(x + 1, y, z)];
                val[2] = values[idx(x + 1, y + 1, z)];
                val[3] = values[idx(x, y + 1, z)];
                val[4] = values[idx(x, y, z + 1)];
                val[5] = values[idx(x + 1, y, z + 1)];
                val[6] = values[idx(x + 1, y + 1, z + 1)];
                val[7] = values[idx(x, y + 1, z + 1)];

                let cubeIndex = 0;
                if (val[0] < isoLevel) cubeIndex |= 1;
                if (val[1] < isoLevel) cubeIndex |= 2;
                if (val[2] < isoLevel) cubeIndex |= 4;
                if (val[3] < isoLevel) cubeIndex |= 8;
                if (val[4] < isoLevel) cubeIndex |= 16;
                if (val[5] < isoLevel) cubeIndex |= 32;
                if (val[6] < isoLevel) cubeIndex |= 64;
                if (val[7] < isoLevel) cubeIndex |= 128;

                const edges = edgeTable[cubeIndex];
                if (edges === 0) continue;

                if (edges & 1) vertList[0] = vertexInterp(isoLevel, p[0], p[1], val[0], val[1]);
                if (edges & 2) vertList[1] = vertexInterp(isoLevel, p[1], p[2], val[1], val[2]);
                if (edges & 4) vertList[2] = vertexInterp(isoLevel, p[2], p[3], val[2], val[3]);
                if (edges & 8) vertList[3] = vertexInterp(isoLevel, p[3], p[0], val[3], val[0]);
                if (edges & 16) vertList[4] = vertexInterp(isoLevel, p[4], p[5], val[4], val[5]);
                if (edges & 32) vertList[5] = vertexInterp(isoLevel, p[5], p[6], val[5], val[6]);
                if (edges & 64) vertList[6] = vertexInterp(isoLevel, p[6], p[7], val[6], val[7]);
                if (edges & 128) vertList[7] = vertexInterp(isoLevel, p[7], p[4], val[7], val[4]);
                if (edges & 256) vertList[8] = vertexInterp(isoLevel, p[0], p[4], val[0], val[4]);
                if (edges & 512) vertList[9] = vertexInterp(isoLevel, p[1], p[5], val[1], val[5]);
                if (edges & 1024) vertList[10] = vertexInterp(isoLevel, p[2], p[6], val[2], val[6]);
                if (edges & 2048) vertList[11] = vertexInterp(isoLevel, p[3], p[7], val[3], val[7]);

                const base = cubeIndex * 16;
                for (let t = 0; t < 16; t += 3) {
                    const a = triTable[base + t];
                    if (a === -1) break;
                    const b = triTable[base + t + 1];
                    const c = triTable[base + t + 2];
                    const va = vertList[a],
                        vb = vertList[b],
                        vc = vertList[c];
                    if (!va || !vb || !vc) continue;
                    positions.push(va.x, va.y, va.z, vb.x, vb.y, vb.z, vc.x, vc.y, vc.z);
                }
            }
        }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.computeVertexNormals();
    geom.computeBoundingSphere();

    const posAttr = geom.getAttribute('position');
    const norAttr = geom.getAttribute('normal');
    const colors = new Float32Array(posAttr.count * 3);

    const oceanDeep = new THREE.Color('#173a6b');
    const oceanShallow = new THREE.Color('#2e67a7');
    const rock = new THREE.Color('#9b8a6b');
    const snow = new THREE.Color('#f4f8ff');
    const white = new THREE.Color('#ffffff');

    const desert = new THREE.Color('#d9c27c');
    const savanna = new THREE.Color('#b9c35a');
    const forest2 = new THREE.Color('#3f9e55');

    const v = new THREE.Vector3();
    const normalV = new THREE.Vector3();

    const seaLevelWorld = colorParams.seaLevelWorld;
    const beachBand = colorParams.beachBand;
    const foamBand = colorParams.foamBand;

    for (let i = 0; i < posAttr.count; i++) {
        v.fromBufferAttribute(posAttr, i);
        normalV.fromBufferAttribute(norAttr, i);

        const r = v.length();
        const dir = v.clone().multiplyScalar(1 / Math.max(r, 1e-6));
        const h = r - radius;
        const slope = 1 - Math.abs(normalV.dot(dir));
        const lat = Math.abs(dir.y);

        const humidity = THREE.MathUtils.clamp(
            0.5 + 0.35 * Math.sin(dir.x * 3.0 + dir.z * 2.0) + 0.25 * Math.sin(dir.y * 6.0 + dir.x * 1.5),
            0,
            1
        );
        const arid = THREE.MathUtils.clamp(1.0 - humidity - lat * 0.25, 0, 1);

        const c = new THREE.Color();

        if (h < seaLevelWorld - beachBand) {
            c.copy(oceanDeep);
        } else if (h < seaLevelWorld + beachBand) {
            const t = THREE.MathUtils.smoothstep(h, seaLevelWorld - beachBand, seaLevelWorld + beachBand);
            c.copy(oceanDeep).lerp(oceanShallow, t);
        } else {
            const rocky = THREE.MathUtils.smoothstep(slope, 0.08, 0.22);
            const elevT = THREE.MathUtils.smoothstep(h, seaLevelWorld, seaLevelWorld + 0.28);
            const low = new THREE.Color().copy(desert).lerp(savanna, 1.0 - arid).lerp(forest2, humidity);
            c.copy(low);
            c.lerp(rock, elevT * 0.75);
            c.lerp(rock, rocky * 0.95);

            const snowLat = THREE.MathUtils.smoothstep(lat, 0.70, 0.95);
            const snowAlt = THREE.MathUtils.smoothstep(h, seaLevelWorld + 0.22, seaLevelWorld + 0.45);
            c.lerp(snow, clamp(Math.max(snowLat, snowAlt), 0, 1) * 0.9);
        }

        const foam = 1 - THREE.MathUtils.smoothstep(Math.abs(h - seaLevelWorld), 0, foamBand);
        c.lerp(white, foam * 0.5);

        colors[i * 3 + 0] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
    }

    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geom;
}

// ---------- Atmosphere Shaders ----------
const atmosphereVS = `
  varying vec3 vW;
  varying vec3 vN;
  void main(){
    vN = normalize(mat3(transpose(inverse(modelMatrix))) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const atmosphereFS = `
  uniform float uR;
  uniform float uA;
  uniform vec3  uCenter;
  uniform vec3  uColor;
  uniform float uDensity;
  uniform float uFalloff;
  uniform float uAlphaPow;
  uniform float uRimPow;
  uniform float uRimBoost;

  varying vec3 vW;
  varying vec3 vN;

  vec2 raySphere(vec3 ro, vec3 rd, vec3 c, float r){
    vec3 oc = ro - c;
    float b = dot(oc, rd);
    float cc = dot(oc, oc) - r*r;
    float h = b*b - cc;
    if(h < 0.0) return vec2(1e9, -1e9);
    h = sqrt(h);
    return vec2(-b - h, -b + h);
  }

  void main(){
    vec3 C = cameraPosition;
    vec3 P = vW;
    vec3 ro = C;
    vec3 rd = normalize(P - C);

    float R0 = uR;
    float R1 = uR + uA;

    vec2 tOuter = raySphere(ro, rd, uCenter, R1);
    vec2 tInner = raySphere(ro, rd, uCenter, R0);

    float t0 = max(tOuter.x, 0.0);
    float t1 = tOuter.y;
    if(t1 <= t0) discard;

    float ti0 = max(tInner.x, 0.0);
    float ti1 = tInner.y;

    const int STEPS = 8;
    float dt = (t1 - t0) / float(STEPS);

    float acc = 0.0;
    float edgeMin = 1.0;

    for(int i=0;i<STEPS;i++){
      float t = t0 + (float(i)+0.5)*dt;
      if(ti1 > ti0 && t > ti0 && t < ti1) continue;
      vec3 X = ro + rd * t;
      float h = length(X - uCenter) - R0;
      float hn = clamp(h / uA, 0.0, 1.0);
      float edge = smoothstep(1.0, 0.0, hn);
      float d = exp(-hn * uFalloff) * edge;
      acc += d;
      edgeMin = min(edgeMin, edge);
    }

    float optical = acc * dt;
    float a = 1.0 - exp(-uDensity * optical);
    a *= pow(edgeMin, 1.25);
    a = pow(clamp(a, 0.0, 1.0), uAlphaPow);

    vec3 N = normalize(vN);
    vec3 V = normalize(C - P);
    float rim = pow(1.0 - max(dot(N, V), 0.0), uRimPow);
    a = clamp(a + rim * uRimBoost, 0.0, 1.0);

    gl_FragColor = vec4(uColor, a);
  }
`;

// ---------- Water Shaders ----------
const waterVS = `
  varying vec3 vN;
  varying vec3 vW;
  void main(){
    vN = normalize(mat3(transpose(inverse(modelMatrix))) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const waterFS = `
  uniform vec3 uSun;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform float uOpacity;
  uniform float uTime;
  varying vec3 vN;
  varying vec3 vW;

  float hash31(vec3 p){
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float noise(vec3 p){
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f*f*(3.0-2.0*f);
    float n000 = hash31(i + vec3(0,0,0));
    float n100 = hash31(i + vec3(1,0,0));
    float n010 = hash31(i + vec3(0,1,0));
    float n110 = hash31(i + vec3(1,1,0));
    float n001 = hash31(i + vec3(0,0,1));
    float n101 = hash31(i + vec3(1,0,1));
    float n011 = hash31(i + vec3(0,1,1));
    float n111 = hash31(i + vec3(1,1,1));
    float nx00 = mix(n000, n100, f.x);
    float nx10 = mix(n010, n110, f.x);
    float nx01 = mix(n001, n101, f.x);
    float nx11 = mix(n011, n111, f.x);
    float nxy0 = mix(nx00, nx10, f.y);
    float nxy1 = mix(nx01, nx11, f.y);
    return mix(nxy0, nxy1, f.z);
  }

  float fbm(vec3 p){
    float a = 0.5;
    float f = 0.0;
    for(int i=0;i<5;i++){
      f += a * noise(p);
      p *= 2.02;
      a *= 0.5;
    }
    return f;
  }

  void main(){
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vW);
    vec3 L = normalize(uSun);
    vec3 dir = normalize(vW);
    vec3 flow = vec3(uTime*0.08, -uTime*0.03, uTime*0.05);
    float w1 = fbm(dir * 18.0 + flow);
    float w2 = fbm(dir * 36.0 - flow*1.3);
    float w = (w1*0.65 + w2*0.35) - 0.45;
    vec3 T = normalize(cross(vec3(0.0,1.0,0.0), dir));
    if(length(T) < 0.001) T = normalize(cross(vec3(1.0,0.0,0.0), dir));
    vec3 B = normalize(cross(dir, T));
    N = normalize(N + T*(w*0.12) + B*(w*0.10));
    float fres = pow(1.0 - max(dot(N, V), 0.0), 5.0);
    float ndl = dot(N, L);
    float day = smoothstep(-0.10, 0.25, ndl);
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 110.0) * (0.45 + 0.55*day);
    vec3 col = mix(uDeep, uShallow, fres * 0.70);
    col *= (0.42 + 0.78 * day);
    col += spec * vec3(0.75, 0.88, 1.0);
    float a = uOpacity * (0.65 + fres * 0.45);
    a *= (0.75 + 0.25 * day);
    gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
  }
`;

// ---------- Cloud Shaders ----------
const cloudVS = `
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vN = normalize(mat3(transpose(inverse(modelMatrix))) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const cloudFS = `
  uniform vec3 uColor;
  uniform vec3 uTint;
  uniform float uOpacity;
  uniform vec3 uSun;
  uniform float uSeed;
  uniform float uF1;
  uniform float uF2;
  uniform float uThreshold;
  uniform float uSoftness;
  uniform float uRim;
  uniform float uRimPow;
  uniform float uTime;
  varying vec3 vN;
  varying vec3 vW;

  float hash31(vec3 p){
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float noise(vec3 p){
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f*f*(3.0-2.0*f);
    float n000 = hash31(i + vec3(0,0,0));
    float n100 = hash31(i + vec3(1,0,0));
    float n010 = hash31(i + vec3(0,1,0));
    float n110 = hash31(i + vec3(1,1,0));
    float n001 = hash31(i + vec3(0,0,1));
    float n101 = hash31(i + vec3(1,0,1));
    float n011 = hash31(i + vec3(0,1,1));
    float n111 = hash31(i + vec3(1,1,1));
    float nx00 = mix(n000, n100, f.x);
    float nx10 = mix(n010, n110, f.x);
    float nx01 = mix(n001, n101, f.x);
    float nx11 = mix(n011, n111, f.x);
    float nxy0 = mix(nx00, nx10, f.y);
    float nxy1 = mix(nx01, nx11, f.y);
    return mix(nxy0, nxy1, f.z);
  }

  float fbm(vec3 p){
    float a = 0.5;
    float f = 0.0;
    for(int i=0;i<5;i++){
      f += a * noise(p);
      p *= 2.02;
      a *= 0.5;
    }
    return f;
  }

  void main() {
    vec3 N = normalize(vN);
    vec3 dir = normalize(vW);
    vec3 flow = vec3(uTime*0.05, uTime*0.02, -uTime*0.03);
    float cov = fbm(dir * uF1 + flow + uSeed);
    float det = fbm(dir * uF2 - flow*1.2 + (uSeed*1.7));
    float field = cov*0.85 + det*0.35;
    float a = smoothstep(uThreshold - uSoftness, uThreshold + uSoftness, field);
    float ndl = dot(N, normalize(uSun));
    float day = smoothstep(-0.08, 0.25, ndl);
    vec3 V = normalize(cameraPosition - vW);
    float rim = pow(1.0 - max(dot(N,V),0.0), uRimPow);
    float alpha = a * uOpacity;
    alpha *= (0.55 + 0.45 * day);
    alpha += rim * uRim * a * 0.22;
    if(alpha < 0.01) discard;
    vec3 col = mix(uTint, uColor, 0.65 + 0.35 * day);
    col += rim * 0.10;
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  }
`;

// ---------- Planet Factory ----------
export interface VoxelPlanet {
    group: THREE.Group;
    update: (dt: number) => void;
    dispose: () => void;
}

export function createVoxelPlanet({
    seed = 1,
    radius = 4000,
    sunDir = [0.8, 0.3, 0.45],
}: {
    seed?: number;
    radius?: number;
    sunDir?: [number, number, number];
}): VoxelPlanet {
    const group = new THREE.Group();
    const sun = new THREE.Vector3(...sunDir).normalize();
    const segments = 72;

    // 1. Geography (marching cubes, landing-page style)
    const density = makePlanetDensity({ seed, radius });
    const geom = buildGeometry({
        density,
        gridSize: 72,
        boxSize: radius * 2.5,
        isoLevel: 0.0,
        radius,
        colorParams: {
            seaLevelWorld: -0.05,
            beachBand: 0.03,
            foamBand: 0.012,
        },
    });
    const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.85,
        metalness: 0.05,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // 2. Water
    const waterR = radius + 0.04 - 0.05; // radius + seaLevelWorld
    const waterMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
            uSun: { value: sun.clone() },
            uDeep: { value: new THREE.Color('#0b2b56') },
            uShallow: { value: new THREE.Color('#1b64ad') },
            uOpacity: { value: 0.88 },
            uTime: { value: 0 },
        },
        vertexShader: waterVS,
        fragmentShader: waterFS,
    });
    const waterGeom = new THREE.SphereGeometry(waterR, segments, segments);
    const waterMesh = new THREE.Mesh(waterGeom, waterMat);
    waterMesh.receiveShadow = true;
    group.add(waterMesh);

    // 3. Atmosphere
    const thickness = Math.min(radius * 0.08, 45); // keep atmosphere sane at large scales
    const atmoMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
            uR: { value: radius },
            uA: { value: thickness },
            uCenter: { value: new THREE.Vector3(0, 0, 0) },
            uColor: { value: new THREE.Color('#8fd0ff') },
            uDensity: { value: 0.12 },
            uFalloff: { value: 10.8 },
            uAlphaPow: { value: 2.2 },
            uRimPow: { value: 2.2 },
            uRimBoost: { value: 0.18 },
        },
        vertexShader: atmosphereVS,
        fragmentShader: atmosphereFS,
    });
    const atmoGeom = new THREE.SphereGeometry(radius + thickness, segments, segments);
    const atmoMesh = new THREE.Mesh(atmoGeom, atmoMat);
    group.add(atmoMesh);

    // 4. Clouds
    const cloudGroup = new THREE.Group();
    function makeCloudLayer(layerSeed: number, scale: number, opacity: number, f1: number, f2: number, threshold: number) {
        const cMat = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            side: THREE.FrontSide,
            uniforms: {
                uColor: { value: new THREE.Color('#ffffff') },
                uTint: { value: new THREE.Color('#dfe9ff') },
                uOpacity: { value: opacity },
                uSun: { value: sun.clone() },
                uSeed: { value: layerSeed },
                uF1: { value: f1 },
                uF2: { value: f2 },
                uThreshold: { value: threshold },
                uSoftness: { value: 0.12 },
                uRim: { value: 0.6 },
                uRimPow: { value: 2.0 },
                uTime: { value: 0 },
            },
            vertexShader: cloudVS,
            fragmentShader: cloudFS,
        });
        const cGeom = new THREE.SphereGeometry(radius * scale, segments, segments);
        const cMesh = new THREE.Mesh(cGeom, cMat);
        return { mesh: cMesh, mat: cMat, geom: cGeom };
    }

    const layers = [
        makeCloudLayer((seed * 1.0) % 9999, 1.04, 0.34, 2.2, 6.2, 0.75),
        makeCloudLayer((seed * 2.0 + 11) % 9999, 1.05, 0.26, 1.7, 4.8, 0.7),
        makeCloudLayer((seed * 3.0 + 29) % 9999, 1.055, 0.20, 1.3, 3.6, 0.7),
    ];
    layers.forEach(l => cloudGroup.add(l.mesh));
    group.add(cloudGroup);

    return {
        group,
        update: (dt: number) => {
            waterMat.uniforms.uTime.value += dt;
            layers[0].mat.uniforms.uTime.value += dt;
            layers[1].mat.uniforms.uTime.value += dt * 0.9;
            layers[2].mat.uniforms.uTime.value += dt * 0.8;
        },
        dispose: () => {
            console.log("🧹 Disposing Voxel Planet Resources...");
            group.traverse((obj: any) => {
                if (obj.isMesh) {
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) {
                        if (Array.isArray(obj.material)) {
                            obj.material.forEach((m: any) => m.dispose());
                        } else {
                            obj.material.dispose();
                        }
                    }
                }
            });
        }
    };
}
