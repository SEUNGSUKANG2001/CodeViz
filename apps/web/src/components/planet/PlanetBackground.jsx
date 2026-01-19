"use client";

import * as THREE from "three";
import { useMemo, useRef, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import VoxelPlanet from "./VoxelPlanet.jsx";

// ---------------- Sun + Halo (occluded) ----------------
function makeRadialTexture(stops, size = 256) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    0,
    size * 0.5,
    size * 0.5,
    size * 0.5
  );
  for (const [at, col] of stops) g.addColorStop(at, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.minFilter = THREE.LinearMipMapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

function SunSpriteWithHalo({
  sunDir = [0.8, 0.3, 0.45],
  distance = 85,
  size = 16,
  haloSize = 36,
  haloOpacity = 0.55,
}) {
  const pos = useMemo(() => {
    const d = new THREE.Vector3(...sunDir).normalize();
    return d.multiplyScalar(distance).toArray();
  }, [sunDir, distance]);

  const coreTex = useMemo(
    () =>
      makeRadialTexture(
        [
          [0.0, "rgba(255,250,235,1.00)"],
          [0.1, "rgba(255,230,170,0.98)"],
          [0.28, "rgba(255,190,110,0.65)"],
          [0.55, "rgba(160,190,255,0.14)"],
          [1.0, "rgba(0,0,0,0.0)"],
        ],
        256
      ),
    []
  );

  const haloTex = useMemo(
    () =>
      makeRadialTexture(
        [
          [0.0, "rgba(0,0,0,0.0)"],
          [0.25, "rgba(0,0,0,0.0)"],
          [0.42, "rgba(255,220,150,0.10)"],
          [0.62, `rgba(255,200,120,${0.22 * haloOpacity})`],
          [0.78, `rgba(140,170,255,${0.12 * haloOpacity})`],
          [1.0, "rgba(0,0,0,0.0)"],
        ],
        256
      ),
    [haloOpacity]
  );

  return (
    <group position={pos}>
      <sprite scale={[haloSize, haloSize, 1]}>
        <spriteMaterial
          map={haloTex}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={true}
          toneMapped={false}
        />
      </sprite>
      <sprite scale={[size, size, 1]}>
        <spriteMaterial
          map={coreTex}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={true}
          toneMapped={false}
        />
      </sprite>
    </group>
  );
}

// ---------------- Stars ----------------
function Stars({ count = 2500, radius = 80 }) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const sizeArr = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = radius * (0.85 + Math.random() * 0.15);
      pos[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      sizeArr[i] = 0.6 + Math.random() * 1.6;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(sizeArr, 1));
    return g;
  }, [count, radius]);

  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uOpacity: { value: 0.95 } },
      vertexShader: `
        attribute float aSize;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (300.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        void main() {
          vec2 p = gl_PointCoord * 2.0 - 1.0;
          float d = dot(p,p);
          float a = smoothstep(1.0, 0.0, d);
          gl_FragColor = vec4(vec3(1.0), a * uOpacity);
        }
      `,
    });
  }, []);

  return <points geometry={geom} material={mat} />;
}

// ---------------- Nebula ----------------
function NebulaBackdrop({ radius = 90, sunDir = [0.8, 0.3, 0.45] }) {
  const sun = useMemo(() => new THREE.Vector3(...sunDir).normalize(), [sunDir]);
  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: new THREE.Color("#0a1030") },
        uMid: { value: new THREE.Color("#121a45") },
        uBottom: { value: new THREE.Color("#050814") },
        uSun: { value: sun.clone() },
        uSunColor: { value: new THREE.Color("#ffd8a0") },
        uSunStrength: { value: 0.18 },
        uSunPower: { value: 10.0 },
      },
      vertexShader: `
        varying vec3 vDir;
        void main(){
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vDir = normalize(wp.xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTop;
        uniform vec3 uMid;
        uniform vec3 uBottom;
        uniform vec3 uSun;
        uniform vec3 uSunColor;
        uniform float uSunStrength;
        uniform float uSunPower;
        varying vec3 vDir;

        void main(){
          float h = clamp((vDir.y + 1.0) * 0.5, 0.0, 1.0);
          vec3 col = mix(uBottom, uTop, h);
          col = mix(col, uMid, smoothstep(0.25, 0.75, h) * 0.35);

          float s = max(dot(normalize(vDir), normalize(uSun)), 0.0);
          float glow = pow(s, uSunPower) * uSunStrength;
          col += uSunColor * glow;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
  }, [sun]);

  return (
    <mesh>
      <sphereGeometry args={[radius, 48, 48]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

// ---------------- Camera + Controls + Export ----------------
function CameraRig({ controlsRef, onSample }) {
  const { camera } = useThree();

  // 매 프레임 controls target/camera가 최신이 되도록
  useFrame(() => {
    controlsRef.current?.update();
  });

  const sample = useCallback(() => {
    const ctl = controlsRef.current;
    const t = ctl?.target ?? new THREE.Vector3(0, 0, 0);

    const payload = {
      cameraPos: [camera.position.x, camera.position.y, camera.position.z],
      cameraTarget: [t.x, t.y, t.z],
      fov: camera.fov,
    };

    console.log("[PlanetBackground] camera snapshot:", payload);

    // 클립보드 복사(가능하면)
    const text =
      `cameraPos: [${payload.cameraPos.map((n) => n.toFixed(3)).join(", ")}]\n` +
      `cameraTarget: [${payload.cameraTarget.map((n) => n.toFixed(3)).join(", ")}]\n` +
      `fov: ${payload.fov.toFixed(1)}`;

    try {
      navigator.clipboard?.writeText(text);
    } catch {
      // ignore
    }

    onSample?.(payload);
  }, [camera, controlsRef, onSample]);

  // 외부 버튼에서 호출 가능하게 ref에 붙여둠
  useMemo(() => {
    if (!controlsRef.current) return;
    controlsRef.current.__sample = sample;
  }, [controlsRef, sample]);

  return null;
}

/**
 * PlanetBackground
 * - OrbitControls로 직접 조절
 * - "Copy camera" 버튼 누르면 현재 카메라/타겟/FOV 출력 + 클립보드 복사
 */
export default function PlanetBackground({
  seed = 1,

  // 태양(월드) 위치
  sunPos = [-30, 22, -18],

  // 행성(월드) 위치
  planetOffset = [-2.2, -0.35, 0],

  // 초기 카메라(여기서 출발 -> 직접 조절 -> 복사)
  cameraPos = [1.6, 0.85, 4.9],
  cameraTarget = [-2.2, -0.35, 0],
  fov = 34,

  className = "",
}) {
  const sunDir = useMemo(
    () => new THREE.Vector3(...sunPos).normalize().toArray(),
    [sunPos]
  );

  const radius = 2.35;
  const controlsRef = useRef();

  const [last, setLast] = useState(null);

  return (
    <div className={`h-full w-full ${className}`} style={{ background: "#050814" }}>
      {/* UI: 카메라 값 복사 */}
      <div
        style={{
          position: "absolute",
          top: 14,
          left: 14,
          zIndex: 20,
          display: "flex",
          gap: 10,
          alignItems: "center",
          pointerEvents: "auto",
        }}
      >
        <button
          onClick={() => controlsRef.current?.__sample?.()}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(8,12,30,0.55)",
            color: "white",
            cursor: "pointer",
            backdropFilter: "blur(6px)",
            fontSize: 12,
          }}
        >
          Copy camera
        </button>

        {last && (
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, lineHeight: 1.2 }}>
            <div>
              cam: [{last.cameraPos.map((n) => n.toFixed(2)).join(", ")}]
            </div>
            <div>
              tgt: [{last.cameraTarget.map((n) => n.toFixed(2)).join(", ")}]
            </div>
          </div>
        )}
      </div>

      <Canvas
        shadows
        camera={{ position: cameraPos, fov, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl, camera }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          gl.setClearColor(new THREE.Color("#050814"), 1);

          // 초기 target 세팅
          camera.lookAt(new THREE.Vector3(...cameraTarget));
        }}
      >
        <NebulaBackdrop radius={90} sunDir={sunDir} />
        <Stars />
        <SunSpriteWithHalo
          sunDir={sunDir}
          distance={85}
          size={16}
          haloSize={36}
          haloOpacity={0.55}
        />

        {/* lights */}
        <ambientLight intensity={0.06} />
        <directionalLight
          position={sunPos}
          intensity={2.4}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={1}
          shadow-camera-far={120}
          shadow-camera-left={-12}
          shadow-camera-right={12}
          shadow-camera-top={12}
          shadow-camera-bottom={-12}
        />
        <directionalLight position={[-6, 3, 8]} intensity={0.12} />

        {/* controls */}
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.55}
          zoomSpeed={0.8}
          panSpeed={0.7}
          // 시작 target
          target={new THREE.Vector3(...cameraTarget)}
        />

        <CameraRig controlsRef={controlsRef} onSample={setLast} />

        {/* planet */}
        <group position={planetOffset}>
          <VoxelPlanet
            seed={seed}
            gridSize={128}
            boxSize={6}
            radius={radius}
            isoLevel={0.0}
            seaLevelWorld={-0.05}
            beachBand={0.03}
            foamBand={0.012}
            sunDir={sunDir}
            rotatePeriodSec={60}
            cloudSpeedFactor={0.5}
          />
        </group>
      </Canvas>
    </div>
  );
}