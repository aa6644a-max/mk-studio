"use client";

import { useEffect, useRef, useState } from "react";
import type { Attachment, Brief } from "@/lib/writing/types";
import StudioIcon from "./studio-icon";
import { StudioVisual } from "./studio-flow";

type InputFile = Attachment & { loading?: boolean; error?: string };
export default function InputPanel({ disabled, busy, onStart }: { disabled: boolean; busy: boolean; onStart: (brief: Brief) => void }) {
  const [topic, setTopic] = useState("");
  const [experience, setExperience] = useState("");
  const [audience, setAudience] = useState("");
  const [length, setLength] = useState<Brief["length"]>("auto");
  const [attachments, setAttachments] = useState<InputFile[]>([]);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [showUrl, setShowUrl] = useState(false);
  const [step, setStep] = useState(0);
  const [dragging, setDragging] = useState(false);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => { if (firstRender.current) { firstRender.current = false; return; } stepHeading.current?.focus({ preventScroll: true }); }, [step]);
  const fileInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  async function addDocuments(files: File[]) {
    if (attachments.length + files.length > 20) { setError("자료는 최대 20개까지 첨부해주세요."); return; }
    const entries = files.map(file => ({ file, id: crypto.randomUUID() }));
    setAttachments(prev => [...prev, ...entries.map(({ file, id }) => ({ id, kind: "document" as const, name: file.name, text: "", loading: true }))]);
    // Sequential extraction keeps several large PDFs from exhausting browser/server memory.
    for (const { file, id } of entries) {
      try {
        if (file.size > 10 * 1024 * 1024) throw new Error("10MB 이하 문서를 첨부해주세요.");
        const form = new FormData(); form.append("file", file);
        const res = await fetch("/api/smart-write/materials", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "문서 내용을 읽지 못했습니다.");
        setAttachments(prev => prev.map(a => a.id === id ? { ...a, text: data.text, loading: false } : a));
      } catch (e) { setAttachments(prev => prev.map(a => a.id === id ? { ...a, loading: false, error: (e as Error).message } : a)); }
    }
  }
  function addPhotos(files: File[]) {
    if (attachments.length + files.length > 20) { setError("자료는 최대 20개까지 첨부해주세요."); return; }
    setAttachments(prev => [...prev, ...files.map(f => ({ id: crypto.randomUUID(), kind: "photo" as const, name: f.name, text: "" }))]);
  }
  function addUrl() {
    try {
      const u = new URL(url);
      if (!["http:", "https:"].includes(u.protocol) || u.username || u.password) throw new Error();
      if (attachments.length >= 20 || attachments.filter(a => a.kind === "url").length >= 6) { setError("웹 주소는 최대 6개, 전체 자료는 최대 20개까지 첨부해주세요."); return; }
      setAttachments(prev => [...prev, { id: crypto.randomUUID(), kind: "url", name: u.hostname, text: u.href }]);
      setUrl(""); setShowUrl(false); setError("");
    } catch { setError("올바른 http 또는 https 주소를 입력해주세요."); }
  }
  const invalid = attachments.some(a => a.loading || a.error);
  const canStart = !disabled && !busy && !invalid && !!(topic.trim() || experience.trim() || attachments.length);
  const stepTitles = ["어떤 이야기를 써볼까요?", "이야기에 재료를 더해요", "이제, 내 글을 만들어볼까요?"];
  return <div className="sw-input-wrap">
    <div className="sw-intro"><div><div className="sw-eyebrow"><span /> YOUR PERSONAL WRITING STUDIO</div><h2>생각은 자유롭게.<br /> 글은 <em>나답게.</em></h2><p>작은 메모에서 하나의 포스팅까지.<br /> 당신의 시선에 자료를 더하고, MK의 문체로 완성해요.</p></div><div className="sw-intro-signature"><StudioIcon name="shield" size={17} /> MK 페르소나 적용</div></div>
    <div className="sw-creation-layout">
      <aside className="sw-creation-aside"><div className="sw-aside-label">FROM IDEA TO STORY <span>↗</span></div><StudioVisual mode="input" /><div className="sw-aside-copy"><span className="sw-tag">나만의 글쓰기 파트너</span><h3>자료는 탄탄하게,<br />목소리는 그대로.</h3><p>조사부터 문체 검수까지 함께해요.<br />당신의 경험과 생각이 글의 중심입니다.</p></div><div className="sw-aside-footer"><span><StudioIcon name="search" size={15} /> 자료 조사</span><span><StudioIcon name="pen" size={15} /> 맞춤 작성</span><span><StudioIcon name="check" size={15} /> 문체 검수</span></div></aside>
    <form className="sw-card sw-composer" onSubmit={e => { e.preventDefault(); if (step < 2) { setStep(step + 1); return; } if (canStart) onStart({ topic, experience, audience, length, attachments: attachments.map(({ id, kind, name, text }) => ({ id, kind, name, text })) }); }}>
      <nav className="sw-input-steps" aria-label="작성 준비 단계">{["이야기", "자료 추가", "작성 설정"].map((title, i) => <button type="button" key={title} aria-current={step === i ? "step" : undefined} disabled={busy} className={step === i ? "is-current" : i < step ? "is-complete" : ""} onClick={() => setStep(i)}><span>{i < step ? <StudioIcon name="check" size={13} /> : `0${i + 1}`}</span>{title}</button>)}</nav>
      <div className="sw-composer-body sw-enter" key={step}>
      <div className="sw-step-heading"><span>STEP 0{step + 1} <span>/ 03</span></span><h3 ref={stepHeading} tabIndex={-1}>{stepTitles[step]}</h3><p>{step === 0 ? "완벽한 문장이 아니어도 괜찮아요. 떠오르는 생각부터 적어주세요." : step === 1 ? "참고할 자료가 있다면 함께 넣어주세요. 없어도 필요한 자료를 찾아드려요." : "독자와 분량을 정하면 나머지는 작성실에서 이어갑니다."}</p></div>
      {step === 0 && <div className="sw-fields">
      <label htmlFor="sw-topic">주제와 원하는 이야기</label>
      <textarea id="sw-topic" value={topic} maxLength={5000} onChange={e => setTopic(e.target.value)} placeholder="예) 주말에 혼자 가기 좋은 대구 전시를 정리해줘. 관람 전에 알아둘 정보를 중심으로." rows={4} disabled={busy} />
      <div className="sw-topic-count">{topic.length.toLocaleString()} / 5,000</div>
      <label htmlFor="sw-experience">내 생각·경험 <span className="sw-optional">선택</span></label>
      <textarea id="sw-experience" value={experience} maxLength={16000} onChange={e => setExperience(e.target.value)} placeholder="직접 쓴 감상평, 현장 메모, 내 역할, 꼭 살리고 싶은 표현을 적어주세요. 참여 팀 기록도 여기에 함께 넣을 수 있어요." rows={4} disabled={busy} />
      <div className="sw-prompt-ideas"><span>이런 이야기로 시작해도 좋아요</span><div className="sw-examples">{["내 감상평을 살린 영화 리뷰", "자료를 바탕으로 한 지역 소식", "처음 접하는 개념을 쉽게 설명"].map(t => <button type="button" key={t} disabled={busy} onClick={() => setTopic(t)}><StudioIcon name="plus" size={13} />{t}</button>)}</div></div>
      </div>}
      {step === 1 && <div className="sw-fields">
      <button type="button" className={`sw-dropzone ${dragging ? "is-dragging" : ""}`} disabled={busy || disabled} onClick={() => fileInput.current?.click()} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); if (!busy && !disabled) void addDocuments(Array.from(e.dataTransfer.files)); }}><span className="sw-upload-icon"><StudioIcon name="upload" size={24} /></span><strong>문서를 놓거나 눌러서 첨부하세요</strong><span>PDF · TXT · MD / 파일당 최대 10MB</span></button>
      <div className="sw-attachment-actions"><button type="button" disabled={busy} onClick={() => photoInput.current?.click()}><span><StudioIcon name="photo" /></span><div><strong>사진 메모</strong><small>사진에 담긴 내 이야기</small></div><StudioIcon name="plus" size={17} /></button><button type="button" disabled={busy} aria-expanded={showUrl} onClick={() => setShowUrl(v => !v)}><span><StudioIcon name="link" /></span><div><strong>참고 URL</strong><small>함께 읽을 웹 페이지</small></div><StudioIcon name="plus" size={17} /></button></div>
      <input ref={fileInput} hidden aria-label="문서 첨부" type="file" accept=".pdf,.txt,.md" multiple onChange={e => { void addDocuments(Array.from(e.target.files || [])); e.target.value = ""; }} />
      <input ref={photoInput} hidden aria-label="사진 첨부" type="file" accept="image/*" multiple onChange={e => { addPhotos(Array.from(e.target.files || [])); e.target.value = ""; }} />
      {showUrl && <div className="sw-toolbar sw-enter"><input aria-label="참고 웹 주소" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" type="url" disabled={busy} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }} /><button type="button" className="sw-secondary" disabled={busy} onClick={addUrl}>추가</button></div>}
      {attachments.length > 0 && <div className="sw-attachments">{attachments.map(a => <div className="sw-attachment" key={a.id}>
        <div className="sw-toolbar"><span className="sw-file-icon"><StudioIcon name={a.kind === "photo" ? "photo" : a.kind === "url" ? "link" : "file"} size={18} /></span><span className="sw-file-name">{a.name}</span><button type="button" className="sw-icon-button" aria-label={`${a.name} 삭제`} disabled={busy} onClick={() => setAttachments(prev => prev.filter(x => x.id !== a.id))}><StudioIcon name="close" size={16} /></button></div>
        {a.loading ? <p className="sw-muted">문서 읽는 중…</p> : a.error ? <p className="sw-error">{a.error} 삭제 후 다시 첨부해주세요.</p> : a.kind === "photo" ? <input aria-label={`${a.name} 사진 메모`} value={a.text} maxLength={4000} onChange={e => setAttachments(prev => prev.map(x => x.id === a.id ? { ...x, text: e.target.value } : x))} placeholder="무엇이 찍혔는지, 그때 느낀 점을 적어주세요." disabled={busy} /> : <p className="sw-muted">{a.kind === "url" ? a.text : `${a.text.length.toLocaleString()}자 · 문서별 출처로 보관`}</p>}
      </div>)}</div>}
      {attachments.some(a => a.kind === "photo") && <p className="sw-muted">사진은 파일명·메모를 바탕으로 본문에 위치를 표시합니다. 완성 후 해당 위치에 직접 삽입해주세요.</p>}
      {!attachments.length && <div className="sw-inline-note"><StudioIcon name="search" size={17} /><span>자료가 없어도 괜찮아요. 주제에 맞춰 웹 자료를 찾아요.</span></div>}
      </div>}
      {step === 2 && <div className="sw-fields">
        <label htmlFor="sw-audience">이 글을 읽을 사람 <span className="sw-optional">선택</span></label><input id="sw-audience" value={audience} maxLength={300} onChange={e => setAudience(e.target.value)} placeholder="비워두면 주제에 맞게 정해요" disabled={busy} />
        <span className="sw-field-label" id="sw-length-label">원하는 분량</span><div className="sw-length-options" role="group" aria-labelledby="sw-length-label">{([{ value: "auto", title: "알아서 맞춤", detail: "자료에 맞게", lines: 0 }, { value: "short", title: "가볍게", detail: "약 1,000자", lines: 2 }, { value: "standard", title: "차근차근", detail: "약 2,200자", lines: 3 }, { value: "long", title: "깊이 있게", detail: "약 4,000자", lines: 4 }] as const).map(o => <button key={o.value} type="button" aria-pressed={length === o.value} disabled={busy} onClick={() => setLength(o.value)} className={length === o.value ? "is-selected" : ""}><span className="sw-length-symbol">{o.lines ? Array.from({ length: o.lines }, (_, i) => <i key={i} />) : <StudioIcon name="spark" size={20} />}</span><strong>{o.title}</strong><small>{o.detail}</small>{length === o.value && <StudioIcon name="check" size={13} className="sw-option-check" />}</button>)}</div>
        <div className="sw-brief-preview"><div className="sw-toolbar"><span className="sw-mini-icon"><StudioIcon name="pen" size={16} /></span><strong>이번에 만들 이야기</strong><button type="button" className="sw-text-button" onClick={() => setStep(0)}>수정</button></div><p>{topic || (experience ? "내 경험을 바탕으로 한 이야기" : attachments.length ? "첨부 자료를 바탕으로 한 이야기" : "주제나 자료를 하나 이상 추가해주세요.")}</p><div className="sw-brief-tags"><span><StudioIcon name="file" size={13} /> 자료 {attachments.length}개</span><span><StudioIcon name="pen" size={13} /> {experience.trim() ? "내 경험 포함" : "경험 입력 없음"}</span><span><StudioIcon name="shield" size={13} /> MK 문체</span></div></div>
        <div className="sw-inline-note"><StudioIcon name="spark" size={17} /><span>조사 → 전략 → 작성 → 검수로 이어져요.<br />당신에게 필요한 질문이 있을 때만 잠시 멈춥니다.</span></div>
        {invalid && <div className="sw-inline-note" role="status"><span>{attachments.some(a => a.error) ? "읽지 못한 첨부 자료가 있어요. 확인 후 다시 시작해주세요." : "문서를 읽고 있어요. 완료되면 작성을 시작할 수 있어요."}</span><button type="button" className="sw-text-button" onClick={() => setStep(1)}>자료 확인</button></div>}
      </div>}
      {error && <p className="sw-error" role="alert">{error}</p>}
      </div>
      <div className="sw-composer-footer">{step > 0 ? <button type="button" className="sw-text-button" disabled={busy} onClick={() => setStep(step - 1)}><StudioIcon name="back" size={16} /> 이전</button> : <span className="sw-footer-hint"><StudioIcon name="shield" size={15} /> 내 생각과 표현을 그대로</span>}<button type="submit" className="sw-primary" disabled={step === 2 ? !canStart : busy}>{busy ? "작업 저장 중…" : step === 0 ? "다음, 자료 추가" : step === 1 ? "다음, 작성 설정" : "자료 찾아 작성하기"}<StudioIcon name={step === 2 ? "spark" : "arrow"} size={17} /></button></div>
    </form>
    </div><p className="sw-bottom-caption">YOUR WORDS. YOUR PERSPECTIVE. <span>ALWAYS MK.</span></p>
  </div>;
}
