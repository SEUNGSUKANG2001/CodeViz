"use client";

import { useEffect, useRef, useCallback } from "react";
import type { GraphData, GraphNode } from "@/lib/types";

// Extended types for visualization
export type ThemeType = "Thema1" | "Thema2" | "Thema3";

export type ViewerConfig = {
  theme: ThemeType;
  sphereRadius: number;
  buildingScale: number;
  showLabels: boolean;
};

const DEFAULT_CONFIG: ViewerConfig = {
  theme: "Thema1",
  sphereRadius: 200,
  buildingScale: 1,
  showLabels: true,
};

// Color mapping for file languages
const LANGUAGE_COLORS: Record<string, string> = {
  typescript: "#3178c6",
  javascript: "#f7df1e",
  python: "#3776ab",
  java: "#007396",
  kotlin: "#7f52ff",
  cpp: "#00599c",
  c: "#a8b9cc",
  go: "#00add8",
  rust: "#dea584",
  ruby: "#cc342d",
  php: "#777bb4",
  swift: "#f05138",
  default: "#6366f1",
};

export function useCodeCityViewer(
  containerRef: React.RefObject<HTMLDivElement>,
  graphData: GraphData | null,
  config: Partial<ViewerConfig> = {}
) {
  const graphRef = useRef<any>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const initViewer = useCallback(async () => {
    if (!containerRef.current || !graphData) return;

    // Dynamic import to avoid SSR issues
    const ForceGraph3DModule = await import("3d-force-graph");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ForceGraph3D = ForceGraph3DModule.default as any;
    const THREE = await import("three");

    // Clean up previous instance
    if (cleanupRef.current) {
      cleanupRef.current();
    }

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Build node map for quick lookup
    const nodeMap = new Map<string, GraphNode>();
    graphData.nodes.forEach((node) => nodeMap.set(node.id, node));

    // Calculate node positions on sphere
    const fileNodes = graphData.nodes.filter((n) => n.type === "file");
    const dirNodes = graphData.nodes.filter((n) => n.type === "directory");

    // Position nodes using Fibonacci sphere distribution
    const positionNodes = (nodes: GraphNode[], radius: number) => {
      const positions = new Map<string, { x: number; y: number; z: number }>();
      const goldenRatio = (1 + Math.sqrt(5)) / 2;

      nodes.forEach((node, i) => {
        const theta = (2 * Math.PI * i) / goldenRatio;
        const phi = Math.acos(1 - (2 * (i + 0.5)) / nodes.length);

        positions.set(node.id, {
          x: radius * Math.sin(phi) * Math.cos(theta),
          y: radius * Math.sin(phi) * Math.sin(theta),
          z: radius * Math.cos(phi),
        });
      });

      return positions;
    };

    const filePositions = positionNodes(fileNodes, mergedConfig.sphereRadius);
    const dirPositions = positionNodes(
      dirNodes,
      mergedConfig.sphereRadius * 0.8
    );

    // Transform nodes for force-graph
    const graphNodes = graphData.nodes.map((node) => {
      const pos =
        node.type === "file"
          ? filePositions.get(node.id)
          : dirPositions.get(node.id);

      return {
        id: node.id,
        name: node.name,
        type: node.type,
        language: node.language || "",
        lines: node.loc || 0,
        fx: pos?.x || 0,
        fy: pos?.y || 0,
        fz: pos?.z || 0,
      };
    });

    // Transform edges for force-graph
    const graphLinks = graphData.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      type: edge.type,
    }));

    // Create the 3D force graph
    const Graph = ForceGraph3D()(container)
      .width(width)
      .height(height)
      .backgroundColor("#fbfbfc")
      .showNavInfo(false)
      .graphData({ nodes: graphNodes, links: graphLinks });

    // Configure node appearance
    Graph.nodeThreeObject((node: any) => {
      const group = new THREE.Group();

      if (node.type === "file") {
        // Create building for file
        const height = Math.max(5, Math.min(50, (node.lines || 10) / 10));
        const size = 3 * mergedConfig.buildingScale;

        const geometry = new THREE.BoxGeometry(size, height, size);
        const color =
          LANGUAGE_COLORS[node.language] || LANGUAGE_COLORS.default;
        const material = new THREE.MeshLambertMaterial({
          color: new THREE.Color(color),
          transparent: true,
          opacity: 0.9,
        });

        const building = new THREE.Mesh(geometry, material);
        building.position.y = height / 2;
        group.add(building);

        // Add edge glow
        const edgeGeometry = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.3,
        });
        const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        edges.position.y = height / 2;
        group.add(edges);
      } else {
        // Directory node - small sphere
        const geometry = new THREE.SphereGeometry(2, 16, 16);
        const material = new THREE.MeshLambertMaterial({
          color: 0x94a3b8,
          transparent: true,
          opacity: 0.6,
        });
        const sphere = new THREE.Mesh(geometry, material);
        group.add(sphere);
      }

      // Orient building to point away from sphere center
      const pos = new THREE.Vector3(node.fx, node.fy, node.fz);
      if (pos.length() > 0) {
        const up = pos.clone().normalize();
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
        group.quaternion.copy(quaternion);
      }

      return group;
    });

    // Configure link appearance
    Graph.linkColor(() => "rgba(99, 102, 241, 0.3)")
      .linkWidth(0.5)
      .linkOpacity(0.3);

    // Add central sphere (planet core)
    const sphereGeometry = new THREE.SphereGeometry(
      mergedConfig.sphereRadius * 0.7,
      64,
      64
    );
    const sphereMaterial = new THREE.MeshPhongMaterial({
      color: 0xf1f5f9,
      transparent: true,
      opacity: 0.3,
      wireframe: false,
    });
    const coreSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    Graph.scene().add(coreSphere);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    Graph.scene().add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 100);
    Graph.scene().add(directionalLight);

    // Set camera position
    Graph.cameraPosition({ x: 0, y: 0, z: mergedConfig.sphereRadius * 2.5 });

    // Enable auto-rotation
    Graph.controls().autoRotate = true;
    Graph.controls().autoRotateSpeed = 0.5;

    // Store reference
    graphRef.current = Graph;

    // Handle resize
    const handleResize = () => {
      if (containerRef.current && graphRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        graphRef.current.width(w).height(h);
      }
    };

    window.addEventListener("resize", handleResize);

    // Cleanup function
    cleanupRef.current = () => {
      window.removeEventListener("resize", handleResize);
      if (graphRef.current) {
        graphRef.current._destructor && graphRef.current._destructor();
        graphRef.current = null;
      }
      // Clear container
      if (container) {
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
      }
    };
  }, [graphData, containerRef, mergedConfig]);

  // Initialize viewer when data changes
  useEffect(() => {
    initViewer();

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [initViewer]);

  // Method to change theme
  const setTheme = useCallback((theme: ThemeType) => {
    // Theme change logic would go here
    // For now, we just log it
    console.log("Theme changed to:", theme);
  }, []);

  // Method to focus on a specific node
  const focusNode = useCallback((nodeId: string) => {
    if (graphRef.current) {
      const node = graphRef.current
        .graphData()
        .nodes.find((n: any) => n.id === nodeId);
      if (node) {
        graphRef.current.cameraPosition(
          { x: node.fx * 1.5, y: node.fy * 1.5, z: node.fz * 1.5 },
          { x: 0, y: 0, z: 0 },
          1000
        );
      }
    }
  }, []);

  // Method to reset camera
  const resetCamera = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.cameraPosition(
        { x: 0, y: 0, z: mergedConfig.sphereRadius * 2.5 },
        { x: 0, y: 0, z: 0 },
        1000
      );
    }
  }, [mergedConfig.sphereRadius]);

  return {
    graphRef,
    setTheme,
    focusNode,
    resetCamera,
  };
}
