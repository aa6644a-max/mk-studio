"use client";

import { useState, useRef, useEffect } from "react";
import { useWorkflowStore } from "@/lib/workflow-store";
import type { PostType } from "@/lib/types";

const TYPE_CHIPS: { type: PostType; label: string; icon: string; placeholder: string }[] = [
  { type: "review",   label: "리뷰",    icon: "🎥",  placeholder: "예) 어벤져스 인피니티 워 리뷰 써줘" },
  { type: "preview",  label: "프리뷰",  icon: "📽️", placeholder: "예) 범죄도시5 개봉 전 기대작 소개" },
  { type: "curation", label: "큐레이션",icon: "🎬",  placeholder: "예) 크리스토퍼 놀란 영화 큐레이션" },
  { type: "binge",    label: "정주행",  icon: "📺",  placeholder: "예) 나혼자만 레벨업 정주행 추천" },
  { type: "photo",    label: "사진",    icon: "📸",  placeholder: "예) 봉평 메밀꽃밭 방문기" },
  { type: "local",    label: "로컬",    icon: "📢",  placeholder: "예) 대구 청년 지원사업 공고" },
  { type: "pdf",      label: "PDF",     icon: "📄",  placeholder: "예) PDF 문서 요약 포스팅" },
  { type: "essay",    label: "에세이",  icon: "✍️",  placeholder: "예) 그림자 아이 GV 다녀온 이야기, 관객과의 대화 정리" },
];

const FILE_TYPES: PostType[] = ["local", "pdf"];
const MOVIE_TYPES: PostType[] = ["review", "preview", "curation", "binge"];

const PHOTO_CATEGORIES: { value: string; label: string; icon: string }[] = [
  { value: "맛집카페", label: "맛집·카페", icon: "🍽️" },
  { value: "일상기록", label: "일상", icon: "📔" },
  { value: "여행나들이", label: "여행·나들이", icon: "🧳" },
  { value: "전시문화", label: "전시·문화", icon: "🎭" },
  { value: "제품리뷰", label: "제품·리뷰", icon: "📦" },
];

export default function TopicInput() {
  const [selectedType, setSelectedTypeLocal] = useState<PostType>("review");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // PDF/local — 여러 파일 업로드 지원
  const [pdfDocs, setPdfDocs] = useState<{ id: string; name: string; text: string; extracting: boolean; error: boolean }[]>([]);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const pdfExtracting = pdfDocs.some((d) => d.extracting);

  // Photo
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageCaptions, setImageCaptions] = useState<string[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [photoCategory, setPhotoCategory] = useState("맛집카페");
  const photoInputRef = useRef<HTMLInputElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    fileContent,
    setTopic, setStrategy, setStage, setError,
    setSelectedType, setPostType, setFileContent, setImageData, setPdfMode,
  } = useWorkflowStore();

  // PDF 작성 방식 (pdf 타입 전용) — 서사형 줄글 / 정보형 표·박스
  const [pdfModeLocal, setPdfModeLocal] = useState<"narrative" | "info">("narrative");

  const isFileType = FILE_TYPES.includes(selectedType);
  const isPhotoType = selectedType === "photo";
  const chipInfo = TYPE_CHIPS.find((c) => c.type === selectedType)!;

  function handleTypeSelect(type: PostType) {
    setSelectedTypeLocal(type);
    setSelectedType(type);
    setPdfDocs([]);
    setFileContent("");
    setImageFiles([]);
    setImageCaptions([]);
    setImagePreviewUrls([]);
    setImageData([], [], []);
    setInput("");
  }

  // 추출 완료된 PDF 텍스트를 파일명 헤더로 구분해 하나로 합쳐 store에 반영
  useEffect(() => {
    if (!FILE_TYPES.includes(selectedType)) return;
    const done = pdfDocs.filter((d) => !d.extracting && !d.error && d.text);
    const merged = done
      .map((d) => (done.length > 1 ? `[문서: ${d.name}]\n${d.text}` : d.text))
      .join("\n\n---\n\n");
    setFileContent(merged);
  }, [pdfDocs, selectedType, setFileContent]);

  async function handlePdfSelect(files: File[]) {
    const pdfs = files.filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    if (pdfs.length === 0) return;

    // id로 항목 식별 (동시 업로드 시 인덱스 밀림 방지)
    const added = pdfs.map((f) => ({ id: `${Date.now()}-${Math.random()}`, file: f }));
    setPdfDocs((prev) => [
      ...prev,
      ...added.map(({ id, file }) => ({ id, name: file.name, text: "", extracting: true, error: false })),
    ]);

    await Promise.all(
      added.map(async ({ id, file }) => {
        try {
          const form = new FormData();
          form.append("file", file);
          const res = await fetch("/api/extract-pdf", { method: "POST", body: form });
          if (!res.ok) throw new Error("PDF 추출 실패");
          const { text } = await res.json();
          setPdfDocs((prev) => prev.map((d) => (d.id === id ? { ...d, text, extracting: false } : d)));
        } catch (e) {
          setError((e as Error).message);
          setPdfDocs((prev) => prev.map((d) => (d.id === id ? { ...d, extracting: false, error: true } : d)));
        }
      }),
    );
  }

  function removePdf(id: string) {
    setPdfDocs((prev) => prev.filter((d) => d.id !== id));
  }

  function handlePhotoSelect(files: File[]) {
    const combined = [...imageFiles, ...files].slice(0, 10);
    const combinedCaptions = [...imageCaptions, ...files.map(() => "")].slice(0, 10);
    const combinedUrls = [
      ...imagePreviewUrls,
      ...files.map((f) => URL.createObjectURL(f)),
    ].slice(0, 10);
    setImageFiles(combined);
    setImageCaptions(combinedCaptions);
    setImagePreviewUrls(combinedUrls);
    setImageData(combined.map((f) => f.name), combinedCaptions, combinedUrls);
  }

  function handleCaptionChange(idx: number, caption: string) {
    const updated = [...imageCaptions];
    updated[idx] = caption;
    setImageCaptions(updated);
    setImageData(imageFiles.map((f) => f.name), updated, imagePreviewUrls);
  }

  function removeImage(idx: number) {
    const nf = imageFiles.filter((_, i) => i !== idx);
    const nc = imageCaptions.filter((_, i) => i !== idx);
    const nu = imagePreviewUrls.filter((_, i) => i !== idx);
    setImageFiles(nf);
    setImageCaptions(nc);
    setImagePreviewUrls(nu);
    setImageData(nf.map((f) => f.name), nc, nu);
  }

  function canSubmit(): boolean {
    if (loading) return false;
    if (isFileType) return pdfDocs.some((d) => !d.error) && !pdfExtracting;
    if (isPhotoType) return imageFiles.length > 0;
    return !!input.trim();
  }

  async function handleSubmit() {
    if (!canSubmit()) return;

    // PDF 작성 방식 저장 (생성 단계에서 서사형/정보형 분기)
    if (selectedType === "pdf") setPdfMode(pdfModeLocal);

    // 영화 타입: 전략 수립 전에 TMDB 작품 검색부터 (검색→전략 순서)
    if (MOVIE_TYPES.includes(selectedType)) {
      setTopic(input.trim());
      setPostType(selectedType); // tmdb-search가 postType으로 단일/다중·movie/tv 분기
      setError("");
      setStage("tmdb-search");
      return;
    }

    setLoading(true);
    setError("");

    const storeState = useWorkflowStore.getState();
    const imageInfo = isPhotoType
      ? storeState.imageNames
          .map((name, i) =>
            `파일명: ${name}${storeState.imageCaptions[i] ? ` — 캡션: ${storeState.imageCaptions[i]}` : ""}`,
          )
          .join("\n")
      : "";

    try {
      const res = await fetch("/api/workflow/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: isPhotoType ? input.trim() || undefined : !isFileType ? input.trim() : undefined,
          selectedType,
          pdfText: isFileType ? storeState.fileContent : undefined,
          imageInfo: isPhotoType ? imageInfo : undefined,
          photoCategory: isPhotoType ? photoCategory : undefined,
        }),
      });
      if (!res.ok) throw new Error("전략 분석 실패");
      const strategy = await res.json();
      setTopic(strategy.topic || input.trim());
      setStrategy(strategy);
      setStage("strategy");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "24px",
        gap: "24px",
        overflowY: "auto",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#171719", margin: "0 0 8px" }}>
          무엇을 쓸까요?
        </h1>
        <p style={{ fontSize: "14px", color: "#5a5c63", margin: 0 }}>
          타입을 선택하고 주제를 알려주세요. 전략부터 포스팅까지 함께 만들어요.
        </p>
      </div>

      {/* 타입 칩 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", maxWidth: "600px" }}>
        {TYPE_CHIPS.map((chip) => {
          const active = selectedType === chip.type;
          return (
            <button
              key={chip.type}
              onClick={() => handleTypeSelect(chip.type)}
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                border: active ? "2px solid #0066FF" : "1.5px solid rgba(112,115,124,0.2)",
                background: active ? "#EBF2FF" : "#fff",
                color: active ? "#0066FF" : "#5a5c63",
                fontSize: "13px",
                fontWeight: active ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {chip.icon} {chip.label}
            </button>
          );
        })}
      </div>

      <div style={{ width: "100%", maxWidth: "600px", display: "flex", flexDirection: "column", gap: "12px" }}>

        {/* PDF 작성 방식 토글 (pdf 타입 전용) */}
        {selectedType === "pdf" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "#5a5c63", fontWeight: 600 }}>작성 방식</span>
            <div style={{ display: "flex", gap: "8px" }}>
              {([
                { mode: "narrative" as const, label: "📝 서사형", desc: "줄글 흐름 · 프리뷰·뉴스·해설" },
                { mode: "info" as const, label: "📊 정보형", desc: "표·박스 · 공고·일정·제원" },
              ]).map(({ mode, label, desc }) => {
                const active = pdfModeLocal === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setPdfModeLocal(mode)}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      borderRadius: "12px",
                      border: active ? "2px solid #0066FF" : "1.5px solid rgba(112,115,124,0.2)",
                      background: active ? "#EBF2FF" : "#fff",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "inherit",
                    }}
                  >
                    <div style={{ fontSize: "13px", fontWeight: 700, color: active ? "#0066FF" : "#171719" }}>{label}</div>
                    <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>{desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* PDF / 로컬 업로드 */}
        {isFileType && (
          <>
            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf"
              multiple
              hidden
              onChange={(e) => { if (e.target.files) handlePdfSelect(Array.from(e.target.files)); e.target.value = ""; }}
            />
            <div style={{ background: "#fff", borderRadius: "16px", border: "1.5px solid rgba(112,115,124,0.2)", boxShadow: "0 2px 16px rgba(0,0,0,0.06)", padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {pdfDocs.map((doc) => (
                <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", background: "#f7f7f8", borderRadius: "10px" }}>
                  <span style={{ fontSize: "24px" }}>📄</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#171719", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
                    <div style={{ fontSize: "12px", color: doc.extracting ? "#0066FF" : doc.error ? "#dc2626" : "#16a34a" }}>
                      {doc.extracting ? "텍스트 추출 중…" : doc.error ? "추출 실패 ✕" : "추출 완료 ✓"}
                    </div>
                  </div>
                  <button onClick={() => removePdf(doc.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#aaa", fontSize: "18px", flexShrink: 0 }}>×</button>
                </div>
              ))}
              <div
                onClick={() => pdfInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handlePdfSelect(Array.from(e.dataTransfer.files)); }}
                style={{ border: "2px dashed rgba(112,115,124,0.3)", borderRadius: "12px", padding: pdfDocs.length > 0 ? "12px" : "32px", textAlign: "center", cursor: "pointer", color: "#5a5c63" }}
              >
                {pdfDocs.length === 0 ? (
                  <>
                    <div style={{ fontSize: "32px", marginBottom: "8px" }}>📄</div>
                    <div style={{ fontWeight: 600, marginBottom: "4px", fontSize: "14px" }}>PDF 파일을 드래그하거나 클릭해서 업로드</div>
                    <div style={{ fontSize: "12px", color: "#aaa" }}>공고문, 보도자료, 안내문 등 · 여러 개 업로드 가능 · AI가 주제 자동 추출</div>
                  </>
                ) : (
                  <span style={{ fontSize: "13px" }}>+ PDF 추가 ({pdfDocs.length}개 업로드됨)</span>
                )}
              </div>
            </div>
          </>
        )}

        {/* 사진 — 카테고리 + 주제 (업로드 전 먼저) */}
        {isPhotoType && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "12px", color: "#5a5c63", fontWeight: 600 }}>① 어떤 종류의 포스팅인가요?</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {PHOTO_CATEGORIES.map((cat) => {
                  const active = photoCategory === cat.value;
                  return (
                    <button
                      key={cat.value}
                      onClick={() => setPhotoCategory(cat.value)}
                      style={{
                        padding: "7px 13px",
                        borderRadius: "18px",
                        border: active ? "2px solid #0066FF" : "1.5px solid rgba(112,115,124,0.2)",
                        background: active ? "#EBF2FF" : "#fff",
                        color: active ? "#0066FF" : "#5a5c63",
                        fontSize: "13px",
                        fontWeight: active ? 700 : 500,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {cat.icon} {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "12px", color: "#5a5c63", fontWeight: 600 }}>② 무엇에 대한 포스팅인가요? <span style={{ color: "#aaa", fontWeight: 400 }}>(선택)</span></span>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={chipInfo.placeholder}
                style={{ width: "100%", border: "1.5px solid rgba(112,115,124,0.2)", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", outline: "none", fontFamily: "inherit", color: "#171719", background: "#fff", boxSizing: "border-box" }}
              />
            </div>
          </div>
        )}

        {/* 사진 업로드 */}
        {isPhotoType && (
          <>
            <span style={{ fontSize: "12px", color: "#5a5c63", fontWeight: 600 }}>③ 사진을 업로드하세요</span>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => { if (e.target.files) handlePhotoSelect(Array.from(e.target.files)); e.target.value = ""; }}
            />
            <div style={{ background: "#fff", borderRadius: "16px", border: "1.5px solid rgba(112,115,124,0.2)", boxShadow: "0 2px 16px rgba(0,0,0,0.06)", padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {imageFiles.map((file, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px", background: "#f7f7f8", borderRadius: "10px" }}>
                  <img src={imagePreviewUrls[idx]} alt="" style={{ width: "48px", height: "48px", objectFit: "cover", borderRadius: "6px", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12px", color: "#aaa", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
                    <input
                      type="text"
                      placeholder="사진 설명 (예: 카페 입구 외관)"
                      value={imageCaptions[idx] ?? ""}
                      onChange={(e) => handleCaptionChange(idx, e.target.value)}
                      style={{ width: "100%", border: "1px solid rgba(112,115,124,0.2)", borderRadius: "6px", padding: "4px 8px", fontSize: "13px", outline: "none", fontFamily: "inherit", color: "#171719", boxSizing: "border-box" }}
                    />
                  </div>
                  <button onClick={() => removeImage(idx)} style={{ border: "none", background: "none", cursor: "pointer", color: "#aaa", fontSize: "18px", flexShrink: 0 }}>×</button>
                </div>
              ))}
              <div
                onClick={() => photoInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handlePhotoSelect(Array.from(e.dataTransfer.files)); }}
                style={{ border: "2px dashed rgba(112,115,124,0.3)", borderRadius: "12px", padding: imageFiles.length > 0 ? "12px" : "32px", textAlign: "center", cursor: "pointer", color: "#5a5c63" }}
              >
                {imageFiles.length === 0 ? (
                  <>
                    <div style={{ fontSize: "32px", marginBottom: "8px" }}>📸</div>
                    <div style={{ fontWeight: 600, marginBottom: "4px", fontSize: "14px" }}>사진을 드래그하거나 클릭해서 업로드</div>
                    <div style={{ fontSize: "12px", color: "#aaa" }}>최대 10장 · 각 사진마다 캡션 입력</div>
                  </>
                ) : (
                  <span style={{ fontSize: "13px" }}>+ 사진 추가 ({imageFiles.length}/10)</span>
                )}
              </div>
            </div>
          </>
        )}

        {/* 에세이 — 참고자료 붙여넣기 (선택) */}
        {selectedType === "essay" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "#5a5c63", fontWeight: 600 }}>
              참고자료 <span style={{ color: "#aaa", fontWeight: 400 }}>(선택 — 대화록·GV 정리본·강연 스크립트 등)</span>
            </span>
            <textarea
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              placeholder="원문 그대로 붙여넣으면 구조·순서를 최대한 보존해서 반영해요. (예: GV 질문·답변 정리본)"
              rows={5}
              style={{ width: "100%", border: "1.5px solid rgba(112,115,124,0.2)", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", outline: "none", fontFamily: "inherit", color: "#171719", background: "#fff", boxSizing: "border-box", resize: "vertical" }}
            />
            {fileContent && (
              <p style={{ fontSize: "11px", color: "#aaa", margin: 0 }}>{fileContent.length.toLocaleString()}자 입력됨</p>
            )}
          </div>
        )}

        {/* 텍스트 입력 (photo/pdf/local 외 타입) */}
        {!isFileType && !isPhotoType && (
          <div style={{ background: "#fff", borderRadius: "16px", border: "1.5px solid rgba(112,115,124,0.2)", boxShadow: "0 2px 16px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={chipInfo.placeholder}
              disabled={loading}
              rows={3}
              style={{ width: "100%", padding: "16px 20px 8px", fontSize: "15px", border: "none", outline: "none", resize: "none", fontFamily: "inherit", color: "#171719", background: "transparent" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 12px 12px" }}>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit()}
                style={{ padding: "8px 20px", borderRadius: "8px", background: canSubmit() ? "#0066FF" : "#e8e9eb", color: canSubmit() ? "#fff" : "#aaa", border: "none", fontSize: "14px", fontWeight: 600, cursor: canSubmit() ? "pointer" : "default", display: "flex", alignItems: "center", gap: "6px", transition: "background 0.15s" }}
              >
                {loading ? <><Spinner /> 전략 분석 중…</> : "전략 수립 →"}
              </button>
            </div>
          </div>
        )}

        {/* PDF/사진 제출 버튼 */}
        {(isFileType || isPhotoType) && (
          <button
            onClick={handleSubmit}
            disabled={!canSubmit()}
            style={{ padding: "12px 24px", borderRadius: "12px", background: canSubmit() ? "#0066FF" : "#e8e9eb", color: canSubmit() ? "#fff" : "#aaa", border: "none", fontSize: "15px", fontWeight: 600, cursor: canSubmit() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", transition: "background 0.15s" }}
          >
            {loading ? <><Spinner /> 전략 분석 중…</> : "전략 수립 →"}
          </button>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Spinner() {
  return (
    <span style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
  );
}
