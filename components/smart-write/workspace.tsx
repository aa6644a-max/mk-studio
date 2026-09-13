"use client";

import { useMemo, useState } from "react";
import Header from "@/components/header";
import { renderArticle } from "@/lib/writing/render";
import { ACTIVE_STAGES, STAGE_LABELS, type RunView, type Strategy } from "@/lib/writing/types";
import InputPanel from "./input-panel";
import { useSmartWrite } from "./use-smart-write";
import "./workspace.css";

export default function SmartWriteWorkspace() {
  const { config, run, busy, loading, automatic, setAutomatic, error, setError, command, start, reset } = useSmartWrite();
  const [titleIndex, setTitleIndex] = useState(0);
  const [tab, setTab] = useState<"preview" | "html">("preview");
  const [copyState, setCopyState] = useState("");
  const [editing, setEditing] = useState(false);
  const html = useMemo(() => run ? renderArticle(run, titleIndex) : "", [run, titleIndex]);
  const active = !!run && ACTIVE_STAGES.includes(run.stage);
  async function copy() {
    try { await navigator.clipboard.writeText(html); setCopyState("복사됨"); setTimeout(() => setCopyState(""), 2000); }
    catch { setError("클립보드에 복사하지 못했습니다. HTML 보기에서 복사하거나 파일로 저장해주세요."); }
  }
  function download() {
    const blob = new Blob([`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${html}</body></html>`], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob), anchor = document.createElement("a");
    anchor.href = url; anchor.download = `${(run?.article?.titles[titleIndex] || "MK 초안").replace(/[<>:"/\\|?*]/g, "_")}.html`;
    anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="sw-workspace">
    <Header title="AI 맞춤 작성" actions={run ? <button className="sw-secondary" disabled={busy} onClick={() => { reset(); setEditing(false); setTitleIndex(0); }}>새 글 작성</button> : undefined} />
    <div className="sw-scroll">
      {error && <div className="sw-alert" role="alert">{error}<button className="sw-text-button" onClick={() => setError("")}>닫기</button></div>}
      {loading ? <div className="sw-loading" role="status">작성 작업실을 불러오는 중…</div> : !run ? <>
        {config && !config.modelReady && <div className="sw-alert">AI 연결이 아직 설정되지 않았습니다. 서버의 ANTHROPIC_API_KEY를 확인해주세요.</div>}
        <InputPanel disabled={!config?.modelReady} busy={busy} onStart={brief => { setTitleIndex(0); void start(brief); }} />
      </> : <div className="sw-run">
        <div className="sw-run-heading"><div><div className="sw-eyebrow">MK의 문체로, 자료에 맞게</div><h2>{run.brief.topic || "첨부 자료로 작성하는 이야기"}</h2></div><span className="sw-saved">{busy ? "처리 중…" : "진행 내용 저장됨"}</span></div>
        <div className="sw-layout">
          <main className="sw-main">
            <div className="sw-card sw-progress" aria-live="polite">
              <div className="sw-toolbar"><span className={busy ? "sw-dot sw-pulse" : "sw-dot"} /><strong>{STAGE_LABELS[run.stage]}</strong></div>
              <p>{busy ? "현재 단계를 마치면 결과를 저장합니다." : automatic ? "다음 단계를 준비하고 있습니다." : active ? "저장된 단계에서 이어서 작성할 수 있습니다." : run.stage === "ready" || run.stage === "needs_review" ? "본문과 출처를 확인한 뒤 사용해주세요." : run.stage === "awaiting_input" ? "자료에 없는 경험이나 대상을 확인하면 작성을 이어갑니다." : "현재까지의 자료와 결과가 보관돼 있습니다."}</p>
              <div className="sw-steps">{["조사", "전략", "작성", "검수"].map((label, i) => <span key={label} className={i === (run.stage === "analyzing" || run.stage === "researching" ? 0 : run.stage === "planning" || run.stage === "awaiting_input" ? 1 : run.stage === "drafting" ? 2 : 3) ? "sw-step-current" : ""}>{label}</span>)}</div>
              <div className="sw-toolbar">
                {active && <button className={automatic ? "sw-secondary" : "sw-primary"} disabled={!automatic && busy} onClick={() => setAutomatic(!automatic)}>{automatic ? "잠시 멈추기" : "이어서 작성하기"}</button>}
                {run.stage === "failed" && <button className="sw-primary" disabled={busy} onClick={async () => { if (await command("retry")) setAutomatic(true); }}>저장된 단계에서 다시 시도</button>}
                {(active || run.stage === "awaiting_input" || run.stage === "failed") && <button className="sw-text-button" disabled={busy} onClick={() => { setAutomatic(false); void command("cancel"); }}>작성 중지</button>}
              </div>
              {run.error && <p className="sw-error" role="alert">{run.error}</p>}
              {busy && !automatic && <p className="sw-muted">현재 요청을 마친 뒤 멈춥니다.</p>}
            </div>

            {run.stage === "awaiting_input" && <Questions key={`${run.id}-${run.version}`} run={run} busy={busy} onSubmit={async answers => { if (await command("answers", { answers })) setAutomatic(true); }} />}

            {run.article && <section className="sw-card sw-result">
              <div className="sw-result-toolbar"><div className="sw-toolbar"><button className={tab === "preview" ? "sw-selected" : "sw-text-button"} onClick={() => setTab("preview")}>미리보기</button><button className={tab === "html" ? "sw-selected" : "sw-text-button"} onClick={() => setTab("html")}>HTML</button></div><div className="sw-toolbar"><button className="sw-secondary" onClick={download}>HTML 파일 저장</button><button className="sw-primary" onClick={() => void copy()}>{copyState || "HTML 복사"}</button></div></div>
              <div className="sw-title-picker"><label htmlFor="sw-title">제목 후보</label><select id="sw-title" value={titleIndex} onChange={e => setTitleIndex(Number(e.target.value))}>{run.article.titles.map((title, i) => <option key={i} value={i}>{title}</option>)}</select></div>
              {run.stage !== "ready" && <div className="sw-result-note">{active ? "검수·수정 중인 초안입니다." : "아래 확인 사항을 검토한 뒤 사용해주세요."}</div>}
              {tab === "preview" ? <iframe title="포스팅 본문 미리보기" sandbox="allow-same-origin" srcDoc={`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:20px;background:white}*{box-sizing:border-box}table{table-layout:fixed}a{color:#2563eb}img{max-width:100%}</style></head><body>${html}</body></html>`} /> : <pre className="sw-code">{html}</pre>}
            </section>}

            {(run.issues.length > 0 || !!run.strategy?.limitations.length) && <section className="sw-card"><h3>확인이 필요한 내용</h3><ul className="sw-issue-list">{run.issues.map((issue, i) => <li key={i}><span className={issue.severity === "error" ? "sw-error" : "sw-muted"}>{issue.kind === "voice" ? "문체" : issue.kind === "experience" ? "경험" : issue.kind === "evidence" ? "근거" : "형식"}</span> {issue.message}</li>)}{run.strategy?.limitations.map((s, i) => <li key={`limit-${i}`}>{s}</li>)}</ul></section>}
          </main>

          <aside className="sw-aside">
            <section className="sw-card"><div className="sw-toolbar"><h3>이번 글의 방향</h3>{run.strategy && !editing && <button className="sw-text-button" disabled={busy || run.stage === "awaiting_input" || run.stage === "cancelled"} onClick={() => { setAutomatic(false); setEditing(true); }}>수정</button>}</div>
              {run.strategy ? editing ? <StrategyEditor key={run.version} strategy={run.strategy} busy={busy} onCancel={() => setEditing(false)} onSave={async strategy => { if (await command("strategy", { strategy })) { setEditing(false); setAutomatic(true); } }} /> : <><dl className="sw-strategy"><dt>독자</dt><dd>{run.strategy.audience}</dd><dt>핵심 질문</dt><dd>{run.strategy.question}</dd><dt>관점</dt><dd>{run.strategy.angle}</dd></dl><div className="sw-keywords">{run.strategy.keywords.map((k, i) => <span key={i}>{k}</span>)}</div><ol className="sw-outline">{run.strategy.outline.map((s, i) => <li key={i}>{s}</li>)}</ol><p className="sw-muted">목표 약 {run.strategy.length.toLocaleString()}자 · MK {run.strategy.voice === "full" ? "감상·경험" : "정보 전달"} 문체</p></> : <p className="sw-muted">자료를 살펴본 뒤 독자와 글의 관점을 정합니다.</p>}
            </section>
            <section className="sw-card"><h3>조사 자료 <span className="sw-count">{run.sources.length}</span></h3><p className="sw-muted">검색 요약과 읽은 원문을 구분합니다.</p>
              {run.sources.map(source => <details key={source.id} className="sw-source"><summary><span className={`sw-source-kind ${source.kind === "snippet" ? "sw-snippet" : ""}`}>{source.kind === "snippet" ? "검색 요약" : source.kind === "document" ? "첨부 문서" : source.kind === "tmdb" ? "작품 정보" : "읽은 원문"}</span><span>{source.title}</span></summary><p className="sw-muted">{source.note}</p><p className="sw-source-excerpt">{source.text.slice(0, 1600)}{source.text.length > 1600 ? "…" : ""}</p>{source.url && <a href={source.url} target="_blank" rel="noopener noreferrer">출처 열기 ↗</a>}<p className="sw-muted">{source.publishedAt ? `자료 시점: ${source.publishedAt} · ` : ""}확인: {new Date(source.retrievedAt).toLocaleString("ko-KR")}</p></details>)}
              {!run.sources.length && <p className="sw-muted">확보한 자료가 여기에 표시됩니다.</p>}
            </section>
            <details className="sw-card"><summary>진행 기록·연결 상태</summary><ol className="sw-log">{run.log.map((entry, i) => <li key={i}>{entry.message}</li>)}</ol>{run.notices.map((s, i) => <p className="sw-muted" key={i}>{s}</p>)}<p className="sw-muted">{run.storage === "local" ? "로컬 개발 저장소" : "서버 저장소"} · 사용 토큰 {run.tokens.toLocaleString()}</p><p className="sw-muted">문체 기준 {run.personaVersion}</p></details>
          </aside>
        </div>
      </div>}
    </div>
  </div>;
}

function Questions({ run, busy, onSubmit }: { run: RunView; busy: boolean; onSubmit: (answers: Record<string, string>) => void }) {
  const pending = run.questions.filter(q => q.answer === undefined);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const update = (id: string, text: string) => setAnswers(prev => ({ ...prev, [id]: text }));
  return <form className="sw-card sw-questions" onSubmit={e => { e.preventDefault(); onSubmit(answers); }}><h3>작성에 필요한 부분만 확인할게요</h3>
    {pending.map(q => <fieldset key={q.id}><legend>{q.text}</legend>{q.kind === "movie" ? <div className="sw-movies">{q.candidates?.map(c => <label key={`${c.mediaType}:${c.id}`} className={answers[q.id] === `${c.mediaType}:${c.id}` ? "sw-movie sw-movie-selected" : "sw-movie"}><input type="radio" name={q.id} value={`${c.mediaType}:${c.id}`} checked={answers[q.id] === `${c.mediaType}:${c.id}`} onChange={e => update(q.id, e.target.value)} disabled={busy} />{c.posterUrl && <img src={c.posterUrl} alt="" />}<span>{c.title}<small>{c.year} · {c.mediaType === "tv" ? "시리즈" : "영화"}</small></span></label>)}<label className="sw-movie"><input type="radio" name={q.id} checked={answers[q.id] === "none"} onChange={() => update(q.id, "none")} disabled={busy} />해당 작품이 없어요</label></div> : <><div className="sw-answer-options">{[...q.options, "모르겠어요 / 경험이 없어요"].map((o, i) => <button type="button" key={i} className="sw-secondary" disabled={busy} onClick={() => update(q.id, o)}>{o}</button>)}</div><textarea aria-label={q.text} value={answers[q.id] || ""} maxLength={6000} rows={3} onChange={e => update(q.id, e.target.value)} placeholder="내 경험이나 생각을 적어주세요." disabled={busy} /></>}</fieldset>)}
    <button className="sw-primary" disabled={busy || pending.some(q => !answers[q.id]?.trim())}>{busy ? "답변 반영 중…" : "답변 반영하고 이어서 작성"}</button>
  </form>;
}
function StrategyEditor({ strategy, busy, onSave, onCancel }: { strategy: Strategy; busy: boolean; onSave: (strategy: Strategy) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(strategy);
  return <form className="sw-strategy-editor" onSubmit={e => { e.preventDefault(); onSave(draft); }}><label>독자<input required maxLength={300} value={draft.audience} onChange={e => setDraft({ ...draft, audience: e.target.value })} /></label><label>글의 관점<textarea required maxLength={1000} rows={4} value={draft.angle} onChange={e => setDraft({ ...draft, angle: e.target.value })} /></label><label>목차 · 한 줄에 하나<textarea required rows={5} value={draft.outline.join("\n")} onChange={e => setDraft({ ...draft, outline: e.target.value.split("\n") })} /></label><label>목표 글자 수<input type="number" min={500} max={8000} value={draft.length} onChange={e => setDraft({ ...draft, length: Number(e.target.value) })} /></label><p className="sw-muted">수정한 방향으로 자료를 다시 확인하고 본문을 새로 작성합니다.</p><div className="sw-toolbar"><button className="sw-primary" disabled={busy}>반영하고 작성</button><button type="button" className="sw-secondary" onClick={onCancel} disabled={busy}>닫기</button></div></form>;
}
