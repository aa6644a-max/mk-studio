"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/header";
import { renderArticle } from "@/lib/writing/render";
import { sourceImages } from "@/lib/writing/movie-media";
import { ACTIVE_STAGES, STAGE_LABELS, type RunView, type Strategy } from "@/lib/writing/types";
import InputPanel from "./input-panel";
import { useSmartWrite } from "./use-smart-write";
import StudioIcon from "./studio-icon";
import { StudioFlow, StudioVisual, flowStep } from "./studio-flow";
import "./workspace.css";

export default function SmartWriteWorkspace() {
  const { config, run, busy, loading, automatic, setAutomatic, error, setError, command, start, reset } = useSmartWrite();
  const [titleIndex, setTitleIndex] = useState(0);
  const [tab, setTab] = useState<"preview" | "html">("preview");
  const [mobileTab, setMobileTab] = useState<"work" | "strategy" | "sources">("work");
  const [copyState, setCopyState] = useState("");
  const [editing, setEditing] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const html = useMemo(() => run ? renderArticle(run, titleIndex) : "", [run, titleIndex]);
  const active = !!run && ACTIVE_STAGES.includes(run.stage);
  const complete = run?.stage === "ready" || run?.stage === "needs_review";
  const movieMedia = useMemo(() => sourceImages(run?.sources || []), [run?.sources]);
  const placedMedia = movieMedia.filter(i => run?.article?.sections.some(s => s.imageIds.includes(i.id)));
  useEffect(() => {
    if (run?.stage === "awaiting_input") setMobileTab("work");
  }, [run?.stage]);
  useEffect(() => { scroll.current?.scrollTo({ top: 0 }); }, [mobileTab, run?.id]);
  async function copy() {
    try { await navigator.clipboard.writeText(html); setCopyState("복사됨"); setTimeout(() => setCopyState(""), 2000); }
    catch { setError("클립보드에 복사하지 못했습니다. HTML 보기에서 복사하거나 파일로 저장해주세요."); }
  }
  function download() {
    const blob = new Blob(['<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + html + "</body></html>"], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob), anchor = document.createElement("a");
    anchor.href = url; anchor.download = (run?.article?.titles[titleIndex] || "MK 초안").replace(/[<>:"/\\|?*]/g, "_") + ".html";
    anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="sw-workspace">
    <Header title="AI 맞춤 작성" actions={<div className="sw-header-actions"><span className="sw-studio-badge"><span /> WRITING STUDIO</span>{run && <button className="sw-secondary sw-new-button" disabled={busy} onClick={() => { reset(); setEditing(false); setTitleIndex(0); setMobileTab("work"); }}><StudioIcon name="plus" size={16} />새 글 작성</button>}</div>} />
    <div className="sw-scroll" ref={scroll}>
      {error && <div className="sw-alert" role="alert"><span>{error}</span><button className="sw-icon-button" aria-label="오류 메시지 닫기" onClick={() => setError("")}><StudioIcon name="close" size={17} /></button></div>}
      {loading ? <div className="sw-loading" role="status"><span className="sw-loading-mark"><StudioIcon name="spark" size={30} /></span><strong>당신의 작업실을 준비하고 있어요</strong><span>저장된 이야기를 불러오는 중</span></div> : !run ? <>
        {config && !config.modelReady && <div className="sw-alert">AI 연결이 아직 설정되지 않았습니다. 서버의 ANTHROPIC_API_KEY를 확인해주세요.</div>}
        <InputPanel disabled={!config?.modelReady} busy={busy} onStart={brief => { setTitleIndex(0); setMobileTab("work"); void start(brief); }} />
      </> : <div className="sw-run" data-mobile-panel={mobileTab}>
        <div className="sw-run-heading"><div><div className="sw-eyebrow">MY WRITING SESSION</div><h2>{run.brief.topic || "첨부 자료로 작성하는 이야기"}</h2></div><span className="sw-saved"><StudioIcon name={busy ? "clock" : "check"} size={14} />{busy ? "작업 중" : "저장됨"}</span></div>
        <StudioFlow current={flowStep(run)} stopped={run.stage === "cancelled" || run.stage === "failed"} />
        <div className="sw-layout">
          <main className="sw-main" id="sw-panel-work">
            <section className={"sw-progress " + (complete ? "sw-progress-complete" : "")} aria-live="polite">
              <div className="sw-progress-copy sw-enter" key={run.stage}>
                <div className="sw-status-caption"><span className={busy ? "sw-dot sw-pulse" : "sw-dot"} />{run.stage === "failed" ? "잠시 연결을 확인할게요" : run.stage === "cancelled" ? "여기까지 저장했어요" : complete ? "YOUR STORY IS READY" : run.stage === "awaiting_input" ? "YOUR TURN" : "STUDIO IN PROGRESS"}</div>
                <h3>{STAGE_LABELS[run.stage]}</h3>
                <p>{busy ? run.stage === "checking" ? "문체와 근거를 살피고, 필요한 부분을 다듬고 있어요." : "당신의 이야기에 필요한 다음 한 걸음을 함께하고 있어요." : automatic ? "다음 단계를 준비하고 있어요." : active ? "잠시 쉬어가도 괜찮아요. 저장된 단계에서 이어가세요." : complete ? "제목을 고르고, 나다운 글로 완성됐는지 살펴보세요." : run.stage === "awaiting_input" ? "당신만 알 수 있는 이야기를 조금 더 들려주세요." : "현재까지의 자료와 결과를 보관하고 있어요."}</p>
                <div className="sw-toolbar sw-progress-actions">
                  {active && <button className={automatic ? "sw-secondary" : "sw-primary"} disabled={!automatic && busy} onClick={() => setAutomatic(!automatic)}><StudioIcon name={automatic ? "pause" : "play"} size={15} />{automatic ? "잠시 멈추기" : "이어서 작성하기"}</button>}
                  {run.stage === "failed" && <button className="sw-primary" disabled={busy} onClick={async () => { if (await command("retry")) setAutomatic(true); }}><StudioIcon name="play" size={15} />저장된 단계에서 다시 시도</button>}
                  {(active || run.stage === "awaiting_input" || run.stage === "failed") && <button className="sw-text-button" disabled={busy} onClick={() => { setAutomatic(false); void command("cancel"); }}>작성 중지</button>}
                  {complete && <span className="sw-complete-meta"><StudioIcon name="file" size={15} />{run.article?.sections.length || 0}개 구역<span />자료 {run.sources.length}개{run.repairs > 0 && <><span />{run.repairs}회 다듬기</>}</span>}
                </div>
                {run.error && <p className="sw-error" role="alert">{run.error}</p>}
                {busy && !automatic && <p className="sw-muted">현재 요청을 마친 뒤 멈춥니다.</p>}
              </div>
              {complete ? <div className="sw-complete-mark" aria-hidden="true"><StudioIcon name="check" size={32} /><i /><i /><i /></div> : <StudioVisual mode={flowStep(run) === 1 ? "research" : flowStep(run) === 2 ? "plan" : "write"} running={busy || automatic} />}
            </section>

            {!run.article && run.stage !== "awaiting_input" && <section className="sw-activity-card sw-card"><div className="sw-section-heading"><span className="sw-section-icon"><StudioIcon name={flowStep(run) === 1 ? "search" : "plan"} size={18} /></span><div><h3>{flowStep(run) === 1 ? "이야기의 근거를 모으는 중" : "생각이 글이 되는 과정"}</h3><p>실제 진행한 작업이 여기에 쌓여요.</p></div>{busy && <span className="sw-live-label">LIVE<span /></span>}</div>
              <div className="sw-session-metrics"><div><strong>{run.sources.length.toString().padStart(2, "0")}</strong><span>확보한 자료</span></div><div><strong>{run.tasks.filter(t => t.status === "done").length.toString().padStart(2, "0")}</strong><span>마친 조사</span></div><div><strong>{run.strategy ? run.strategy.length.toLocaleString() : "—"}</strong><span>목표 글자 수</span></div></div>
              <div className="sw-current-activity"><span className="sw-activity-line" /><StudioIcon name={busy ? "clock" : "check"} size={17} /><p>{run.log[run.log.length - 1]?.message || "주제와 자료를 준비했어요."}</p></div>
            </section>}

            {run.stage === "awaiting_input" && <Questions key={run.id + "-" + run.version} run={run} busy={busy} onSubmit={async answers => { if (await command("answers", { answers })) setAutomatic(true); }} />}

            {run.article && <section className="sw-card sw-result sw-enter">
              <div className="sw-result-toolbar"><div className="sw-result-tabs" role="tablist" aria-label="본문 보기 방식" onKeyDown={event => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); const next = event.key === "Home" ? "preview" : event.key === "End" ? "html" : tab === "preview" ? "html" : "preview"; setTab(next); event.currentTarget.querySelectorAll<HTMLButtonElement>("button")[next === "preview" ? 0 : 1]?.focus(); } }}><button role="tab" tabIndex={tab === "preview" ? 0 : -1} aria-selected={tab === "preview"} aria-controls="sw-article-content" className={tab === "preview" ? "sw-selected" : "sw-text-button"} onClick={() => setTab("preview")}><StudioIcon name="eye" size={16} />미리보기</button><button role="tab" tabIndex={tab === "html" ? 0 : -1} aria-selected={tab === "html"} aria-controls="sw-article-content" className={tab === "html" ? "sw-selected" : "sw-text-button"} onClick={() => setTab("html")}><StudioIcon name="code" size={16} />HTML</button></div><div className="sw-toolbar"><button className="sw-secondary" onClick={download}><StudioIcon name="download" size={16} /><span>HTML 파일 저장</span></button><button className="sw-primary" onClick={() => void copy()}><StudioIcon name={copyState ? "check" : "copy"} size={16} />{copyState || "HTML 복사"}</button></div></div>
              {run.sources.some(s => s.kind === "tmdb") && <div className="sw-movie-media-bar"><span className="sw-section-icon"><StudioIcon name="photo" size={18} /></span><div role="status"><strong>영화 이미지</strong><p>{movieMedia.length ? `포스터 ${movieMedia.filter(i => i.kind === "poster").length}장 · 스틸컷 ${movieMedia.filter(i => i.kind === "still").length}장 · 본문에 ${placedMedia.length}장` : "TMDB에서 포스터와 스틸컷을 불러올 수 있어요."}</p></div>{complete && <button className="sw-secondary" disabled={busy} onClick={() => { void command("images"); }}><StudioIcon name="photo" size={15} />{busy ? "이미지 적용 중…" : "영화 이미지 적용"}</button>}</div>}
              <div className="sw-title-picker"><label htmlFor="sw-title"><StudioIcon name="pen" size={15} />제목 후보<span>마음에 드는 제목을 골라주세요</span></label><select id="sw-title" value={titleIndex} onChange={e => setTitleIndex(Number(e.target.value))}>{run.article.titles.map((title, i) => <option key={i} value={i}>{title}</option>)}</select></div>
              {run.stage !== "ready" && <div className="sw-result-note"><StudioIcon name="shield" size={15} />{active ? "검수·수정 중인 초안입니다." : "확인이 필요한 내용을 검토한 뒤 사용해주세요."}</div>}
              <div id="sw-article-content" role="tabpanel" aria-label={tab === "preview" ? "본문 미리보기" : "본문 HTML"}>
              {tab === "preview" ? <iframe title="포스팅 본문 미리보기" sandbox="allow-same-origin" srcDoc={'<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:20px;background:white}*{box-sizing:border-box}table{table-layout:fixed}a{color:#2563eb}img{max-width:100%}</style></head><body>' + html + "</body></html>"} /> : <pre className="sw-code">{html}</pre>}
              </div>
            </section>}

            {(run.issues.length > 0 || !!run.strategy?.limitations.length) && <section className="sw-card sw-review-card"><div className="sw-section-heading"><span className="sw-section-icon"><StudioIcon name="shield" size={18} /></span><h3>확인이 필요한 내용</h3><span className="sw-count">{run.issues.length + (run.strategy?.limitations.length || 0)}</span></div><ul className="sw-issue-list">{run.issues.map((issue, i) => <li key={i}><span className={issue.severity === "error" ? "sw-error" : "sw-muted"}>{issue.kind === "voice" ? "문체" : issue.kind === "experience" ? "경험" : issue.kind === "evidence" ? "근거" : "형식"}</span> {issue.message}</li>)}{run.strategy?.limitations.map((s, i) => <li key={"limit-" + i}>{s}</li>)}</ul></section>}
          </main>

          <aside className="sw-aside">
            <section className="sw-card sw-direction-card" id="sw-panel-strategy"><div className="sw-section-heading"><span className="sw-section-icon"><StudioIcon name="plan" size={18} /></span><h3>이번 글의 방향</h3>{run.strategy && !editing && <button className="sw-text-button" disabled={busy || run.stage === "awaiting_input" || run.stage === "cancelled"} onClick={() => { setAutomatic(false); setEditing(true); }}><StudioIcon name="edit" size={14} />수정</button>}</div>
              {run.strategy ? editing ? <StrategyEditor key={run.version} strategy={run.strategy} busy={busy} onCancel={() => setEditing(false)} onSave={async strategy => { if (await command("strategy", { strategy })) { setEditing(false); setMobileTab("work"); setAutomatic(true); } }} /> : <><dl className="sw-strategy"><dt>FOR · 독자</dt><dd>{run.strategy.audience}</dd><dt>QUESTION · 핵심 질문</dt><dd>{run.strategy.question}</dd><dt>ANGLE · 나의 관점</dt><dd className="sw-angle">{run.strategy.angle}</dd></dl><div className="sw-keywords">{run.strategy.keywords.map((k, i) => <span key={i}>#{k}</span>)}</div><div className="sw-outline-label">STORY OUTLINE</div><ol className="sw-outline">{run.strategy.outline.map((s, i) => <li key={i}><span>{String(i + 1).padStart(2, "0")}</span>{s}</li>)}</ol><p className="sw-direction-footer"><StudioIcon name="shield" size={14} />MK {run.strategy.voice === "full" ? "감상·경험" : "정보 전달"} 문체 · 약 {run.strategy.length.toLocaleString()}자</p></> : <div className="sw-empty-state"><StudioIcon name="plan" size={28} /><strong>이야기의 지도를 그릴게요</strong><p>자료를 살펴본 뒤 독자와 관점,<br />목차를 이곳에 정리합니다.</p><div className="sw-skeleton"><i /><i /><i /></div></div>}
            </section>
            <section className="sw-card sw-sources-card" id="sw-panel-sources"><div className="sw-section-heading"><span className="sw-section-icon"><StudioIcon name="search" size={18} /></span><h3>조사 자료</h3><span className="sw-count">{run.sources.length}</span></div><p className="sw-muted">검색 요약과 읽은 원문을 구분합니다.</p>
              {run.sources.map(source => <details key={source.id} className="sw-source"><summary><span className={"sw-source-kind " + (source.kind === "snippet" ? "sw-snippet" : "")}>{source.kind === "snippet" ? "검색 요약" : source.kind === "document" ? "첨부 문서" : source.kind === "tmdb" ? "작품 정보" : "읽은 원문"}</span><span>{source.title}</span></summary><p className="sw-muted">{source.note}</p><div className="sw-source-images">{sourceImages([source]).map(i => <a key={i.id} href={i.url} target="_blank" rel="noopener noreferrer"><img src={i.url} alt={i.alt} loading="lazy" /><span>{i.kind === "poster" ? "포스터" : "스틸컷"}</span></a>)}</div><p className="sw-source-excerpt">{source.text.slice(0, 1600)}{source.text.length > 1600 ? "…" : ""}</p>{source.url && <a href={source.url} target="_blank" rel="noopener noreferrer">출처 열기 ↗</a>}<p className="sw-muted">{source.publishedAt ? "자료 시점: " + source.publishedAt + " · " : ""}확인: {new Date(source.retrievedAt).toLocaleString("ko-KR")}</p></details>)}
              {!run.sources.length && <div className="sw-empty-state"><StudioIcon name="file" size={28} /><strong>자료가 쌓일 자리예요</strong><p>확보한 자료를 출처와 함께<br />하나씩 확인할 수 있어요.</p></div>}
            </section>
            <details className="sw-card sw-history-card"><summary><StudioIcon name="clock" size={16} />진행 기록·연결 상태</summary><ol className="sw-log">{run.log.map((entry, i) => <li key={i}>{entry.message}</li>)}</ol>{run.notices.map((s, i) => <p className="sw-muted" key={i}>{s}</p>)}<p className="sw-muted">{run.storage === "local" ? "로컬 개발 저장소" : "서버 저장소"} · 사용 토큰 {run.tokens.toLocaleString()}</p><p className="sw-muted">문체 기준 {run.personaVersion}</p></details>
          </aside>
        </div>
      </div>}
    </div>
    {run && <nav className="sw-mobile-tabs" aria-label="작성실 패널">{([{ value: "work", title: "작업", icon: "spark" }, { value: "strategy", title: "전략", icon: "plan" }, { value: "sources", title: "자료", icon: "file" }] as const).map(item => <button type="button" key={item.value} aria-pressed={mobileTab === item.value} aria-controls={"sw-panel-" + item.value} className={mobileTab === item.value ? "is-selected" : ""} onClick={() => setMobileTab(item.value)}><span><StudioIcon name={item.icon} size={20} />{item.value === "work" && run.stage === "awaiting_input" && <i />}</span>{item.title}{item.value === "sources" && <small>{run.sources.length}</small>}</button>)}</nav>}
  </div>;
}

function Questions({ run, busy, onSubmit }: { run: RunView; busy: boolean; onSubmit: (answers: Record<string, string>) => void }) {
  const pending = run.questions.filter(q => q.answer === undefined);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const questionHeading = useRef<HTMLLegendElement>(null);
  useEffect(() => { if (index > 0) questionHeading.current?.focus({ preventScroll: true }); }, [index]);
  const update = (id: string, text: string) => setAnswers(prev => ({ ...prev, [id]: text }));
  return <form className="sw-card sw-questions" onSubmit={e => { e.preventDefault(); if (!answers[pending[index]?.id]?.trim()) return; if (index < pending.length - 1) setIndex(index + 1); else onSubmit(answers); }}>
    <div className="sw-question-caption"><span>QUESTION {String(index + 1).padStart(2, "0")} / {String(pending.length).padStart(2, "0")}</span><span className="sw-question-dots" aria-hidden="true">{pending.map((q, i) => <i key={q.id} className={i <= index ? "is-current" : ""} />)}</span></div><h3>작성에 필요한 부분만 확인할게요</h3>
    {pending.slice(index, index + 1).map(q => <fieldset key={q.id} className="sw-enter"><legend ref={questionHeading} tabIndex={-1}>{q.text}</legend>{q.kind === "movie" ? <div className="sw-movies">{q.candidates?.map(c => <label key={`${c.mediaType}:${c.id}`} className={answers[q.id] === `${c.mediaType}:${c.id}` ? "sw-movie sw-movie-selected" : "sw-movie"}><input type="radio" name={q.id} value={`${c.mediaType}:${c.id}`} checked={answers[q.id] === `${c.mediaType}:${c.id}`} onChange={e => update(q.id, e.target.value)} disabled={busy} />{c.posterUrl && <img src={c.posterUrl} alt="" />}<span>{c.title}<small>{c.year} · {c.mediaType === "tv" ? "시리즈" : "영화"}</small></span></label>)}<label className="sw-movie"><input type="radio" name={q.id} checked={answers[q.id] === "none"} onChange={() => update(q.id, "none")} disabled={busy} />해당 작품이 없어요</label></div> : <><div className="sw-answer-options">{[...q.options, "모르겠어요 / 경험이 없어요"].map((o, i) => <button type="button" key={i} className="sw-secondary" aria-pressed={answers[q.id] === o} disabled={busy} onClick={() => update(q.id, o)}>{o}</button>)}</div><textarea aria-label={q.text} value={answers[q.id] || ""} maxLength={6000} rows={3} onChange={e => update(q.id, e.target.value)} placeholder="내 경험이나 생각을 적어주세요." disabled={busy} /></>}</fieldset>)}
    <div className="sw-question-footer">{index > 0 ? <button type="button" className="sw-text-button" disabled={busy} onClick={() => setIndex(index - 1)}><StudioIcon name="back" size={15} />이전 질문</button> : <span className="sw-muted">내 이야기를 더하는 시간</span>}<button className="sw-primary" disabled={busy || !answers[pending[index]?.id]?.trim()}>{busy ? "답변 반영 중…" : index < pending.length - 1 ? "다음 질문" : "답변 반영하고 이어서 작성"}<StudioIcon name="arrow" size={16} /></button></div>
  </form>;
}
function StrategyEditor({ strategy, busy, onSave, onCancel }: { strategy: Strategy; busy: boolean; onSave: (strategy: Strategy) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(strategy);
  return <form className="sw-strategy-editor" onSubmit={e => { e.preventDefault(); onSave(draft); }}><label>독자<input required maxLength={300} value={draft.audience} onChange={e => setDraft({ ...draft, audience: e.target.value })} /></label><label>글의 관점<textarea required maxLength={1000} rows={4} value={draft.angle} onChange={e => setDraft({ ...draft, angle: e.target.value })} /></label><label>목차 · 한 줄에 하나<textarea required rows={5} value={draft.outline.join("\n")} onChange={e => setDraft({ ...draft, outline: e.target.value.split("\n") })} /></label><label>목표 글자 수<input type="number" min={500} max={8000} value={draft.length} onChange={e => setDraft({ ...draft, length: Number(e.target.value) })} /></label><p className="sw-muted">수정한 방향으로 자료를 다시 확인하고 본문을 새로 작성합니다.</p><div className="sw-toolbar"><button className="sw-primary" disabled={busy}>반영하고 작성</button><button type="button" className="sw-secondary" onClick={onCancel} disabled={busy}>닫기</button></div></form>;
}
