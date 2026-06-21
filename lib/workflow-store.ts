import { create } from "zustand";
import type { PostType } from "./types";

export type WorkflowStage =
  | "input"
  | "strategy"
  | "tmdb-search"
  | "interview"
  | "generating"
  | "result";

export type PhotoCategory = "맛집카페" | "일상기록" | "여행나들이" | "전시문화";

export type StrategyCard = {
  postType: PostType;
  keywords: string[];
  target: string;
  angle: string;
  contentType: "searchable" | "shareable" | "both";
  /** photo 타입일 때만 의미 있음 — 글 구조 분기용 */
  photoCategory?: PhotoCategory;
};

export type ChatMessage = {
  role: "assistant" | "user";
  content: string;
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
  seoTitles: string[];
  isStreaming: boolean;
  error: string;
  generatingChars: number;
  fileContent: string;
  imageNames: string[];
  imageCaptions: string[];
  imagePreviewUrls: string[];
  tmdbSelections: TmdbSelection[];
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
  setSeoTitles: (titles: string[]) => void;
  setStreaming: (b: boolean) => void;
  setError: (e: string) => void;
  addGeneratingChars: (n: number) => void;
  setFileContent: (text: string) => void;
  setImageData: (names: string[], captions: string[], urls: string[]) => void;
  setTmdbSelections: (items: TmdbSelection[]) => void;
  reset: () => void;
};

const INIT: State = {
  stage: "input",
  topic: "",
  strategy: null,
  postType: "review",
  selectedType: null,
  messages: [],
  generatedHtml: "",
  seoTitles: [],
  isStreaming: false,
  error: "",
  generatingChars: 0,
  fileContent: "",
  imageNames: [],
  imageCaptions: [],
  imagePreviewUrls: [],
  tmdbSelections: [],
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
  setSeoTitles: (seoTitles) => set({ seoTitles }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  setError: (error) => set({ error }),
  addGeneratingChars: (n) => set((s) => ({ generatingChars: s.generatingChars + n })),
  setFileContent: (fileContent) => set({ fileContent }),
  setImageData: (imageNames, imageCaptions, imagePreviewUrls) =>
    set({ imageNames, imageCaptions, imagePreviewUrls }),
  setTmdbSelections: (tmdbSelections) => set({ tmdbSelections }),
  reset: () => set(INIT),
}));
