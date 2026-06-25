"use client";

import { useState, useRef, useCallback } from "react";
import type { BriefSuggestion } from "@/app/api/marketing/brief/route";

type Status = "idle" | "loading" | "streaming" | "done" | "error";
type BriefStatus = "idle" | "loading" | "done" | "error";
type Tab = "brief" | "manual";

// ─── Markdown → HTML (PDF용) ────────────────────────────────────────────────

function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inUl = false;
  let inOl = false;
  let tableRows: string[][] = [];
  let tableHeaders: string[] = [];
  let inTable = false;

  const closeList = () => {
    if (inUl) { out.push("</ul>"); inUl = false; }
    if (inOl) { out.push("</ol>"); inOl = false; }
  };
  const flushTable = () => {
    if (!inTable) return;
    out.push('<table><thead><tr>');
    tableHeaders.forEach(h => out.push(`<th>${h}</th>`));
    out.push('</tr></thead><tbody>');
    tableRows.forEach(row => {
      out.push('<tr>');
      row.forEach(cell => out.push(`<td>${cell}</td>`));
      out.push('</tr>');
    });
    out.push('</tbody></table>');
    tableHeaders = []; tableRows = []; inTable = false;
  };
  const inline = (s: string) => s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  for (const raw of lines) {
    if (raw.startsWith("|")) {
      const cells = raw.split("|").map(c => c.trim()).filter(Boolean);
      if (!inTable) { tableHeaders = cells; inTable = true; }
      else if (cells.every(c => /^[-:]+$/.test(c))) { /* skip separator */ }
      else tableRows.push(cells);
      continue;
    }
    if (inTable) flushTable();
    closeList();

    if (raw.startsWith("### ")) out.push(`<h3>${inline(raw.slice(4))}</h3>`);
    else if (raw.startsWith("#### ")) out.push(`<h4>${inline(raw.slice(5))}</h4>`);
    else if (raw === "---") out.push("<hr>");
    else if (raw.startsWith("- ") || raw.startsWith("* ")) {
      if (!inUl) { out.push("<ul>"); inUl = true; }
      out.push(`<li>${inline(raw.slice(2))}</li>`);
      continue;
    } else if (/^\d+\.\s/.test(raw)) {
      if (!inOl) { out.push("<ol>"); inOl = true; }
      out.push(`<li>${inline(raw.replace(/^\d+\.\s/, ""))}</li>`);
      continue;
    } else if (raw.trim() === "") out.push("<br>");
    else out.push(`<p>${inline(raw)}</p>`);
  }
  if (inTable) flushTable();
  closeList();
  return out.join("\n");
}

function buildPrintHtml(topic: string, body: string, date: string): string {
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8">
<title>MK LINK 마케팅 전략 — ${topic}</title>
<style>
@page{size:A4;margin:20mm 18mm 20mm 18mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Malgun Gothic','맑은 고딕',sans-serif;font-size:10pt;color:#1a1a2e;line-height:1.6;background:#fff}
.header{background:#1a2e4a;color:#fff;padding:14px 18px 12px;margin-bottom:18px;border-radius:4px;display:flex;justify-content:space-between;align-items:flex-end}
.header-brand{font-size:13pt;font-weight:800;color:#26C6A4}
.header-topic{font-size:10pt;color:rgba(255,255,255,0.75);margin-top:3px}
.header-date{font-size:8pt;color:rgba(255,255,255,0.5);white-space:nowrap}
h3{font-size:11pt;font-weight:700;color:#26C6A4;margin:14px 0 6px;padding-bottom:4px;border-bottom:1.5px solid #26C6A4;page-break-after:avoid}
h4{font-size:10pt;font-weight:700;color:#1a2e4a;margin:10px 0 4px;page-break-after:avoid}
p{font-size:9.5pt;color:#333;margin:3px 0}
br{display:block;height:4px;content:''}
hr{border:none;border-top:1px solid #dde;margin:10px 0}
strong{color:#1a2e4a;font-weight:700}
ul,ol{padding-left:16px;margin:4px 0}
li{font-size:9.5pt;color:#333;margin:2px 0;line-height:1.55}
table{width:100%;border-collapse:collapse;margin:8px 0;font-size:9pt;page-break-inside:avoid}
th{background:#1a2e4a;color:#fff;text-align:left;padding:5px 8px;font-size:8.5pt;font-weight:600}
td{border:1px solid #dde;padding:5px 8px;color:#333;vertical-align:top}
tr:nth-child(even) td{background:#f7f9fc}
.footer{margin-top:18px;padding-top:8px;border-top:1px solid #dde;display:flex;justify-content:space-between;font-size:7.5pt;color:#999}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="header"><div><div class="header-brand">MK LINK</div><div class="header-topic">마케팅 전략 — ${topic}</div></div><div class="header-date">${date}</div></div>
${body}
<div class="footer"><span>MK LINK 마케팅 전략 에이전트</span><span>${date}</span></div>
</body></html>`;
}

// ─── Markdown → React (화면 렌더용) ─────────────────────────────────────────

function renderInline(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} className="text-[var(--text-primary)] font-semibold">{part.slice(2, -2)}</strong>
      : part
  );
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let tableBuffer: string[] = [];
  let key = 0;

  const flushTable = () => {
    if (tableBuffer.length < 2) { tableBuffer.forEach(l => nodes.push(<p key={key++} className="text-sm text-[var(--text-primary)] leading-relaxed">{l}</p>)); tableBuffer = []; return; }
    const headers = tableBuffer[0].split("|").map(h => h.trim()).filter(Boolean);
    const rows = tableBuffer.slice(2).map(r => r.split("|").map(c => c.trim()).filter(Boolean));
    nodes.push(
      <div key={key++} className="overflow-x-auto my-3">
        <table className="w-full text-sm border-collapse">
          <thead><tr>{headers.map((h, i) => <th key={i} className="text-left px-3 py-2 border border-[var(--panel-border)] bg-[var(--panel-header)] text-[var(--text-primary)] font-semibold text-xs">{h}</th>)}</tr></thead>
          <tbody>{rows.map((row, ri) => <tr key={ri} className={ri % 2 === 0 ? "bg-[var(--panel-bg)]" : ""}>{row.map((cell, ci) => <td key={ci} className="px-3 py-2 border border-[var(--panel-border)] text-[var(--text-secondary)] text-xs">{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
    );
    tableBuffer = [];
  };

  for (const line of lines) {
    if (line.startsWith("|")) { tableBuffer.push(line); continue; }
    if (tableBuffer.length > 0) flushTable();
    if (line.startsWith("### ")) nodes.push(<h3 key={key++} className="text-[var(--accent)] font-bold text-base mt-5 mb-2">{line.slice(4)}</h3>);
    else if (line.startsWith("#### ")) nodes.push(<h4 key={key++} className="text-[var(--text-primary)] font-semibold text-sm mt-3 mb-1">{line.slice(5)}</h4>);
    else if (line === "---") nodes.push(<hr key={key++} className="border-[var(--panel-border)] my-4" />);
    else if (line.startsWith("- ") || line.startsWith("* ")) nodes.push(<li key={key++} className="text-sm text-[var(--text-secondary)] ml-4 leading-relaxed list-disc">{renderInline(line.slice(2))}</li>);
    else if (/^\d+\.\s/.test(line)) nodes.push(<li key={key++} className="text-sm text-[var(--text-secondary)] ml-4 leading-relaxed list-decimal">{renderInline(line.replace(/^\d+\.\s/, ""))}</li>);
    else if (line.trim() === "") nodes.push(<div key={key++} className="h-1" />);
    else nodes.push(<p key={key++} className="text-sm text-[var(--text-secondary)] leading-relaxed">{renderInline(line)}</p>);
  }
  if (tableBuffer.length > 0) flushTable();
  return nodes;
}

// ─── 브리핑 카드 ─────────────────────────────────────────────────────────────

function TrendBadge({ trend }: { trend: BriefSuggestion["trend"] }) {
  if (trend === "up") return <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold">↑ 상승</span>;
  if (trend === "down") return <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-semibold">↓ 하락</span>;
  return <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-[var(--text-secondary)] font-semibold">→ 보합</span>;
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function MarketingWorkspace() {
  const [tab, setTab] = useState<Tab>("brief");
  const [topic, setTopic] = useState("");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const [briefStatus, setBriefStatus] = useState<BriefStatus>("idle");
  const [suggestions, setSuggestions] = useState<BriefSuggestion[]>([]);
  const [briefDate, setBriefDate] = useState("");
  const [briefError, setBriefError] = useState("");

  const abortRef = useRef<AbortController | null>(null);

  // ── 브리핑 요청 ──
  const fetchBrief = useCallback(async () => {
    if (briefStatus === "loading") return;
    setBriefStatus("loading");
    setBriefError("");
    setSuggestions([]);

    try {
      const res = await fetch("/api/marketing/brief");
      if (!res.ok) {
        const msg = await res.json();
        throw new Error(msg.error ?? `오류 ${res.status}`);
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSuggestions(data.suggestions ?? []);
      setBriefDate(data.generatedAt ?? "");
      setBriefStatus("done");
    } catch (e) {
      setBriefError((e as Error).message);
      setBriefStatus("error");
    }
  }, [briefStatus]);

  // ── 카드 선택 → 전략 생성 ──
  const selectSuggestion = useCallback((s: BriefSuggestion) => {
    setTopic(s.topic);
    setTab("manual");
    setOutput("");
    setStatus("idle");
  }, []);

  // ── 5단계 전략 생성 (스트리밍) ──
  const generate = useCallback(async (overrideTopic?: string) => {
    const t = (overrideTopic ?? topic).trim();
    if (!t || status === "loading" || status === "streaming") return;

    abortRef.current = new AbortController();
    setOutput("");
    setError("");
    setStatus("loading");

    try {
      const res = await fetch("/api/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: t }),
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
  }, [topic, status]);

  const stop = useCallback(() => abortRef.current?.abort(), []);
  const copyAll = useCallback(() => navigator.clipboard.writeText(output), [output]);

  const exportToPdf = useCallback(() => {
    const date = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
    const html = buildPrintHtml(topic, markdownToHtml(output), date);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }, [output, topic]);

  const isRunning = status === "loading" || status === "streaming";

  return (
    <div className="flex flex-col md:flex-row gap-0 md:h-full md:overflow-hidden">

      {/* ── 왼쪽 패널 ── */}
      <div className="shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-[var(--panel-border)] overflow-y-auto w-full md:w-[clamp(280px,30%,360px)]">

        {/* 헤더 */}
        <div className="px-5 h-[52px] flex items-center shrink-0 border-b border-[var(--panel-border)]">
          <h1 className="text-[15px] font-bold text-[var(--text-primary)]">마케팅 전략 에이전트</h1>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-[var(--panel-border)]">
          {(["brief", "manual"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${tab === t ? "text-[var(--accent)] border-b-2 border-[var(--accent)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
            >
              {t === "brief" ? "📡 AI 브리핑" : "✏️ 직접 입력"}
            </button>
          ))}
        </div>

        <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto">

          {/* ── 브리핑 탭 ── */}
          {tab === "brief" && (
            <>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Naver 검색 트렌드 + 블로그 RSS 분석 →<br />
                지금 MK LINK에 맞는 주제 3개 추천
              </p>

              <button
                onClick={fetchBrief}
                disabled={briefStatus === "loading"}
                className="w-full rounded-lg py-2.5 text-sm font-semibold bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50 transition-colors"
              >
                {briefStatus === "loading" ? "분석 중..." : "오늘 브리핑 받기"}
              </button>

              {briefError && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">{briefError}</div>
              )}

              {briefStatus === "done" && suggestions.length > 0 && (
                <div className="flex flex-col gap-3">
                  {briefDate && <p className="text-[10px] text-[var(--text-secondary)]">{briefDate} 기준</p>}
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => selectSuggestion(s)}
                      className="w-full text-left rounded-lg border border-[var(--panel-border)] p-3 hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-[11px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] leading-tight">{s.topic}</span>
                        <TrendBadge trend={s.trend} />
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-[var(--text-secondary)] mb-1.5 inline-block">{s.badge}</span>
                      <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed mt-1">{s.reason}</p>
                      <p className="text-[10px] text-[var(--accent)] mt-2 font-semibold">→ 이 주제로 전략 생성</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── 직접 입력 탭 ── */}
          {tab === "manual" && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">주제</label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={"예: 대구 독립영화 모임 모집\n예: MK LINK 신규 가입 캠페인\n예: 봄 문화행사 홍보"}
                  rows={5}
                  className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate(); }}
                />
                <span className="text-[11px] text-[var(--text-secondary)]">⌘Enter로 실행</span>
              </div>

              <button
                onClick={isRunning ? stop : () => generate()}
                disabled={!isRunning && !topic.trim()}
                className={`w-full rounded-lg py-2.5 text-sm font-semibold transition-colors ${isRunning ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"}`}
              >
                {status === "loading" ? "연결 중..." : status === "streaming" ? "⏹ 중단" : "전략 생성"}
              </button>

              {status === "done" && output && (
                <>
                  <button onClick={copyAll} className="w-full rounded-lg border border-[var(--panel-border)] py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors">
                    전체 복사
                  </button>
                  <button onClick={exportToPdf} className="w-full rounded-lg border border-[var(--panel-border)] py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors flex items-center justify-center gap-2">
                    <span>📄</span> PDF 저장
                  </button>
                </>
              )}

              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">{error}</div>
              )}
            </>
          )}

          <div className="mt-auto pt-4 border-t border-[var(--panel-border)]">
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              {tab === "brief"
                ? "브리핑 카드 클릭 → 자동으로 전략 생성 탭으로 이동"
                : "5단계: 콘텐츠 전략 → 카피 → 인스타/블로그 → 리드마그넷 → 요약"}
            </p>
          </div>
        </div>
      </div>

      {/* ── 오른쪽: 출력 패널 ── */}
      <div className="flex-1 flex flex-col md:overflow-hidden min-h-[60vh] md:min-h-0">
        <div className="px-5 h-[52px] flex items-center justify-between shrink-0 border-b border-[var(--panel-border)]">
          <span className="text-[13px] text-[var(--text-secondary)]">
            {status === "idle" && (tab === "brief" ? "브리핑을 받고 주제를 선택하세요" : "주제를 입력하고 전략 생성을 눌러주세요")}
            {status === "loading" && "생성 중..."}
            {status === "streaming" && "작성 중..."}
            {status === "done" && `완료 — ${topic}`}
            {status === "error" && "오류 발생"}
          </span>
          {status === "streaming" && (
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {output ? (
            <div className="max-w-2xl">{renderMarkdown(output)}</div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
              <span className="text-4xl">📣</span>
              <p className="text-sm text-[var(--text-secondary)]">MK LINK 마케팅 전략을 5단계로 설계해드립니다</p>
              <div className="mt-2 text-[12px] text-[var(--text-secondary)] space-y-1">
                <p>AI 브리핑 탭 → 오늘 브리핑 받기 → 주제 선택</p>
                <p>또는 직접 입력 탭에서 주제를 직접 작성</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
