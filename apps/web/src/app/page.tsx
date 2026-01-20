"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/api";
import type {
  FeedResponse,
  PostCard,
  MeResponse,
  Author,
  PlanetSummary,
  UserPlanetsResponse,
} from "@/lib/types";

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
      ],
      life: [
        "열분출구 위로 떠도는 유목 부족이 겨우 생존한다.",
        "지하 동굴의 지열 도시가 유일한 숨 쉴 곳이다.",
        "정착민들은 얼음 속 음향을 길잡이로 삼는다.",
      ],
      warning: [
        "테라포밍은 거대한 눈폭풍과의 장기전이 될 것이다.",
        "희박한 공기와 냉각풍이 사방에서 밀려든다.",
        "열돔과 반사 거울 없이는 정착이 불가능하다.",
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
      ],
      life: [
        "물과 정보를 거래하는 별빛 상단이 사막을 누빈다.",
        "현무암 기둥의 그늘에 도시가 매달려 있다.",
        "유목 카라반이 모래 바다의 지도 자체다.",
      ],
      warning: [
        "테라포밍은 극단적 일교차를 먼저 길들여야 한다.",
        "모래폭풍은 정착지를 삼킬 만큼 폭력적이다.",
        "수분 보존 기술 없이는 생존이 어렵다.",
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
      ],
      life: [
        "부유도시는 거대한 해류를 따라 항해한다.",
        "심해 길드가 발광 광물을 채굴한다.",
        "별처럼 빛나는 산호 군락이 항로가 된다.",
      ],
      warning: [
        "테라포밍은 조류와 조석을 안정시키는 것이 핵심이다.",
        "태풍과 고습도가 일상처럼 밀려온다.",
        "해상 기반 시설이 필수다.",
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
      ],
      life: [
        "지열로 버티는 대장장이 도시가 살아남는다.",
        "불길을 숭배하는 부족이 용암 계곡을 지킨다.",
        "산업 카라반이 현무암을 수집한다.",
      ],
      warning: [
        "테라포밍은 끊임없는 지각운동을 완화해야 한다.",
        "하룻밤 사이 지형이 바뀔 수 있다.",
        "차폐 시설이 없다면 정착은 불가능하다.",
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
      ],
      life: [
        "거목에 매달린 공중 마을이 존재한다.",
        "발광 생물이 길을 밝힌다.",
        "탐험가들은 포자와 약물을 교환한다.",
      ],
      warning: [
        "테라포밍은 폭발적 성장률을 제어해야 한다.",
        "방치된 구조물은 곧 식물에 삼켜진다.",
        "공기 정화와 캐노피 매핑이 필수다.",
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
      ],
      life: [
        "관측소가 하늘의 신호를 추적한다.",
        "거울 도시가 어둠을 반사한다.",
        "고대 중계소를 수호하는 수도회가 있다.",
      ],
      warning: [
        "테라포밍은 인공 광주기가 핵심이다.",
        "에너지 생산이 제한적이며 공사가 길어진다.",
        "전력 분배 효율이 생존을 좌우한다.",
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
      ],
      life: [
        "포자 생명체가 거대한 군락을 이룬다.",
        "방독면을 쓴 정찰대만이 지상에 발을 딛는다.",
        "빛나는 곰팡이가 밤을 더 밝게 만든다.",
      ],
      warning: [
        "테라포밍은 독성 대기 정화가 최우선이다.",
        "호흡 장치 없이는 생존이 불가능하다.",
        "산성비가 구조물을 빠르게 부식시킨다.",
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
      ],
      life: [
        "전기 생명체가 자기장에 붙어 살아간다.",
        "정착민은 지하 깊숙이 에너지 저장소를 만든다.",
        "여행자들은 별빛만으로 길을 찾는다.",
      ],
      warning: [
        "테라포밍은 대기 생성부터 시작해야 한다.",
        "방전 폭풍이 장비를 무력화시킨다.",
        "광원과 방전 차폐가 필수다.",
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
    return {
      id: `preview-${profile.key}-${seed}`,
      seed,
      params: {
        ...profile.params,
        biome: profile.key,
        lore: profile.lore,
      },
      palette: profile.palette,
      cloudColor: profile.cloudColor,
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
      ? "바다가 거의 사라진 건조한 지형이 지배한다."
      : sea < -0.06
        ? "행성의 대부분은 깊은 바다와 습한 해양 지형이다."
        : "얕은 해안선이 군도처럼 흩어져 있다.";
  const colorLine = tone ? `지표는 ${tone} 빛을 띠며 독특한 광도를 가진다.` : "";
  const cloudLine = cloudTone ? `${cloudTone} 구름이 대기를 뒤덮어 하늘의 분위기를 바꾼다.` : "";
  return {
    title,
    lines: [climate, seaLine, colorLine, cloudLine, life, warning, extra].filter(Boolean),
  };
}

export default function LandingPage() {
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
  const [repos, setRepos] = useState<any[]>([]);
  const [fetchingRepos, setFetchingRepos] = useState(false);
  const [showRepos, setShowRepos] = useState(false);
  const wheelLockRef = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!user) return;
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
  }, [user]);

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
      const presets = buildPreviewPlanets();
      setCustomPlanets(presets);
      setFocusedPlanet(presets[0] ?? null);
      setViewMode("carousel");
      setPlacementMode(false);
      setPlacement(null);
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

  const isCustomizing = customPlanets.length > 0;
  const carouselPlanets = isCustomizing ? customPlanets : planets;
  const carouselActiveId = isCustomizing
    ? focusedPlanet?.id ?? customPlanets[0]?.id ?? null
    : defaultPlanetId;

  const story = focusedPlanet ? buildPlanetLore(focusedPlanet) : null;

  const handleTerraform = async () => {
    if (!focusedPlanet || !pendingProjectId) return;
    if (!placementMode) {
      setPlacementMode(true);
      return;
    }
    if (!placement) return;
    setTerraforming(true);
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
      router.push(`/p/${pendingProjectId}`);
    } catch {
      alert("Failed to terraform planet");
    } finally {
      setTerraforming(false);
    }
  };

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
          {isCustomizing ? "Planet Lab" : "Planet"}
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
              disabled={terraforming || !pendingProjectId || (placementMode && !placement)}
              className={cn(
                "w-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.2em] transition",
                terraforming
                  ? "bg-white/10 text-white/50"
                  : "bg-cyan-300/90 text-black hover:bg-cyan-200"
              )}
            >
              {terraforming
                ? "Terraforming..."
                : placementMode
                  ? "Confirm Landing Site"
                  : "Terraforming"}
            </button>
          </div>
        )}
      </div>

      <section className="h-[100vh]" />
    </main>
  );
}
