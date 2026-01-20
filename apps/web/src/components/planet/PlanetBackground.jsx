"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import VoxelPlanet from "./VoxelPlanet.jsx";

const DEBUG_PLANET = false;

/* ================= Utils ================= */

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function expDamp(current, target, lambda, dt) {
  const t = 1 - Math.exp(-lambda * dt);
  current.lerp(target, t);
}

function lerpVec3(out, a, b, t) {
  out.set(
    a.x + (b.x - a.x) * t,
    a.y + (b.y - a.y) * t,
    a.z + (b.z - a.z) * t
  );
  return out;
}

function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
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

function makeLabelTexture(lines) {
  const width = 540;
  const height = 230;
  const padding = 26;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(8, 12, 24, 0.86)";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(120, 230, 255, 0.4)";
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, width - 4, height - 4);

  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "600 36px ui-sans-serif, system-ui, -apple-system";
  ctx.fillText(lines[0] ?? "", padding, padding);

  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = "400 26px ui-sans-serif, system-ui, -apple-system";
  ctx.fillText(lines[1] ?? "", padding, padding + 54);

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "400 24px ui-sans-serif, system-ui, -apple-system";
  ctx.fillText(lines[2] ?? "", padding, padding + 96);

  ctx.fillStyle = "rgba(140, 220, 255, 0.95)";
  ctx.font = "600 24px ui-sans-serif, system-ui, -apple-system";
  ctx.fillText(lines[3] ?? "", padding, padding + 140);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/* ================= Sun + Stars + Nebula ================= */

function Sun({
  sunPos = [-30, 22, -18],
  distance = 90,
  size = 14,
  haloSize = 34,
  intensity = 2.6,
}) {
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

/* ================= Camera Rig ================= */

function CameraRig({
  startCameraPos,
  endCameraPos,
  startTarget,
  endTarget,
  progress,
  focusRef,
  exploreRef,
  exploreActive,
  focusActive,
  cameraPosRef,
}) {
  const { camera } = useThree();

  const currentTarget = useRef(new THREE.Vector3(...startTarget));
  const desiredPos = useRef(new THREE.Vector3());
  const desiredTarget = useRef(new THREE.Vector3());

  const startPosVec = useMemo(() => new THREE.Vector3(...startCameraPos), [startCameraPos]);
  const endPosVec = useMemo(() => new THREE.Vector3(...endCameraPos), [endCameraPos]);
  const startTargetVec = useMemo(() => new THREE.Vector3(...startTarget), [startTarget]);
  const endTargetVec = useMemo(() => new THREE.Vector3(...endTarget), [endTarget]);

  useFrame((_, dt) => {
    if (exploreActive && exploreRef.current) {
      desiredPos.current.copy(exploreRef.current.position);
      desiredTarget.current.copy(exploreRef.current.target);
    } else if (focusActive && focusRef.current) {
      desiredPos.current.copy(focusRef.current.position);
      desiredTarget.current.copy(focusRef.current.target);
    } else {
      const t = smoothstep(0.0, 1.0, progress);
      lerpVec3(desiredPos.current, startPosVec, endPosVec, t);
      lerpVec3(desiredTarget.current, startTargetVec, endTargetVec, t);
    }

    expDamp(camera.position, desiredPos.current, 6.0, dt);
    expDamp(currentTarget.current, desiredTarget.current, 6.0, dt);
    camera.lookAt(currentTarget.current);

    if (cameraPosRef) {
      cameraPosRef.current.copy(camera.position);
    }
  });

  return null;
}

/* ================= Orbiting Alien Planets ================= */

function AlienPlanet({ planet, appearance, onPick }) {
  const group = useRef(null);

  useFrame((_, dt) => {
    if (!group.current) return;
    group.current.scale.setScalar(appearance.scale);
    group.current.visible = appearance.opacity > 0.02;
    group.current.rotation.y += dt * 0.15;
    group.current.rotation.x += dt * 0.05;
    group.current.position.copy(planet.position);
  });

  const handlePick = useCallback(
    (point, normal) => {
      onPick?.(planet, point, normal);
    },
    [onPick, planet]
  );

  return (
    <group
      ref={group}
      onPointerDown={(e) => {
        e.stopPropagation();
        onPick?.(planet, null, null);
      }}
    >
      <VoxelPlanet
        seed={planet.seed}
        gridSize={28}
        boxSize={6}
        radius={planet.radius}
        isoLevel={0.0}
        seaLevelWorld={planet.seaLevelWorld}
        beachBand={planet.beachBand}
        foamBand={planet.foamBand}
        sunDir={planet.sunDir}
        rotatePeriodSec={60}
        cloudSpeedFactor={0.6}
        onPick={handlePick}
      />
    </group>
  );
}

function OrbitSystem({
  feedItems,
  scrollProgress,
  orbitCenter,
  selectedId,
  onPlanetPick,
  onExplore,
  selectedPlanetRef,
}) {
  const lineRef = useRef(null);
  const labelRef = useRef(null);
  const labelScaleRef = useRef(new THREE.Vector3(2.3, 1.0, 1));

  const appear = smoothstep(0.45, 0.75, scrollProgress);
  const appearance = useMemo(() => {
    return {
      opacity: clamp01(appear),
      scale: 1.0,
    };
  }, [appear]);

  const items = useMemo(() => {
    const arr = Array.isArray(feedItems) ? feedItems.slice(0, 8) : [];
    if (arr.length === 0) {
      return new Array(8).fill(0).map((_, i) => ({
        postId: `dummy-${i}`,
        title: `Popular Planet ${i + 1}`,
        author: { username: "user" },
        likeCount: 10 + i * 7,
        commentCount: 2 + i,
      }));
    }
    return arr;
  }, [feedItems]);

  const planets = useMemo(() => {
    const N = Math.min(8, items.length);
    const out = [];
    const baseR = 9.5;
    const maxR = 15.5;
    const baseSpeed = 2.4;

    for (let i = 0; i < N; i++) {
      const it = items[i];
      const id = it.postId || it.id || `p-${i}`;
      const seed = hash01(String(id));
      const r = baseR + seed * (maxR - baseR);
      const angle = (i / N) * Math.PI * 2 + seed;
      const speed = baseSpeed / Math.pow(r, 1.5);
      const yOffset = (seed - 0.5) * 1.6;

      out.push({
        id,
        idx: i,
        title: it.title || "Untitled",
        author: it.author?.username ? `@${it.author.username}` : "@user",
        likes: it.likeCount ?? 0,
        comments: it.commentCount ?? 0,
        seed: Math.floor(seed * 1000) + 2,
        radius: 2.35,
        seaLevelWorld: -0.12 + seed * 0.22,
        beachBand: 0.02 + seed * 0.06,
        foamBand: 0.008 + seed * 0.016,
        sunDir: new THREE.Vector3(
          -0.6 + seed * 1.2,
          0.15 + seed * 0.6,
          0.2 + seed * 0.8
        )
          .normalize()
          .toArray(),
        orbitRadius: r,
        orbitAngle: angle,
        orbitSpeed: speed,
        orbitYOffset: yOffset,
        position: new THREE.Vector3(),
      });
    }

    return out;
  }, [items]);

  const selectedPlanet = useMemo(
    () => planets.find((p) => p.id === selectedId) || null,
    [planets, selectedId]
  );

  useEffect(() => {
    if (selectedPlanetRef) selectedPlanetRef.current = selectedPlanet;
  }, [selectedPlanet, selectedPlanetRef]);

  const labelTexture = useMemo(() => {
    if (!selectedPlanet) return null;
    return makeLabelTexture([
      selectedPlanet.title,
      `${selectedPlanet.author} · ❤ ${selectedPlanet.likes} · 💬 ${selectedPlanet.comments}`,
      "Planet by another user",
      "Move",
    ]);
  }, [selectedPlanet]);

  const labelMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.0,
      map: null,
      depthWrite: false,
    });
  }, []);

  useEffect(() => {
    if (!labelTexture) return;
    labelMaterial.map = labelTexture;
    labelMaterial.needsUpdate = true;
  }, [labelTexture, labelMaterial]);

  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    return geo;
  }, []);

  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime();
    for (const p of planets) {
      const a = p.orbitAngle + t * p.orbitSpeed;
      p.position.set(
        orbitCenter.x + Math.cos(a) * p.orbitRadius,
        orbitCenter.y + p.orbitYOffset,
        orbitCenter.z + Math.sin(a) * p.orbitRadius
      );
    }

    if (!selectedPlanet) {
      if (lineRef.current) lineRef.current.visible = false;
      if (labelRef.current) labelRef.current.visible = false;
      return;
    }

    const planetPos = selectedPlanet.position;
    const dir = new THREE.Vector3().subVectors(camera.position, planetPos).normalize();
    const lineEnd = new THREE.Vector3().copy(planetPos).addScaledVector(dir, 3.0);
    const labelPos = new THREE.Vector3().copy(lineEnd).addScaledVector(dir, 1.1);

    if (lineRef.current?.geometry?.attributes?.position) {
      const arr = lineRef.current.geometry.attributes.position.array;
      arr[0] = planetPos.x;
      arr[1] = planetPos.y;
      arr[2] = planetPos.z;
      arr[3] = lineEnd.x;
      arr[4] = lineEnd.y;
      arr[5] = lineEnd.z;
      lineRef.current.geometry.attributes.position.needsUpdate = true;
      lineRef.current.visible = true;
    }

    if (labelRef.current) {
      labelRef.current.position.copy(labelPos);
      labelRef.current.lookAt(camera.position);
      labelRef.current.scale.copy(labelScaleRef.current);
      labelRef.current.visible = true;
      labelMaterial.opacity = clamp01(appear) * 0.95;
    }
  });

  return (
    <group>
      {planets.map((p) => (
      <AlienPlanet
        key={p.id}
        planet={p}
        appearance={appearance}
        onPick={onPlanetPick}
      />
      ))}

      <line ref={lineRef} geometry={lineGeometry}>
        <lineBasicMaterial transparent opacity={appear * 0.75} color="#8ff7ff" />
      </line>

      <mesh
        ref={labelRef}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (selectedPlanet) onExplore?.(selectedPlanet);
        }}
      >
        <planeGeometry args={[2.3, 1.0]} />
        <primitive object={labelMaterial} attach="material" />
      </mesh>
    </group>
  );
}

/* ================= Export ================= */

export default function PlanetBackground({
  feedItems = [],
  scrollProgress = 0,
  planetOffset = [-2.2, -0.35, 0],
  sunPos = [-30, 22, -18],
  startCameraPos = [-2.281, 0.364, 3.009],
  endCameraPos = [0.5, 0.4, 11.5],
  startTarget = [-2.385, 0.445, 2.863],
  endTarget = [-0.8, 0.2, 0.0],
  fov = 34,
}) {
  const orbitCenter = useMemo(() => new THREE.Vector3(...planetOffset), [planetOffset]);
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [exploreMode, setExploreMode] = useState(false);

  const focusRef = useRef(null);
  const exploreRef = useRef(null);
  const cameraPosRef = useRef(new THREE.Vector3(...startCameraPos));
  const selectedPlanetRef = useRef(null);

  const setFocus = useCallback(
    (planet) => {
      if (!planet) {
        focusRef.current = null;
        setSelectedPlanet(null);
        setExploreMode(false);
        return;
      }
      const dir = new THREE.Vector3().subVectors(cameraPosRef.current, planet.position).normalize();
      const camPos = new THREE.Vector3().copy(planet.position).addScaledVector(dir, 7.5);
      focusRef.current = {
        position: camPos,
        target: planet.position.clone(),
      };
      setSelectedPlanet(planet);
      setExploreMode(false);
    },
    []
  );

  const startExplore = useCallback((planet) => {
    if (!planet) return;
    const dir = new THREE.Vector3().subVectors(cameraPosRef.current, planet.position).normalize();
    const camPos = new THREE.Vector3().copy(planet.position).addScaledVector(dir, 7.0);
    exploreRef.current = {
      position: camPos,
      target: planet.position.clone(),
    };
    setExploreMode(true);
  }, []);

  const onPlanetPick = useCallback(
    (planet, point, normal) => {
      if (!planet) return;
      if (exploreMode && selectedPlanet?.id === planet.id && point && normal) {
        const camPos = point.clone().addScaledVector(normal, 5.0);
        exploreRef.current = {
          position: camPos,
          target: point.clone(),
        };
        return;
      }
      setFocus(planet);
    },
    [exploreMode, selectedPlanet, setFocus]
  );

  return (
    <div className="h-full w-full bg-[#050814]">
      <Canvas
        dpr={[1, 1.25]}
        camera={{ position: startCameraPos, fov, near: 0.1, far: 260 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color("#050814"), 1);
        }}
      >
        <NebulaBackdrop radius={95} sunDir={new THREE.Vector3(...sunPos).normalize().toArray()} />
        <Stars />
        <Sun sunPos={sunPos} />
        <ambientLight intensity={0.08} />

        <CameraRig
          startCameraPos={startCameraPos}
          endCameraPos={endCameraPos}
          startTarget={startTarget}
          endTarget={endTarget}
          progress={scrollProgress}
          focusRef={focusRef}
          exploreRef={exploreRef}
          exploreActive={exploreMode}
          focusActive={!exploreMode && !!selectedPlanet}
          cameraPosRef={cameraPosRef}
        />

        {exploreMode && selectedPlanet && (
          <OrbitControls
            enableDamping
            dampingFactor={0.08}
            rotateSpeed={0.5}
            zoomSpeed={0.9}
            panSpeed={0.6}
            target={exploreRef.current?.target}
          />
        )}

        <group position={planetOffset}>
          <VoxelPlanet
            seed={1}
            gridSize={32}
            boxSize={6}
            radius={2.35}
            isoLevel={0.0}
            seaLevelWorld={-0.05}
            beachBand={0.03}
            foamBand={0.012}
            sunDir={new THREE.Vector3(...sunPos).normalize().toArray()}
            rotatePeriodSec={80}
            cloudSpeedFactor={0.4}
          />
        </group>

        <OrbitSystem
          feedItems={feedItems}
          scrollProgress={scrollProgress}
          orbitCenter={orbitCenter}
          selectedId={selectedPlanet?.id ?? null}
          onPlanetPick={onPlanetPick}
          onExplore={startExplore}
          selectedPlanetRef={selectedPlanetRef}
        />
      </Canvas>
    </div>
  );
}
