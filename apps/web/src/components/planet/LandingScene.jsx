"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef, useState, useCallback, useLayoutEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import VoxelPlanet from "./VoxelPlanet.jsx";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";

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

function Sun({ sunPosRef, sunPos = [-30, 22, -18], distance = 90, size = 14, haloSize = 34, intensity = 4.4, lightRef }) {
  const lightRefLocal = useRef();
  const spriteRef = useRef();

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

  useFrame(() => {
    const pos = sunPosRef?.current ? new THREE.Vector3(...sunPosRef.current) : new THREE.Vector3(...sunPos);
    const targetLight = lightRef?.current ?? lightRefLocal.current;
    if (targetLight) targetLight.position.copy(pos);
    const spritePos = pos.clone().normalize().multiplyScalar(distance);
    if (spriteRef.current) spriteRef.current.position.copy(spritePos);
  });

  return (
    <>
      <directionalLight
        position={sunPos}
        ref={lightRefLocal}
        intensity={intensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <group ref={spriteRef}>
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

function ScreenshotManager({ onCaptureReady }) {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    if (!onCaptureReady) return;

    const capture = async () => {
      // Force a render to ensure the buffer is up to date
      gl.render(scene, camera);
      return gl.domElement.toDataURL("image/png");
    };

    onCaptureReady(capture);
  }, [gl, scene, camera, onCaptureReady]);

  return null;
}

function CameraRig({ mode, targets, enabled = true }) {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3(...targets.main.target));
  const desiredPos = useRef(new THREE.Vector3());
  const desiredTarget = useRef(new THREE.Vector3());
  const dampingRef = useRef(6.0);
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
    if (!enabled) return;
    const conf = targets[mode] || targets.main;
    desiredPos.current.set(...conf.position);
    desiredTarget.current.set(...conf.target);

    if (modeRef.current !== mode) {
      prevModeRef.current = modeRef.current;
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
      const speed = 0.96;
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
      const base = dampingRef.current;
      const damp = mode === "main" && prevModeRef.current === "carousel" ? base * 0.8 : base;
      expDamp(camera.position, desiredPos.current, damp, dt);
      expDamp(targetRef.current, desiredTarget.current, damp, dt);
    }

    camera.lookAt(targetRef.current);
  });

  return null;
}

function OrbitDragControls({ enabled, targetRef, onInteract }) {
  const { camera, gl } = useThree();
  const dragRef = useRef({
    active: false,
    mode: "rotate",
    lastX: 0,
    lastY: 0,
    theta: 0,
    phi: 0,
    radius: 8,
  });
  const targetOffsetRef = useRef(new THREE.Vector3());

  useEffect(() => {
    if (!enabled) return;
    const updateFromCamera = () => {
      const target = targetRef.current || new THREE.Object3D();
      const targetPos = new THREE.Vector3();
      target.getWorldPosition(targetPos);
      targetPos.add(targetOffsetRef.current);
      const offset = camera.position.clone().sub(targetPos);
      dragRef.current.radius = offset.length();
      dragRef.current.theta = Math.atan2(offset.x, offset.z);
      dragRef.current.phi = Math.acos(THREE.MathUtils.clamp(offset.y / dragRef.current.radius, -1, 1));
    };
    updateFromCamera();

    const dom = gl.domElement;
    const isInside = (e) => dom && dom.contains(e.target);
    const onPointerDown = (e) => {
      if (!isInside(e)) return;
      if (e.button !== 0 && e.button !== 1 && e.button !== 2) return;
      e.preventDefault();
      onInteract?.();
      dragRef.current.active = true;
      dragRef.current.mode = e.button === 0 ? "rotate" : "pan";
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
    };
    const onPointerMove = (e) => {
      if (!dragRef.current.active) return;
      const dx = e.clientX - dragRef.current.lastX;
      const dy = e.clientY - dragRef.current.lastY;
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;

      const target = targetRef.current || new THREE.Object3D();
      const targetPos = new THREE.Vector3();
      target.getWorldPosition(targetPos);

      if (dragRef.current.mode === "pan") {
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        const panScale = dragRef.current.radius * 0.002;
        targetOffsetRef.current.addScaledVector(right, -dx * panScale);
        targetOffsetRef.current.addScaledVector(up, dy * panScale);
      } else {
        dragRef.current.theta -= dx * 0.005;
        dragRef.current.phi = THREE.MathUtils.clamp(
          dragRef.current.phi + dy * 0.004,
          0.25,
          Math.PI - 0.25
        );
      }

      targetPos.add(targetOffsetRef.current);

      const r = dragRef.current.radius;
      const sinPhi = Math.sin(dragRef.current.phi);
      const pos = new THREE.Vector3(
        r * sinPhi * Math.sin(dragRef.current.theta),
        r * Math.cos(dragRef.current.phi),
        r * sinPhi * Math.cos(dragRef.current.theta)
      ).add(targetPos);
      camera.position.copy(pos);
      camera.lookAt(targetPos);
    };
    const onPointerUp = () => {
      dragRef.current.active = false;
    };
    const onContextMenu = (e) => {
      e.preventDefault();
    };
    const onWheel = (e) => {
      if (!isInside(e)) return;
      e.preventDefault();
      onInteract?.();
      dragRef.current.radius = THREE.MathUtils.clamp(
        dragRef.current.radius + e.deltaY * 0.002,
        2.5,
        40
      );
      const target = targetRef.current || new THREE.Object3D();
      const targetPos = new THREE.Vector3();
      target.getWorldPosition(targetPos);
      targetPos.add(targetOffsetRef.current);
      const r = dragRef.current.radius;
      const sinPhi = Math.sin(dragRef.current.phi);
      const pos = new THREE.Vector3(
        r * sinPhi * Math.sin(dragRef.current.theta),
        r * Math.cos(dragRef.current.phi),
        r * sinPhi * Math.cos(dragRef.current.theta)
      ).add(targetPos);
      camera.position.copy(pos);
      camera.lookAt(targetPos);
    };

    dom.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    dom.addEventListener("wheel", onWheel, { passive: false });
    dom.addEventListener("contextmenu", onContextMenu);
    return () => {
      dom.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      dom.removeEventListener("wheel", onWheel);
      dom.removeEventListener("contextmenu", onContextMenu);
    };
  }, [enabled, camera, targetRef, onInteract, gl]);

  return null;
}

function SunRig({ mode, base, sunPosRef, angleRef, lightRef = null, orbit = false }) {
  useFrame((_, dt) => {
    if (orbit) {
      angleRef.current += dt * 0.06;
    } else {
      const targetAngle = mode === "carousel" ? Math.PI * 0.25 : 0;
      const t = 1 - Math.exp(-1 * dt);
      angleRef.current += (targetAngle - angleRef.current) * t;
    }
    const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angleRef.current);
    const pos = base.clone().applyQuaternion(rot).toArray();
    sunPosRef.current = pos;
    if (lightRef?.current) {
      lightRef.current.position.set(pos[0], pos[1], pos[2]);
    }
  });
  return null;
}

function LandingCameraCue({ active, placement, planetRef, lockRef, override = false }) {
  const { camera } = useThree();
  const animRef = useRef({
    t: 0,
    from: new THREE.Vector3(),
    to: new THREE.Vector3(),
    fromFov: 34,
    toFov: 42,
    target: new THREE.Vector3(),
  });
  const delayRef = useRef(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!active || !placement?.point) return;
    if (lockRef && !lockRef.current?.position) return;
    const worldPoint = new THREE.Vector3(...placement.point);
    const center = new THREE.Vector3();
    if (planetRef?.current) {
      planetRef.current.getWorldPosition(center);
    }
    const outward = worldPoint.clone().sub(center);
    let normal = outward.lengthSq() > 1e-6 ? outward.normalize() : new THREE.Vector3(...placement.normal).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const tangent = up.clone().projectOnPlane(normal);
    if (tangent.lengthSq() < 1e-6) tangent.set(1, 0, 0);
    tangent.normalize();
    const dist = PLANET_RADIUS + 1.9;
    const targetPos = center
      .clone()
      .add(normal.clone().multiplyScalar(dist))
      .add(tangent.clone().multiplyScalar(1.6))
      .add(up.clone().multiplyScalar(-1.35));
    animRef.current.t = 0;
    if (lockRef?.current?.position) {
      animRef.current.from.copy(lockRef.current.position);
    } else {
      animRef.current.from.copy(camera.position);
    }
    animRef.current.to.copy(targetPos);
    animRef.current.fromFov = camera.fov;
    animRef.current.toFov = camera.fov + 8;
    animRef.current.target.copy(worldPoint);
    delayRef.current = performance.now() + 2000;
    startedRef.current = false;
  }, [active, placement, camera, planetRef, lockRef]);

  useFrame((_, dt) => {
    if (!active || !placement?.point) return;
    if (performance.now() < delayRef.current) {
      if (!override && lockRef?.current?.position) {
        camera.position.copy(lockRef.current.position);
      }
      if (!override) {
        camera.lookAt(animRef.current.target);
      }
      return;
    }
    if (!startedRef.current) {
      animRef.current.t = 0;
      startedRef.current = true;
    }
    animRef.current.t = Math.min(1, animRef.current.t + dt * 0.175);
    const t = animRef.current.t;
    const eased = t * t * (3 - 2 * t);
    camera.position.lerpVectors(animRef.current.from, animRef.current.to, eased);
    camera.fov = THREE.MathUtils.lerp(animRef.current.fromFov, animRef.current.toFov, eased);
    camera.updateProjectionMatrix();
    camera.lookAt(animRef.current.target);
  });

  return null;
}

function StarsOrbit({ active, groupRef }) {
  useFrame((_, dt) => {
    if (!active || !groupRef.current) return;
    groupRef.current.rotation.y += dt * 0.05;
  });
  return null;
}

function LandingCameraLock({ active, lockRef, landingKey, onReady }) {
  const { camera } = useThree();
  useLayoutEffect(() => {
    if (!active) return;
    if (lockRef.current?.key === landingKey) return;
    camera.updateMatrixWorld();
    const position = new THREE.Vector3();
    camera.getWorldPosition(position);
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    lockRef.current = {
      key: landingKey,
      position,
      forward,
      up: camera.up.clone(),
    };
    onReady?.();
  }, [active, landingKey, camera, lockRef, onReady]);
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

function PlanetNode({
  planet,
  position,
  onPick,
  placementMode,
  placement,
  focusId,
  enableRotateDrag,
  shipLandingActive,
  onShipArrive,
  shipTestMode,
  shipLandingKey,
  registerActiveRef,
  cityBuilt,
  cityGraphData,
  cityTheme = "Thema1",
  selectedNodeId,
  onCityNodeSelect,
}) {
  const params = resolvePlanetParams(planet);
  const palette = planet?.palette || {};
  const cloudColor = planet?.cloudColor || {};
  const groupRef = useRef(null);
  const targetQuat = useRef(new THREE.Quaternion());
  const hasTarget = useRef(false);
  const dragRef = useRef({ active: false, lastX: 0, lastY: 0 });
  useEffect(() => {
    if (!registerActiveRef) return;
    if (focusId && planet?.id !== focusId) return;
    registerActiveRef(groupRef.current);
  }, [focusId, planet, registerActiveRef]);

  useEffect(() => {
    if (!placementMode || !placement?.point) {
      hasTarget.current = false;
      return;
    }
    if (focusId && planet?.id !== focusId) {
      hasTarget.current = false;
      return;
    }
    const point = new THREE.Vector3(...placement.point);
    const localDir = point.clone().normalize();
    const targetDir = new THREE.Vector3(0, 0.2, 1).normalize();
    targetQuat.current.setFromUnitVectors(localDir, targetDir);
    hasTarget.current = true;
  }, [placementMode, placement, focusId, planet, position]);

  useEffect(() => {
    if (!enableRotateDrag) return;
    const onPointerDown = (e) => {
      if (e.button !== 0) return;
      dragRef.current.active = true;
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
    };
    const onPointerMove = (e) => {
      if (!dragRef.current.active || !groupRef.current) return;
      const dx = e.clientX - dragRef.current.lastX;
      const dy = e.clientY - dragRef.current.lastY;
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
      hasTarget.current = false;
      groupRef.current.rotation.y += dx * 0.005;
      groupRef.current.rotation.x += dy * 0.003;
      groupRef.current.rotation.x = THREE.MathUtils.clamp(groupRef.current.rotation.x, -1.2, 1.2);
    };
    const onPointerUp = () => {
      dragRef.current.active = false;
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [enableRotateDrag]);

  useFrame((_, dt) => {
    if (!groupRef.current || !hasTarget.current) return;
    const t = 1 - Math.exp(-6 * dt);
    groupRef.current.quaternion.slerp(targetQuat.current, t);
  });

  return (
    <group position={position} ref={groupRef}>
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
        rotatePeriodSec={placementMode || cityBuilt ? 0 : 80}
        cloudSpeedFactor={0.4}
        onPick={(point, normal) => {
          if (!onPick) return;
          if (!groupRef.current) {
            onPick(point, normal);
            return;
          }
          const localPoint = groupRef.current.worldToLocal(point.clone());
          const inv = groupRef.current.quaternion.clone().invert();
          const localNormal = normal.clone().applyQuaternion(inv).normalize();
          onPick(localPoint, localNormal);
        }}
      />
      {!cityBuilt && placementMode && placement && focusId === planet?.id && (
        <PlacementMarker placement={placement} />
      )}
      {placement && focusId === planet?.id && cityGraphData && (
        <CityCluster
          placement={placement}
          graphData={cityGraphData}
          theme={cityTheme}
          selectedNodeId={selectedNodeId}
          onNodeSelect={onCityNodeSelect}
        />
      )}
      {cityBuilt && !cityGraphData && placement && focusId === planet?.id && (
        <LandingCharacters placement={placement} />
      )}
    </group>
  );
}

function PlacementMarker({ placement }) {
  const normal = useMemo(() => {
    if (!placement?.normal) return null;
    return new THREE.Vector3(...placement.normal).normalize();
  }, [placement]);
  const position = placement?.point ?? null;
  const rotation = useMemo(() => {
    if (!normal) return null;
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(up, normal);
    return q;
  }, [normal]);
  const pulseRef = useRef(null);
  const glowRef = useRef(null);

  useFrame((state) => {
    if (!pulseRef.current || !glowRef.current) return;
    const t = state.clock.getElapsedTime();
    const s = 1 + Math.sin(t * 3.2) * 0.08;
    pulseRef.current.scale.setScalar(s);
    glowRef.current.material.opacity = 0.35 + Math.sin(t * 3.2) * 0.15;
  });

  if (!position || !rotation) return null;

  return (
    <group position={position} quaternion={rotation}>
      <group ref={pulseRef}>
        <mesh>
          <cylinderGeometry args={[0.08, 0.12, 0.28, 12]} />
          <meshStandardMaterial color="#cfe9ff" emissive="#2bd5ff" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <coneGeometry args={[0.12, 0.3, 12]} />
          <meshStandardMaterial color="#f7fbff" emissive="#8be7ff" emissiveIntensity={0.7} />
        </mesh>
        <mesh position={[0.12, 0, -0.02]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.16, 0.02, 0.08]} />
          <meshStandardMaterial color="#6fd3ff" emissive="#4bc2ff" emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[-0.12, 0, -0.02]} rotation={[0, 0, -Math.PI / 2]}>
          <boxGeometry args={[0.16, 0.02, 0.08]} />
          <meshStandardMaterial color="#6fd3ff" emissive="#4bc2ff" emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[0, -0.2, 0]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshStandardMaterial color="#2bd5ff" emissive="#2bd5ff" emissiveIntensity={1.4} />
        </mesh>
      </group>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.45, 18, 18]} />
        <meshBasicMaterial color="#58e3ff" transparent opacity={0.45} />
      </mesh>
    </group>
  );
}

function CityMarker({ placement }) {
  const normal = useMemo(() => {
    if (!placement?.normal) return null;
    return new THREE.Vector3(...placement.normal).normalize();
  }, [placement]);
  const position = placement?.point ?? null;
  const rotation = useMemo(() => {
    if (!normal) return null;
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(up, normal);
    return q;
  }, [normal]);

  if (!position || !rotation) return null;

  return (
    <group position={position} quaternion={rotation}>
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.22, 0.18, 0.22]} />
        <meshStandardMaterial color="#d9f1ff" emissive="#64d9ff" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0.18, 0.06, -0.1]}>
        <boxGeometry args={[0.14, 0.12, 0.14]} />
        <meshStandardMaterial color="#b7ddff" emissive="#48c3ff" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[-0.18, 0.07, 0.12]}>
        <boxGeometry args={[0.16, 0.14, 0.16]} />
        <meshStandardMaterial color="#c9e8ff" emissive="#59ceff" emissiveIntensity={0.32} />
      </mesh>
      <mesh position={[0, 0.24, 0]}>
        <boxGeometry args={[0.08, 0.14, 0.08]} />
        <meshStandardMaterial color="#ecf8ff" emissive="#7fe6ff" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

const CITY_THEME_CONFIG = {
  Thema1: { lastBuilding: "n" },
  Thema2: { lastBuilding: "t" },
  Thema3: { lastBuilding: "p" },
};

const CITY_OBJ_CACHE = new Map();
const CHARACTER_CACHE = new Map();

function loadCityModel(url, objLoader, mtlLoader) {
  if (CITY_OBJ_CACHE.has(url)) {
    return Promise.resolve(CITY_OBJ_CACHE.get(url).clone());
  }
  return new Promise((resolve, reject) => {
    const baseUrl = url.substring(0, url.lastIndexOf("/") + 1);
    const objFile = url.split("/").pop();
    const mtlFile = url.replace(".obj", ".mtl").split("/").pop();
    mtlLoader.setPath(baseUrl).load(
      mtlFile,
      (mtl) => {
        mtl.preload();
        objLoader.setMaterials(mtl);
        objLoader.setPath(baseUrl).load(
          objFile,
          (obj) => {
            CITY_OBJ_CACHE.set(url, obj);
            resolve(obj.clone());
          },
          undefined,
          reject
        );
      },
      undefined,
      () => {
        objLoader.setMaterials(null);
        objLoader.setPath(baseUrl).load(
          objFile,
          (obj) => {
            obj.traverse((c) => {
              if (c.isMesh) {
                c.material = new THREE.MeshStandardMaterial({ color: "#d9e8ff" });
              }
            });
            CITY_OBJ_CACHE.set(url, obj);
            resolve(obj.clone());
          },
          undefined,
          reject
        );
      }
    );
  });
}

function loadCharacterObj(url) {
  if (CHARACTER_CACHE.has(url)) {
    return Promise.resolve(CHARACTER_CACHE.get(url).clone());
  }
  const objLoader = new OBJLoader();
  const mtlLoader = new MTLLoader();
  return new Promise((resolve, reject) => {
    const baseUrl = url.substring(0, url.lastIndexOf("/") + 1);
    const objFile = url.split("/").pop();
    const mtlFile = url.replace(".obj", ".mtl").split("/").pop();
    mtlLoader.setPath(baseUrl).load(
      mtlFile,
      (mtl) => {
        mtl.preload();
        objLoader.setMaterials(mtl);
        objLoader.setPath(baseUrl).load(
          objFile,
          (obj) => {
            CHARACTER_CACHE.set(url, obj);
            resolve(obj.clone());
          },
          undefined,
          reject
        );
      },
      undefined,
      () => {
        objLoader.setMaterials(null);
        objLoader.setPath(baseUrl).load(
          objFile,
          (obj) => {
            obj.traverse((c) => {
              if (c.isMesh) {
                c.material = new THREE.MeshStandardMaterial({ color: "#f4f7ff" });
              }
            });
            CHARACTER_CACHE.set(url, obj);
            resolve(obj.clone());
          },
          undefined,
          reject
        );
      }
    );
  });
}

function LandingCharacters({ placement, count = 4 }) {
  const groupRef = useRef(null);
  const [model, setModel] = useState(null);
  const startTimeRef = useRef(null);
  const normal = useMemo(() => {
    if (!placement?.normal) return null;
    return new THREE.Vector3(...placement.normal).normalize();
  }, [placement]);
  const walkers = useMemo(
    () =>
      Array.from({ length: count }).map((_, idx) => {
        const delay = idx * 0.55;
        const angle = (Math.random() * 0.8 - 0.4) * Math.PI;
        const speed = 0.08 + Math.random() * 0.04;
        const maxDist = 0.6 + Math.random() * 0.4;
        return { delay, angle, speed, maxDist };
      }),
    [count]
  );

  useEffect(() => {
    let mounted = true;
    loadCharacterObj("/Themas/Thema1/character-oobi.obj")
      .then((obj) => {
        if (!mounted) return;
        const box = new THREE.Box3().setFromObject(obj);
        const size = box.getSize(new THREE.Vector3());
        const scale = 0.08 / Math.max(size.x, size.y, size.z);
        obj.scale.setScalar(scale);
        setModel(obj);
      })
      .catch(() => { });
    return () => {
      mounted = false;
    };
  }, []);

  useFrame((state) => {
    if (!groupRef.current || !normal) return;
    const time = state.clock.getElapsedTime();
    if (startTimeRef.current === null) {
      startTimeRef.current = time;
    }
    const baseTime = startTimeRef.current ?? time;
    const tangent1 = new THREE.Vector3(1, 0, 0).projectOnPlane(normal).normalize();
    const tangent2 = new THREE.Vector3().crossVectors(normal, tangent1).normalize();
    const baseStart = tangent1.clone().multiplyScalar(0.12).add(tangent2.clone().multiplyScalar(-0.06));
    groupRef.current.children.forEach((child, idx) => {
      const walker = walkers[idx];
      const t = time - baseTime - walker.delay;
      if (t < 0) {
        child.visible = false;
        return;
      }
      child.visible = true;
      const dir = tangent1
        .clone()
        .multiplyScalar(Math.cos(walker.angle))
        .add(tangent2.clone().multiplyScalar(Math.sin(walker.angle)))
        .normalize();
      const walkDist = Math.min(walker.maxDist, walker.speed * t);
      const wobble = Math.sin(t * 0.8) * 0.03;
      const offset = baseStart
        .clone()
        .add(dir.clone().multiplyScalar(walkDist))
        .add(tangent2.clone().multiplyScalar(wobble));
      child.position.copy(offset);
      child.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      child.lookAt(offset.clone().add(dir));
    });
  });

  if (!model || !normal || !placement?.point) return null;

  const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  return (
    <group position={placement.point} quaternion={rotation} ref={groupRef}>
      {Array.from({ length: count }).map((_, idx) => (
        <primitive key={idx} object={model.clone()} />
      ))}
    </group>
  );
}

function CityCluster({ placement, graphData, theme, selectedNodeId, onNodeSelect }) {
  const groupRef = useRef(null);
  const objLoaderRef = useRef(new OBJLoader());
  const mtlLoaderRef = useRef(new MTLLoader());
  const nodes = graphData?.nodes || [];
  const edges = graphData?.edges || graphData?.links || [];
  const edgeGroupRef = useRef(null);
  const ringRef = useRef(null);
  const nodePosRef = useRef(new Map());
  const nodeNormalRef = useRef(new Map());
  const { camera, gl } = useThree();

  useEffect(() => {
    if (!groupRef.current || !placement?.point || !nodes.length) return;
    groupRef.current.clear();
    const config = CITY_THEME_CONFIG[theme] || CITY_THEME_CONFIG.Thema1;
    const startCode = "a".charCodeAt(0);
    const endCode = config.lastBuilding.charCodeAt(0);
    const buildings = [];
    for (let i = startCode; i <= endCode; i++) {
      buildings.push(`/Themas/${theme}/building-${String.fromCharCode(i)}.obj`);
    }

    const normal = new THREE.Vector3(...placement.normal).normalize();
    const base = new THREE.Vector3(...placement.point).normalize().multiplyScalar(PLANET_RADIUS + 0.02);
    const tangent1 = new THREE.Vector3(1, 0, 0).projectOnPlane(normal).normalize();
    const tangent2 = new THREE.Vector3().crossVectors(normal, tangent1).normalize();
    const limit = Math.min(nodes.length, 140);
    const pos2 = Array.from({ length: limit }, () => new THREE.Vector2());
    const vel2 = Array.from({ length: limit }, () => new THREE.Vector2());
    const nodeIndex = new Map();

    for (let i = 0; i < limit; i++) {
      const node = nodes[i];
      nodeIndex.set(node.id, i);
      const angle = i * 0.6;
      const radius = 0.12 * Math.sqrt(i);
      pos2[i].set(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }

    const repel = 0.008;
    const spring = 0.32;
    const linkDist = 0.14;
    const damping = 0.82;
    const iterations = 80;
    const dt = 0.035;

    for (let step = 0; step < iterations; step += 1) {
      for (let i = 0; i < limit; i++) {
        for (let j = i + 1; j < limit; j++) {
          const dx = pos2[i].x - pos2[j].x;
          const dy = pos2[i].y - pos2[j].y;
          const distSq = dx * dx + dy * dy + 0.001;
          const force = repel / distSq;
          const invDist = 1 / Math.sqrt(distSq);
          const fx = dx * invDist * force;
          const fy = dy * invDist * force;
          vel2[i].x += fx;
          vel2[i].y += fy;
          vel2[j].x -= fx;
          vel2[j].y -= fy;
        }
      }
      edges.forEach((edge) => {
        const sId = typeof edge.source === "object" ? edge.source.id : edge.source;
        const tId = typeof edge.target === "object" ? edge.target.id : edge.target;
        const si = nodeIndex.get(sId);
        const ti = nodeIndex.get(tId);
        if (si == null || ti == null) return;
        const dx = pos2[ti].x - pos2[si].x;
        const dy = pos2[ti].y - pos2[si].y;
        const dist = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));
        const force = (dist - linkDist) * spring;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        vel2[si].x += fx;
        vel2[si].y += fy;
        vel2[ti].x -= fx;
        vel2[ti].y -= fy;
      });
      for (let i = 0; i < limit; i++) {
        pos2[i].x += vel2[i].x * dt;
        pos2[i].y += vel2[i].y * dt;
        vel2[i].multiplyScalar(damping);
      }
    }

    const surfacePositions = new Array(limit);
    for (let i = 0; i < limit; i++) {
      const offset = tangent1.clone().multiplyScalar(pos2[i].x).add(tangent2.clone().multiplyScalar(pos2[i].y));
      const position = base.clone().add(offset).normalize().multiplyScalar(PLANET_RADIUS + 0.02);
      surfacePositions[i] = position;
    }

    nodePosRef.current.clear();
    nodeNormalRef.current.clear();
    edgeGroupRef.current = new THREE.Group();

    if (edges.length && edgeGroupRef.current) {
      const tubeRadius = PLANET_RADIUS * 0.0016;
      edges.forEach((edge) => {
        const sId = typeof edge.source === "object" ? edge.source.id : edge.source;
        const tId = typeof edge.target === "object" ? edge.target.id : edge.target;
        const si = nodeIndex.get(sId);
        const ti = nodeIndex.get(tId);
        if (si == null || ti == null) return;
        const sPos = surfacePositions[si];
        const tPos = surfacePositions[ti];
        const mid = sPos.clone().add(tPos).multiplyScalar(0.5);
        const ctrl = mid.clone().normalize().multiplyScalar(PLANET_RADIUS + 0.05);
        const curve = new THREE.QuadraticBezierCurve3(sPos, ctrl, tPos);
        const geometry = new THREE.TubeGeometry(curve, 6, tubeRadius, 6, false);
        const material = new THREE.MeshBasicMaterial({ color: "#2f3338", transparent: true, opacity: 0.75 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData = { isRoad: true, sourceId: sId, targetId: tId };
        edgeGroupRef.current.add(mesh);
      });
      groupRef.current.add(edgeGroupRef.current);
    }

    for (let i = 0; i < limit; i++) {
      const node = nodes[i];
      const height = Math.max(
        PLANET_RADIUS * 0.008,
        Math.log((node.lines || node.loc || 10) + 1) * PLANET_RADIUS * 0.004
      );
      const url = buildings[i % buildings.length];
      const surfacePos = surfacePositions[i];
      const nodeNormal = surfacePos.clone().normalize();
      nodePosRef.current.set(node.id, surfacePos.clone());
      nodeNormalRef.current.set(node.id, nodeNormal.clone());
      loadCityModel(url, objLoaderRef.current, mtlLoaderRef.current)
        .then((obj) => {
          obj.rotation.x = -Math.PI / 2;
          obj.rotation.z = Math.PI;
          obj.scale.setScalar(height);
          const box = new THREE.Box3().setFromObject(obj);
          const minY = box.min.y;
          obj.position.z = minY;
          obj.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          const wrapper = new THREE.Group();
          wrapper.position.copy(surfacePos);
          wrapper.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nodeNormal);
          wrapper.userData.nodeId = node.id;
          wrapper.userData.nodePosition = surfacePos.clone();
          wrapper.userData.nodeNormal = nodeNormal.clone();
          obj.traverse((child) => {
            child.userData = {
              ...child.userData,
              nodeId: node.id,
              nodePosition: surfacePos.clone(),
              nodeNormal: nodeNormal.clone(),
            };
          });
          wrapper.add(obj);
          groupRef.current?.add(wrapper);
        })
        .catch(() => { });
    }
    if (!ringRef.current) {
      const ringGeo = new THREE.RingGeometry(PLANET_RADIUS * 0.02, PLANET_RADIUS * 0.028, 36);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xff1b8c,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      });
      ringRef.current = new THREE.Mesh(ringGeo, ringMat);
      ringRef.current.visible = false;
      groupRef.current?.add(ringRef.current);
    }
  }, [placement, graphData, theme, nodes, edges]);

  const raycaster = useRef(new THREE.Raycaster());
  const pointer = useRef(new THREE.Vector2());

  useEffect(() => {
    if (!gl?.domElement) return;
    const onPointerDown = (e) => {
      if (!groupRef.current) return;
      const rect = gl.domElement.getBoundingClientRect();
      pointer.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(pointer.current, camera);
      const hits = raycaster.current.intersectObjects(groupRef.current.children, true);
      for (const hit of hits) {
        let obj = hit.object;
        while (obj && !obj.userData?.nodeId) {
          obj = obj.parent;
        }
        if (obj?.userData?.isRoad) continue;
        if (obj?.userData?.nodeId) {
          onNodeSelect?.(obj.userData.nodeId, obj.userData.nodePosition, obj.userData.nodeNormal);
          break;
        }
      }
    };
    gl.domElement.addEventListener("pointerdown", onPointerDown);
    return () => gl.domElement.removeEventListener("pointerdown", onPointerDown);
  }, [gl, camera, onNodeSelect]);

  useEffect(() => {
    if (!edgeGroupRef.current) return;
    edgeGroupRef.current.children.forEach((mesh) => {
      const { sourceId, targetId } = mesh.userData || {};
      const mat = mesh.material;
      if (!mat) return;
      if (!selectedNodeId) {
        mat.color.set("#2f3338");
        mat.opacity = 0.75;
        return;
      }
      if (sourceId === selectedNodeId) {
        mat.color.set("#00ffff");
        mat.opacity = 1.0;
      } else if (targetId === selectedNodeId) {
        mat.color.set("#ff1b8c");
        mat.opacity = 1.0;
      } else {
        mat.color.set("#2f3338");
        mat.opacity = 0.45;
      }
    });
  }, [selectedNodeId]);

  useEffect(() => {
    if (!ringRef.current) return;
    if (!selectedNodeId) {
      ringRef.current.visible = false;
      return;
    }
    const pos = nodePosRef.current.get(selectedNodeId);
    const normal = nodeNormalRef.current.get(selectedNodeId);
    if (!pos || !normal) {
      ringRef.current.visible = false;
      return;
    }
    ringRef.current.visible = true;
    ringRef.current.position.copy(pos);
    ringRef.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  }, [selectedNodeId]);

  return <group ref={groupRef} />;
}

const TRAIN_PARTS = [
  { key: "a", obj: "/train/train-electric-city-a.obj", mtl: "/train/train-electric-city-a.mtl" },
  { key: "b", obj: "/train/train-electric-city-b.obj", mtl: "/train/train-electric-city-b.mtl" },
  { key: "c", obj: "/train/train-electric-city-c.obj", mtl: "/train/train-electric-city-c.mtl" },
];
const TRAIN_CACHE = new Map();

function loadTrainPart(part, objLoader, mtlLoader) {
  if (TRAIN_CACHE.has(part.obj)) {
    return Promise.resolve(TRAIN_CACHE.get(part.obj).clone());
  }
  return new Promise((resolve, reject) => {
    const baseUrl = part.obj.substring(0, part.obj.lastIndexOf("/") + 1);
    const objFile = part.obj.split("/").pop();
    const mtlFile = part.mtl.split("/").pop();
    mtlLoader.setPath(baseUrl).load(
      mtlFile,
      (mtl) => {
        mtl.preload();
        objLoader.setMaterials(mtl);
        objLoader.setPath(baseUrl).load(
          objFile,
          (obj) => {
            TRAIN_CACHE.set(part.obj, obj);
            resolve(obj.clone());
          },
          undefined,
          reject
        );
      },
      undefined,
      () => {
        objLoader.setMaterials(null);
        objLoader.setPath(baseUrl).load(
          objFile,
          (obj) => {
            obj.traverse((c) => {
              if (c.isMesh) {
                c.material = new THREE.MeshStandardMaterial({ color: "#cfe3ff" });
              }
            });
            TRAIN_CACHE.set(part.obj, obj);
            resolve(obj.clone());
          },
          undefined,
          reject
        );
      }
    );
  });
}

function TrainLanding({ active, placement, onArrive, loop = false, landingKey, cameraLockRef, depart = false }) {
  const { camera } = useThree();
  const [ship, setShip] = useState(null);
  const pathRef = useRef({
    start: new THREE.Vector3(),
    control: new THREE.Vector3(),
    end: new THREE.Vector3(),
  });
  const departPathRef = useRef({
    active: false,
    t: 0,
    start: new THREE.Vector3(),
    control: new THREE.Vector3(),
    end: new THREE.Vector3(),
  });
  const tRef = useRef(0);
  const doneRef = useRef(false);
  const landedRef = useRef(false);
  const landedPosRef = useRef(null);
  const landedQuatRef = useRef(null);
  const effectRef = useRef(null);

  useEffect(() => {
    const objLoader = new OBJLoader();
    const mtlLoader = new MTLLoader();
    let mounted = true;
    Promise.all(TRAIN_PARTS.map((part) => loadTrainPart(part, objLoader, mtlLoader)))
      .then((parts) => {
        if (!mounted) return;
        const group = new THREE.Group();
        const sizes = parts.map((p) => new THREE.Box3().setFromObject(p).getSize(new THREE.Vector3()));
        const front = parts[0];
        const mid = parts[1];
        const tail = parts[2];
        mid.position.z = -sizes[0].z * 0.85;
        tail.position.z = -(sizes[0].z * 0.85 + sizes[1].z * 0.9);
        group.add(front, mid, tail);
        const box = new THREE.Box3().setFromObject(group);
        const center = new THREE.Vector3();
        box.getCenter(center);
        group.position.sub(center);
        group.scale.setScalar(0.09);
        setShip(group);
      })
      .catch(() => { });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!active || !placement?.point || !ship) return;
    if (landedRef.current) return;
    tRef.current = 0;
    doneRef.current = false;
    landedRef.current = false;
    landedPosRef.current = null;
    landedQuatRef.current = null;
    departPathRef.current.active = false;
    ship.visible = true;
    const lock = cameraLockRef?.current;
    const lockedPos = lock?.position ? lock.position.clone() : camera.position.clone();
    const lockedForward = lock?.forward ? lock.forward.clone() : new THREE.Vector3(0, 0, -1);
    const lockedUp = lock?.up ? lock.up.clone() : camera.up.clone();
    const normal = new THREE.Vector3(...placement.normal).normalize();
    const endWorld = new THREE.Vector3(...placement.point).add(normal.clone().multiplyScalar(0.005));
    const forward = lockedForward.clone();
    const cameraWorld = lockedPos.clone();
    const startWorld = cameraWorld
      .clone()
      .add(forward.clone().multiplyScalar(-3.2))
      .add(new THREE.Vector3(0, 0.05, 0));
    const flyBy = cameraWorld
      .clone()
      .add(forward.clone().multiplyScalar(4.5))
      .add(new THREE.Vector3(0, 0.08, 0));
    const controlWorld = flyBy
      .clone()
      .lerp(endWorld, 0.6)
      .add(normal.clone().multiplyScalar(2.6));
    pathRef.current.start.copy(startWorld);
    pathRef.current.control.copy(controlWorld);
    pathRef.current.end.copy(endWorld);
    pathRef.current.up = lockedUp.clone();
  }, [active, placement, ship, camera, landingKey]);

  useEffect(() => {
    if (!active || !ship || !placement?.point) return;
    if (!depart || loop) return;
    if (!landedRef.current) return;
    if (departPathRef.current.active) return;
    const normal = new THREE.Vector3(...placement.normal).normalize();
    const lock = cameraLockRef?.current;
    const forward = lock?.forward ? lock.forward.clone() : new THREE.Vector3(0, 0, -1);
    const start = (landedPosRef.current || ship.position).clone();
    const end = start.clone().add(normal.clone().multiplyScalar(10)).add(forward.clone().multiplyScalar(8));
    const control = start.clone().add(normal.clone().multiplyScalar(4.8)).add(forward.clone().multiplyScalar(4.2));
    departPathRef.current.start.copy(start);
    departPathRef.current.control.copy(control);
    departPathRef.current.end.copy(end);
    departPathRef.current.t = 0;
    departPathRef.current.active = true;
  }, [active, depart, loop, placement, ship, cameraLockRef]);

  useFrame((_, dt) => {
    if (!active || !ship) return;
    if (!landedRef.current) {
      tRef.current = Math.min(1, tRef.current + dt * 0.145);
      const t = tRef.current;
      const inv = 1 - t;
      const { start, control, end } = pathRef.current;
      const pos = new THREE.Vector3(
        inv * inv * start.x + 2 * inv * t * control.x + t * t * end.x,
        inv * inv * start.y + 2 * inv * t * control.y + t * t * end.y,
        inv * inv * start.z + 2 * inv * t * control.z + t * t * end.z
      );
      ship.position.copy(pos);
      const nextT = Math.min(1, t + 0.02);
      const invN = 1 - nextT;
      const next = new THREE.Vector3(
        invN * invN * start.x + 2 * invN * nextT * control.x + nextT * nextT * end.x,
        invN * invN * start.y + 2 * invN * nextT * control.y + nextT * nextT * end.y,
        invN * invN * start.z + 2 * invN * nextT * control.z + nextT * nextT * end.z
      );
      ship.lookAt(next);
      if (placement?.normal) {
        const normal = new THREE.Vector3(...placement.normal).normalize();
        const blend = THREE.MathUtils.smoothstep(t, 0.55, 0.98);
        const tangent = next.clone().sub(pos).projectOnPlane(normal);
        if (tangent.lengthSq() < 1e-6) {
          const up = pathRef.current.up || camera.up;
          tangent.copy(up).projectOnPlane(normal);
        }
        const approachDir = next.clone().sub(pos).normalize();
        const finalDir = tangent.normalize();
        const dir = approachDir.clone().lerp(finalDir, blend).normalize();
        ship.up.copy(camera.up.clone().lerp(normal, blend).normalize());
        ship.lookAt(pos.clone().add(dir));
      }
      if (effectRef.current) {
        const s = Math.max(0, (t - 0.75) / 0.25);
        effectRef.current.scale.setScalar(0.6 + s * 2.2);
        effectRef.current.material.opacity = 0.5 * (1 - s);
      }
      if (t >= 1 && !doneRef.current) {
        doneRef.current = true;
        landedRef.current = true;
        landedPosRef.current = ship.position.clone();
        landedQuatRef.current = ship.quaternion.clone();
        if (loop) {
          tRef.current = 0;
          doneRef.current = false;
          landedRef.current = false;
          landedPosRef.current = null;
          landedQuatRef.current = null;
        } else {
          onArrive?.();
        }
      }
      return;
    }

    if (departPathRef.current.active) {
      departPathRef.current.t = Math.min(1, departPathRef.current.t + dt * 0.1);
      const t = departPathRef.current.t;
      const eased = t * t;
      const inv = 1 - eased;
      const { start, control, end } = departPathRef.current;
      const pos = new THREE.Vector3(
        inv * inv * start.x + 2 * inv * eased * control.x + eased * eased * end.x,
        inv * inv * start.y + 2 * inv * eased * control.y + eased * eased * end.y,
        inv * inv * start.z + 2 * inv * eased * control.z + eased * eased * end.z
      );
      ship.position.copy(pos);
      const nextT = Math.min(1, eased + 0.02);
      const invN = 1 - nextT;
      const next = new THREE.Vector3(
        invN * invN * start.x + 2 * invN * nextT * control.x + nextT * nextT * end.x,
        invN * invN * start.y + 2 * invN * nextT * control.y + nextT * nextT * end.y,
        invN * invN * start.z + 2 * invN * nextT * control.z + nextT * nextT * end.z
      );
      ship.lookAt(next);
      if (t >= 1) {
        ship.visible = false;
        departPathRef.current.active = false;
      }
      return;
    }

    if (landedRef.current && landedPosRef.current) {
      ship.position.copy(landedPosRef.current);
      if (landedQuatRef.current) {
        ship.quaternion.copy(landedQuatRef.current);
      }
    }
  });

  if (!ship) return null;

  return (
    <>
      <primitive object={ship} />
      <mesh ref={effectRef} position={placement?.point ?? [0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.25, 0.6, 40]} />
        <meshBasicMaterial color="#6fe7ff" transparent opacity={0.0} />
      </mesh>
    </>
  );
}

export default function LandingScene({
  mode = "empty",
  planets = [],
  activePlanetId = null,
  onSelectPlanet,
  onFocusPlanetChange,
  onPlanetPick,
  onCityNodeSelect,
  selectedNodeId,
  cityFocusTarget,
  placementMode = false,
  placement = null,
  focusId = null,
  shipLandingActive = false,
  onShipArrive,
  shipTestMode = false,
  shipLandingKey = 0,
  cityBuilt = false,
  cityGraphData = null,
  cityTheme = "Thema1",
  enableOrbit = false,
  onCaptureReady,
}) {
  const [dragOffset, setDragOffset] = useState(0);
  const [targetOffset, setTargetOffset] = useState(0);
  const dragOffsetRef = useRef(0);
  const targetOffsetRef = useRef(0);
  const lastArrowRef = useRef(0);
  const focusTimerRef = useRef(null);
  const landingCamLockRef = useRef(null);
  const [cameraLockReady, setCameraLockReady] = useState(false);
  const [cameraInputLocked, setCameraInputLocked] = useState(false);
  const spacing = 12;
  const orbitEnabled = enableOrbit || cityBuilt || shipLandingActive;
  const listLength = planets.length > 0 ? planets.length : 1;
  const currentIndex = Math.max(
    0,
    (planets.length ? planets.findIndex((p) => p.id === activePlanetId) : 0)
  );

  useEffect(() => {
    const next = -currentIndex * spacing;
    setTargetOffset(next);
    if (mode !== "carousel") {
      setDragOffset(next);
    }
  }, [currentIndex, spacing, mode]);

  const [cameraOverride, setCameraOverride] = useState(false);

  useEffect(() => {
    if (!shipLandingActive) return;
    setCameraLockReady(false);
    setCameraInputLocked(false);
    setCameraOverride(false);
  }, [shipLandingActive]);

  useEffect(() => {
    if (!cityFocusTarget) return;
    setCameraOverride(false);
  }, [cityFocusTarget]);

  useEffect(() => {
    dragOffsetRef.current = dragOffset;
  }, [dragOffset]);

  useEffect(() => {
    targetOffsetRef.current = targetOffset;
  }, [targetOffset]);

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
  const visibleIndex = Math.max(0, Math.min(list.length - 1, Math.round(-dragOffset / spacing)));
  const activePlanetRef = useRef(null);
  const [placementWorld, setPlacementWorld] = useState(null);
  const landingLockRef = useRef({ key: 0, locked: null });

  const targets = useMemo(
    () => ({
      empty: { position: [0, 0, 16], target: [0, 0, 0] },
      main: { position: [-2.281, 0.364, 3.009], target: [-2.385, 0.445, 2.863] },
      carousel: { position: [0, 3, 9.5], target: [0, -0.2, 0] },
    }),
    []
  );
  const baseSunRef = useRef(new THREE.Vector3(-30, 22, -18));
  const sunPos = useRef(baseSunRef.current.clone().toArray());
  const sunAngleRef = useRef(0);
  const starsRef = useRef(null);
  const sunLightRef = useRef(null);

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
      if (placementMode) return;
      if (shipLandingActive) return;
      e.preventDefault();
      const now = Date.now();
      if (now - lastArrowRef.current < 600) return;
      lastArrowRef.current = now;
      setTargetOffset((prev) => {
        const delta = e.key === "ArrowLeft" ? spacing : -spacing;
        const maxOffset = 0;
        const minOffset = -(listLength - 1) * spacing;
        const next = Math.max(minOffset, Math.min(maxOffset, prev + delta));
        const nextIndex = Math.max(0, Math.min(listLength - 1, Math.round(-next / spacing)));
        if (focusTimerRef.current) {
          window.clearTimeout(focusTimerRef.current);
        }
        if (onFocusPlanetChange && list[nextIndex]) {
          focusTimerRef.current = window.setTimeout(() => {
            onFocusPlanetChange(list[nextIndex]);
          }, 200);
        }
        return next;
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, listLength, spacing, placementMode, shipLandingActive]);

  useEffect(() => {
    return () => {
      if (focusTimerRef.current) {
        window.clearTimeout(focusTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!shipLandingActive || !placement?.point || !activePlanetRef.current) return;
    if (landingLockRef.current.key === shipLandingKey && landingLockRef.current.locked) return;
    const worldPoint = activePlanetRef.current.localToWorld(new THREE.Vector3(...placement.point));
    const worldNormal = new THREE.Vector3(...placement.normal)
      .applyQuaternion(activePlanetRef.current.quaternion)
      .normalize();
    const locked = {
      point: [worldPoint.x, worldPoint.y, worldPoint.z],
      normal: [worldNormal.x, worldNormal.y, worldNormal.z],
    };
    landingLockRef.current = { key: shipLandingKey, locked };
    setPlacementWorld(locked);
  }, [shipLandingActive, placement, shipLandingKey]);

  return (
    <div className="h-full w-full bg-[#050814]">
      <Canvas
        dpr={mode === "carousel" ? [1, 1] : [1, 1.25]}
        camera={{ position: targets.main.position, fov: 34, near: 0.1, far: 200 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          preserveDrawingBuffer: true,
        }}
        style={{ touchAction: "none" }}
        onCreated={({ gl: renderer }) => {
          renderer.setClearColor(new THREE.Color("#050814"), 1);
        }}
      >
        <ScreenshotManager onCaptureReady={onCaptureReady} />
        <NebulaBackdrop radius={95} sunDir={[0.8, 0.3, 0.45]} />
        <group ref={starsRef}>
          <Stars />
        </group>
        <Sun sunPosRef={sunPos} lightRef={sunLightRef} />
        <SunRig
          mode={mode}
          base={baseSunRef.current}
          sunPosRef={sunPos}
          angleRef={sunAngleRef}
          orbit={cityBuilt}
          lightRef={sunLightRef}
        />
        <StarsOrbit active={cityBuilt} groupRef={starsRef} />
        <ambientLight intensity={0.18} />

        <CameraRig mode={mode} targets={targets} enabled={!orbitEnabled && !shipLandingActive} />
        {orbitEnabled && !cameraInputLocked && (
          <OrbitDragControls
            enabled={orbitEnabled}
            targetRef={activePlanetRef}
            onInteract={() => setCameraOverride(true)}
          />
        )}
        {cityFocusTarget && !cameraOverride && (
          <CityFocusRig target={cityFocusTarget} enabled={cityBuilt} />
        )}
        {shipLandingActive && placementWorld && (
          <>
            <LandingCameraLock
              active={shipLandingActive}
              landingKey={shipLandingKey}
              lockRef={landingCamLockRef}
              onReady={() => setCameraLockReady(true)}
            />
            {cameraLockReady && !cameraOverride && (
              <LandingCameraCue
                active={shipLandingActive}
                placement={placementWorld}
                planetRef={activePlanetRef}
                lockRef={landingCamLockRef}
                override={cameraOverride}
              />
            )}
          </>
        )}
        <CarouselLerp
          enabled={mode === "carousel"}
          targetOffset={targetOffset}
          setDragOffset={setDragOffset}
        />

        {mode === "main" && (
          <PlanetNode
            planet={mainPlanet}
            position={[-2.2, -0.35, 0]}
            placementMode={false}
            cityTheme={cityTheme}
          />
        )}

        {mode === "carousel" && (
          <group position={[dragOffset, -0.4, 0]}>
            {list.map((planet, idx) => {
              if ((placementMode || shipLandingActive) && planet?.id !== focusId) return null;
              if (!placementMode && !shipLandingActive && idx !== visibleIndex) return null;
              return (
                <PlanetNode
                  key={planet.id || idx}
                  planet={planet}
                  position={[idx * spacing, 0, 0]}
                  onPick={(point, normal) => handlePick(planet, point, normal)}
                  placementMode={placementMode}
                  placement={placement}
                  focusId={focusId}
                  enableRotateDrag={placementMode && focusId === planet.id && !shipLandingActive}
                  shipLandingActive={shipLandingActive}
                  onShipArrive={onShipArrive}
                  shipTestMode={shipTestMode}
                  shipLandingKey={shipLandingKey}
                  registerActiveRef={(ref) => {
                    if (ref) activePlanetRef.current = ref;
                  }}
                  cityBuilt={cityBuilt}
                  cityGraphData={cityGraphData}
                  cityTheme={cityTheme}
                  selectedNodeId={selectedNodeId}
                  onCityNodeSelect={onCityNodeSelect}
                />
              );
            })}
          </group>
        )}
        {mode === "carousel" && shipLandingActive && placementWorld && (
          <TrainLanding
            active={shipLandingActive}
            placement={placementWorld}
            onArrive={shipTestMode ? undefined : onShipArrive}
            loop={shipTestMode}
            landingKey={shipLandingKey}
            cameraLockRef={landingCamLockRef}
            depart={!!cityGraphData && !shipTestMode}
          />
        )}
      </Canvas>
    </div>
  );
}
