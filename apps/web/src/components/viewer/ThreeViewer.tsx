"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { ProjectDetailResponse, ResultUrlResponse, GraphData } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import { useCodeCityViewer, ThemeType } from "./useCodeCityViewer";
import { TwoViewer } from "./TwoViewer";
import "./viewer.css";

/**
 * ThreeViewer 컴포넌트의 Props 타입 정의
 * - project: 프로젝트 상세 정보 (DB 데이터)
 * - loading: 프로젝트 데이터를 가져오는 중인지 여부
 * - theme: 3D 테마 선택 ("Thema1", "Thema2", "Thema3")
 * - onThemeChange: 테마 변경 시 호출되는 콜백 함수
 */
type Props = {
  project: ProjectDetailResponse["data"]["project"] | null;
  loading?: boolean;
  theme?: ThemeType;
  onThemeChange?: (theme: ThemeType) => void;
  onCaptureReady?: (captureFn: () => Promise<string>) => void;
};

/**
 * ThreeViewer 컴포넌트
 * - 분석 결과(JSON)를 S3에서 가져와 3D 시각화를 화면에 표시합니다.
 * - 프로젝트의 분석 작업(AnalysisJob) 상태에 따라 로딩 스크린, 에러 메시지 등을 보여줍니다.
 */
export function ThreeViewer({ project, loading, theme = "Thema1", onThemeChange, onCaptureReady }: Props) {
  // 3D 캔버스가 렌더링될 DOM 요소에 대한 Ref
  const containerRef = useRef<HTMLDivElement>(null);

  // 시각화에 필요한 그래프 데이터 (노드 및 링크 정보)
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);

  // 3D 엔진(Three.js/3d-force-graph) 준비 완료 여부
  const [viewerReady, setViewerReady] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [focusedNodeState, setFocusedNodeState] = useState<any>(null);

  // 히스토리(Time Machine) 관련 상태
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [activeGraphData, setActiveGraphData] = useState<GraphData | null>(null);

  // 사이드바 전용 상태
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [sidebarActive, setSidebarActive] = useState(false);

  // 최신 분석 작업(Job) 상태 편리하게 참조
  const jobStatus = project?.latestJob?.status;
  const jobId = project?.latestJob?.id;
  const progress = project?.latestJob?.progress;

  // 핸들러용 Ref (순환 참조 방지 및 의존성 안정화)
  const onNodeClickRef = useRef<(node: any) => void>(null as any);
  const onBackgroundClickRef = useRef<() => void>(null as any);

  /**
   * 3D 시각화 엔진 초기화 커스텀 훅
   */
  const { graphRef, resetCamera, focusOnNode, highlightNode, captureScreenshot } = useCodeCityViewer(
    containerRef,
    viewerReady ? activeGraphData : null,
    {
      theme,
      onNodeClick: (node) => onNodeClickRef.current?.(node),
      onBackgroundClick: () => onBackgroundClickRef.current?.(),
    }
  );

  useEffect(() => {
    if (captureScreenshot && onCaptureReady) {
      onCaptureReady(captureScreenshot);
    }
  }, [captureScreenshot, onCaptureReady]);

  const handleNodeSelect = useCallback((node: any) => {
    if (!node) return;

    // 이미 데이터가 enrich 되어있으므로, ID로 찾아도 좋고 넘겨받은 객체를 그대로 써도 좋습니다.
    // 다만 history 전환 시의 최신 상태(isModified 등)를 반영하기 위해 activeGraphData에서 조회합니다.
    const fullNode = activeGraphData?.nodes.find((n: any) => n.id === node.id) || node;

    setSelectedNode(fullNode);
    setSidebarActive(true);

    if (theme !== "2D") {
      highlightNode(node);
    } else {
      setFocusedNodeState(node);
    }
    setSearchQuery("");
  }, [theme, highlightNode, activeGraphData]);

  const closeSidebar = useCallback(() => {
    setSidebarActive(false);
    if (theme !== "2D") {
      highlightNode(null);
    }
  }, [theme, highlightNode]);

  // 핸들러 Ref 업데이트 (매 render마다 최신 핸들러를 가리키도록 함)
  useEffect(() => {
    onNodeClickRef.current = handleNodeSelect;
    onBackgroundClickRef.current = closeSidebar;
  }, [handleNodeSelect, closeSidebar]);
  // 분석 데이터 로드 또는 히스토리 변경 시 활성 데이터 업데이트
  useEffect(() => {
    if (!graphData) return;

    if (historyIndex === -1 || !graphData.history || graphData.history.length === 0) {
      setActiveGraphData(graphData);
    } else {
      const targetCommit = graphData.history[historyIndex];
      console.log("히스토리 인덱스 변경:", historyIndex);
      console.log("대상 커밋 해시:", targetCommit.hash);

      const snapshot = graphData.snapshots?.find((s) => s.hash === targetCommit.hash);
      console.log("매칭된 스냅샷 찾음:", snapshot);

      if (snapshot) {
        // 스냅샷 파일 맵을 GraphNode[] 및 GraphEdge[] 형식으로 변환
        const snapshotNodes = Object.entries(snapshot.files).map(([path, info]) => ({
          id: path,
          name: path.split("/").pop() || path,
          path: path,
          type: "file",
          lines: info.line_count,
          language: info.language,
        }));

        const snapshotEdges: any[] = [];
        const nodeIds = new Set(snapshotNodes.map((n) => n.id));

        Object.entries(snapshot.files).forEach(([sourcePath, info]) => {
          info.depends_on.forEach((dep) => {
            if (nodeIds.has(dep.target)) {
              snapshotEdges.push({
                source: sourcePath,
                target: dep.target,
                type: dep.type || "import",
              });
            }
          });
        });

        // 관계 데이터(imports/importedBy) 계산 및 주입 (기존 로직과 동일)
        const nodeMap = new Map<string, any>();
        snapshotNodes.forEach((n: any) => {
          n.imports = [];
          n.importedBy = [];
          nodeMap.set(n.id, n);
        });

        snapshotEdges.forEach((e: any) => {
          if (nodeMap.has(e.source) && nodeMap.has(e.target)) {
            nodeMap.get(e.source).imports.push(e.target);
            nodeMap.get(e.target).importedBy.push(e.source);
          }
        });

        setActiveGraphData({
          ...graphData,
          nodes: snapshotNodes,
          edges: snapshotEdges,
        });
      } else {
        console.warn("해당 커밋에 대한 스냅샷이 존재하지 않습니다.");
        // 데이터가 없으면 빈 상태로 두지 않고 현재 데이터를 유지하거나 빈 그래프를 보여줄 수 있음
        // 여기서는 안전하게 현재 노드들만 유지
        setActiveGraphData(graphData);
      }
    }
  }, [graphData, historyIndex]);

  // 검색어 입력 시 결과 필터링
  useEffect(() => {
    if (!searchQuery.trim() || !graphData) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const matches = graphData.nodes
      .filter((n: any) =>
        n.id.toLowerCase().includes(query) ||
        n.id.split("/").pop()?.toLowerCase().includes(query)
      )
      .slice(0, 8);
    setSearchResults(matches);
  }, [searchQuery, graphData]);


  /**
   * 분석 작업이 완료(done)되었을 때 S3에서 그래프 JSON 데이터를 가져오는 이펙트
   */
  useEffect(() => {
    // 작업이 진행 중이거나 실패한 경우 데이터 초기화 후 종료
    if (jobStatus !== "done" || !jobId) {
      setGraphData(null);
      setViewerReady(false);
      return;
    }

    let cancelled = false;

    async function fetchGraph() {
      setGraphLoading(true);
      setGraphError(null);

      try {
        // 1. 분석 결과인 S3 JSON 파일에 접근할 수 있는 임시(Presigned) URL 요청
        const urlRes = await apiFetch<ResultUrlResponse>(
          `/api/v1/analysis-jobs/${jobId}/result-url`
        );

        // 2. 받은 URL을 통해 실제 JSON 데이터 Fetch
        const graphRes = await fetch(urlRes.data.url);
        if (!graphRes.ok) throw new Error("Failed to fetch graph data");

        const data: GraphData = await graphRes.json();
        console.log("그래프 데이터 로드 완료:", data);
        if (data.snapshots) {
          console.log("사용 가능한 스냅샷 개수:", data.snapshots.length);
        }

        // [중요] 데이터를 받은 즉시 의존성 관계(imports/importedBy) 계산 및 주입
        // 이를 통해 사이드바나 검색 결과에서 안정적으로 관계 데이터를 사용할 수 있음
        const nodeMap = new Map<string, any>();
        data.nodes.forEach((n: any) => {
          n.imports = [];
          n.importedBy = [];
          nodeMap.set(n.id, n);
        });
        (data.edges || []).forEach((e: any) => {
          if (nodeMap.has(e.source) && nodeMap.has(e.target)) {
            nodeMap.get(e.source).imports.push(e.target);
            nodeMap.get(e.target).importedBy.push(e.source);
          }
        });

        // 3. 데이터를 상태에 저장하고 엔진 준비 알림
        if (!cancelled) {
          setGraphData(data);
          // 컨테이너 요소가 DOM에 완전히 준비될 시간을 주기 위한 약간의 지연
          setTimeout(() => {
            if (!cancelled) setViewerReady(true);
          }, 100);
        }
      } catch (e) {
        if (!cancelled) {
          const error = e as Error;
          setGraphError(error.message ?? "Failed to load graph");
        }
      } finally {
        if (!cancelled) setGraphLoading(false);
      }
    }

    fetchGraph();

    // 컴포넌트 언마운트 시 비동기 작업 취소 처리
    return () => {
      cancelled = true;
    };
  }, [jobStatus, jobId]);

  /**
   * 현재 상태(로딩, 작업 중, 에러 등)에 따라 오버레이 화면을 보여줄지 결정
   */
  const showOverlay =
    loading ||
    jobStatus === "queued" ||
    jobStatus === "running" ||
    jobStatus === "failed" ||
    graphLoading ||
    graphError ||
    !graphData;

  return (
    <div className="viewer-body relative h-full w-full">
      {/* Theme Tabs */}
      <div className="theme-tabs">
        <button
          className={`tab-btn ${theme === "2D" ? "active" : ""}`}
          onClick={() => onThemeChange?.("2D")}
        >
          2D Graph 📄
        </button>
        {(["Thema1", "Thema2", "Thema3"] as ThemeType[]).map((t) => (
          <button
            key={t}
            className={`tab-btn ${theme === t ? "active" : ""}`}
            onClick={() => onThemeChange?.(t)}
          >
            {t.replace("Thema", "Thema ")}
          </button>
        ))}
      </div>

      {/* Search Container */}
      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search files... (e.g. main.js)"
          autoComplete="off"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((node) => (
              <button
                key={node.id}
                className="search-item"
                onClick={() => {
                  handleNodeSelect(node);
                  setSearchQuery("");
                }}
              >
                <strong>{node.id.split(/[\\/]/).pop()}</strong>
                <span className="sub-text">{node.id}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info Badge */}
      <div className="info-badge">🖱️ 좌클릭: 회전 / 우클릭: 이동 / 휠: 줌</div>

      {/* 3D/2D Graph Viewers */}
      <div
        className="graph-container h-full w-full"
        style={{ display: theme === "2D" ? "none" : "block" }}
      >
        <div ref={containerRef} className="h-full w-full" />
      </div>

      {theme === "2D" && (
        <div className="graph-container h-full w-full bg-black">
          <TwoViewer
            data={activeGraphData}
            onNodeClick={handleNodeSelect}
            focusedNode={focusedNodeState}
          />
        </div>
      )}

      {/* Timeline Controls (History) */}
      {viewerReady && graphData?.history && graphData.history.length > 0 && (
        <div className="timeline-controls">
          <div className="timeline-info">
            <span className="history-date">
              {historyIndex === -1
                ? "Latest"
                : new Date(graphData.history[historyIndex].timestamp * 1000).toLocaleDateString()}
            </span>
            <span className="history-impact">
              {historyIndex === -1 ? "Initial layout" : graphData.history[historyIndex].message}
            </span>
          </div>
          {(() => {
            const history = graphData.history;
            const L = history.length;
            const sliderValue = historyIndex === -1 ? L : (L - 1) - historyIndex;
            return (
              <input
                type="range"
                min="0"
                max={L}
                value={sliderValue}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setHistoryIndex(val === L ? -1 : (L - 1) - val);
                }}
                className="history-slider"
              />
            );
          })()}
        </div>
      )}

      {/* Neon Sidebar */}
      <div className={`viewer-sidebar ${sidebarActive ? "active" : ""}`}>
        <div className="sidebar-header">
          <h2 id="sb-title">{selectedNode?.id.split(/[\\/]/).pop() || "File Name"}</h2>
          <button className="close-btn" onClick={closeSidebar}>
            &times;
          </button>
        </div>
        <div className="info-group">
          <strong>Line Count</strong>{" "}
          <span id="sb-loc">{selectedNode?.lineCount || selectedNode?.loc || 0}</span>
        </div>

        <div className="dep-section">
          <h3>Imports</h3>
          <ul id="sb-imports">
            {selectedNode?.imports?.map((imp: string) => (
              <li key={imp} title={imp} onClick={() => handleNodeSelect(graphData?.nodes.find(n => n.id === imp))}>
                {imp.split(/[\\/]/).pop()}
              </li>
            ))}
            {(!selectedNode?.imports || selectedNode.imports.length === 0) && (
              <li className="text-neutral-400 italic">(None)</li>
            )}
          </ul>
        </div>

        <div className="dep-section">
          <h3>Used By</h3>
          <ul id="sb-usedby">
            {selectedNode?.importedBy?.map((by: string) => (
              <li key={by} title={by} onClick={() => handleNodeSelect(graphData?.nodes.find(n => n.id === by))}>
                {by.split(/[\\/]/).pop()}
              </li>
            ))}
            {(!selectedNode?.importedBy || selectedNode.importedBy.length === 0) && (
              <li className="text-neutral-400 italic">(None)</li>
            )}
          </ul>
        </div>
      </div>

      {/* Loading Overlay */}
      {showOverlay && (
        <div className="loading-overlay">
          <div className="flex flex-col items-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <div className="text-white">
              {jobStatus === "failed" ? (
                <span className="text-red-400 font-bold">Analysis Failed</span>
              ) : graphError ? (
                <span className="text-red-400 font-bold">{graphError}</span>
              ) : (
                "🏗️ 도시 데이터를 분석 중..."
              )}
            </div>
            {(jobStatus === "queued" || jobStatus === "running" || jobStatus === "failed") && (
              <div className="mt-2 text-sm text-neutral-400">
                {project?.latestJob?.message || (jobStatus === "failed" ? "작업 중 오류가 발생했습니다." : "Preparing repository...")}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 로딩 애니메이션 및 타이틀을 보여주는 간단한 서브 컴포넌트
 */
function StatusBlock({ title }: { title: string }) {
  return (
    <div className="text-center">
      <div className="mb-3">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
      <div className="text-lg font-medium text-neutral-900">{title}</div>
    </div>
  );
}