"use client";

import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import ForceGraph3D from "3d-force-graph";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import type { GraphData } from "@/lib/types";

export type ThemeType = "Thema1" | "Thema2" | "Thema3";

const THEME_CONFIG: Record<ThemeType, { character: string; lastBuilding: string }> = {
  Thema1: { character: "oobi", lastBuilding: "n" },
  Thema2: { character: "oozi", lastBuilding: "t" },
  Thema3: { character: "ooli", lastBuilding: "p" },
};

const PLANET_CONFIG = {
  RADIUS: 4000,
  CENTER_Z: -4000,
};

type CityNode = {
  id: string;
  lineCount: number;
  imports: string[];
  importedBy: string[];
  x: number;
  y: number;
  z: number;
};

type CityLink = {
  source: CityNode | string;
  target: CityNode | string;
};

type CityGraphData = {
  nodes: CityNode[];
  links: CityLink[];
};

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const OBJ_CACHE = useRef<Record<string, THREE.Object3D>>({});
  const CHARACTER_MODEL = useRef<THREE.Group | null>(null);

  const objLoaderRef = useRef(new OBJLoader());
  const mtlLoaderRef = useRef(new MTLLoader());

  const cityDataRef = useRef<CityGraphData | null>(null);

  const loadOBJ = useCallback(async (url: string): Promise<THREE.Object3D> => {
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
          // MTL failed, fallback to OBJ-only
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

  const buildCityData = useCallback((data: GraphData): CityGraphData => {
    const nodes: CityNode[] = [];
    const links: CityLink[] = [];

    const nodeMap = new Map<string, CityNode>();
    const sourceNodes = data.nodes.filter((n) => n.type === "file");

    sourceNodes.forEach((n) => {
      const node: CityNode = {
        id: n.id,
        lineCount: n.lines || n.loc || 10,
        imports: [],
        importedBy: [],
        x: 0,
        y: 0,
        z: 0,
      };
      nodeMap.set(n.id, node);
      nodes.push(node);
    });

    data.edges.forEach((e) => {
      if (!nodeMap.has(e.source) || !nodeMap.has(e.target)) return;
      links.push({ source: e.source, target: e.target });

      nodeMap.get(e.source)!.imports.push(e.target);
      nodeMap.get(e.target)!.importedBy.push(e.source);
    });

    const clusterRadius = 500;
    nodes.forEach((node) => {
      if (node.imports.length === 0 && node.importedBy.length === 0) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * clusterRadius;
        node.x = Math.cos(angle) * radius;
        node.y = Math.sin(angle) * radius;
        node.z = PLANET_CONFIG.CENTER_Z + PLANET_CONFIG.RADIUS;
      }
    });

    return { nodes, links };
  }, []);

  const getCurve = useCallback((start: any, end: any) => {
    const R = PLANET_CONFIG.RADIUS;
    const Cz = PLANET_CONFIG.CENTER_Z;

    const mx = (start.x + end.x) / 2;
    const my = (start.y + end.y) / 2;
    const mz = (start.z + end.z) / 2;

    const cx = mx;
    const cy = my;
    const cz = mz - Cz;

    const dist = Math.sqrt(cx * cx + cy * cy + cz * cz) || 1;
    const chordDist = Math.hypot(start.x - end.x, start.y - end.y, start.z - end.z);

    const height = R + 2 + chordDist * 0.01;
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

  const changeTheme = useCallback(
    async (theme: ThemeType) => {
      if (!THEME_CONFIG[theme]) return;
      themeRef.current = theme;

      const charPath = `/Themas/${theme}/character-${THEME_CONFIG[theme].character}.obj`;

      try {
        const charObj = await loadOBJ(charPath);
        const box = new THREE.Box3().setFromObject(charObj);
        const size = box.getSize(new THREE.Vector3());
        const scale = 7.5 / (Math.max(size.x, size.y, size.z) || 1);
        charObj.scale.set(scale, scale, scale);

        const g = new THREE.Group();
        g.add(charObj);
        CHARACTER_MODEL.current = g;
      } catch (e) {
        console.error("Failed to load character:", e);
      }

      if (graphRef.current) {
        graphRef.current.nodeThreeObject(graphRef.current.nodeThreeObject());
        graphRef.current.linkThreeObject(graphRef.current.linkThreeObject());
      }
    },
    [loadOBJ]
  );

  const focusOnNode = useCallback((node: CityNode) => {
    if (!graphRef.current) return;

    const R = PLANET_CONFIG.RADIUS;
    const Cz = PLANET_CONFIG.CENTER_Z;

    const center = new THREE.Vector3(0, 0, Cz);
    const nodePos = new THREE.Vector3(node.x, node.y, node.z);
    const normal = new THREE.Vector3().subVectors(nodePos, center).normalize();

    const globalUp = new THREE.Vector3(0, 1, 0);
    let north = new THREE.Vector3().copy(globalUp).projectOnPlane(normal).normalize();
    if (north.lengthSq() < 0.001) {
      north.set(0, 0, 1).projectOnPlane(normal).normalize();
    }
    const south = north.clone().negate();

    const dist = 800;
    const camPos = nodePos.clone()
      .add(normal.clone().multiplyScalar(dist))
      .add(south.clone().multiplyScalar(dist));

    const camera = graphRef.current.camera();
    camera.up.copy(normal);

    graphRef.current.cameraPosition(
      { x: camPos.x, y: camPos.y, z: camPos.z },
      node,
      1500
    );
  }, []);

  const resetCamera = useCallback(() => {
    if (!graphRef.current) return;
    const R = PLANET_CONFIG.RADIUS;
    const Cz = PLANET_CONFIG.CENTER_Z;

    graphRef.current.cameraPosition(
      { x: 0, y: R * 1.5, z: Cz + R * 1.5 },
      { x: 0, y: 0, z: Cz },
      1500
    );
  }, []);

  const init = useCallback(async () => {
    if (!containerRef.current || !graphData) return;

    // ✅ container가 0x0이면 ForceGraph가 망가짐 -> 방지
    const el = containerRef.current;
    const rect = el.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;

    // cleanup previous
    cleanupRef.current?.();

    // theme/character preload
    await changeTheme(themeRef.current);

    const cityData = buildCityData(graphData);
    cityDataRef.current = cityData;

    // init graph
    const ForceGraph3DAny = ForceGraph3D as any;
    const Graph = ForceGraph3DAny()(el)
      .graphData(cityData)
      .backgroundColor("#87CEEB")
      .nodeThreeObject((node: CityNode) => {
        const group = new THREE.Group();
        const scale = Math.max(12, Math.log(node.lineCount || 10) * 12);

        const charCode = THEME_CONFIG[themeRef.current].lastBuilding.charCodeAt(0);
        const startCode = "a".charCodeAt(0);
        const buildings: string[] = [];
        for (let i = startCode; i <= charCode; i++) {
          buildings.push(`/Themas/${themeRef.current}/building-${String.fromCharCode(i)}.obj`);
        }

        const bUrl = buildings[Math.floor(Math.random() * buildings.length)];
        loadOBJ(bUrl)
          .then((obj) => {
            obj.rotation.x = Math.PI / 2;
            obj.scale.set(scale, scale, scale);
            group.add(obj);
          })
          .catch((err) => console.error(`Failed building load (${bUrl}):`, err));

        return group;
      })
      .onNodeClick((node: CityNode) => {
        focusOnNode(node);
        opts?.onNodeClick?.(node);
      })
      .onBackgroundClick(() => {
        opts?.onBackgroundClick?.();
      });

    Graph.d3Force("charge")?.strength(-140);
    Graph.d3Force("link")?.distance(120);

    const R = PLANET_CONFIG.RADIUS;
    const Cz = PLANET_CONFIG.CENTER_Z;

    Graph.linkThreeObjectExtend(true)
      .linkThreeObject((link: CityLink) => {
        const group = new THREE.Group();
        (group as any).userData.link = link;

        if (Math.random() <= 0.6 && CHARACTER_MODEL.current) {
          const obj = CHARACTER_MODEL.current.clone();
          obj.up.set(0, 0, 1);
          (obj as any).userData = {
            offset: Math.random() * 10000,
            isCharacter: true,
            linkData: link,
          };
          group.add(obj);
        }

        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, 0)
        );
        const geometry = new THREE.TubeGeometry(curve, 10, 2, 6, false);
        const material = new THREE.MeshBasicMaterial({
          color: 0x1a1a1a,
          transparent: true,
          opacity: 0.8,
        });
        const mesh = new THREE.Mesh(geometry, material);
        (mesh as any).userData = { isRoad: true };
        group.add(mesh);

        return group;
      })
      .linkPositionUpdate((obj: THREE.Object3D, { start, end }: any) => {
        if (!start || !end) return;
        const roadMesh = obj.children.find((c) => (c as any).userData?.isRoad) as THREE.Mesh | undefined;
        if (roadMesh) {
          const curve = getCurve(start, end);
          roadMesh.geometry.dispose();
          roadMesh.geometry = new THREE.TubeGeometry(curve, 10, 2, 6, false);
        }
        return false;
      });

    // Project nodes onto sphere surface (연구용 코드와 동일)
    const modelUp = new THREE.Vector3(0, 0, 1);
    const cityNormal = new THREE.Vector3(0, 1, 0);
    Graph.onEngineTick(() => {
      const nodes = Graph.graphData().nodes as CityNode[];
      nodes.forEach((n) => {
        const dx = n.x;
        const dy = n.y;
        const dz = n.z - Cz;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        let normal = new THREE.Vector3(dx, dy, dz).multiplyScalar(1 / dist);
        if (n.imports.length === 0 && n.importedBy.length === 0) {
          normal = normal.lerp(cityNormal, 0.08).normalize();
        }
        n.x = normal.x * R;
        n.y = normal.y * R;
        n.z = normal.z * R + Cz;

        const obj = (n as any).__threeObj as THREE.Object3D | undefined;
        if (obj) {
          obj.quaternion.setFromUnitVectors(modelUp, normal);
        }
      });
    });

    // planet + lights
    const scene = Graph.scene();
    const sphereGeo = new THREE.SphereGeometry(R, 64, 64);
    const sphereMat = new THREE.MeshStandardMaterial({ color: "#4d8b31", roughness: 1 });
    const ground = new THREE.Mesh(sphereGeo, sphereMat);
    ground.position.set(0, 0, Cz);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(1000, 1000, 1000);
    scene.add(dirLight);

    Graph.cameraPosition({ x: 0, y: R * 1.5, z: Cz + R * 1.5 }, { x: 0, y: 0, z: Cz }, 0);
    Graph.width(el.clientWidth).height(el.clientHeight);

    // character animate
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      scene.traverse((obj: THREE.Object3D) => {
        const ud = (obj as any).userData;
        if (ud?.isCharacter) {
          const { source: s, target: t } = ud.linkData;
          if (typeof s === "object" && typeof t === "object") {
            const time = ((Date.now() + ud.offset) % 10000) / 10000;
            const curve = getCurve(s, t);
            const point = curve.getPoint(time);
            obj.position.copy(point);

            const nextTime = Math.min(time + 0.01, 1);
            const lookAtPoint = curve.getPoint(nextTime);
            obj.lookAt(lookAtPoint);
          }
        }
      });
    };
    animate();

    // resize
    const onResize = () => {
      if (!containerRef.current || !graphRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      graphRef.current.width(w).height(h);
    };
    window.addEventListener("resize", onResize);

    graphRef.current = Graph;

    cleanupRef.current = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      try {
        (graphRef.current as any)?._destructor?.();
      } catch {}
      graphRef.current = null;

      // container clear
      while (el.firstChild) el.removeChild(el.firstChild);
    };
  }, [containerRef, graphData, buildCityData, loadOBJ, getCurve, changeTheme, focusOnNode, opts]);

  useEffect(() => {
    init();
    return () => cleanupRef.current?.();
  }, [init]);

  // container가 처음에 0사이즈였다가 나중에 커지는 케이스 보정
  useEffect(() => {
    const id = setInterval(() => {
      if (!containerRef.current || graphRef.current) return;
      init();
    }, 100);
    return () => clearInterval(id);
  }, [init, containerRef]);

  return {
    graphRef,
    changeTheme,
    resetCamera,
    focusOnNode,
  };
}
