import { create } from "zustand";
import type { PostType } from "./types";

export type WorkflowStage = "input" | "strategy" | "interview" | "generating" | "result";

export type StrategyCard = {
  postType: PostType;
  keywords: string[];
  target: string;
  angle: string;
  contentType: "searchable" | "shareable" | "both";
};

export type ChatMessage = {
  role: "assistant" | "user";
  content: string;
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
  reset: () => set(INIT),
}));
