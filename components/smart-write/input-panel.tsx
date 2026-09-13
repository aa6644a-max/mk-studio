"use client";

import { useRef, useState } from "react";
import type { Attachment, Brief } from "@/lib/writing/types";

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
  return <div className="sw-input-wrap">
    <div className="sw-eyebrow">MK STUDIO · AI 맞춤 작성</div>
    <h2>무엇을 쓰고 싶으세요?</h2>
    <p className="sw-subtitle">자료를 찾아 글의 방향을 잡고, MK의 문체로 작성합니다.</p>
    <form className="sw-card sw-composer" onSubmit={e => { e.preventDefault(); if (canStart) onStart({ topic, experience, audience, length, attachments: attachments.map(({ id, kind, name, text }) => ({ id, kind, name, text })) }); }}>
      <label htmlFor="sw-topic">주제와 원하는 이야기</label>
      <textarea id="sw-topic" value={topic} maxLength={5000} onChange={e => setTopic(e.target.value)} placeholder="예) 주말에 혼자 가기 좋은 대구 전시를 정리해줘. 관람 전에 알아둘 정보를 중심으로." rows={4} disabled={busy} />
      <label htmlFor="sw-experience">내 생각·경험 <span className="sw-muted">선택</span></label>
      <textarea id="sw-experience" value={experience} maxLength={16000} onChange={e => setExperience(e.target.value)} placeholder="직접 쓴 감상평, 현장 메모, 내 역할, 꼭 살리고 싶은 표현을 적어주세요. 참여 팀 기록도 여기에 함께 넣을 수 있어요." rows={4} disabled={busy} />
      <div className="sw-toolbar">
        <button type="button" className="sw-secondary" disabled={busy || disabled} onClick={() => fileInput.current?.click()}>＋ PDF·텍스트</button>
        <button type="button" className="sw-secondary" disabled={busy} onClick={() => photoInput.current?.click()}>＋ 사진 메모</button>
        <button type="button" className="sw-secondary" disabled={busy} onClick={() => setShowUrl(v => !v)}>＋ 참고 URL</button>
      </div>
      <input ref={fileInput} hidden aria-label="문서 첨부" type="file" accept=".pdf,.txt,.md" multiple onChange={e => { void addDocuments(Array.from(e.target.files || [])); e.target.value = ""; }} />
      <input ref={photoInput} hidden aria-label="사진 첨부" type="file" accept="image/*" multiple onChange={e => { addPhotos(Array.from(e.target.files || [])); e.target.value = ""; }} />
      {showUrl && <div className="sw-toolbar"><input aria-label="참고 웹 주소" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" type="url" /><button type="button" className="sw-secondary" onClick={addUrl}>추가</button></div>}
      {attachments.length > 0 && <div className="sw-attachments">{attachments.map(a => <div className="sw-attachment" key={a.id}>
        <div className="sw-toolbar"><span className="sw-file-name">{a.kind === "photo" ? "📷" : a.kind === "url" ? "↗" : "▤"} {a.name}</span><button type="button" className="sw-text-button" aria-label={`${a.name} 삭제`} disabled={busy} onClick={() => setAttachments(prev => prev.filter(x => x.id !== a.id))}>삭제</button></div>
        {a.loading ? <p className="sw-muted">문서 읽는 중…</p> : a.error ? <p className="sw-error">{a.error} 삭제 후 다시 첨부해주세요.</p> : a.kind === "photo" ? <input aria-label={`${a.name} 사진 메모`} value={a.text} maxLength={4000} onChange={e => setAttachments(prev => prev.map(x => x.id === a.id ? { ...x, text: e.target.value } : x))} placeholder="무엇이 찍혔는지, 그때 느낀 점을 적어주세요." disabled={busy} /> : <p className="sw-muted">{a.kind === "url" ? a.text : `${a.text.length.toLocaleString()}자 · 문서별 출처로 보관`}</p>}
      </div>)}</div>}
      {attachments.some(a => a.kind === "photo") && <p className="sw-muted">사진은 파일명·메모를 바탕으로 본문에 위치를 표시합니다. 완성 후 해당 위치에 직접 삽입해주세요.</p>}
      <details className="sw-options"><summary>독자·분량 설정</summary><div className="sw-settings">
        <label>이 글을 읽을 사람<input value={audience} maxLength={300} onChange={e => setAudience(e.target.value)} placeholder="자동 판단" disabled={busy} /></label>
        <label>원하는 분량<select value={length} onChange={e => setLength(e.target.value as Brief["length"])} disabled={busy}><option value="auto">자료에 맞게</option><option value="short">짧게 · 약 1,000자</option><option value="standard">보통 · 약 2,200자</option><option value="long">자세히 · 약 4,000자</option></select></label>
      </div></details>
      {error && <p className="sw-error" role="alert">{error}</p>}
      <div className="sw-composer-footer"><span className="sw-muted">MK 문체 적용 · 필요한 경험만 질문</span><button type="submit" className="sw-primary" disabled={!canStart}>{busy ? "작업 저장 중…" : "자료 찾아 작성하기 →"}</button></div>
    </form>
    <div className="sw-examples">{["내 감상평을 살린 영화 리뷰", "자료를 바탕으로 한 지역 소식", "처음 접하는 개념을 쉽게 설명"].map(t => <button type="button" key={t} disabled={busy} onClick={() => setTopic(t)}>{t}</button>)}</div>
  </div>;
}
