import { create } from "zustand";
import type { MarketHost, PostType } from "./types";

export type WorkflowStage =
  | "input"
  | "strategy"
  | "tmdb-search"
  | "seed"
  | "interview"
  | "generating"
  | "result";

export type PhotoCategory = "맛집카페" | "일상기록" | "여행나들이" | "전시문화" | "제품리뷰";

export type StrategyCard = {
  postType: PostType;
  keywords: string[];
  target: string;
  angle: string;
  contentType: "searchable" | "shareable" | "both";
  /** photo 타입일 때만 의미 있음 — 글 구조 분기용 */
  photoCategory?: PhotoCategory;
  /** 영화 타입(review/preview/curation/binge) 전용 — TMDB 작품 데이터 기반 차별화 전략 */
  hook?: string; // 이 포스팅만의 후킹 한 줄 (단일=작품 끌림 / 다중=리스트 묶는 매력)
  watchPoints?: string[]; // 관전 포인트 후보 2~3개 (단일=작품 주목점 / 다중=묶음 관점)
  differentiator?: string; // 차별화 각도 (단일=일반 리뷰 대비 / 다중=이 큐레이션만의 관점)
};

export type ChatMessage = {
  role: "assistant" | "user";
  content: string;
};

/**
 * market 타입 전용 입력값.
 * 참여 팀 목록과 팀별 현장 메모는 인터뷰로 받기엔 양이 많아(10~15팀)
 * 입력 화면에서 구조화해 받고, 인터뷰는 총평·계기만 캐도록 한다.
 */
export type MarketInfo = {
  venueName: string;
  venueAddress: string;
  eventDate: string;
  eventTime: string;
  venueInfo: string;
  seriesInfo: string;
  brandColor: string;
  hosts: MarketHost[];
};

export const EMPTY_MARKET_INFO: MarketInfo = {
  venueName: "",
  venueAddress: "",
  eventDate: "",
  eventTime: "",
  venueInfo: "",
  seriesInfo: "",
  brandColor: "#8E3B62",
  hosts: [],
};

export type TmdbSelection = {
  id: number;
  title: string;
  year: string;
  posterUrl: string | null;
  mediaType: "movie" | "tv";
};

type State = {
  stage: WorkflowStage;
  topic: string;
  strategy: StrategyCard | null;
  postType: PostType;
  selectedType: PostType | null;
  messages: ChatMessage[];
  generatedHtml: string;
  /** wrapHtml 래핑 전 본문 — SEO 제목 변경 시 h1 재래핑용 */
  rawHtml: string;
  seoTitles: string[];
  isStreaming: boolean;
  error: string;
  generatingChars: number;
  fileContent: string;
  imageNames: string[];
  imageCaptions: string[];
  imagePreviewUrls: string[];
  tmdbSelections: TmdbSelection[];
  /** 사용자가 작품 선택 후 직접 쓴 감상평 — 전략·인터뷰·생성의 시드 (review 등 영화 타입) */
  seed: string;
  /** PDF 작성 방식 — narrative(줄글 서사) / info(표·박스 정보 시각화) */
  pdfMode: "narrative" | "info";
  /** market 타입 전용 — 행사·장소 정보 + 참여 팀 목록 */
  marketInfo: MarketInfo;
  /** "AI 맞춤 작성" 탭 여부 — input 스테이지에서 어떤 입력 화면을 보여줄지 결정 */
  entryMode: "manual" | "smart";
  /** 섹션 헤더 등 디자인 시스템 색상 사용자 지정 (전략카드 스와치). 비어있으면 타입별 기본색 사용 */
  brandColor: string;
};

type Actions = {
  setTopic: (t: string) => void;
  setStrategy: (s: StrategyCard) => void;
  setPostType: (t: PostType) => void;
  setSelectedType: (t: PostType | null) => void;
  setStage: (s: WorkflowStage) => void;
  addMessage: (m: ChatMessage) => void;
  appendToLastMessage: (chunk: string) => void;
  setGeneratedHtml: (html: string) => void;
  setRawHtml: (html: string) => void;
  setSeoTitles: (titles: string[]) => void;
  setStreaming: (b: boolean) => void;
  setError: (e: string) => void;
  addGeneratingChars: (n: number) => void;
  setFileContent: (text: string) => void;
  setImageData: (names: string[], captions: string[], urls: string[]) => void;
  setTmdbSelections: (items: TmdbSelection[]) => void;
  setSeed: (seed: string) => void;
  setPdfMode: (mode: "narrative" | "info") => void;
  setMarketInfo: (patch: Partial<MarketInfo>) => void;
  setBrandColor: (color: string) => void;
  reset: (entryMode?: "manual" | "smart") => void;
};

const INIT: State = {
  stage: "input",
  topic: "",
  strategy: null,
  postType: "review",
  selectedType: null,
  messages: [],
  generatedHtml: "",
  rawHtml: "",
  seoTitles: [],
  isStreaming: false,
  error: "",
  generatingChars: 0,
  fileContent: "",
  imageNames: [],
  imageCaptions: [],
  imagePreviewUrls: [],
  tmdbSelections: [],
  seed: "",
  pdfMode: "narrative",
  marketInfo: EMPTY_MARKET_INFO,
  entryMode: "manual",
  brandColor: "",
};

export const useWorkflowStore = create<State & Actions>((set) => ({
  ...INIT,
  setTopic: (topic) => set({ topic }),
  setStrategy: (strategy) => set({ strategy, postType: strategy.postType }),
  setPostType: (postType) => set({ postType }),
  setSelectedType: (selectedType) => set({ selectedType }),
  setStage: (stage) => set({ stage }),
  addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  appendToLastMessage: (chunk) =>
    set((s) => {
      const msgs = [...s.messages];
      if (!msgs.length) return {};
      const last = msgs[msgs.length - 1];
      msgs[msgs.length - 1] = { ...last, content: last.content + chunk };
      return { messages: msgs };
    }),
  setGeneratedHtml: (generatedHtml) => set({ generatedHtml }),
  setRawHtml: (rawHtml) => set({ rawHtml }),
  setSeoTitles: (seoTitles) => set({ seoTitles }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  setError: (error) => set({ error }),
  addGeneratingChars: (n) => set((s) => ({ generatingChars: s.generatingChars + n })),
  setFileContent: (fileContent) => set({ fileContent }),
  setImageData: (imageNames, imageCaptions, imagePreviewUrls) =>
    set({ imageNames, imageCaptions, imagePreviewUrls }),
  setTmdbSelections: (tmdbSelections) => set({ tmdbSelections }),
  setSeed: (seed) => set({ seed }),
  setPdfMode: (pdfMode) => set({ pdfMode }),
  setMarketInfo: (patch) =>
    set((s) => ({ marketInfo: { ...s.marketInfo, ...patch } })),
  setBrandColor: (brandColor) => set({ brandColor }),
  reset: (entryMode = "manual") => set({ ...INIT, entryMode }),
}));
