"use client";

import { useEffect, useRef, useState } from "react";
import ForceGraph from "force-graph";
import type { GraphData } from "@/lib/types";

type CityNode = {
    id: string;
    lineCount: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    fx?: number;
    fy?: number;
};

type Props = {
    data: GraphData | null;
    focusedNode?: any;
    onNodeClick?: (node: any) => void;
    onBackgroundClick?: () => void;
};

export function TwoViewer({ data, focusedNode, onNodeClick, onBackgroundClick }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const graphRef = useRef<any>(null);
    const [selectedNode, setSelectedNode] = useState<any>(null);

    useEffect(() => {
        if (!containerRef.current || !data) return;

        // Initialize 2D Graph
        const ForceGraphAny = ForceGraph as any;
        const Graph = ForceGraphAny()(containerRef.current)
            .graphData({
                nodes: data.nodes,
                links: data.edges || []
            })
            .backgroundColor("#000000")
            .nodeLabel((node: any) => node.id.split(/[\\/]/).pop())
            .nodeCanvasObject((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                const label = node.id.split(/[\\/]/).pop();
                const fontSize = 12 / globalScale;
                const isSelected = selectedNode && node.id === selectedNode.id;

                // 1. Draw node circle
                const radius = isSelected ? 8 : 5;
                ctx.beginPath();
                ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
                ctx.fillStyle = isSelected ? "#ffff00" : "#4da6ff";
                ctx.fill();

                // White border for better visibility in dark background
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 1 / globalScale;
                ctx.stroke();

                // 2. Label text (on selection or zoom)
                if (isSelected || globalScale > 1.5) {
                    ctx.font = `${fontSize}px Sans-Serif`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillStyle = "white";
                    ctx.fillText(label, node.x, node.y + radius + fontSize);
                }
            })
            .linkColor(() => "rgba(255,255,255,0.2)")
            .onNodeClick((node: any) => {
                setSelectedNode(node);
                onNodeClick?.(node);

                // Center and zoom on click
                Graph.centerAt(node.x, node.y, 1000);
                Graph.zoom(2, 1000);

                // Trigger re-render to reflect selection
                Graph.nodeCanvasObject(Graph.nodeCanvasObject());
            })
            .onBackgroundClick(() => {
                setSelectedNode(null);
                onBackgroundClick?.();
                // Reset selection view
                Graph.nodeCanvasObject(Graph.nodeCanvasObject());
            })
            .onNodeDragEnd((node: any) => {
                // Pin node after drag
                node.fx = node.x;
                node.fy = node.y;
            });

        // Initial node pinning if positions exist
        data.nodes.forEach((node: any) => {
            if (node.x !== undefined) {
                node.fx = node.x;
                node.fy = node.y;
            }
        });

        // Force settings
        Graph.d3Force("charge")?.strength(-75);
        Graph.d3Force("link")?.distance(45);

        graphRef.current = Graph;

        // Handle resize
        const handleResize = () => {
            if (containerRef.current && graphRef.current) {
                graphRef.current.width(containerRef.current.clientWidth);
                graphRef.current.height(containerRef.current.clientHeight);
            }
        };
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            if (containerRef.current) {
                containerRef.current.innerHTML = "";
            }
            graphRef.current = null;
        };
    }, [data, onNodeClick, onBackgroundClick]); // Removed selectedNode and focusedNode

    // Handle focus specifically in a separate effect
    useEffect(() => {
        if (graphRef.current && focusedNode) {
            graphRef.current.centerAt(focusedNode.x, focusedNode.y, 1000);
            graphRef.current.zoom(2, 1000);
            setSelectedNode(focusedNode);
            // Trigger canvas refresh
            graphRef.current.nodeCanvasObject(graphRef.current.nodeCanvasObject());
        }
    }, [focusedNode]);

    return <div ref={containerRef} className="h-full w-full" />;
}
