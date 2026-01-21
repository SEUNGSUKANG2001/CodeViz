"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { apiFetch } from "@/lib/api";
import type {
  FeedResponse,
  PostCard,
  MeResponse,
  Author,
  PlanetSummary,
  UserPlanetsResponse,
  ProjectDetailResponse,
  ResultUrlResponse,
  GraphData,
} from "@/lib/types";
import type { ThemeType } from "@/components/viewer/useCodeCityViewer";
import { ControlsPanel } from "@/components/viewer/ControlsPanel";
import { PublishDialog } from "@/components/modals/PublishDialog";

const LandingScene = dynamic<any>(
  () => import("@/components/planet/LandingScene"),
  { ssr: false }
);

function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

const PLANET_PROFILES = [
  {
    key: "ice",
    palette: { primary: "#dfe9ff", accent: "#9fb6d9" },
    cloudColor: { tint: "#eef5ff" },
    params: { seaLevelWorld: -0.1, beachBand: 0.02, foamBand: 0.008 },
    lore: {
      title: ["크라이오스톰 헤이븐", "아이보리 분지", "프로스트베일 IX"],
      climate: [
        "끝없는 설풍이 지평선을 밀어내는 만년설 행성이다.",
        "얼음 판이 대륙처럼 흘러가며 표면을 유리처럼 깎아낸다.",
        "차가운 태양빛이 비치지만, 따뜻함은 끝내 닿지 않는다.",
        "하루의 시간 감각이 흐릿해지는 극지성의 리듬이 있다.",
      ],
      life: [
        "열분출구 위로 떠도는 유목 부족이 겨우 생존한다.",
        "지하 동굴의 지열 도시가 유일한 숨 쉴 곳이다.",
        "정착민들은 얼음 속 음향을 길잡이로 삼는다.",
        "빛 대신 맥동하는 지열 신호가 길을 안내한다.",
      ],
      warning: [
        "테라포밍은 거대한 눈폭풍과의 장기전이 될 것이다.",
        "희박한 공기와 냉각풍이 사방에서 밀려든다.",
        "열돔과 반사 거울 없이는 정착이 불가능하다.",
        "지표 온도 안정화가 완료되기 전까지는 지상 거주가 위험하다.",
      ],
    },
  },
  {
    key: "desert",
    palette: { primary: "#e4c38a", accent: "#b97d45" },
    cloudColor: { tint: "#f1d7a6" },
    params: { seaLevelWorld: 0.09, beachBand: 0.01, foamBand: 0.004 },
    lore: {
      title: ["사블 메리디언", "듄라이트 프라임", "앰버 폐허"],
      climate: [
        "끝없는 모래와 열기만 존재하는 타오르는 세계다.",
        "지평선은 아지랑이로 굴절되고, 대지는 용광로처럼 흔들린다.",
        "낮에는 타오르고 밤에는 급격히 얼어붙는다.",
        "낮과 밤의 경계는 강철처럼 날카롭다.",
      ],
      life: [
        "물과 정보를 거래하는 별빛 상단이 사막을 누빈다.",
        "현무암 기둥의 그늘에 도시가 매달려 있다.",
        "유목 카라반이 모래 바다의 지도 자체다.",
        "밤마다 유성우를 따라 이동하는 이주단이 있다.",
      ],
      warning: [
        "테라포밍은 극단적 일교차를 먼저 길들여야 한다.",
        "모래폭풍은 정착지를 삼킬 만큼 폭력적이다.",
        "수분 보존 기술 없이는 생존이 어렵다.",
        "행성 궤도에 거대 수분 저장소를 구축해야 한다.",
      ],
    },
  },
  {
    key: "ocean",
    palette: { primary: "#2f6fa6", accent: "#63b7ff" },
    cloudColor: { tint: "#dff3ff" },
    params: { seaLevelWorld: -0.02, beachBand: 0.05, foamBand: 0.016 },
    lore: {
      title: ["펠라직 아틀라스", "어비스 게이트", "블루 크라운"],
      climate: [
        "대양이 대부분을 덮고 폭풍이 행성을 감싸는 세계다.",
        "거대한 구름대가 따뜻한 해류를 따라 돈다.",
        "수평선은 빛과 파도의 거울로 끊임없이 흔들린다.",
        "대기층이 두꺼워 하늘이 낮게 내려앉은 듯하다.",
      ],
      life: [
        "부유도시는 거대한 해류를 따라 항해한다.",
        "심해 길드가 발광 광물을 채굴한다.",
        "별처럼 빛나는 산호 군락이 항로가 된다.",
        "바다 위로만 존재하는 거대한 교역망이 형성돼 있다.",
      ],
      warning: [
        "테라포밍은 조류와 조석을 안정시키는 것이 핵심이다.",
        "태풍과 고습도가 일상처럼 밀려온다.",
        "해상 기반 시설이 필수다.",
        "해상 부유 플랫폼이 없으면 도시 유지가 불가능하다.",
      ],
    },
  },
  {
    key: "volcanic",
    palette: { primary: "#3b2b2b", accent: "#d2561b" },
    cloudColor: { tint: "#d9b2a1" },
    params: { seaLevelWorld: 0.02, beachBand: 0.02, foamBand: 0.01 },
    lore: {
      title: ["엠버리치", "신더 패러독스", "퍼니스 벨트"],
      climate: [
        "갈라진 흑요석 평원 아래로 용암이 빛난다.",
        "재구름이 하늘을 붉게 물들인다.",
        "행성 전체가 지각의 울림으로 진동한다.",
        "밤마다 붉은 번개가 산맥을 가른다.",
      ],
      life: [
        "지열로 버티는 대장장이 도시가 살아남는다.",
        "불길을 숭배하는 부족이 용암 계곡을 지킨다.",
        "산업 카라반이 현무암을 수집한다.",
        "광산의 열기가 곧 생명줄이 되는 세계다.",
      ],
      warning: [
        "테라포밍은 끊임없는 지각운동을 완화해야 한다.",
        "하룻밤 사이 지형이 바뀔 수 있다.",
        "차폐 시설이 없다면 정착은 불가능하다.",
        "열 차폐와 내진 기반이 도시 생존의 조건이다.",
      ],
    },
  },
  {
    key: "jungle",
    palette: { primary: "#2c6a52", accent: "#7bd66a" },
    cloudColor: { tint: "#d7f3e1" },
    params: { seaLevelWorld: -0.04, beachBand: 0.03, foamBand: 0.012 },
    lore: {
      title: ["버던트 코일", "에메랄드 런", "캐노피 버지"],
      climate: [
        "습도가 잠들지 않는 에메랄드 행성이다.",
        "거대한 캐노피가 초록의 바다처럼 출렁인다.",
        "안개가 낮게 깔려 강과 유적을 가린다.",
        "바람이 스치면 숲 자체가 숨을 쉬는 듯 흔들린다.",
      ],
      life: [
        "거목에 매달린 공중 마을이 존재한다.",
        "발광 생물이 길을 밝힌다.",
        "탐험가들은 포자와 약물을 교환한다.",
        "수분의 향이 도시의 리듬을 결정한다.",
      ],
      warning: [
        "테라포밍은 폭발적 성장률을 제어해야 한다.",
        "방치된 구조물은 곧 식물에 삼켜진다.",
        "공기 정화와 캐노피 매핑이 필수다.",
        "생태 균형이 무너지면 도시가 숲에 흡수된다.",
      ],
    },
  },
  {
    key: "twilight",
    palette: { primary: "#5a4a7b", accent: "#c5a3ff" },
    cloudColor: { tint: "#d7ccff" },
    params: { seaLevelWorld: 0.0, beachBand: 0.03, foamBand: 0.012 },
    lore: {
      title: ["움브라 드리프트", "바이올렛 리치", "녹턴 헤일로"],
      climate: [
        "영원한 황혼에 갇힌 희미한 세계다.",
        "오로라가 수평선을 가르며 흔들린다.",
        "차가운 태양 아래 긴 그림자가 뻗는다.",
        "빛의 결이 느리게 흐르며 시간 감각이 달라진다.",
      ],
      life: [
        "관측소가 하늘의 신호를 추적한다.",
        "거울 도시가 어둠을 반사한다.",
        "고대 중계소를 수호하는 수도회가 있다.",
        "빛을 모으는 신전이 도시의 중심을 이룬다.",
      ],
      warning: [
        "테라포밍은 인공 광주기가 핵심이다.",
        "에너지 생산이 제한적이며 공사가 길어진다.",
        "전력 분배 효율이 생존을 좌우한다.",
        "광원 설계 없이는 정신적 안정도 유지하기 어렵다.",
      ],
    },
  },
  {
    key: "toxic",
    palette: { primary: "#4e6a2d", accent: "#92ff5d" },
    cloudColor: { tint: "#7dff5a" },
    params: { seaLevelWorld: 0.12, beachBand: 0.0, foamBand: 0.0 },
    lore: {
      title: ["그린헤이즈", "스포어링", "네온 스웜프"],
      climate: [
        "형광빛 구름이 대기를 뒤덮는 독성 행성이다.",
        "산성 안개가 대륙을 녹이며 낮은 바다조차 말라붙었다.",
        "지표는 끈적한 황록색 균열로 갈라져 있다.",
        "냄새 자체가 경보처럼 날카롭다.",
      ],
      life: [
        "포자 생명체가 거대한 군락을 이룬다.",
        "방독면을 쓴 정찰대만이 지상에 발을 딛는다.",
        "빛나는 곰팡이가 밤을 더 밝게 만든다.",
        "정화 탑이 없으면 교역도 불가능하다.",
      ],
      warning: [
        "테라포밍은 독성 대기 정화가 최우선이다.",
        "호흡 장치 없이는 생존이 불가능하다.",
        "산성비가 구조물을 빠르게 부식시킨다.",
        "방호 재료를 준비하지 않으면 정착은 즉시 실패한다.",
      ],
    },
  },
  {
    key: "void",
    palette: { primary: "#2a2a35", accent: "#9b7bff" },
    cloudColor: { tint: "#6c5aff" },
    params: { seaLevelWorld: 0.18, beachBand: 0.0, foamBand: 0.0 },
    lore: {
      title: ["보이드 큐브", "제로폴", "나이트 엔진"],
      climate: [
        "대기가 희박해 바다조차 형성되지 않는 건조 행성이다.",
        "보랏빛 구름이 낮게 맴돌며 전자 폭풍을 뿌린다.",
        "밤과 낮의 경계가 거의 사라진다.",
        "기압이 낮아 대지의 소리조차 가볍다.",
      ],
      life: [
        "전기 생명체가 자기장에 붙어 살아간다.",
        "정착민은 지하 깊숙이 에너지 저장소를 만든다.",
        "여행자들은 별빛만으로 길을 찾는다.",
        "기계화된 탐사대가 전면에 나서야 한다.",
      ],
      warning: [
        "테라포밍은 대기 생성부터 시작해야 한다.",
        "방전 폭풍이 장비를 무력화시킨다.",
        "광원과 방전 차폐가 필수다.",
        "정착 전에 대형 전자 차폐망을 구축해야 한다.",
      ],
    },
  },
  {
    key: "crystal",
    palette: { primary: "#82d1ff", accent: "#ff8cf7" },
    cloudColor: { tint: "#c7fff2" },
    params: { seaLevelWorld: 0.03, beachBand: 0.015, foamBand: 0.012 },
    lore: {
      title: ["크리스탈 폴리아", "하이퍼리온 리프", "프리즘 리치"],
      climate: [
        "빛이 표면에서 수천 번 굴절되는 광채 행성이다.",
        "광물성 대륙이 낮은 산맥처럼 지평선을 감싼다.",
        "밤이 되면 대지가 스스로 빛을 낸다.",
        "그림자가 거의 생기지 않을 만큼 반사가 강하다.",
      ],
      life: [
        "수정 채굴 공동체가 행성의 심장을 감시한다.",
        "빛을 먹는 생명체가 도시를 휘감는다.",
        "탐사자들은 빛의 균열을 길로 삼는다.",
        "에너지 장막이 방패처럼 흔들린다.",
      ],
      warning: [
        "테라포밍은 광물 반사열을 통제해야 한다.",
        "조명 설계가 도시의 안정을 결정한다.",
        "하나의 균열이 대규모 전력 붕괴를 부를 수 있다.",
        "표면 채굴은 반드시 제한되어야 한다.",
      ],
    },
  },
  {
    key: "aurora",
    palette: { primary: "#1d5f5b", accent: "#57f2e3" },
    cloudColor: { tint: "#7dffe1" },
    params: { seaLevelWorld: -0.06, beachBand: 0.04, foamBand: 0.02 },
    lore: {
      title: ["오로라 로움", "폴라 스케일", "새턴스 리브"],
      climate: [
        "대기가 두껍고 자력 소용돌이가 밤을 채운다.",
        "극지방에서 형광 오로라가 바다를 가로지른다.",
        "바람이 멈추는 순간조차 빛이 흐른다.",
        "전장 같은 하늘이 매일 방향을 바꾼다.",
      ],
      life: [
        "자기장 위를 달리는 비행도시가 존재한다.",
        "빛을 추적하는 무역항이 해안을 따라 늘어선다.",
        "전기 폭풍을 예측하는 집단이 질서를 만든다.",
        "빛에 반응하는 생물권이 도시를 보호한다.",
      ],
      warning: [
        "테라포밍은 자력 폭풍을 제어해야 한다.",
        "통신 체계는 항상 변조에 대비해야 한다.",
        "빛에 민감한 장비는 별도 차폐가 필요하다.",
        "궤도 위 감시망이 필수다.",
      ],
    },
  },
];

function seededIndex(seed: number, mod: number) {
  const x = Math.sin(seed) * 10000;
  return Math.abs(Math.floor(x)) % mod;
}

function buildPreviewPlanets(): PlanetSummary[] {
  const shuffled = [...PLANET_PROFILES].sort(() => Math.random() - 0.5);
  const picks = shuffled.slice(0, 3);
  return picks.map((profile, idx) => {
    const seed = Math.floor(Math.random() * 9999) + 1 + idx * 37;
    const hue = (seed * 47) % 360;
    const accentHue = (hue + 140 + idx * 13) % 360;
    const primary = `hsl(${hue}, 55%, 45%)`;
    const accent = `hsl(${accentHue}, 70%, 60%)`;
    const cloud = `hsl(${(hue + 220) % 360}, 70%, 80%)`;
    return {
      id: `preview-${profile.key}-${seed}`,
      seed,
      params: {
        ...profile.params,
        biome: profile.key,
        lore: profile.lore,
      },
      palette: {
        ...profile.palette,
        primary,
        accent,
      },
      cloudColor: {
        ...profile.cloudColor,
        tint: cloud,
        core: primary,
      },
      projectId: null,
      city: null,
    };
  });
}

function hexToRgb(hex?: string) {
  if (!hex) return null;
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return null;
  const num = parseInt(cleaned, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function colorTone(hex?: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const { r, g, b } = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 12) return "무채색";
  if (max === r && g > 100) return "따뜻한 황금";
  if (max === r) return "붉은";
  if (max === g && b > 120) return "청록";
  if (max === g) return "초록";
  if (max === b && r > 120) return "보랏빛";
  if (max === b) return "푸른";
  return "은은한";
}

function buildPlanetLore(planet: PlanetSummary) {
  const lore = (planet.params as any)?.lore;
  if (!lore) return null;
  const seed = planet.seed || 1;
  const title = lore.title?.[seededIndex(seed + 11, lore.title.length)] ?? "프론티어 월드";
  const climate = lore.climate?.[seededIndex(seed + 17, lore.climate.length)] ?? "";
  const life = lore.life?.[seededIndex(seed + 23, lore.life.length)] ?? "";
  const warning = lore.warning?.[seededIndex(seed + 29, lore.warning.length)] ?? "";
  const extra = lore.warning?.[seededIndex(seed + 37, lore.warning.length)] ?? "";
  const primary = (planet.palette as any)?.primary;
  const cloud = (planet.cloudColor as any)?.tint;
  const tone = colorTone(primary);
  const cloudTone = colorTone(cloud);
  const sea = typeof (planet.params as any)?.seaLevelWorld === "number" ? (planet.params as any).seaLevelWorld : 0;
  const seaLine =
    sea > 0.1
      ? "바다가 거의 사라져 건조한 지형이 지배한다."
      : sea < -0.06
        ? "행성의 대부분은 깊은 바다와 습한 해양 지형이다."
        : "얕은 해안선이 군도처럼 흩어져 있다.";
  const colorLine = tone ? `지표는 ${tone} 빛을 띠며 독특한 광도를 가진다.` : "";
  const cloudLine = cloudTone ? `${cloudTone} 구름이 대기를 뒤덮어 하늘의 분위기를 바꾼다.` : "";
  const habitability =
    sea > 0.08
      ? "거주지는 반드시 지하나 돔형 구조로 보호해야 한다."
      : sea < -0.05
        ? "도시는 해상 플랫폼 위에 세워야 안정적이다."
        : "거주지는 해안과 내륙 사이의 완충 지대에 형성된다.";
  return {
    title,
    lines: [climate, seaLine, colorLine, cloudLine, habitability, life, warning, extra].filter(Boolean),
  };
}

function buildGraphFromFiles(files: Record<string, any>) {
  const nodes = Object.entries(files).map(([path, info]) => ({
    id: path,
    name: path.split("/").pop() || path,
    path,
    type: "file",
    lines: info.line_count ?? info.lineCount ?? info.linecount ?? 10,
  }));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges: any[] = [];
  Object.entries(files).forEach(([sourcePath, info]) => {
    const deps = info.depends_on || info.dependsOn || [];
    deps.forEach((dep: any) => {
      const targetId = dep.target || dep.id || dep.path;
      if (!targetId) return;
      if (!nodeIds.has(targetId)) {
        nodeIds.add(targetId);
        nodes.push({
          id: targetId,
          name: targetId.split("/").pop() || targetId,
          path: targetId,
          type: "file",
          lines: 10,
        });
      }
      edges.push({ source: sourcePath, target: targetId, type: dep.type || "import" });
    });
  });
  return { nodes, edges };
}

function normalizeGraphData(data: GraphData): GraphData {
  if (data?.nodes?.length) return data;
  const history = (data as any)?.history;
  if (Array.isArray(history) && history.length > 0) {
    const latest = history[history.length - 1];
    if (latest?.files) {
      return { ...data, ...buildGraphFromFiles(latest.files) };
    }
  }
  const snapshots = data?.snapshots;
  if (Array.isArray(snapshots) && snapshots.length > 0) {
    const latest = snapshots[snapshots.length - 1];
    if (latest?.files) {
      return { ...data, ...buildGraphFromFiles(latest.files) };
    }
  }
  return data;
}

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-[#050505] flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
    </div>}>
      <LandingPageClient />
    </Suspense>
  );
}

function LandingPageClient() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [feed, setFeed] = useState<PostCard[]>([]);
  const [user, setUser] = useState<Author | null>(null);
  const [planets, setPlanets] = useState<PlanetSummary[]>([]);
  const [defaultPlanetId, setDefaultPlanetId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"empty" | "main" | "carousel">("empty");
  const [focusedPlanet, setFocusedPlanet] = useState<PlanetSummary | null>(null);
  const [customPlanets, setCustomPlanets] = useState<PlanetSummary[]>([]);
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
  const [terraforming, setTerraforming] = useState(false);
  const [placementMode, setPlacementMode] = useState(false);
  const [placement, setPlacement] = useState<{
    point: [number, number, number];
    normal: [number, number, number];
  } | null>(null);
  const [shipLandingActive, setShipLandingActive] = useState(false);
  const [shipTestMode, setShipTestMode] = useState(false);
  const [shipLandingKey, setShipLandingKey] = useState(0);
  const [cityBuilt, setCityBuilt] = useState(false);
  const [cityGraphData, setCityGraphData] = useState<GraphData | null>(null);
  const [landingProject, setLandingProject] = useState<ProjectDetailResponse["data"]["project"] | null>(null);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [cityTheme, setCityTheme] = useState<ThemeType>("Thema1");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [uiHidden, setUiHidden] = useState(false);
  const [cityReady, setCityReady] = useState(true);
  const [selectedCityNode, setSelectedCityNode] = useState<{
    id: string;
    lineCount: number;
    imports: string[];
    usedBy: string[];
  } | null>(null);
  const [cityFocusTarget, setCityFocusTarget] = useState<{
    point: [number, number, number];
    normal: [number, number, number];
  } | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [captureFn, setCaptureFn] = useState<(() => Promise<string>) | null>(null);
  const isCustomizing = pendingProjectId !== null && customPlanets.length > 0;
  const [repos, setRepos] = useState<any[]>([]);
  const [fetchingRepos, setFetchingRepos] = useState(false);
  const [showRepos, setShowRepos] = useState(false);
  const wheelLockRef = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const cityReadyTimerRef = useRef<number | null>(null);
  const confirmAtRef = useRef<number | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const targetProjectId = searchParams.get("projectId");

  useEffect(() => {
    if (!targetProjectId || !user) return;
    (async () => {
      try {
        const res = await apiFetch<ProjectDetailResponse>(`/api/v1/projects/${targetProjectId}`);
        if (!res.ok) return;
        const project = res.data.project;
        setLandingProject(project);
        setRepoUrl(project.repoUrl);
        setPendingProjectId(project.id);
        setPendingJobId(project.latestJob?.id ?? null);

        // Find associated planet
        const planetsRes = await apiFetch<UserPlanetsResponse>("/api/v1/planets");
        const matchingPlanet = planetsRes.data.items.find(p => p.projectId === project.id);
        if (matchingPlanet) {
          setFocusedPlanet(matchingPlanet);
          const cityAnchor = matchingPlanet.params?.cityAnchor as any;
          if (cityAnchor) {
            setPlacement(cityAnchor);
          }
          setViewMode("carousel");
          setCityBuilt(true);
          setCityReady(true);
        }
      } catch (e) {
        console.error("Failed to load target project", e);
      }
    })();
  }, [targetProjectId, user]);
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!user) return;
      if (isCustomizing) return;
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) return;
      if (wheelLockRef.current) return;
      if (Math.abs(e.deltaY) < 2) return;
      if (e.deltaY > 0) {
        setViewMode("carousel");
      } else {
        setViewMode("main");
      }
      wheelLockRef.current = true;
      setTimeout(() => {
        wheelLockRef.current = false;
      }, 500);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [user, isCustomizing]);

  useEffect(() => {
    if (!user) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
        document.documentElement.style.overflow = "";
      };
    }
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRepos(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  useEffect(() => {
    (async () => {
      try {
        const [feedRes, meRes] = await Promise.all([
          apiFetch<FeedResponse>("/api/v1/feed?limit=8"),
          apiFetch<MeResponse>("/api/v1/auth/me"),
        ]);
        setFeed(feedRes.data.items);
        if (meRes.ok) {
          setUser(meRes.data.user);
          setViewMode("empty");
          fetchRepos();
          try {
            const planetsRes = await apiFetch<UserPlanetsResponse>("/api/v1/planets");
            setPlanets(planetsRes.data.items);
            setDefaultPlanetId(planetsRes.data.defaultPlanetId);
          } catch {
            setPlanets([]);
            setDefaultPlanetId(null);
          }
          window.setTimeout(() => {
            setViewMode("main");
          }, 250);
        } else {
          setUser(null);
          setViewMode("empty");
        }
      } catch {
        setUser(null);
        setViewMode("empty");
      }
    })();
  }, []);

  async function fetchRepos() {
    setFetchingRepos(true);
    try {
      const res = await apiFetch<{ ok: boolean; data: { repos: any[] } }>("/api/v1/users/me/github-repos");
      if (res.ok) {
        setRepos(res.data.repos);
      }
    } catch (e) {
      console.error("Failed to fetch repos", e);
    } finally {
      setFetchingRepos(false);
    }
  }

  const handleSelectRepo = (repo: any) => {
    setRepoUrl(repo.htmlUrl);
    setShowRepos(false);
  };

  const onTransform = async () => {
    if (!repoUrl) return;
    setLoading(true);
    try {
      const res = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          // router.push("/api/v1/auth/kakao/start");
          router.push("/api/v1/auth/github/start");
          return;
        }
        alert(data.error?.message || "Failed to create project");
        return;
      }
      const projectId = data.data.project.id as string;
      setPendingProjectId(projectId);
      setPendingJobId(data.data.project.latestJob?.id ?? null);
      const presets = buildPreviewPlanets();
      setCustomPlanets(presets);
      setFocusedPlanet(presets[0] ?? null);
      setViewMode("carousel");
      setPlacementMode(false);
      setPlacement(null);
      setCityBuilt(false);
      setCityReady(true);
      confirmAtRef.current = null;
      if (cityReadyTimerRef.current) {
        window.clearTimeout(cityReadyTimerRef.current);
        cityReadyTimerRef.current = null;
      }
      setCityGraphData(null);
      setLandingProject(null);
    } catch {
      alert("Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlanet = useCallback(async (planetId: string) => {
    try {
      await fetch("/api/v1/planets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planetId }),
      });
      setDefaultPlanetId(planetId);
    } catch {
      // ignore
    } finally {
      setViewMode("main");
    }
  }, []);

  useEffect(() => {
    if (viewMode !== "carousel") return;
    if (focusedPlanet) return;
    const source = customPlanets.length ? customPlanets : planets;
    const fallback =
      source.find((p) => p.id === defaultPlanetId) || source[0] || null;
    setFocusedPlanet(fallback);
  }, [viewMode, focusedPlanet, planets, defaultPlanetId, customPlanets]);

  useEffect(() => {
    if (!customPlanets.length) return;
    setFocusedPlanet(customPlanets[0] ?? null);
  }, [customPlanets]);

  const carouselPlanets = isCustomizing ? customPlanets : planets;
  const carouselActiveId = isCustomizing
    ? focusedPlanet?.id ?? customPlanets[0]?.id ?? null
    : defaultPlanetId;

  const story = focusedPlanet ? buildPlanetLore(focusedPlanet) : null;

  const completeTerraform = useCallback(async () => {
    if (!focusedPlanet || !pendingProjectId || !placement) return;
    setTerraforming(true);
    setCityBuilt(true);
    try {
      const res = await fetch("/api/v1/planets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planet: {
            seed: focusedPlanet.seed,
            params: focusedPlanet.params ?? {},
            palette: focusedPlanet.palette ?? {},
            cloudColor: focusedPlanet.cloudColor ?? {},
          },
          projectId: pendingProjectId,
          cityAnchor: placement,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error?.message || "Failed to terraform planet");
        return;
      }
      setShipTestMode(false);
      setPlacementMode(false);
      setCityTheme((prev) => prev);
    } catch {
      alert("Failed to terraform planet");
    } finally {
      setTerraforming(false);
    }
  }, [focusedPlanet, pendingProjectId, placement, router]);

  useEffect(() => {
    const theme = landingProject?.currentConfig?.theme as ThemeType | undefined;
    if (theme) setCityTheme(theme);
  }, [landingProject]);

  const displayGraphData = useMemo(() => {
    if (!cityGraphData || !cityReady) return null;
    if (historyIndex === -1 || !cityGraphData.history || cityGraphData.history.length === 0) {
      return cityGraphData;
    }
    const target = cityGraphData.history[historyIndex];
    const snapshots = cityGraphData.snapshots || [];
    const snapshot = snapshots.find((s: any) => s.hash === (target as any).hash);
    if (snapshot?.files) {
      return { ...cityGraphData, ...buildGraphFromFiles(snapshot.files) };
    }
    if (snapshots.length === cityGraphData.history.length && snapshots[historyIndex]?.files) {
      return { ...cityGraphData, ...buildGraphFromFiles(snapshots[historyIndex].files) };
    }
    if ((target as any)?.files) {
      return { ...cityGraphData, ...buildGraphFromFiles((target as any).files) };
    }
    return cityGraphData;
  }, [cityGraphData, historyIndex]);

  const handleCityNodeSelect = useCallback(
    (nodeId: string, position: { x: number; y: number; z: number }, normal: { x: number; y: number; z: number }) => {
      if (!displayGraphData) return;
      const node = displayGraphData.nodes.find((n: any) => n.id === nodeId);
      const edges = displayGraphData.edges || (displayGraphData as any).links || [];
      const imports: string[] = [];
      const usedBy: string[] = [];
      edges.forEach((edge: any) => {
        const sId = typeof edge.source === "object" ? edge.source.id : edge.source;
        const tId = typeof edge.target === "object" ? edge.target.id : edge.target;
        if (sId === nodeId) imports.push(tId);
        if (tId === nodeId) usedBy.push(sId);
      });
      setSelectedCityNode({
        id: nodeId,
        lineCount: (node as any)?.lines ?? (node as any)?.lineCount ?? (node as any)?.loc ?? 0,
        imports,
        usedBy,
      });
      setCityFocusTarget({
        point: [position.x, position.y, position.z],
        normal: [normal.x, normal.y, normal.z],
      });
    },
    [displayGraphData]
  );

  useEffect(() => {
    if (!displayGraphData || !selectedCityNode) return;
    const exists = displayGraphData.nodes.some((n: any) => n.id === selectedCityNode.id);
    if (!exists) {
      setSelectedCityNode(null);
      setCityFocusTarget(null);
    }
  }, [displayGraphData, selectedCityNode]);

  const handleTerraform = () => {
    if (!focusedPlanet || !pendingProjectId) return;
    if (!placementMode) {
      setPlacementMode(true);
      return;
    }
    if (!placement) return;
    if (shipLandingActive || terraforming) return;
    setCityReady(true);
    if (cityReadyTimerRef.current) {
      window.clearTimeout(cityReadyTimerRef.current);
    }
    confirmAtRef.current = Date.now();
    setShipLandingActive(true);
    setShipLandingKey((prev) => prev + 1);
  };

  const handleTestLanding = () => {
    if (!placementMode) {
      setPlacementMode(true);
      return;
    }
    if (!placement) return;
    setShipTestMode(true);
    setShipLandingActive(true);
    setShipLandingKey((prev) => prev + 1);
  };

  const handleExitCustomizing = () => {
    setCustomPlanets([]);
    setPendingProjectId(null);
    setPendingJobId(null);
    setPlacementMode(false);
    setPlacement(null);
    setShipLandingActive(false);
    setShipTestMode(false);
    setCityBuilt(false);
    setCityReady(true);
    confirmAtRef.current = null;
    if (cityReadyTimerRef.current) {
      window.clearTimeout(cityReadyTimerRef.current);
      cityReadyTimerRef.current = null;
    }
    setCityGraphData(null);
    setViewMode("main");
  };

  useEffect(() => {
    if (!pendingProjectId || !pendingJobId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchGraph = async () => {
      try {
        const projectRes = await apiFetch<ProjectDetailResponse>(`/api/v1/projects/${pendingProjectId}`);
        const project = projectRes?.data?.project ?? null;
        if (!cancelled) setLandingProject(project);
        const job = project?.latestJob;
        if (!job || job.status !== "done") {
          timer = setTimeout(fetchGraph, 2000);
          return;
        }
        const urlRes = await apiFetch<ResultUrlResponse>(`/api/v1/analysis-jobs/${job.id}/result-url`);
        const graphRes = await fetch(urlRes.data.url);
        if (!graphRes.ok) throw new Error("Failed to fetch graph data");
        const data: GraphData = await graphRes.json();
        const normalized = normalizeGraphData(data);
        if (!cancelled) setCityGraphData(normalized);
      } catch {
        if (!cancelled) timer = setTimeout(fetchGraph, 3000);
      }
    };

    fetchGraph();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pendingProjectId, pendingJobId]);

  useEffect(() => {
    return () => {
      if (cityReadyTimerRef.current) {
        window.clearTimeout(cityReadyTimerRef.current);
        cityReadyTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!cityGraphData) return;
    setCityReady(true);
  }, [cityGraphData]);

  return (
    <main className="relative min-h-[200vh] overflow-hidden text-white">
      <div className="fixed inset-0 z-0 pointer-events-auto">
        <LandingScene
          mode={viewMode}
          planets={viewMode === "carousel" ? carouselPlanets : planets}
          activePlanetId={viewMode === "carousel" ? carouselActiveId : defaultPlanetId}
          onSelectPlanet={isCustomizing ? undefined : handleSelectPlanet}
          onFocusPlanetChange={setFocusedPlanet}
          onPlanetPick={
            placementMode
              ? (planet: PlanetSummary, point: { x: number; y: number; z: number }, normal: { x: number; y: number; z: number }) => {
                if (!focusedPlanet || planet.id !== focusedPlanet.id) return;
                setPlacement({
                  point: [point.x, point.y, point.z],
                  normal: [normal.x, normal.y, normal.z],
                });
              }
              : undefined
          }
          placementMode={placementMode}
          placement={placement}
          focusId={focusedPlanet?.id ?? null}
          shipLandingActive={shipLandingActive}
          onShipArrive={completeTerraform}
          onShipDepart={() => setShipLandingActive(false)}
          shipTestMode={shipTestMode}
          shipLandingKey={shipLandingKey}
          cityBuilt={cityBuilt}
          cityGraphData={displayGraphData}
          cityTheme={cityTheme}
          enableOrbit={cityBuilt && !publishOpen}
          selectedNodeId={selectedCityNode?.id ?? null}
          onCityNodeSelect={handleCityNodeSelect}
          cityFocusTarget={cityFocusTarget}
          onCaptureReady={(fn: () => Promise<string>) => setCaptureFn(() => fn)}
        />
      </div>

      <section className="relative z-10 min-h-[100vh] px-10 pt-8 pointer-events-none">
        <div
          className="mx-auto flex max-w-[1600px] flex-col transition-transform duration-[2400ms] ease-in-out"
          style={{
            transform: viewMode === "carousel" ? "translateY(-100vh)" : "translateY(0)",
          }}
        >
          <header className="flex items-center justify-between pointer-events-auto">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative h-9 w-9 rounded-none border border-white/15 bg-white/5">
                <div className="absolute left-2 top-2 h-2 w-2 rounded-full bg-cyan-300" />
              </div>
              <span className="text-sm font-semibold tracking-[0.18em] text-white/90">
                CODEVIZ
              </span>
            </Link>

            <div className="flex items-center gap-4">
              <Link
                href="/feed"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur-md transition hover:bg-white/10 hover:text-cyan-300"
              >
                Explore
              </Link>
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-medium text-white/90">
                      {user.displayName || user.username}
                    </span>
                    <button
                      onClick={async () => {
                        await fetch("/api/v1/auth/logout", { method: "POST" });
                        window.location.reload();
                      }}
                      className="text-[10px] text-white/40 hover:text-white/60"
                    >
                      Logout
                    </button>
                  </div>
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName || "Avatar"}
                      className="h-8 w-8 rounded-full border border-white/10"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[10px]">
                      {user.username?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  // onClick={() => router.push("/api/v1/auth/kakao/start")}
                  onClick={() => router.push("/api/v1/auth/github/start")}
                  className="rounded-full bg-cyan-300/90 px-4 py-2 text-sm font-medium text-black hover:bg-cyan-200"
                >
                  Login
                </button>
              )}
            </div>
          </header>

          <div className="mt-20 max-w-3xl pointer-events-auto">
            <div
              className="inline-flex items-center gap-2 rounded-none border border-cyan-400/30 bg-cyan-400/5 px-4 py-1.5 text-[11px] font-medium tracking-widest text-cyan-300/90 uppercase"
              style={{
                textShadow: "0 0 12px rgba(34, 211, 238, 0.4)",
                boxShadow: "inset 0 0 12px rgba(34, 211, 238, 0.05)"
              }}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-300"></span>
              </span>
              Code as spatial structure
            </div>

            <h1
              className="mt-7 text-4xl font-semibold tracking-tight md:text-6xl"
              style={{ textShadow: "0 12px 34px rgba(0,0,0,0.75)" }}
            >
              Read complex code
              <span className="block text-white/90">as architecture</span>
            </h1>

            <p
              className="mt-5 max-w-xl text-base text-white/75"
              style={{ textShadow: "0 10px 26px rgba(0,0,0,0.7)" }}
            >
              Visualize repositories as navigable 3D structures.
              Discover dependencies, growth, and hotspots at a glance.
            </p>

            <div className="mt-10 max-w-xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-1 rounded-none border border-white/15 bg-white/5 px-4 py-3 backdrop-blur-[2px]">
                  <input
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    onFocus={() => setShowRepos(true)}
                    placeholder="Paste GitHub repository URL"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/45"
                  />
                </div>

                <button
                  onClick={onTransform}
                  disabled={!repoUrl || loading}
                  className={cn(
                    "rounded-none px-5 py-3 text-sm font-medium transition",
                    loading
                      ? "bg-white/15 text-white/60"
                      : "bg-cyan-300/90 text-black hover:bg-cyan-200"
                  )}
                  style={{ boxShadow: "0 12px 36px rgba(0,0,0,0.45)" }}
                >
                  {loading ? "Transforming..." : "Transform"}
                </button>
              </div>

              <div className="relative" ref={dropdownRef}>
                {showRepos && (repos.length > 0 || fetchingRepos) && (
                  <div className="absolute left-0 right-0 top-2 z-50 max-h-60 overflow-y-auto border border-white/15 bg-neutral-900/90 backdrop-blur-md p-1 shadow-2xl">
                    {fetchingRepos ? (
                      <p className="px-4 py-3 text-xs text-white/40 italic">Fetching your repositories...</p>
                    ) : (
                      <>
                        <p className="px-3 py-2 text-[10px] font-semibold text-white/30 uppercase tracking-[0.2em]">
                          Your GitHub Repositories
                        </p>
                        {repos.map((repo) => (
                          <button
                            key={repo.fullName}
                            onClick={() => handleSelectRepo(repo)}
                            className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 transition-colors flex flex-col gap-1 border-b border-white/5 last:border-0"
                          >
                            <span className="font-medium text-white/90">{repo.fullName}</span>
                            {repo.description && (
                              <span className="text-xs text-white/40 line-clamp-1">{repo.description}</span>
                            )}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div
                className="mt-3 text-[11px] text-white/55"
                style={{ textShadow: "0 6px 18px rgba(0,0,0,0.7)" }}
              >
                Smaller repositories analyze faster · Private repos coming soon
              </div>
            </div>
          </div>

          <div className="mt-auto pb-10 text-xs text-white/50">
            Scroll to explore the universe ↓
          </div>
        </div>
      </section>

      {!cityBuilt && (
        <div
          className="pointer-events-auto fixed bottom-16 right-10 z-[60] w-[320px] rounded-none border border-white/15 bg-white/5 p-4 text-sm text-white/85 backdrop-blur-[2px] transition-[transform,opacity] duration-[2400ms] ease-in-out"
          style={{
            transform: viewMode === "carousel" ? "translateY(0)" : "translateY(100vh)",
            pointerEvents: viewMode === "carousel" ? "auto" : "none",
            opacity: viewMode === "carousel" ? 1 : 0,
          }}
          aria-hidden={viewMode !== "carousel"}
        >
          <div className="text-xs uppercase tracking-[0.2em] text-white/60">
            {isCustomizing ? "행성 연구소" : "행성 정보"}
          </div>
          <div className="mt-2 text-base font-semibold text-white/90">
            {story?.title ?? (focusedPlanet ? focusedPlanet.id.slice(0, 8) : "—")}
          </div>
          <div className="mt-3 space-y-2 text-xs text-white/70">
            {story?.lines?.map((line, idx) => (
              <p key={idx} className="leading-relaxed text-white/70">
                {line}
              </p>
            ))}
            {!story && (
              <>
                <div>Seed: {focusedPlanet?.seed ?? "—"}</div>
                <div>Project: {focusedPlanet?.projectId ?? "None"}</div>
                <div>City: {focusedPlanet?.city?.cityJsonKey ? "Attached" : "None"}</div>
              </>
            )}
          </div>
          {isCustomizing && (
            <div className="mt-5 space-y-3">
              {placementMode && (
                <div className="text-[11px] text-white/55">
                  행성 표면을 클릭해 도시의 착륙 지점을 선택하세요.
                </div>
              )}
              <button
                type="button"
                onClick={handleTerraform}
                disabled={terraforming || shipLandingActive || !pendingProjectId || (placementMode && !placement)}
                className={cn(
                  "w-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.2em] transition",
                  terraforming || shipLandingActive
                    ? "bg-white/10 text-white/50"
                    : "bg-cyan-300/90 text-black hover:bg-cyan-200"
                )}
              >
                {terraforming
                  ? "Terraforming..."
                  : shipLandingActive
                    ? "Landing..."
                    : placementMode
                      ? "Confirm Landing Site"
                      : "Terraforming"}
              </button>
              <button
                type="button"
                onClick={handleTestLanding}
                disabled={!pendingProjectId || (placementMode && !placement)}
                className="w-full border border-white/20 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-white/70 hover:bg-white/10"
              >
                Test Landing
              </button>
              <button
                type="button"
                onClick={handleExitCustomizing}
                className="w-full border border-white/20 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-white/70 hover:bg-white/10"
              >
                돌아가기
              </button>
            </div>
          )}
        </div>
      )}

      {cityBuilt && (
        <>
          <div className="pointer-events-auto fixed inset-x-0 top-0 z-[70] translate-y-0 border-b border-white/10 bg-black/50 px-6 py-4 backdrop-blur-md transition-transform duration-[1200ms]">
            <div className="mx-auto flex max-w-[1600px] items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/" className="flex items-center gap-3">
                  <div className="relative h-8 w-8 rounded-none border border-white/20 bg-white/10">
                    <div className="absolute left-2 top-2 h-1.5 w-1.5 rounded-full bg-cyan-300" />
                  </div>
                  <span className="text-sm font-semibold tracking-[0.18em] text-white">CODEVIZ</span>
                </Link>
                <span className="text-white/20">/</span>
                <div className="text-sm font-medium text-white/90">
                  {landingProject?.title ?? "Terraforming Project"}
                </div>
                {landingProject?.latestJob?.status && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/70">
                    Job: {landingProject.latestJob.status}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push("/feed")}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-white/80"
                >
                  Explore
                </button>
                <button
                  onClick={() => {
                    setUiHidden(true);
                    setPublishOpen(true);
                  }}
                  disabled={!landingProject || landingProject.latestJob?.status !== "done"}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-white/80 disabled:text-white/40 disabled:cursor-not-allowed"
                >
                  Publish
                </button>
                <button
                  onClick={() => setUiHidden((prev) => !prev)}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-white/80"
                >
                  {uiHidden ? "Show UI" : "Hide UI"}
                </button>
              </div>
            </div>
          </div>
          <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-[70] border-t border-white/10 bg-black/40 px-6 py-3 backdrop-blur-md transition-transform duration-[1200ms]">
            <div className="mx-auto flex max-w-[1600px] items-center justify-between text-xs text-white/70">
              <span>3D City View · Drag to orbit · Scroll to zoom</span>
              <span>Theme: {cityTheme}</span>
            </div>
          </div>
          <div
            className="pointer-events-auto fixed right-0 top-[68px] z-[70] h-[calc(100vh-68px)] w-[360px] transition-transform duration-[1200ms] ease-in-out"
            style={{
              transform: uiHidden ? "translateX(110%)" : "translateX(0)",
              pointerEvents: uiHidden ? "none" : "auto",
            }}
          >
            <ControlsPanel
              project={landingProject}
              theme={cityTheme}
              onThemeChange={setCityTheme}
              selectedNode={selectedCityNode}
            />
          </div>
          {displayGraphData?.history && displayGraphData.history.length > 0 && (
            <div
              className="pointer-events-auto fixed bottom-24 left-1/2 z-[70] w-[520px] -translate-x-1/2 border border-white/10 bg-black/40 px-4 py-3 backdrop-blur-md transition-transform duration-[1200ms] ease-in-out"
              style={{
                transform: `translate(-50%, ${uiHidden ? "160%" : "0"})`,
                opacity: uiHidden ? 0 : 1,
                pointerEvents: uiHidden ? "none" : "auto",
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onPointerMove={(e) => e.stopPropagation()}
              onWheel={(e) => e.stopPropagation()}
            >
              <div className="mb-2 flex items-center justify-between text-xs text-white/70">
                <span>
                  {historyIndex === -1
                    ? "Latest"
                    : (() => {
                      const entry = displayGraphData.history[historyIndex] as any;
                      if (entry?.timestamp) {
                        return new Date(entry.timestamp * 1000).toLocaleDateString();
                      }
                      if (entry?.date) {
                        return new Date(entry.date).toLocaleDateString();
                      }
                      return "Snapshot";
                    })()}
                </span>
                <span className="text-white/50">
                  {historyIndex === -1
                    ? "Initial layout"
                    : (() => {
                      const entry = displayGraphData.history[historyIndex] as any;
                      return entry?.message || entry?.hash || "Snapshot";
                    })()}
                </span>
              </div>
              {(() => {
                const history = displayGraphData.history;
                const L = history.length;
                const sliderValue = historyIndex === -1 ? L : (L - 1) - historyIndex;
                const handleChange = (val: number) => {
                  setHistoryIndex(val === L ? -1 : (L - 1) - val);
                };
                return (
                  <input
                    type="range"
                    min="0"
                    max={L}
                    value={sliderValue}
                    onChange={(e) => handleChange(parseInt(e.target.value, 10))}
                    onInput={(e) => handleChange(parseInt((e.target as HTMLInputElement).value, 10))}
                    className="w-full accent-cyan-300"
                  />
                );
              })()}
            </div>
          )}
          {landingProject?.id && (
            <PublishDialog
              open={publishOpen}
              onOpenChange={setPublishOpen}
              projectId={landingProject.id}
              repoUrl={landingProject.repoUrl}
              currentConfig={{ ...(landingProject.currentConfig || {}), theme: cityTheme }}
              latestJobId={landingProject.latestJob?.id ?? null}
              captureScreenshot={captureFn}
            />
          )}
        </>
      )}

      <section className="h-[100vh]" />
    </main>
  );
}
