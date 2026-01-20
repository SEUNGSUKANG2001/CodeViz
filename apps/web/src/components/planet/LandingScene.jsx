"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import VoxelPlanet from "./VoxelPlanet.jsx";

const PLANET_RADIUS = 2.35;

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function expDamp(current, target, lambda, dt) {
  const t = 1 - Math.exp(-lambda * dt);
  current.lerp(target, t);
}

function makeRadialTexture(stops, size = 256) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [at, col] of stops) g.addColorStop(at, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.minFilter = THREE.LinearMipMapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}

function Sun({ sunPos = [-30, 22, -18], distance = 90, size = 14, haloSize = 34, intensity = 2.6 }) {
  const sunDir = useMemo(() => new THREE.Vector3(...sunPos).normalize(), [sunPos]);
  const spritePos = useMemo(() => sunDir.clone().multiplyScalar(distance).toArray(), [sunDir, distance]);

  const coreTex = useMemo(
    () =>
      makeRadialTexture([
        [0.0, "rgba(255,250,235,1.0)"],
        [0.15, "rgba(255,230,170,0.9)"],
        [0.35, "rgba(255,190,110,0.5)"],
        [1.0, "rgba(0,0,0,0.0)"],
      ]),
    []
  );

  const haloTex = useMemo(
    () =>
      makeRadialTexture([
        [0.0, "rgba(0,0,0,0.0)"],
        [0.4, "rgba(255,200,120,0.15)"],
        [0.75, "rgba(140,170,255,0.12)"],
        [1.0, "rgba(0,0,0,0.0)"],
      ]),
    []
  );

  return (
    <>
      <directionalLight
        position={sunPos}
        intensity={intensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <group position={spritePos}>
        <sprite scale={[haloSize, haloSize, 1]}>
          <spriteMaterial
            map={haloTex}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
        <sprite scale={[size, size, 1]}>
          <spriteMaterial
            map={coreTex}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      </group>
    </>
  );
}

function Stars({ count = 2000, radius = 90 }) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = radius * (0.85 + Math.random() * 0.15);

      pos[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }

    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count, radius]);

  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: "#ffffff",
        size: 0.6,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    []
  );

  return <points geometry={geom} material={mat} />;
}

function NebulaBackdrop({ radius = 95, sunDir = [0.8, 0.3, 0.45] }) {
  const sun = useMemo(() => new THREE.Vector3(...sunDir).normalize(), [sunDir]);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color("#0b1135") },
          uBottom: { value: new THREE.Color("#02030b") },
          uSun: { value: sun.clone() },
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
          uniform vec3 uBottom;
          uniform vec3 uSun;
          varying vec3 vDir;
          void main(){
            float h = clamp((vDir.y + 1.0) * 0.5, 0.0, 1.0);
            vec3 col = mix(uBottom, uTop, h);
            float glow = pow(max(dot(vDir, normalize(uSun)),0.0), 12.0) * 0.25;
            col += glow * vec3(1.0,0.8,0.5);
            gl_FragColor = vec4(col,1.0);
          }
        `,
      }),
    [sun]
  );

  return (
    <mesh>
      <sphereGeometry args={[radius, 48, 48]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

function CameraRig({ mode, targets }) {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3(...targets.main.target));
  const desiredPos = useRef(new THREE.Vector3());
  const desiredTarget = useRef(new THREE.Vector3());
  const dampingRef = useRef(2.0);
  const modeRef = useRef(mode);
  const prevModeRef = useRef(mode);
  const transitionRef = useRef({
    active: false,
    t: 0,
    fromPos: new THREE.Vector3(),
    toPos: new THREE.Vector3(),
    fromTarget: new THREE.Vector3(),
    toTarget: new THREE.Vector3(),
    control: new THREE.Vector3(),
  });

  useFrame((_, dt) => {
    const conf = targets[mode] || targets.main;
    desiredPos.current.set(...conf.position);
    desiredTarget.current.set(...conf.target);

    if (modeRef.current !== mode) {
      prevModeRef.current = mode;
      modeRef.current = mode;
      transitionRef.current.active = mode === "carousel";
      transitionRef.current.t = 0;
      const startPos =
        mode === "carousel"
          ? new THREE.Vector3(...targets.main.position)
          : camera.position.clone();
      const startTarget =
        mode === "carousel"
          ? new THREE.Vector3(...targets.main.target)
          : targetRef.current.clone();
      transitionRef.current.fromPos.copy(startPos);
      transitionRef.current.toPos.copy(desiredPos.current);
      transitionRef.current.fromTarget.copy(startTarget);
      transitionRef.current.toTarget.copy(desiredTarget.current);
      camera.position.copy(startPos);
      targetRef.current.copy(startTarget);
      const mid = transitionRef.current.fromPos.clone().lerp(transitionRef.current.toPos, 0.5);
      const dist = transitionRef.current.fromPos.distanceTo(transitionRef.current.toPos);
      const arc = Math.max(1.2, dist * 0.25);
      transitionRef.current.control.set(mid.x, mid.y + arc, mid.z + arc * 0.4);
    }

    if (transitionRef.current.active) {
      const speed = 0.8;
      transitionRef.current.t = Math.min(1, transitionRef.current.t + dt * speed);
      const t = transitionRef.current.t;
      camera.position.lerpVectors(
        transitionRef.current.fromPos,
        transitionRef.current.toPos,
        t
      );
      targetRef.current.lerpVectors(
        transitionRef.current.fromTarget,
        transitionRef.current.toTarget,
        t
      );
      if (t >= 1) transitionRef.current.active = false;
    } else {
      expDamp(camera.position, desiredPos.current, dampingRef.current, dt);
      expDamp(targetRef.current, desiredTarget.current, dampingRef.current, dt);
    }

    camera.lookAt(targetRef.current);
  });

  return null;
}

function CarouselLerp({ enabled, targetOffset, setDragOffset }) {
  useFrame((_, dt) => {
    if (!enabled) return;
    const t = 1 - Math.exp(-6 * dt);
    setDragOffset((prev) => prev + (targetOffset - prev) * t);
  });
  return null;
}

function resolvePlanetParams(planet) {
  const params = planet?.params || {};
  return {
    seed: planet?.seed ?? 1,
    seaLevelWorld: typeof params.seaLevelWorld === "number" ? params.seaLevelWorld : -0.05,
    beachBand: typeof params.beachBand === "number" ? params.beachBand : 0.03,
    foamBand: typeof params.foamBand === "number" ? params.foamBand : 0.012,
  };
}

function PlanetNode({ planet, position, onPick }) {
  const params = resolvePlanetParams(planet);
  const palette = planet?.palette || {};
  const cloudColor = planet?.cloudColor || {};
  return (
    <group position={position}>
      <VoxelPlanet
        seed={params.seed}
        gridSize={32}
        boxSize={6}
        radius={PLANET_RADIUS}
        isoLevel={0.0}
        seaLevelWorld={params.seaLevelWorld}
        beachBand={params.beachBand}
        foamBand={params.foamBand}
        palette={palette}
        cloudColor={cloudColor}
        sunDir={[-30, 22, -18]}
        rotatePeriodSec={80}
        cloudSpeedFactor={0.4}
        onPick={onPick}
      />
    </group>
  );
}

export default function LandingScene({
  mode = "empty",
  planets = [],
  activePlanetId = null,
  onSelectPlanet,
  onFocusPlanetChange,
  onPlanetPick,
}) {
  const [dragOffset, setDragOffset] = useState(0);
  const [targetOffset, setTargetOffset] = useState(0);
  const spacing = 12;
  const listLength = planets.length > 0 ? planets.length : 1;
  const currentIndex = Math.max(
    0,
    (planets.length ? planets.findIndex((p) => p.id === activePlanetId) : 0)
  );

  useEffect(() => {
    const next = -currentIndex * spacing;
    setDragOffset(next);
    setTargetOffset(next);
  }, [currentIndex, spacing]);

  const fallbackPlanet = useMemo(
    () => ({
      id: "fallback",
      seed: 1,
      params: {},
      palette: {},
      cloudColor: {},
    }),
    []
  );

  const list = planets.length > 0 ? planets : [fallbackPlanet];
  const mainPlanet = list.find((p) => p.id === activePlanetId) || list[0];

  const targets = useMemo(
    () => ({
      empty: { position: [0, 0, 16], target: [0, 0, 0] },
      main: { position: [-2.281, 0.364, 3.009], target: [-2.385, 0.445, 2.863] },
      carousel: { position: [0, 3, 9.5], target: [0, -0.2, 0] },
    }),
    []
  );

  const handlePick = useCallback(
    (planet, point, normal) => {
      if (mode !== "carousel") return;
      if (!planet?.id) return;
      if (onPlanetPick) {
        onPlanetPick(planet, point, normal);
        return;
      }
      onSelectPlanet?.(planet.id);
    },
    [mode, onSelectPlanet, onPlanetPick]
  );

  useEffect(() => {
    if (mode !== "carousel") return;
    const onKey = (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      setTargetOffset((prev) => {
        const delta = e.key === "ArrowLeft" ? spacing : -spacing;
        const maxOffset = 0;
        const minOffset = -(listLength - 1) * spacing;
        return Math.max(minOffset, Math.min(maxOffset, prev + delta));
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, listLength, spacing]);

  useEffect(() => {
    if (mode !== "carousel") return;
    if (!list.length) return;
    const idx = Math.max(0, Math.min(list.length - 1, Math.round(-targetOffset / spacing)));
    const focused = list[idx];
    if (focused && onFocusPlanetChange) {
      onFocusPlanetChange(focused);
    }
  }, [mode, targetOffset, spacing, list, onFocusPlanetChange]);

  return (
    <div className="h-full w-full bg-[#050814]">
      <Canvas
        dpr={mode === "carousel" ? [1, 1] : [1, 1.25]}
        camera={{ position: targets.main.position, fov: 34, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        style={{ touchAction: "none" }}
        onCreated={({ gl: renderer }) => {
          renderer.setClearColor(new THREE.Color("#050814"), 1);
        }}
      >
        <NebulaBackdrop radius={95} sunDir={[0.8, 0.3, 0.45]} />
        <Stars />
        <Sun sunPos={[-30, 22, -18]} />
        <ambientLight intensity={0.08} />

        <CameraRig mode={mode} targets={targets} />
        <CarouselLerp
          enabled={mode === "carousel"}
          targetOffset={targetOffset}
          setDragOffset={setDragOffset}
        />

        {mode === "main" && (
          <PlanetNode planet={mainPlanet} position={[-2.2, -0.35, 0]} />
        )}

        {mode === "carousel" && (
          <group position={[dragOffset, -0.4, 0]}>
            {list.map((planet, idx) => (
              <PlanetNode
                key={planet.id || idx}
                planet={planet}
                position={[idx * spacing, 0, 0]}
                onPick={(point, normal) => handlePick(planet, point, normal)}
              />
            ))}
          </group>
        )}
      </Canvas>
    </div>
  );
}
