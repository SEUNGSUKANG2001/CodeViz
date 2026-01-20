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
  const width = 520;
  const height = 360;
  const padding = 32;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, width, height);

  // -- Background with glass-like effect --
  ctx.fillStyle = "rgba(4, 7, 18, 0.94)";
  ctx.fillRect(0, 0, width, height);

  // -- Accents & Glass highlights --
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(34, 211, 238, 0.1)");
  gradient.addColorStop(1, "rgba(34, 211, 238, 0.0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // -- Top Scanning Bar --
  const band = ctx.createLinearGradient(0, 0, width, 0);
  band.addColorStop(0, "rgba(34, 211, 238, 0.4)");
  band.addColorStop(0.5, "rgba(34, 211, 238, 0.1)");
  band.addColorStop(1, "rgba(34, 211, 238, 0.4)");
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, width, 4);

  // -- Corner Brackets (Futuristic Style) --
  const cl = 24; // corner length
  ctx.strokeStyle = "rgba(34, 211, 238, 0.6)";
  ctx.lineWidth = 2.5;

  // Top-Left
  ctx.beginPath(); ctx.moveTo(padding / 2, padding / 2 + cl); ctx.lineTo(padding / 2, padding / 2); ctx.lineTo(padding / 2 + cl, padding / 2); ctx.stroke();
  // Bottom-Right
  ctx.beginPath(); ctx.moveTo(width - padding / 2 - cl, height - padding / 2); ctx.lineTo(width - padding / 2, height - padding / 2); ctx.lineTo(width - padding / 2, height - padding / 2 - cl); ctx.stroke();

  // -- UI Elements: Decorative scanning lines --
  ctx.strokeStyle = "rgba(34, 211, 238, 0.08)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(padding, i * 45 + height / 3);
    ctx.lineTo(width - padding, i * 45 + height / 3);
    ctx.stroke();
  }

  // -- Text Shadow --
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = 12;

  // -- Title (Lines[0]) --
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(255, 255, 255, 1.0)";
  ctx.font = "700 38px 'Inter', ui-sans-serif, system-ui";
  ctx.fillText(lines[0] ?? "", padding, padding + 10);

  // -- Underline --
  ctx.fillStyle = "rgba(34, 211, 238, 0.3)";
  ctx.fillRect(padding, padding + 60, 120, 3);

  // -- Stats (Lines[1]) --
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = "500 24px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(lines[1] ?? "", padding, padding + 78);

  // -- Metadata (Lines[2]) --
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.font = "400 21px ui-sans-serif, system-ui";
  ctx.fillText(lines[2] ?? "".toUpperCase(), padding, padding + 128);

  // -- Action Prompt (Lines[3]) --
  const actionText = lines[3] ?? "VIEW ARCHIVE";
  ctx.fillStyle = "rgba(34, 211, 238, 0.9)";
  ctx.font = "700 22px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.letterSpacing = "2px";
  ctx.fillText(`> ${actionText}`, padding, height - padding - 30);

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
  orbitCenterRef,
  selectedPlanetRef,
  focusHeightRef,
}) {
  const { camera } = useThree();

  const currentTarget = useRef(new THREE.Vector3(...startTarget));
  const desiredPos = useRef(new THREE.Vector3());
  const desiredTarget = useRef(new THREE.Vector3());
  const baseQuat = useRef(null);
  const focusQuatRef = useRef(null);
  const focusBasisRef = useRef({
    right: new THREE.Vector3(),
    up: new THREE.Vector3(),
    forward: new THREE.Vector3(),
  });
  const focusTemp = useMemo(() => new THREE.Vector3(), []);

  const startPosVec = useMemo(() => new THREE.Vector3(...startCameraPos), [startCameraPos]);
  const endPosVec = useMemo(() => new THREE.Vector3(...endCameraPos), [endCameraPos]);
  const startTargetVec = useMemo(() => new THREE.Vector3(...startTarget), [startTarget]);
  const endTargetVec = useMemo(() => new THREE.Vector3(...endTarget), [endTarget]);
  const arcOffset = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const followDir = useMemo(() => new THREE.Vector3(1, 0, 0), []);
  const followPos = useMemo(() => new THREE.Vector3(), []);
  const endPosSnap = useMemo(() => new THREE.Vector3(...endCameraPos), [endCameraPos]);

  useFrame((_, dt) => {
    if (!baseQuat.current) {
      baseQuat.current = camera.quaternion.clone();
    }
    const endReached =
      progress >= 0.98 && camera.position.distanceTo(endPosSnap) < 1.2;
    if (exploreActive && exploreRef.current) {
      desiredPos.current.copy(exploreRef.current.position);
      desiredTarget.current.copy(exploreRef.current.target);
    } else if (focusActive && focusRef.current) {
      if (selectedPlanetRef?.current && orbitCenterRef?.current) {
        const planetPos = selectedPlanetRef.current.position;
        const height =
          typeof focusHeightRef?.current === "number"
            ? focusHeightRef.current
            : camera.position.y;
        if (!focusQuatRef.current) {
          focusQuatRef.current = camera.quaternion.clone();
          focusBasisRef.current.right.set(1, 0, 0).applyQuaternion(focusQuatRef.current);
          focusBasisRef.current.up.set(0, 1, 0).applyQuaternion(focusQuatRef.current);
          focusBasisRef.current.forward.set(0, 0, -1).applyQuaternion(focusQuatRef.current);
        }

        const { right, up } = focusBasisRef.current;
        focusTemp.subVectors(planetPos, camera.position);
        const dx = focusTemp.dot(right);
        const dy = focusTemp.dot(up);
        desiredPos.current.copy(camera.position);
        desiredPos.current.addScaledVector(right, dx);
        desiredPos.current.addScaledVector(up, dy);
        desiredPos.current.setY(height);
        desiredTarget.current.copy(planetPos);
      } else {
        desiredPos.current.copy(focusRef.current.position);
        desiredTarget.current.copy(focusRef.current.target);
      }
    } else {
      const t = smoothstep(0.0, 1.0, progress);
      lerpVec3(desiredPos.current, startPosVec, endPosVec, t);
      lerpVec3(desiredTarget.current, startTargetVec, endTargetVec, t);
      const arc = Math.sin(Math.PI * t) * 1.6;
      desiredPos.current.addScaledVector(arcOffset, arc);
    }

    expDamp(camera.position, desiredPos.current, 5.0, dt);
    expDamp(currentTarget.current, desiredTarget.current, 5.0, dt);
    if (exploreActive) {
      focusQuatRef.current = null;
    } else if (focusActive && focusQuatRef.current) {
      camera.quaternion.copy(focusQuatRef.current);
    } else if (!focusActive) {
      focusQuatRef.current = null;
      camera.lookAt(currentTarget.current);
    }

    if (cameraPosRef) {
      cameraPosRef.current.copy(camera.position);
    }
  });

  return null;
}

/* ================= Orbiting Alien Planets ================= */

function AlienPlanet({ planet, appearance, onPick }) {
  const group = useRef(null);
  const hitSphere = useMemo(
    () => new THREE.Sphere(new THREE.Vector3(), planet.radius * 1.1),
    [planet.radius]
  );
  const hitPoint = useMemo(() => new THREE.Vector3(), []);

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

  const hitRaycast = useCallback(
    (raycaster, intersects) => {
      if (!group.current) return;
      hitSphere.center.copy(group.current.position);
      const hit = raycaster.ray.intersectSphere(hitSphere, hitPoint);
      if (hit) {
        intersects.push({
          distance: raycaster.ray.origin.distanceTo(hit),
          point: hit.clone(),
          object: group.current,
        });
      }
    },
    [hitSphere, hitPoint]
  );

  return (
    <group
      ref={group}
      raycast={hitRaycast}
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
  const { camera, gl, raycaster } = useThree();
  const lineRef = useRef(null);
  const labelRef = useRef(null);
  const labelScaleRef = useRef(new THREE.Vector3(3.8, 2.6, 1));
  const pickSphere = useMemo(() => new THREE.Sphere(), []);
  const pickPoint = useMemo(() => new THREE.Vector3(), []);

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
      return new Array(5).fill(0).map((_, i) => {
        const dummyTitles = [
          "Nebula-7 Archive",
          "Vertex Core Registry",
          "Distributed Mesh-Nodes",
          "Quantum Ledger V2",
          "Hyperlayer Fragment"
        ];
        return {
          postId: `dummy-${i}`,
          title: dummyTitles[i] || `Protocol Alpha-${i}`,
          author: { username: "core-node" },
          likeCount: 128 + i * 42,
          commentCount: 16 + i * 4,
        };
      });
    }
    return arr;
  }, [feedItems]);

  const planets = useMemo(() => {
    const N = Math.min(5, items.length);
    const out = [];
    const baseR = 12.0;
    const maxR = 26.0;
    const baseSpeed = 2.4;

    for (let i = 0; i < N; i++) {
      const it = items[i];
      const id = it.postId || it.id || `p-${i}`;
      const seed = hash01(String(id));
      const r = baseR + seed * (maxR - baseR);
      const angle = (i / N) * Math.PI * 2 + seed * 2.0;
      const speed = baseSpeed / Math.pow(r, 1.5);
      const yOffset = (seed - 0.5) * 2.4;
      const eccentricity = 0.08 + seed * 0.32;
      const semiMinor = r * (1 - eccentricity * 0.6);
      const orbitNode = seed * Math.PI * 2;
      const orbitInclination = (seed - 0.5) * 0.9;

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
        orbitSemiMinor: semiMinor,
        orbitAngle: angle,
        orbitSpeed: speed,
        orbitYOffset: yOffset,
        orbitNode,
        orbitInclination,
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

  useEffect(() => {
    if (!gl?.domElement) return;
    const handlePointer = (event) => {
      if (appearance.opacity < 0.05) return;
      const target = event.target;
      const tag = target?.tagName?.toLowerCase();
      if (tag && ["button", "input", "textarea", "select", "a"].includes(tag)) return;

      const rect = gl.domElement.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        return;
      }

      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera({ x, y }, camera);

      if (labelRef.current && selectedPlanet) {
        const labelHits = raycaster.intersectObject(labelRef.current, true);
        if (labelHits.length > 0) {
          onExplore?.(selectedPlanet);
          return;
        }
      }

      let hitPlanet = null;
      let hitDistance = Infinity;
      let hitPoint = null;
      let hitNormal = null;

      for (const p of planets) {
        pickSphere.center.copy(p.position);
        pickSphere.radius = p.radius * 1.1;
        const hit = raycaster.ray.intersectSphere(pickSphere, pickPoint);
        if (!hit) continue;
        const dist = raycaster.ray.origin.distanceTo(hit);
        if (dist < hitDistance) {
          hitDistance = dist;
          hitPlanet = p;
          hitPoint = hit.clone();
          hitNormal = hit.clone().sub(p.position).normalize();
        }
      }

      if (hitPlanet) {
        onPlanetPick?.(hitPlanet, hitPoint, hitNormal);
      }
    };

    window.addEventListener("pointerdown", handlePointer, { passive: true });
    return () => window.removeEventListener("pointerdown", handlePointer);
  }, [appearance.opacity, camera, gl, onExplore, onPlanetPick, planets, raycaster, selectedPlanet]);

  const tempVec = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime();
    for (const p of planets) {
      const a = p.orbitAngle + t * p.orbitSpeed;
      tempVec.set(Math.cos(a) * p.orbitRadius, 0, Math.sin(a) * p.orbitSemiMinor);
      tempVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), p.orbitNode);
      tempVec.applyAxisAngle(new THREE.Vector3(1, 0, 0), p.orbitInclination);
      p.position.set(
        orbitCenter.x + tempVec.x,
        orbitCenter.y + tempVec.y + p.orbitYOffset,
        orbitCenter.z + tempVec.z
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
        <planeGeometry args={[3.8, 2.6]} />
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
  startTarget = [-2.385, 0.445, 2.863],
  endCameraPos,
  endTarget,
  fov = 34,
}) {
  const orbitCenter = useMemo(() => new THREE.Vector3(...planetOffset), [planetOffset]);
  const resolvedEndCameraPos = useMemo(() => {
    if (endCameraPos) return endCameraPos;
    return [orbitCenter.x, orbitCenter.y + 60, orbitCenter.z + 34];
  }, [endCameraPos, orbitCenter]);
  const resolvedEndTarget = useMemo(() => {
    if (endTarget) return endTarget;
    return [orbitCenter.x, orbitCenter.y, orbitCenter.z];
  }, [endTarget, orbitCenter]);
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [exploreMode, setExploreMode] = useState(false);

  const focusRef = useRef(null);
  const exploreRef = useRef(null);
  const cameraPosRef = useRef(new THREE.Vector3(...startCameraPos));
  const selectedPlanetRef = useRef(null);
  const focusHeightRef = useRef(startCameraPos[1]);

  const setFocus = useCallback(
    (planet) => {
      if (!planet) {
        focusRef.current = null;
        setSelectedPlanet(null);
        setExploreMode(false);
        return;
      }
      focusHeightRef.current = cameraPosRef.current.y;
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
        eventSource={document.body}
        eventPrefix="client"
        onCreated={({ gl, camera }) => {
          gl.setClearColor(new THREE.Color("#050814"), 1);
          camera.lookAt(...startTarget);
        }}
      >
        <NebulaBackdrop radius={95} sunDir={new THREE.Vector3(...sunPos).normalize().toArray()} />
        <Stars />
        <Sun sunPos={sunPos} />
        <ambientLight intensity={0.08} />

        <CameraRig
          startCameraPos={startCameraPos}
          endCameraPos={resolvedEndCameraPos}
          startTarget={startTarget}
          endTarget={resolvedEndTarget}
          progress={scrollProgress}
          focusRef={focusRef}
          exploreRef={exploreRef}
          exploreActive={exploreMode}
          focusActive={!exploreMode && !!selectedPlanet}
          cameraPosRef={cameraPosRef}
          orbitCenterRef={{ current: orbitCenter }}
          selectedPlanetRef={selectedPlanetRef}
          focusHeightRef={focusHeightRef}
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
