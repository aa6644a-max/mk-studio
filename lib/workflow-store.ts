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
  messages: ChatMessage[];
  generatedHtml: string;
  seoTitles: string[];
  isStreaming: boolean;
  error: string;
  generatingChars: number;
};

type Actions = {
  setTopic: (t: string) => void;
  setStrategy: (s: StrategyCard) => void;
  setPostType: (t: PostType) => void;
  setStage: (s: WorkflowStage) => void;
  addMessage: (m: ChatMessage) => void;
  appendToLastMessage: (chunk: string) => void;
  setGeneratedHtml: (html: string) => void;
  setSeoTitles: (titles: string[]) => void;
  setStreaming: (b: boolean) => void;
  setError: (e: string) => void;
  addGeneratingChars: (n: number) => void;
  reset: () => void;
};

const INIT: State = {
  stage: "input",
  topic: "",
  strategy: null,
  postType: "review",
  messages: [],
  generatedHtml: "",
  seoTitles: [],
  isStreaming: false,
  error: "",
  generatingChars: 0,
};

export const useWorkflowStore = create<State & Actions>((set) => ({
  ...INIT,
  setTopic: (topic) => set({ topic }),
  setStrategy: (strategy) => set({ strategy, postType: strategy.postType }),
  setPostType: (postType) => set({ postType }),
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
  reset: () => set(INIT),
}));
