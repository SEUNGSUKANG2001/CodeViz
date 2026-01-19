import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { createNoise3D } from 'simplex-noise'
import { edgeTable, triTable } from './mcTriTable.js'

// ---------- utils ----------
function mulberry32(seed) {
  let t = seed >>> 0
  return function () {
    t += 0x6D2B79F5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v))
}
function smooth01(t) {
  return t * t * (3 - 2 * t)
}

// ---------- density (SDF planet) ----------
function makePlanetDensity({ seed, radius }) {
  const rng = mulberry32(seed)
  const noise3 = createNoise3D(() => rng())

  const continentFreq = 0.55
  const hillFreq = 1.3
  const mountainFreq = 2.6
  const heightAmp = 0.55
  const seaLevel = 0.06
  const plainLevel = 0.42

  const ridge = (x, y, z) => 1 - Math.abs(noise3(x, y, z)) // 0..1

  function localHeight(nx, ny, nz) {
    const bigRaw = noise3(nx * continentFreq, ny * continentFreq, nz * continentFreq)
    const big = Math.pow((bigRaw + 1) * 0.5, 1.35)

    const landMask = smooth01(clamp((big - seaLevel) / (plainLevel - seaLevel), 0, 1))
    const mountMask = smooth01(clamp((big - plainLevel) / (1 - plainLevel), 0, 1))

    // ✅ 해안 굴곡(유지)
    const shore = 1.0 - Math.abs(landMask * 2.0 - 1.0)
    const shoreRaw =
      noise3(nx * 3.6, ny * 3.6, nz * 3.6) * 0.06 +
      noise3(nx * 7.2, ny * 7.2, nz * 7.2) * 0.025
    const shoreWarp = shoreRaw * shore

    const ocean = noise3(nx * 0.9, ny * 0.9, nz * 0.9) * 0.03 - 0.08
    const hills = noise3(nx * hillFreq, ny * hillFreq, nz * hillFreq) * 0.08
    const plain = hills

    const r1 = ridge(nx * mountainFreq, ny * mountainFreq, nz * mountainFreq)
    const r2 = ridge(nx * (mountainFreq * 1.8), ny * (mountainFreq * 1.8), nz * (mountainFreq * 1.8))
    const mountain = clamp(0.65 * r1 + 0.35 * r2, 0, 1) * 0.22

    const micro =
      noise3(nx * 12.0, ny * 12.0, nz * 12.0) * 0.02 +
      noise3(nx * 24.0, ny * 24.0, nz * 24.0) * 0.01
    const mountainDetail = micro * mountMask

    const landBase = THREE.MathUtils.lerp(plain, plain + mountain, mountMask) + mountainDetail

    // 해안 살짝 침식
    const erode = 1.0 - shore * 0.45
    const land = landBase * erode

    const h = THREE.MathUtils.lerp(ocean, land, landMask)
    return (h + shoreWarp) * heightAmp
  }

  return (x, y, z) => {
    const r = Math.sqrt(x * x + y * y + z * z)
    const inv = r > 1e-6 ? 1 / r : 0
    const nx = x * inv,
      ny = y * inv,
      nz = z * inv
    const h = localHeight(nx, ny, nz)
    return r - (radius + h)
  }
}

// ---------- marching cubes core ----------
function vertexInterp(isolevel, p1, p2, valp1, valp2) {
  if (Math.abs(isolevel - valp1) < 1e-7) return p1.clone()
  if (Math.abs(isolevel - valp2) < 1e-7) return p2.clone()
  if (Math.abs(valp1 - valp2) < 1e-7) return p1.clone()
  const mu = (isolevel - valp1) / (valp2 - valp1)
  return new THREE.Vector3(
    p1.x + mu * (p2.x - p1.x),
    p1.y + mu * (p2.y - p1.y),
    p1.z + mu * (p2.z - p1.z)
  )
}

function buildGeometry({ density, gridSize, boxSize, isoLevel, radius, colorParams }) {
  const half = boxSize / 2
  const n = gridSize
  const step = boxSize / (n - 1)

  const values = new Float32Array(n * n * n)
  const idx = (x, y, z) => x + n * (y + n * z)

  let k = 0
  for (let z = 0; z < n; z++) {
    const wz = -half + z * step
    for (let y = 0; y < n; y++) {
      const wy = -half + y * step
      for (let x = 0; x < n; x++) {
        const wx = -half + x * step
        values[k++] = -density(wx, wy, wz) // ✅ 네 컨벤션 유지
      }
    }
  }

  const positions = []
  const vertList = new Array(12)
  const p = new Array(8)
  const val = new Array(8)

  for (let z = 0; z < n - 1; z++) {
    for (let y = 0; y < n - 1; y++) {
      for (let x = 0; x < n - 1; x++) {
        const x0 = -half + x * step
        const y0 = -half + y * step
        const z0 = -half + z * step

        p[0] = new THREE.Vector3(x0, y0, z0)
        p[1] = new THREE.Vector3(x0 + step, y0, z0)
        p[2] = new THREE.Vector3(x0 + step, y0 + step, z0)
        p[3] = new THREE.Vector3(x0, y0 + step, z0)
        p[4] = new THREE.Vector3(x0, y0, z0 + step)
        p[5] = new THREE.Vector3(x0 + step, y0, z0 + step)
        p[6] = new THREE.Vector3(x0 + step, y0 + step, z0 + step)
        p[7] = new THREE.Vector3(x0, y0 + step, z0 + step)

        val[0] = values[idx(x, y, z)]
        val[1] = values[idx(x + 1, y, z)]
        val[2] = values[idx(x + 1, y + 1, z)]
        val[3] = values[idx(x, y + 1, z)]
        val[4] = values[idx(x, y, z + 1)]
        val[5] = values[idx(x + 1, y, z + 1)]
        val[6] = values[idx(x + 1, y + 1, z + 1)]
        val[7] = values[idx(x, y + 1, z + 1)]

        let cubeIndex = 0
        if (val[0] < isoLevel) cubeIndex |= 1
        if (val[1] < isoLevel) cubeIndex |= 2
        if (val[2] < isoLevel) cubeIndex |= 4
        if (val[3] < isoLevel) cubeIndex |= 8
        if (val[4] < isoLevel) cubeIndex |= 16
        if (val[5] < isoLevel) cubeIndex |= 32
        if (val[6] < isoLevel) cubeIndex |= 64
        if (val[7] < isoLevel) cubeIndex |= 128

        const edges = edgeTable[cubeIndex]
        if (edges === 0) continue

        if (edges & 1) vertList[0] = vertexInterp(isoLevel, p[0], p[1], val[0], val[1])
        if (edges & 2) vertList[1] = vertexInterp(isoLevel, p[1], p[2], val[1], val[2])
        if (edges & 4) vertList[2] = vertexInterp(isoLevel, p[2], p[3], val[2], val[3])
        if (edges & 8) vertList[3] = vertexInterp(isoLevel, p[3], p[0], val[3], val[0])
        if (edges & 16) vertList[4] = vertexInterp(isoLevel, p[4], p[5], val[4], val[5])
        if (edges & 32) vertList[5] = vertexInterp(isoLevel, p[5], p[6], val[5], val[6])
        if (edges & 64) vertList[6] = vertexInterp(isoLevel, p[6], p[7], val[6], val[7])
        if (edges & 128) vertList[7] = vertexInterp(isoLevel, p[7], p[4], val[7], val[4])
        if (edges & 256) vertList[8] = vertexInterp(isoLevel, p[0], p[4], val[0], val[4])
        if (edges & 512) vertList[9] = vertexInterp(isoLevel, p[1], p[5], val[1], val[5])
        if (edges & 1024) vertList[10] = vertexInterp(isoLevel, p[2], p[6], val[2], val[6])
        if (edges & 2048) vertList[11] = vertexInterp(isoLevel, p[3], p[7], val[3], val[7])

        const base = cubeIndex * 16
        for (let t = 0; t < 16; t += 3) {
          const a = triTable[base + t]
          if (a === -1) break
          const b = triTable[base + t + 1]
          const c = triTable[base + t + 2]
          const va = vertList[a],
            vb = vertList[b],
            vc = vertList[c]
          if (!va || !vb || !vc) continue
          positions.push(va.x, va.y, va.z, vb.x, vb.y, vb.z, vc.x, vc.y, vc.z)
        }
      }
    }
  }

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geom.computeVertexNormals()
  geom.computeBoundingSphere()

  // ---------- vertex colors (너가 쓰던 버전 유지) ----------
  const posAttr = geom.getAttribute('position')
  const norAttr = geom.getAttribute('normal')
  const colors = new Float32Array(posAttr.count * 3)

  const oceanDeep = new THREE.Color('#173a6b')
  const oceanShallow = new THREE.Color('#2e67a7')
  const rock = new THREE.Color('#9b8a6b')
  const snow = new THREE.Color('#f4f8ff')
  const white = new THREE.Color('#ffffff')

  const desert = new THREE.Color('#d9c27c')
  const savanna = new THREE.Color('#b9c35a')
  const forest2 = new THREE.Color('#3f9e55')

  const v = new THREE.Vector3()
  const normalV = new THREE.Vector3()

  const seaLevelWorld = colorParams.seaLevelWorld
  const beachBand = colorParams.beachBand
  const foamBand = colorParams.foamBand

  for (let i = 0; i < posAttr.count; i++) {
    v.fromBufferAttribute(posAttr, i)
    normalV.fromBufferAttribute(norAttr, i)

    const r = v.length()
    const dir = v.clone().multiplyScalar(1 / Math.max(r, 1e-6))
    const h = r - radius
    const slope = 1 - Math.abs(normalV.dot(dir))
    const lat = Math.abs(dir.y)

    const humidity = THREE.MathUtils.clamp(
      0.5 + 0.35 * Math.sin(dir.x * 3.0 + dir.z * 2.0) + 0.25 * Math.sin(dir.y * 6.0 + dir.x * 1.5),
      0,
      1
    )
    const arid = THREE.MathUtils.clamp(1.0 - humidity - lat * 0.25, 0, 1)

    const c = new THREE.Color()

    if (h < seaLevelWorld - beachBand) {
      c.copy(oceanDeep)
    } else if (h < seaLevelWorld + beachBand) {
      const t = THREE.MathUtils.smoothstep(h, seaLevelWorld - beachBand, seaLevelWorld + beachBand)
      c.copy(oceanDeep).lerp(oceanShallow, t)
    } else {
      const rocky = THREE.MathUtils.smoothstep(slope, 0.08, 0.22)
      const elevT = THREE.MathUtils.smoothstep(h, seaLevelWorld, seaLevelWorld + 0.28)
      const low = new THREE.Color().copy(desert).lerp(savanna, 1.0 - arid).lerp(forest2, humidity)
      c.copy(low)
      c.lerp(rock, elevT * 0.75)
      c.lerp(rock, rocky * 0.95)

      const snowLat = THREE.MathUtils.smoothstep(lat, 0.70, 0.95)
      const snowAlt = THREE.MathUtils.smoothstep(h, seaLevelWorld + 0.22, seaLevelWorld + 0.45)
      c.lerp(snow, clamp(Math.max(snowLat, snowAlt), 0, 1) * 0.9)
    }

    const foam = 1 - THREE.MathUtils.smoothstep(Math.abs(h - seaLevelWorld), 0, foamBand)
    c.lerp(white, foam * 0.5)

    colors[i * 3 + 0] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }

  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geom
}

// ---------- Atmosphere (3: sun-facing boost + softer terminator) ----------
function Atmosphere({ radius, sunDir = [0.8, 0.3, 0.45], thickness = 0.6, center = [0, 0, 0] }) {
  const sun = useMemo(() => new THREE.Vector3(...sunDir).normalize(), [sunDir])

  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.BackSide,                 // 대기는 보통 BackSide가 안정적
      blending: THREE.AdditiveBlending,      // 원하면 NormalBlending으로 바꿔도 됨
      uniforms: {
        uR: { value: radius },
        uA: { value: thickness },
        uCenter: { value: new THREE.Vector3(...center) },

        uColor: { value: new THREE.Color('#8fd0ff') },

        // 전체 농도(찐하면 여기 더 내리면 됨)
        uDensity: { value: 0.12 },

        // 바깥으로 옅어짐(클수록 더 빨리 사라짐)
        uFalloff: { value: 10.8 },

        // 알파 커브(클수록 더 옅게 보임)
        uAlphaPow: { value: 2.2 },

        // 림(가장자리) 강조
        uRimPow: { value: 2.2 },
        uRimBoost: { value: 0.18 },
      },
      vertexShader: `
        varying vec3 vW;
        varying vec3 vN;
        void main(){
          vN = normalize(mat3(transpose(inverse(modelMatrix))) * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vW = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
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

          // 행성 내부 구간 제외
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

            // 높이 감쇠 + 끝에서 0으로 부드럽게(비눗방울 테두리 느낌 완화)
            float edge = smoothstep(1.0, 0.0, hn);
            float d = exp(-hn * uFalloff) * edge;

            acc += d;
            edgeMin = min(edgeMin, edge);
          }

          float optical = acc * dt;

          float a = 1.0 - exp(-uDensity * optical);
          a *= pow(edgeMin, 1.25);
          a = pow(clamp(a, 0.0, 1.0), uAlphaPow);

          // rim (카메라 기준 가장자리)
          vec3 N = normalize(vN);
          vec3 V = normalize(C - P);
          float rim = pow(1.0 - max(dot(N, V), 0.0), uRimPow);

          // 최종 알파
          a = clamp(a + rim * uRimBoost, 0.0, 1.0);

          vec3 col = uColor;

          gl_FragColor = vec4(col, a);
        }
      `,
    })
  }, [radius, thickness, sun, center])

  return (
    <mesh scale={1.0}>
      <sphereGeometry args={[radius + thickness, 96, 96]} />
      <primitive object={mat} attach="material" />
    </mesh>
  )
}
// ---------- Water (1: normal perturb + moving spec) ----------
function Water({ radius, seaLevelWorld, sunDir = [0.8, 0.3, 0.45] }) {
  const waterR = Math.max(0.0001, radius + 0.04 + seaLevelWorld)
  const sun = useMemo(() => new THREE.Vector3(...sunDir).normalize(), [sunDir])
  const matRef = useRef()

  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uSun: { value: sun.clone() },
        uDeep: { value: new THREE.Color('#0b2b56') },
        uShallow: { value: new THREE.Color('#1b64ad') },
        uOpacity: { value: 0.88 },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vN;
        varying vec3 vW;
        void main(){
          vN = normalize(mat3(transpose(inverse(modelMatrix))) * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vW = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uSun;
        uniform vec3 uDeep;
        uniform vec3 uShallow;
        uniform float uOpacity;
        uniform float uTime;

        varying vec3 vN;
        varying vec3 vW;

        float sstep(float a, float b, float x){
          float t = clamp((x-a)/(b-a), 0.0, 1.0);
          return t*t*(3.0-2.0*t);
        }

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

          // ✅ subtle moving normal perturb (water ripples)
          vec3 dir = normalize(vW);
          vec3 flow = vec3(uTime*0.08, -uTime*0.03, uTime*0.05);
          float w1 = fbm(dir * 18.0 + flow);
          float w2 = fbm(dir * 36.0 - flow*1.3);
          float w = (w1*0.65 + w2*0.35) - 0.45;

          // tangent-ish perturb (good enough on sphere)
          vec3 T = normalize(cross(vec3(0.0,1.0,0.0), dir));
          if(length(T) < 0.001) T = normalize(cross(vec3(1.0,0.0,0.0), dir));
          vec3 B = normalize(cross(dir, T));

          N = normalize(N + T*(w*0.12) + B*(w*0.10));

          float fres = pow(1.0 - max(dot(N, V), 0.0), 5.0);

          float ndl = dot(N, L);
          float day = sstep(-0.10, 0.25, ndl);

          vec3 H = normalize(L + V);
          float spec = pow(max(dot(N, H), 0.0), 110.0) * (0.45 + 0.55*day);

          vec3 col = mix(uDeep, uShallow, fres * 0.70);
          col *= (0.42 + 0.78 * day);
          col += spec * vec3(0.75, 0.88, 1.0);

          float a = uOpacity * (0.65 + fres * 0.45);
          a *= (0.75 + 0.25 * day);

          gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
        }
      `,
    })
  }, [sun])

  useFrame((_, dt) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += dt
  })

  return (
    <mesh receiveShadow>
      <sphereGeometry args={[waterR, 128, 128]} />
      <primitive object={mat} ref={matRef} attach="material" />
    </mesh>
  )
}

// ---------- Clouds (white) ----------
function Clouds3({ radius, seed, sunDir = [0.8, 0.3, 0.45] }) {
  const sun = useMemo(() => new THREE.Vector3(...sunDir).normalize(), [sunDir])

  const makeMat = (layerSeed, opacity, f1, f2, threshold, softness, rimK, rimPow) =>
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
      uniforms: {
        uColor: { value: new THREE.Color('#ffffff') },
        uTint: { value: new THREE.Color('#dfe9ff') },
        uOpacity: { value: 0.5 },
        uSun: { value: sun.clone() },
        uSeed: { value: layerSeed },
        uF1: { value: f1 },
        uF2: { value: f2 },
        uThreshold: { value: threshold },
        uSoftness: { value: softness },
        uRim: { value: rimK },
        uRimPow: { value: rimPow },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vN;
        varying vec3 vW;
        void main() {
          vN = normalize(mat3(transpose(inverse(modelMatrix))) * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vW = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
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

        float sstep(float a, float b, float x){
          float t = clamp((x-a)/(b-a), 0.0, 1.0);
          return t*t*(3.0-2.0*t);
        }

        void main() {
          vec3 N = normalize(vN);
          vec3 dir = normalize(vW);

          vec3 flow = vec3(uTime*0.05, uTime*0.02, -uTime*0.03);

          float cov = fbm(dir * uF1 + flow + uSeed);
          float det = fbm(dir * uF2 - flow*1.2 + (uSeed*1.7));
          float field = cov*0.85 + det*0.35;

          float a = sstep(uThreshold - uSoftness, uThreshold + uSoftness, field);

          float ndl = dot(N, normalize(uSun));
          float day = sstep(-0.08, 0.25, ndl);

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
      `,
    })

  const mats = useMemo(() => {
    const m1 = makeMat((seed * 1.0) % 9999, 0.34, 2.2, 6.2, 0.75, 0.11, 0.70, 2.1)
    const m2 = makeMat((seed * 2.0 + 11) % 9999, 0.26, 1.7, 4.8, 0.7, 0.13, 0.58, 2.0)
    const m3 = makeMat((seed * 3.0 + 29) % 9999, 0.20, 1.3, 3.6, 0.7, 0.15, 0.48, 1.9)
    return [m1, m2, m3]
  }, [seed, sun])

  useFrame((_, dt) => {
    mats[0].uniforms.uTime.value += dt
    mats[1].uniforms.uTime.value += dt * 0.9
    mats[2].uniforms.uTime.value += dt * 0.8
  })

  return (
    <group>
      <mesh scale={1.04} castShadow={false} receiveShadow={false}>
        <sphereGeometry args={[radius, 48, 48]} />
        <primitive object={mats[0]} attach="material" />
      </mesh>
      <mesh scale={1.05} castShadow={false} receiveShadow={false}>
        <sphereGeometry args={[radius, 42, 42]} />
        <primitive object={mats[1]} attach="material" />
      </mesh>
      <mesh scale={1.055} castShadow={false} receiveShadow={false}>
        <sphereGeometry args={[radius, 38, 38]} />
        <primitive object={mats[2]} attach="material" />
      </mesh>
    </group>
  )
}

// ---------- Cloud Shadow (2) ----------
function CloudShadow({ radius, seed, sunDir = [0.8, 0.3, 0.45] }) {
  const sun = useMemo(() => new THREE.Vector3(...sunDir).normalize(), [sunDir])
  const matRef = useRef()

  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending, // black overlay
      uniforms: {
        uSun: { value: sun.clone() },
        uSeed: { value: (seed % 9999) * 1.0 },
        uTime: { value: 0 },

        // shadow look
        uStrength: { value: 0.25 }, // 전체 그림자 강도
        uSoft: { value: 0.06 },     // 가장자리 부드러움
      },
      vertexShader: `
        varying vec3 vW;
        varying vec3 vN;
        void main(){
          vN = normalize(mat3(transpose(inverse(modelMatrix))) * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vW = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uSun;
        uniform float uSeed;
        uniform float uTime;
        uniform float uStrength;
        uniform float uSoft;

        varying vec3 vW;
        varying vec3 vN;

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

        float sstep(float a, float b, float x){
          float t = clamp((x-a)/(b-a), 0.0, 1.0);
          return t*t*(3.0-2.0*t);
        }

        void main(){
          vec3 dir = normalize(vW);

          // ✅ "shadow projection": sample dir slightly shifted opposite sun (approx)
          vec3 L = normalize(uSun);
          vec3 flow = vec3(uTime*0.05, uTime*0.02, -uTime*0.03);

          vec3 sampleDir = normalize(dir - L * 0.12); // 태양 반대쪽으로 살짝 밀어 그림자 느낌
          float cov = fbm(sampleDir * 2.2 + flow + uSeed);
          float det = fbm(sampleDir * 6.2 - flow*1.2 + (uSeed*1.7));
          float field = cov*0.85 + det*0.35;

          float mask = sstep(0.60 - uSoft, 0.60 + uSoft, field);

          // night side는 그림자 티 덜 나게
          float ndl = dot(normalize(vN), L);
          float day = sstep(-0.08, 0.25, ndl);

          float a = mask * uStrength * (0.55 + 0.45 * day);
          if(a < 0.01) discard;

          gl_FragColor = vec4(vec3(0.0), a);
        }
      `,
    })
  }, [sun, seed])

  useFrame((_, dt) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += dt
  })

  return (
    <mesh scale={1.01} receiveShadow castShadow={false}>
      <sphereGeometry args={[radius, 96, 96]} />
      <primitive object={mat} ref={matRef} attach="material" />
    </mesh>
  )
}

// ---------- main ----------
export default function VoxelPlanet({
  seed = 1,
  gridSize = 92,
  boxSize = 6,
  radius = 2.35,
  isoLevel = 0.0,

  seaLevelWorld = 0.02,
  beachBand = 0.03,
  foamBand = 0.012,

  sunDir = [0.8, 0.3, 0.45],

  rotatePeriodSec = 60,
  cloudSpeedFactor = 0.5,

  onPick,
}) {
  const root = useRef()
  const cloudGroup = useRef()

  const density = useMemo(() => makePlanetDensity({ seed, radius }), [seed, radius])
  const sun = useMemo(() => new THREE.Vector3(...sunDir).normalize(), [sunDir])

  const geometry = useMemo(() => {
    return buildGeometry({
      density,
      gridSize,
      boxSize,
      isoLevel,
      radius,
      colorParams: { seaLevelWorld, beachBand, foamBand, sunDir: sun },
    })
  }, [density, gridSize, boxSize, isoLevel, radius, seaLevelWorld, beachBand, foamBand, sun])

  const landMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.92,
        metalness: 0.02,
      }),
    []
  )

  // invisible pick sphere
  const pickMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
      }),
    []
  )

  useFrame((_, dt) => {
    const w = (Math.PI * 2) / Math.max(1, rotatePeriodSec)
    if (root.current) root.current.rotation.y += w * dt
    if (cloudGroup.current) cloudGroup.current.rotation.y += w * cloudSpeedFactor * dt
  })

  const handlePick = (e) => {
    e.stopPropagation()
    if (!onPick) return
    const point = e.point.clone()

    // face normal -> world normal
    const nLocal = e.face?.normal ? e.face.normal.clone() : new THREE.Vector3().copy(point).normalize()
    const nWorld = nLocal.transformDirection(e.object.matrixWorld).normalize()

    onPick(point, nWorld)
  }

  return (
    <group ref={root}>

      <Water radius={radius} seaLevelWorld={seaLevelWorld} sunDir={sunDir} />

      {/* land */}
      <mesh geometry={geometry} material={landMat} castShadow receiveShadow />

      {/* (4) pick surface */}
      <mesh onPointerDown={handlePick}>
        <sphereGeometry args={[radius * 1.04, 64, 64]} />
        <primitive object={pickMat} attach="material" />
      </mesh>

      {/* clouds + (2) shadows (same rotation group so they move together) */}
      <group ref={cloudGroup}>
        <CloudShadow radius={radius} seed={seed} sunDir={sunDir} />
        <Clouds3 radius={radius} seed={seed} sunDir={sunDir} />
      </group>
    </group>
  )
}
