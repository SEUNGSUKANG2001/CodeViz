"use client";

import React, { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import ForceGraph3D from "3d-force-graph";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { GraphData } from "@/lib/types";
import { createVoxelPlanet } from "./VoxelPlanetCore";

/**
 * 프로젝트에서 로드 가능한 시각화 테마 타입
 * Thema1: City (🏙️), Thema2: Space (🌌), Thema3: Forest (🌲), 2D: Flat Graph (📊)
 */
export type ThemeType = "Thema1" | "Thema2" | "Thema3" | "2D";

// 3D 공간 내의 노드(건물/파일) 정의
export type CityNode = {
  id: string;
  lineCount: number;
  imports: string[];
  importedBy: string[];
  x: number;
  y: number;
  z: number;
  vx?: number;
  vy?: number;
  vz?: number;
  fx?: number | null;
  fy?: number | null;
  fz?: number | null;
  isModified?: boolean;
  __threeObj?: THREE.Object3D;
};

// 노드 간의 연결(도로/의존성) 정의
export type CityLink = {
  source: CityNode | string;
  target: CityNode | string;
};

// 시각화용 최종 데이터 구조
export type CityGraphData = {
  nodes: CityNode[];
  links: CityLink[];
};

/**
 * 테마별 캐릭터 및 건물 설정
 * 각 테마 폴더 내의 특정 .obj 파일을 매핑합니다.
 */
const THEME_CONFIG: Record<ThemeType, { character: string; lastBuilding: string }> = {
  Thema1: { character: "oobi", lastBuilding: "n" },
  Thema2: { character: "oozi", lastBuilding: "t" },
  Thema3: { character: "ooli", lastBuilding: "p" },
  "2D": { character: "", lastBuilding: "" }, // 2D doesn't use these but needed for type safety
};

/**
 * 3D 행성(지구형) 시각화를 위한 상수 설정
 * 행성의 반지름과 중심점 좌표를 정의합니다.
 */
const PLANET_CONFIG = {
  RADIUS: 2.35,
  CENTER_Z: -2.35,
};
const SUN_POS = new THREE.Vector3(-30, 22, -18);

function makeRadialTexture(stops: Array<[number, string]>, size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [at, col] of stops) g.addColorStop(at, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(canvas);
  t.minFilter = THREE.LinearMipMapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}

function createSunSprite() {
  const coreTex = makeRadialTexture([
    [0.0, "rgba(255,250,235,1.0)"],
    [0.15, "rgba(255,230,170,0.9)"],
    [0.35, "rgba(255,190,110,0.5)"],
    [1.0, "rgba(0,0,0,0.0)"],
  ]);
  const haloTex = makeRadialTexture([
    [0.0, "rgba(0,0,0,0.0)"],
    [0.4, "rgba(255,200,120,0.15)"],
    [0.75, "rgba(140,170,255,0.12)"],
    [1.0, "rgba(0,0,0,0.0)"],
  ]);

  const group = new THREE.Group();
  if (haloTex) {
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: haloTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    halo.scale.set(34, 34, 1);
    group.add(halo);
  }
  if (coreTex) {
    const core = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: coreTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    core.scale.set(14, 14, 1);
    group.add(core);
  }
  return group;
}

function createStarField(count = 2500, radius = 90) {
  const tex = makeRadialTexture(
    [
      [0.0, "rgba(255,255,255,1.0)"],
      [0.7, "rgba(255,255,255,0.8)"],
      [1.0, "rgba(255,255,255,0.0)"],
    ],
    64
  );
  const geom = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = radius * (0.85 + Math.random() * 0.15);
    positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.7,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    map: tex ?? undefined,
    alphaTest: 0.2,
  });
  return new THREE.Points(geom, mat);
}

function createNebula(radius = 95, sunDir = new THREE.Vector3(0.8, 0.3, 0.45)) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color("#0b1135") },
      uBottom: { value: new THREE.Color("#02030b") },
      uSun: { value: sunDir.clone().normalize() },
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
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 48), mat);
  return mesh;
}



/**
 * useCodeCityViewer 커스텀 훅
 * - Three.js와 3d-force-graph를 조합하여 3D 시각화 엔진을 구축하고 관리합니다.
 * - 행성 모양의 바닥, 건물(파일), 도로(의존성), 움직이는 캐릭터 등을 생성합니다.
 */
export function useCodeCityViewer(
  containerRef: React.RefObject<HTMLDivElement | null>,
  graphData: GraphData | null,
  opts?: {
    theme?: ThemeType;
    onNodeClick?: (node: CityNode) => void;
    onBackgroundClick?: () => void;
  }
) {
  const themeRef = useRef<ThemeType>(opts?.theme ?? "Thema1");
  const onNodeClickRef = useRef(opts?.onNodeClick);
  const onBackgroundClickRef = useRef(opts?.onBackgroundClick);

  useEffect(() => {
    onNodeClickRef.current = opts?.onNodeClick;
    onBackgroundClickRef.current = opts?.onBackgroundClick;
  }, [opts?.onNodeClick, opts?.onBackgroundClick]);

  // 시각화 그래프 인스턴스 및 정리(cleanup)용 Ref
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // 모델 로딩 최적화를 위한 캐시 및 래더
  const OBJ_CACHE = useRef<Record<string, THREE.Object3D>>({});
  const CHARACTER_MODEL = useRef<THREE.Group | null>(null);

  const objLoaderRef = useRef(new OBJLoader());
  const mtlLoaderRef = useRef(new MTLLoader());
  const gltfLoaderRef = useRef(new GLTFLoader());
  const starFieldRef = useRef<THREE.Points | null>(null);
  const sunSpriteRef = useRef<THREE.Group | null>(null);
  const nebulaRef = useRef<THREE.Mesh | null>(null);
  const planetUpdateRef = useRef<((dt: number) => void) | null>(null);

  const { RADIUS: R, CENTER_Z: Cz } = PLANET_CONFIG;
  const themeCameraStatesRef = useRef<Record<string, { pos: any; lookAt: any; up: any }>>({});
  const selectionRingRef = useRef<THREE.Mesh | null>(null);

  /**
   * 3D 모델(OBJ/GLB/GLTF) 캐시
   */
  const modelCacheRef = useRef<Record<string, THREE.Object3D>>({});

  /**
   * 모델 로드 공통 함수
   */
  const loadModel = useCallback(
    async (url: string): Promise<THREE.Object3D> => {
      if (modelCacheRef.current[url]) {
        return modelCacheRef.current[url].clone();
      }

      return new Promise((resolve, reject) => {
        if (url.endsWith(".glb") || url.endsWith(".gltf")) {
          gltfLoaderRef.current.load(
            url,
            (gltf) => {
              const obj = gltf.scene;
              obj.traverse((c) => {
                if ((c as THREE.Mesh).isMesh) {
                  const mesh = c as THREE.Mesh;
                  mesh.castShadow = true;
                  mesh.receiveShadow = true;
                  if (mesh.material && (mesh.material as any).type === "MeshBasicMaterial") {
                    const prevColor = (mesh.material as any).color;
                    mesh.material = new THREE.MeshStandardMaterial({ color: prevColor });
                  }
                }
              });
              modelCacheRef.current[url] = obj;
              resolve(obj.clone());
            },
            undefined,
            reject
          );
        } else {
          // OBJ/MTL 로직
          const mtlUrl = url.replace(".obj", ".mtl");
          const baseUrl = url.substring(0, url.lastIndexOf("/") + 1);

          mtlLoaderRef.current.setPath(baseUrl).load(
            mtlUrl.split("/").pop()!,
            (mtl) => {
              mtl.preload();
              objLoaderRef.current
                .setMaterials(mtl)
                .setPath(baseUrl)
                .load(
                  url.split("/").pop()!,
                  (obj) => {
                    obj.traverse((c) => {
                      if ((c as THREE.Mesh).isMesh) {
                        const mesh = c as THREE.Mesh;
                        mesh.castShadow = true;
                        mesh.receiveShadow = true;
                        if (mesh.material && (mesh.material as any).type === "MeshBasicMaterial") {
                          const prevColor = (mesh.material as any).color;
                          mesh.material = new THREE.MeshStandardMaterial({ color: prevColor });
                        }
                      }
                    });
                    modelCacheRef.current[url] = obj;
                    resolve(obj.clone());
                  },
                  undefined,
                  reject
                );
            },
            undefined,
            () => {
              // MTL 실패 시 OBJ만 로드
              objLoaderRef.current
                .setMaterials(null as any)
                .setPath(baseUrl)
                .load(
                  url.split("/").pop()!,
                  (obj) => {
                    obj.traverse((c) => {
                      if ((c as THREE.Mesh).isMesh) {
                        const mesh = c as THREE.Mesh;
                        mesh.castShadow = true;
                        mesh.receiveShadow = true;
                        mesh.material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
                      }
                    });
                    modelCacheRef.current[url] = obj;
                    resolve(obj.clone());
                  },
                  undefined,
                  reject
                );
            }
          );
        }
      });
    },
    []
  );

  /**
   * OBJ 3D 모델을 비동기로 로드하는 함수
   * @deprecated loadModel 사용 권장
   */
  const loadOBJ = useCallback(async (url: string): Promise<THREE.Object3D> => {
    return loadModel(url);
  }, [loadModel]);

  // 처리된 시각화 데이터 보관
  const cityDataRef = useRef<CityGraphData | null>(null);

  /**
   * OBJ 및 MTL 파일을 비동기로 로드하는 유틸리티
   * - 텍스처(MTL)가 있으면 먼저 입히고, 없으면 기본 회색 재질을 입힙니다.
   */
  // This function is now deprecated and replaced by loadModel.
  // Keeping it for context, but its logic is moved into loadModel.
  /*
  const loadOBJ = useCallback(async (url: string): Promise<THREE.Object3D> => {
    // 캐시된 모델이 있으면 복제해서 반환
    if (OBJ_CACHE.current[url]) return OBJ_CACHE.current[url].clone();

    return new Promise((resolve, reject) => {
      const mtlUrl = url.replace(".obj", ".mtl");
      const baseUrl = url.substring(0, url.lastIndexOf("/") + 1);
      const fileName = url.split("/").pop() || "";
      const mtlFileName = mtlUrl.split("/").pop() || "";

      const mtlLoader = mtlLoaderRef.current;
      const objLoader = objLoaderRef.current;

      mtlLoader.setPath(baseUrl);
      mtlLoader.load(
        mtlFileName,
        (mtl) => {
          mtl.preload();
          objLoader.setMaterials(mtl);
          objLoader.setPath(baseUrl);
          objLoader.load(
            fileName,
            (obj) => {
              OBJ_CACHE.current[url] = obj;
              resolve(obj.clone());
            },
            undefined,
            reject
          );
        },
        undefined,
        () => {
          // MTL(재질) 로드 실패 시 기본 재질 적용
          objLoader.setMaterials(null as any);
          objLoader.setPath(baseUrl);
          objLoader.load(
            fileName,
            (obj) => {
              obj.traverse((c) => {
                if ((c as THREE.Mesh).isMesh) {
                  (c as THREE.Mesh).material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
                }
              });
              OBJ_CACHE.current[url] = obj;
              resolve(obj.clone());
            },
            undefined,
            reject
          );
        }
      );
    });
  }, []);
  */

  /**
   * 서버에서 온 일반 그래프 데이터를 시각화 전용 City 데이터로 변환
   */
  const buildCityData = useCallback((data: GraphData): CityGraphData => {
    const nodes: CityNode[] = [];
    const links: CityLink[] = [];

    const nodeMap = new Map<string, CityNode>();
    const sourceNodes = data.nodes.filter((n) => n.type === "file");

    // 파일 노드 생성 (코드 라인 수에 따라 나중에 건물 크기가 결정됨)
    sourceNodes.forEach((n: any) => {
      const node: CityNode = {
        id: n.id,
        lineCount: n.lines || n.loc || 10,
        imports: [],
        importedBy: [],
        x: n.x,
        y: n.y,
        z: n.z,
        vx: n.vx,
        vy: n.vy,
        vz: n.vz,
        fx: n.fx,
        fy: n.fy,
        fz: n.fz,
      };
      nodeMap.set(n.id, node);
      nodes.push(node);
    });

    // 노드 간 의존성 연결
    data.edges.forEach((e) => {
      if (!nodeMap.has(e.source) || !nodeMap.has(e.target)) return;
      links.push({ source: e.source, target: e.target });

      nodeMap.get(e.source)!.imports.push(e.target);
      nodeMap.get(e.target)!.importedBy.push(e.source);
    });

    return { nodes, links };
  }, []);

  /**
   * 행성 표면 위에 곡선 형태로 도로를 그리기 위한 베지어 곡선 생성
   */
  const getCurve = useCallback((start: any, end: any) => {

    // 시작점과 끝점 사이의 중간 지점 계산
    const mx = (start.x + end.x) / 2;
    const my = (start.y + end.y) / 2;
    const mz = (start.z + end.z) / 2;

    const cx = mx;
    const cy = my;
    const cz = mz - Cz;

    const dist = Math.sqrt(cx * cx + cy * cy + cz * cz) || 1;
    const chordDist = Math.hypot(start.x - end.x, start.y - end.y, start.z - end.z);

    // 곡선의 높이를 행성 반지름보다 충분히 높게 설정 (클리핑 방지)
    const height = R + 0.03 + chordDist * 0.02;
    const ratio = height / dist;

    const cpx = cx * ratio;
    const cpy = cy * ratio;
    const cpz = cz * ratio + Cz;

    return new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(start.x, start.y, start.z),
      new THREE.Vector3(cpx, cpy, cpz),
      new THREE.Vector3(end.x, end.y, end.z)
    );
  }, []);

  /**
   * 사용자가 테마를 바꿀 때 호출되어 캐릭터와 건물 모델을 교체
   */
  const changeTheme = useCallback(
    async (theme: ThemeType) => {
      if (theme === "2D") return; // 2D 테마는 3D 자산을 로드하지 않음
      if (theme === themeRef.current && CHARACTER_MODEL.current) return;

      // 1. 현재 테마의 카메라 상태 저장 (이탈 전)
      if (graphRef.current) {
        const camera = graphRef.current.camera();
        const controls = graphRef.current.controls();
        themeCameraStatesRef.current[themeRef.current] = {
          pos: graphRef.current.cameraPosition(),
          lookAt: controls.target.clone(),
          up: camera.up.clone(),
        };
      }

      themeRef.current = theme;

      // 새 테마용 캐릭터 모델 로딩
      const charPath = `/Themas/${theme}/character-${THEME_CONFIG[theme].character}.obj`;

      try {
        // 새 테마용 캐릭터 모델 로드
        const charObj = await loadModel(charPath);
        // Rotate character 180 degrees so it faces the direction of travel (tangent)
        charObj.rotation.y = Math.PI;

        const box = new THREE.Box3().setFromObject(charObj);
        const size = box.getSize(new THREE.Vector3());
        const scale = (R * 0.003) / (Math.max(size.x, size.y, size.z) || 1);
        charObj.scale.set(scale, scale, scale);
        charObj.traverse((child) => {
          if ((child as any).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        const g = new THREE.Group();
        g.add(charObj);
        CHARACTER_MODEL.current = g;
        console.log("✅ Character model loaded successfully:", charPath);
      } catch (e) {
        console.error("❌ Failed to load character:", e);
      }

      // [로직: City 모드(도시) 복귀 시]
      // [수정 사항] 물리 엔진에 맡기지 않고, 즉시 제자리를 찾아 'Snap(강제 고정)' 시킴
      if (!graphRef.current) return;
      const nodes = graphRef.current.graphData().nodes as CityNode[];

      nodes.forEach((n) => {
        // 저장된 위치가 없다면(처음이라면), 현재 위치를 구체 표면으로 사영(Projection)
        const dx = n.x,
          dy = n.y,
          dz = n.z - Cz;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        const ratio = R / dist;
        n.x = dx * ratio;
        n.y = dy * ratio;
        n.z = dz * ratio + Cz;

        // 속도 0으로 초기화 (미끄러짐 방지)
        n.vx = 0;
        n.vy = 0;
        n.vz = 0;

        // 물리 엔진이 다시 계산할 수 있도록 고정 해제 (원하는 경우)
        n.fx = null;
        n.fy = null;
        n.fz = null;
      });

      // 2. 저장된 카메라 상태 복원 (진입 후)
      const savedState = themeCameraStatesRef.current[theme];

      if (savedState) {
        const camera = graphRef.current.camera();
        camera.up.copy(savedState.up);
        graphRef.current.cameraPosition(savedState.pos, savedState.lookAt, 1000);
      } else {
        // 기본 시점 (도시 모드) - 많은 건물이 한눈에 들어오도록 각도를 틀고 거리를 확보함
        graphRef.current.camera().up.set(0, 1, 0);
        graphRef.current.cameraPosition(
          { x: 0, y: R * 1.6, z: Cz + R * 2.8 },
          { x: 0, y: 0, z: Cz },
          1000
        );
      }

      // 3. 그래프 오브젝트 리프레시 (건물 및 도로 캐릭터 교체 트리거)
      // nodeThreeObject와 linkThreeObject를 재설정하여 모든 노드/링크의 3D 객체를 다시 생성함
      graphRef.current.nodeThreeObject(graphRef.current.nodeThreeObject());
      graphRef.current.linkThreeObject(graphRef.current.linkThreeObject());
      graphRef.current.cooldownTicks(100); // 방향(quaternion) 재계산 및 안정을 위해 충분한 틱 부여
    },
    [loadModel, Cz, R]
  );

  /**
   * 특정 노드(건물)를 클릭했을 때 카메라를 해당 위치로 이동
   */
  const focusOnNode = useCallback((node: CityNode, showRing = true) => {
    if (!graphRef.current || !graphRef.current.graphData()) return;

    // 선택 링 위치 이동 및 표시
    if (selectionRingRef.current) {
      const ring = selectionRingRef.current;
      ring.position.set(node.x, node.y, node.z);

      const normal = new THREE.Vector3(node.x, node.y, node.z - Cz).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      if (Math.abs(normal.dot(up)) > 0.99) up.set(1, 0, 0);

      const m = new THREE.Matrix4().lookAt(new THREE.Vector3(0, 0, 0), normal, up);
      ring.quaternion.setFromRotationMatrix(m);
      ring.visible = showRing;
    }

    const center = new THREE.Vector3(0, 0, Cz);
    const nodePos = new THREE.Vector3(node.x, node.y, node.z);
    // 노드 표면의 법선(Normal) 벡터 계산하여 카메라 배치 기준으로 사용
    const normal = new THREE.Vector3().subVectors(nodePos, center).normalize();

    const globalUp = new THREE.Vector3(0, 1, 0);
    let north = new THREE.Vector3().copy(globalUp).projectOnPlane(normal).normalize();
    if (north.lengthSq() < 0.001) {
      north.set(0, 0, 1).projectOnPlane(normal).normalize();
    }
    const south = north.clone().negate();

    const dist = R * 1.2; // 카메라 높이
    const camPos = nodePos.clone()
      .add(normal.clone().multiplyScalar(dist))
      .add(south.clone().multiplyScalar(dist));

    const camera = graphRef.current.camera();
    camera.up.copy(normal); // 행성 표면 방향으로 '위'를 재설정

    graphRef.current.cameraPosition(
      { x: camPos.x, y: camPos.y, z: camPos.z },
      node,
      1500
    );
  }, []);

  /**
   * 카메라를 행성 전체가 보이는 초기 시점으로 복구
   */
  const resetCamera = useCallback(() => {
    if (!graphRef.current) return;

    graphRef.current.cameraPosition(
      { x: 0, y: R * 1.5, z: Cz + R * 2.6 },
      { x: 0, y: 0, z: Cz },
      1500
    );
  }, []);

  /**
   * 메인 초기화 함수 (3D 엔진 시작)
   */
  const init = useCallback(async () => {
    if (!containerRef.current || !graphData) return;

    // 컨테이너 크기가 준비될 때까지 대기
    const el = containerRef.current;
    const rect = el.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;

    // 이전 인스턴스 정리 또는 데이터 업데이트만 수행
    if (graphRef.current) {
      // 이미 엔진이 실행 중이라면 데이터만 교체 (매우 빠름, 깜빡임 없음)
      const cityData = buildCityData(graphData);
      cityDataRef.current = cityData;
      graphRef.current.graphData(cityData);

      // 데이터 교체 시 모든 3D 객체의 속성(빌딩 높이 등)을 강제로 갱신하도록 트리거
      graphRef.current.nodeThreeObject(graphRef.current.nodeThreeObject());
      graphRef.current.linkThreeObject(graphRef.current.linkThreeObject());
      graphRef.current.cooldownTicks(60);
      return;
    }

    cleanupRef.current?.();

    // 1. 테마에 필요한 모델 로드 (캐릭터 등)
    const theme = themeRef.current;
    const charPath = `/Themas/${theme}/character-${THEME_CONFIG[theme].character}.obj`;
    try {
      const charObj = await loadModel(charPath);
      charObj.rotation.y = Math.PI;
      const box = new THREE.Box3().setFromObject(charObj);
      const size = box.getSize(new THREE.Vector3());
      const scale = (R * 0.003) / (Math.max(size.x, size.y, size.z) || 1);
      charObj.scale.set(scale, scale, scale);
      charObj.traverse((child) => {
        if ((child as any).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      const g = new THREE.Group();
      g.add(charObj);
      CHARACTER_MODEL.current = g;
    } catch (e) {
      console.error("❌ Failed to load character during init:", e);
    }

    const cityData = buildCityData(graphData);
    cityDataRef.current = cityData;

    // 3d-force-graph 초기화
    const ForceGraph3DAny = ForceGraph3D as any;
    const Graph = ForceGraph3DAny()(el)
      .graphData(cityData)
      .backgroundColor("#000000") // 배경 검은색 고정
      .warmupTicks(120) // 초기 로딩 시 시뮬레이션을 미루고 계산만 수행하여 빠르게 배치
      .cooldownTicks(60) // 조금 더 길게 주어 안정적으로 멈추게 함
      .nodeThreeObject((node: CityNode) => {
        const group = new THREE.Group();
        const scale = Math.max(R * 0.008, Math.log(node.lineCount || 10) * R * 0.005);
        const config = THEME_CONFIG[themeRef.current];
        if (!config || themeRef.current === "2D") return group;

        const charCode = config.lastBuilding.charCodeAt(0);
        const startCode = "a".charCodeAt(0);

        // 테마에 맞는 빌딩 리스트 생성
        const buildings: string[] = [];
        for (let i = startCode; i <= charCode; i++) {
          buildings.push(`/Themas/${themeRef.current}/building-${String.fromCharCode(i)}.obj`);
        }

        // 노드 ID를 기반으로 일관된 건물 선택 (테마 변경 시에도 같은 유형 유지)
        const charSum = node.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const bIndex = charSum % buildings.length;
        const bUrl = buildings[bIndex];

        loadModel(bUrl)
          .then((obj) => {
            const box = new THREE.Box3().setFromObject(obj);
            const minY = box.min.y;

            obj.rotation.x = -Math.PI / 2; // +Y(Up)가 바깥쪽(+Z)이 되도록 회전
            // 모델의 바닥(minY)이 그룹의 중심(0,0,0) 즉 표면에 오도록 Z축(바깥방향) 이동
            // -Math.PI/2 회전 후에는 모델의 원래 Y축이 부모의 Z축이 됨
            obj.position.z = minY;

            obj.traverse((child) => {
              if ((child as any).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });

            obj.scale.set(scale, scale, scale);
            group.add(obj);
          })
          .catch((err) => console.error(`❌ Load failed (${bUrl}):`, err));

        (group as any).userData.node = node;
        node.__threeObj = group;
        return group;
      })
      .onNodeClick((node: CityNode) => {
        focusOnNode(node);
        onNodeClickRef.current?.(node);
      })
      .onBackgroundClick(() => {
        if (selectionRingRef.current) selectionRingRef.current.visible = false;
        onBackgroundClickRef.current?.();
      });

    // 물리 엔진 설정 (노드 간 거리 및 중심 억제)
    Graph.d3Force("charge")?.strength(-2); // 척력
    Graph.d3Force("link")?.distance(R * 0.08); // 링크 간 거리
    Graph.d3Force("link")?.strength(0.9); // 인력 강화
    Graph.d3Force("center", null); // 행성 표면에 고정하므로 중앙 집중력 제거

    // 링크(파일 의존성)를 도로 및 움직이는 캐릭터로 시각화
    Graph.linkThreeObjectExtend(true)
      .linkThreeObject((link: CityLink) => {
        const group = new THREE.Group();
        (link as any).__threeObj = group; // Store reference for fast access
        (group as any).userData.link = link;

        // Use character model for link animation (street traffic)
        if (CHARACTER_MODEL.current) {
          const obj = CHARACTER_MODEL.current.clone();
          obj.up.set(0, 0, 1);
          (obj as any).userData = {
            offset: Math.random() * 10000,
            isCharacter: true,
            linkData: link,
          };
          group.add(obj);
        }

        // 의존성을 나타내는 도로(TubeGeometry) 생성
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, 0)
        );
        const geometry = new THREE.TubeGeometry(curve, 8, R * 0.002, 6, false);
        const material = new THREE.MeshBasicMaterial({
          color: 0x333333,
          transparent: true,
          opacity: 0.8,
        });
        const mesh = new THREE.Mesh(geometry, material);
        (mesh as any).userData = { isRoad: true };
        (link as any).__roadMesh = mesh; // Store reference to the mesh directly
        group.add(mesh);

        return group;
      })
      .linkPositionUpdate((obj: THREE.Object3D, { start, end }: any) => {
        // 물리 엔진이 계산한 위치에 따라 실시간으로 곡선 도로 업데이트
        if (!start || !end) return;
        const roadMesh = obj.children.find((c) => (c as any).userData?.isRoad) as THREE.Mesh | undefined;
        if (roadMesh) {
          const curve = getCurve(start, end);
          if (roadMesh.geometry) roadMesh.geometry.dispose(); // 기존 지오메트리 해제 (메모리 절약)
          roadMesh.geometry = new THREE.TubeGeometry(curve, 8, R * 0.002, 6, false);
        }
        // 그룹 자체는 원점에 두어 자식들(캐릭터 등)이 전역 좌표를 그대로 쓸 수 있게 함
        obj.position.set(0, 0, 0);
        return true;
      });

    // 핑크색 선택 링 초기화
    const ringGeo = new THREE.RingGeometry(R * 0.025, R * 0.035, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff1493, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    const selectionRing = new THREE.Mesh(ringGeo, ringMat);
    selectionRing.visible = false;
    Graph.scene().add(selectionRing);
    selectionRingRef.current = selectionRing;

    // [중요 로직] 포스 레이아웃의 결과를 실시간으로 행성(구체) 표면에 강제로 투영
    Graph.onEngineTick(() => {
      const nodes = Graph.graphData().nodes as CityNode[];
      nodes.forEach((n) => {
        const dx = n.x;
        const dy = n.y;
        const dz = n.z - Cz;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        const ratio = R / dist;
        // 위치: 구체 표면에 딱 붙이기
        n.x = dx * ratio;
        n.y = dy * ratio;
        n.z = dz * ratio + Cz;

        // 노드 고정 로직: 속도가 매우 낮아지면 완전히 고정시켜서 떨림 방지
        const speedSq = (n.vx || 0) ** 2 + (n.vy || 0) ** 2 + (n.vz || 0) ** 2;
        if (speedSq < 0.05) {
          n.fx = n.x;
          n.fy = n.y;
          n.fz = n.z;
        }

        // 물리 엔진 초기 단계에서는 유동성을 주어 노드들이 겹치지 않게 함
        // (완전 고정시키지 않고 서서히 감속)
        if (n.vx !== undefined) n.vx *= 0.9;
        if (n.vy !== undefined) n.vy *= 0.9;
        if (n.vz !== undefined) n.vz *= 0.9;
        const obj = (n as any).__threeObj as THREE.Object3D | undefined;
        if (obj) {
          const normal = new THREE.Vector3(n.x, n.y, n.z - Cz);
          const lenSq = normal.lengthSq();
          if (lenSq > 1e-6) {
            normal.normalize();

            // lookAt 특이점(업벡터 상/하방) 방지용 up 선택
            const up = new THREE.Vector3(0, 1, 0);
            if (Math.abs(normal.dot(up)) > 0.95) {
              up.set(0, 0, 1); // 극점에서는 Z축을 기준으로 정렬
            }

            const m = new THREE.Matrix4().lookAt(
              new THREE.Vector3(0, 0, 0),
              normal,
              up
            );
            obj.quaternion.setFromRotationMatrix(m);
            obj.updateMatrix(); // 즉시 행렬 반영
          }
        }
      });
    });

    // --- [6. 환경 및 광원 설정] ---
    const scene = Graph.scene();

    // 6-1. 배경 별(Starfield) 생성
    if (!starFieldRef.current) {
      starFieldRef.current = createStarField();
    }
    scene.add(starFieldRef.current);

    if (!nebulaRef.current) {
      nebulaRef.current = createNebula(95, SUN_POS.clone().normalize());
    }
    scene.add(nebulaRef.current);

    if (!sunSpriteRef.current) {
      sunSpriteRef.current = createSunSprite();
      sunSpriteRef.current.position
        .copy(SUN_POS)
        .normalize()
        .multiplyScalar(90);
    }
    scene.add(sunSpriteRef.current);

    // 6-2. 바닥(Ground Sphere / Procedural Planet) 생성
    const voxelPlanet = createVoxelPlanet({
      seed: 1,
      radius: R,
      sunDir: [SUN_POS.x, SUN_POS.y, SUN_POS.z],
    });
    voxelPlanet.group.position.set(0, 0, Cz);
    scene.add(voxelPlanet.group);
    planetUpdateRef.current = voxelPlanet.update;
    (Graph as any).__voxelPlanet = voxelPlanet; // Store for cleanup

    // 6-3. 조명 설정 (landing page match)
    scene.add(new THREE.AmbientLight(0xffffff, 0.02));

    const dirLight = new THREE.DirectionalLight(0xffffff, 3.0);
    dirLight.position.copy(SUN_POS);
    dirLight.castShadow = true;

    // 그림자 품질 및 범위 설정
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.left = -R * 6;
    dirLight.shadow.camera.right = R * 6;
    dirLight.shadow.camera.top = R * 6;
    dirLight.shadow.camera.bottom = -R * 6;
    dirLight.shadow.camera.near = R * 0.1;
    dirLight.shadow.camera.far = R * 20;
    dirLight.shadow.bias = -0.001;

    scene.add(dirLight);
    scene.add(dirLight.target);
    dirLight.target.position.set(0, 0, Cz);

    // 렌더러 그림자 활성화
    const renderer = Graph.renderer();
    if (renderer) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    // 초기 카메라 위치 (데이터가 배치되기 전의 아주 먼 시점)
    Graph.cameraPosition({ x: 0, y: 0, z: Cz + R * 6 }, { x: 0, y: 0, z: Cz }, 0);
    const controls = Graph.controls();
    if (controls) {
      controls.minDistance = R * 0.15;
      controls.maxDistance = R * 50;
    }

    // 캐릭터 애니메이션 루프 (도로 위를 왕복)
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      scene.traverse((obj: THREE.Object3D) => {
        const ud = (obj as any).userData;
        if (ud?.isCharacter) {
          const { source: s, target: t } = ud.linkData;
          const time = ((Date.now() + ud.offset) % 10000) / 10000;
          const curve = getCurve(s, t);
          const point = curve.getPoint(time);

          // 도로 두께만큼 살짝 위로 띄움 (법선 방향)
          const nodeNormal = point.clone().sub(new THREE.Vector3(0, 0, Cz)).normalize();
          obj.position.copy(point).add(nodeNormal.multiplyScalar(R * 0.008));

          // 진행 방향 및 업벡터(표면 법선)를 고려한 회전
          const nextTime = Math.min(time + 0.005, 1);
          const lookAtPoint = curve.getPoint(nextTime);
          const tangent = lookAtPoint.clone().sub(point).normalize();

          const m = new THREE.Matrix4().lookAt(new THREE.Vector3(0, 0, 0), tangent, nodeNormal);
          obj.quaternion.setFromRotationMatrix(m);
        }
      });
      // 행성 애니메이션 (물, 구름)
      if (planetUpdateRef.current) {
        planetUpdateRef.current(0.016); // Approx 60fps dt
      }
    };
    animate();

    // 창 크기 조절 대응
    const onResize = () => {
      if (!containerRef.current || !graphRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      graphRef.current.width(w).height(h);
    };
    window.addEventListener("resize", onResize);

    console.log("🚀 CodeCityViewer Engine Initializing...");
    graphRef.current = Graph;

    // 2. 테마 시점 및 노드 배치 초기화
    setTimeout(() => {
      if (graphRef.current) {
        changeTheme(themeRef.current);
      }
    }, 100);

    /**
     * 컴포넌트 언마운트 시 리소스 정리
     */
    cleanupRef.current = () => {
      console.log("🧹 CodeCityViewer Engine Cleaning up...");
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);

      if (graphRef.current) {
        const scene = graphRef.current.scene();
        const renderer = graphRef.current.renderer();

        // 1. Dispose of the planet if exists
        (graphRef.current as any).__voxelPlanet?.dispose?.();

        // 2. Deep traverse scene and dispose of resources
        scene.traverse((obj: any) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m: any) => m.dispose());
            } else {
              obj.material.dispose();
            }
          }
        });

        // 3. Destroy force-graph instance
        try {
          (graphRef.current as any)?._destructor?.();
        } catch (e) {
          console.warn("Error in force-graph destructor:", e);
        }

        // 4. Dispose of renderer
        if (renderer) {
          renderer.dispose();
          renderer.forceContextLoss();
        }
      }

      graphRef.current = null;

      // 5. Clear container
      while (el.firstChild) el.removeChild(el.firstChild);
    };
  }, [containerRef, graphData, buildCityData, loadModel, getCurve, changeTheme, focusOnNode]);

  // 데이터 로드 시 엔진 초기화 실행
  useEffect(() => {
    init();
    return () => cleanupRef.current?.();
  }, [init]);

  // 프로퍼티 테마 변경 감지 및 반영
  useEffect(() => {
    if (opts?.theme && opts.theme !== themeRef.current) {
      changeTheme(opts.theme);
    }
  }, [opts?.theme, changeTheme]);

  // 컨테이너 레이아웃 지연 보정용 주기적 시도
  // [강력 수정] setInterval을 통한 중복 init() 방지. 
  // 대신 컨테이너가 준비되면 한 번만 실행되도록 init 호출 조건을 useEffect에서 관리함.
  useEffect(() => {
    if (containerRef.current && !graphRef.current && graphData) {
      init();
    }
  }, [init, containerRef, graphData]);

  /**
   * 노드 및 연결된 링크 하이라이트 통합 처리
   */
  const highlightNode = useCallback((node: CityNode | null) => {
    if (!graphRef.current) return;
    const scene = graphRef.current.scene();

    // 1. 도로(링크) 하이라이트
    const graphData = graphRef.current.graphData();
    if (!graphData || !graphData.links) return;

    graphData.links.forEach((link: any) => {
      const roadMesh = link.__roadMesh;
      if (!roadMesh) return;

      const material = roadMesh.material as THREE.MeshBasicMaterial;

      if (!node) {
        // 하이라이트 초기화
        material.color.set(0x333333);
        material.opacity = 0.8;
      } else {
        // ID 비교를 위해 변수 정규화 (객체일 수도, 문자열일 수도 있음)
        const sId = typeof link.source === "object" ? link.source.id : link.source;
        const tId = typeof link.target === "object" ? link.target.id : link.target;

        const isSource = sId === node.id;
        const isTarget = tId === node.id;

        if (isSource) {
          material.color.set(0x00ffff); // 참조하는 파일 -> 밝은 청록색
          material.opacity = 1.0;
        } else if (isTarget) {
          material.color.set(0xff00ff); // 참조되는 파일 -> 밝은 자주색
          material.opacity = 1.0;
        } else {
          material.color.set(0x111111); // 비관련 도로는 아주 어둡게
          material.opacity = 0.15;      // 보일 정도로만 (너무 투명하면 끊어져 보임)
        }
      }

      // 캐릭터(자동차) 투명도도 동기화
      const group = link.__threeObj as THREE.Group | undefined;
      if (group) {
        group.traverse((c: any) => {
          if (c.userData?.isCharacter) {
            c.traverse((child: any) => {
              if (child.isMesh) {
                child.material.transparent = true;
                child.material.opacity = !node ? 1.0 : (material.opacity > 0.5 ? 1.0 : 0.05);
              }
            });
          }
        });
      }
    });

    // 2. 노드(건물) 하이라이트
    scene.traverse((obj: any) => {
      if (obj.userData?.node) {
        const isSelected = node && obj.userData.node.id === node.id;
        obj.traverse((child: any) => {
          if (child.isMesh) {
            if (isSelected) {
              child.material.emissive?.set(0xff1493);
              child.material.emissiveIntensity = 0.8;
            } else {
              child.material.emissive?.set(0x000000);
              child.material.emissiveIntensity = 0;
            }
          }
        });
      }
    });
    if (node) {
      focusOnNode(node);
    } else {
      if (selectionRingRef.current) selectionRingRef.current.visible = false;
    }
  },
    [focusOnNode]
  );

  return {
    graphRef,
    changeTheme,
    resetCamera,
    focusOnNode,
    highlightNode,
  };
}
