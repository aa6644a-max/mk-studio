"use client";

import { useState, useRef, useCallback } from "react";
import { ANGLE_LABELS, type Class101Angle } from "@/lib/prompts/class101";

type Status = "idle" | "loading" | "streaming" | "done" | "error";
type ViewMode = "preview" | "html";

function stripFence(s: string): string {
  return s
    .replace(/^```html?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
}

function extractTitle(raw: string): { title: string; body: string } {
  const cleaned = stripFence(raw);
  const m = cleaned.match(/<!--\s*TITLE:\s*([^\-\->]+?)\s*-->/i);
  if (!m) return { title: "", body: cleaned };
  return {
    title: m[1].trim(),
    body: cleaned.replace(m[0], "").trim(),
  };
}

export default function Class101Workspace() {
  const [angle, setAngle] = useState<Class101Angle>(1);
  const [category, setCategory] = useState("AI·업무자동화");
  const [courseName, setCourseName] = useState("");
  const [notes, setNotes] = useState("");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async () => {
    if (status === "loading" || status === "streaming") return;
    abortRef.current = new AbortController();
    setOutput("");
    setError("");
    setStatus("loading");

    try {
      const res = await fetch("/api/partnerships/class101", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ angle, category, courseName, userNotes: notes }),
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error((await res.text()) || `오류 ${res.status}`);
      if (!res.body) throw new Error("스트림 없음");

      setStatus("streaming");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setOutput(accumulated);
      }
      setStatus("done");
    } catch (e) {
      if ((e as Error).name === "AbortError") { setStatus("idle"); return; }
      setError((e as Error).message);
      setStatus("error");
    }
  }, [angle, category, courseName, notes, status]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const copyHtml = useCallback(async () => {
    const { body } = extractTitle(output);
    await navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const isRunning = status === "loading" || status === "streaming";
  const { title, body } = extractTitle(output);

  return (
    <div className="flex h-full flex-col md:flex-row gap-0 overflow-hidden">

      {/* ── 왼쪽 패널 ── */}
      <div
        className="shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-[var(--panel-border)] overflow-y-auto"
        style={{ width: "clamp(280px,30%,340px)" }}
      >
        <div className="px-5 h-[52px] flex items-center shrink-0 border-b border-[var(--panel-border)]">
          <h1 className="text-[15px] font-bold text-[var(--text-primary)]">
            📦 클래스101 파트너스
          </h1>
        </div>

        <div className="flex-1 p-5 flex flex-col gap-5 overflow-y-auto">

          {/* 마감 안내 */}
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5 text-xs text-amber-700 leading-relaxed">
            <p className="font-bold mb-1">⏰ 마감 안내</p>
            <p>구독권 등록: 2026-06-24까지</p>
            <p>블로그 업로드: 2026-07-01까지</p>
          </div>

          {/* 카테고리 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              카테고리
            </label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="예: AI·업무자동화, 드로잉, 영상편집, 재테크"
              className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>

          {/* 수강 강의명 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              수강 강의명 <span className="normal-case font-normal">(선택)</span>
            </label>
            <input
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="예: ChatGPT 업무 자동화 완성 클래스"
              className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>

          {/* 앵글 선택 */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              포스팅 앵글 선택
            </label>
            {([1, 2, 3] as Class101Angle[]).map((a) => (
              <button
                key={a}
                onClick={() => setAngle(a)}
                className={`w-full text-left rounded-lg border p-3 transition-all ${
                  angle === a
                    ? "border-[var(--accent)] bg-[var(--accent)]/8 text-[var(--text-primary)]"
                    : "border-[var(--panel-border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      angle === a
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--panel-border)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {a}편
                  </span>
                  <span className="text-xs font-semibold">
                    {ANGLE_LABELS[a]}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* 추가 메모 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              추가 메모 (선택)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={"실제 수강한 강의 이름, 특이사항, 추가 강조점 등"}
              rows={4}
              className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>

          {/* 생성 버튼 */}
          <button
            onClick={isRunning ? stop : generate}
            className={`w-full rounded-lg py-2.5 text-sm font-semibold transition-colors ${
              isRunning
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                : "bg-[var(--accent)] text-white hover:opacity-90"
            }`}
          >
            {status === "loading"
              ? "연결 중..."
              : status === "streaming"
              ? "⏹ 중단"
              : "포스팅 생성"}
          </button>

          {/* 복사 버튼 */}
          {status === "done" && output && (
            <button
              onClick={copyHtml}
              className="w-full rounded-lg border border-[var(--panel-border)] py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors"
            >
              {copied ? "✓ 복사됨" : "HTML 복사 (네이버 붙여넣기용)"}
            </button>
          )}

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}

          {/* 안내 */}
          <div className="mt-auto pt-4 border-t border-[var(--panel-border)] space-y-2 text-[11px] text-[var(--text-secondary)] leading-relaxed">
            <p>✦ 레퍼럴 링크 자동 2회 삽입 (상단·하단)</p>
            <p>✦ 필수 키워드 5회↑ 자동 포함</p>
            <p>✦ 해시태그 자동 생성</p>
            <p>✦ HTML 복사 → 네이버 블로그 HTML 편집기에 붙여넣기</p>
          </div>
        </div>
      </div>

      {/* ── 오른쪽: 출력 패널 ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-5 h-[52px] flex items-center justify-between shrink-0 border-b border-[var(--panel-border)]">
          <span className="text-[13px] text-[var(--text-secondary)] truncate mr-4">
            {status === "idle" && "앵글을 선택하고 생성 버튼을 누르세요"}
            {status === "loading" && "생성 중..."}
            {status === "streaming" && "작성 중..."}
            {status === "done" && (title || `${angle}편 완료`)}
            {status === "error" && "오류 발생"}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            {status === "streaming" && (
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            )}
            {output && (
              <div className="flex rounded-lg border border-[var(--panel-border)] overflow-hidden text-xs">
                {(["preview", "html"] as ViewMode[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setViewMode(v)}
                    className={`px-3 py-1.5 font-medium transition-colors ${
                      viewMode === v
                        ? "bg-[var(--accent)] text-white"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {v === "preview" ? "미리보기" : "HTML"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {output ? (
            viewMode === "preview" ? (
              <div className="max-w-2xl">
                {title && (
                  <div className="mb-4 p-3 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20">
                    <p className="text-[10px] text-[var(--accent)] font-bold mb-1">제안 제목 (네이버 블로그)</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
                  </div>
                )}
                <div
                  className="prose prose-sm max-w-none text-[var(--text-primary)]"
                  dangerouslySetInnerHTML={{ __html: body || output }}
                />
              </div>
            ) : (
              <pre className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap font-mono leading-relaxed">
                {body || output}
              </pre>
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
              <span className="text-4xl">📝</span>
              <p className="text-sm text-[var(--text-secondary)]">
                클래스101 파트너스 블로그 포스팅을 자동 생성합니다
              </p>
              <div className="mt-2 text-[12px] text-[var(--text-secondary)] space-y-1">
                <p>필수 키워드 · 레퍼럴 링크 · 해시태그 자동 삽입</p>
                <p>MK 문체 유지 · 네이버 HTML 형식 출력</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
