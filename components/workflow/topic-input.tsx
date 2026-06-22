"use client";

import { useState, useRef } from "react";
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
];

const FILE_TYPES: PostType[] = ["local", "pdf"];
const MOVIE_TYPES: PostType[] = ["review", "preview", "curation", "binge"];

export default function TopicInput() {
  const [selectedType, setSelectedTypeLocal] = useState<PostType>("review");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // PDF/local
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfExtracting, setPdfExtracting] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Photo
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageCaptions, setImageCaptions] = useState<string[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    setTopic, setStrategy, setStage, setError,
    setSelectedType, setPostType, setFileContent, setImageData,
  } = useWorkflowStore();

  const isFileType = FILE_TYPES.includes(selectedType);
  const isPhotoType = selectedType === "photo";
  const chipInfo = TYPE_CHIPS.find((c) => c.type === selectedType)!;

  function handleTypeSelect(type: PostType) {
    setSelectedTypeLocal(type);
    setSelectedType(type);
    setPdfFile(null);
    setFileContent("");
    setImageFiles([]);
    setImageCaptions([]);
    setImagePreviewUrls([]);
    setImageData([], [], []);
    setInput("");
  }

  async function handlePdfSelect(file: File) {
    setPdfFile(file);
    setPdfExtracting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/extract-pdf", { method: "POST", body: form });
      if (!res.ok) throw new Error("PDF 추출 실패");
      const { text } = await res.json();
      setFileContent(text);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPdfExtracting(false);
    }
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
    if (isFileType) return !!pdfFile && !pdfExtracting;
    if (isPhotoType) return imageFiles.length > 0;
    return !!input.trim();
  }

  async function handleSubmit() {
    if (!canSubmit()) return;

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
          topic: !isFileType && !isPhotoType ? input.trim() : undefined,
          selectedType,
          pdfText: isFileType ? storeState.fileContent : undefined,
          imageInfo: isPhotoType ? imageInfo : undefined,
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

        {/* PDF / 로컬 업로드 */}
        {isFileType && (
          <>
            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf"
              hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdfSelect(f); }}
            />
            <div style={{ background: "#fff", borderRadius: "16px", border: "1.5px solid rgba(112,115,124,0.2)", boxShadow: "0 2px 16px rgba(0,0,0,0.06)", padding: "20px" }}>
              {!pdfFile ? (
                <div
                  onClick={() => pdfInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handlePdfSelect(f); }}
                  style={{ border: "2px dashed rgba(112,115,124,0.3)", borderRadius: "12px", padding: "32px", textAlign: "center", cursor: "pointer", color: "#5a5c63" }}
                >
                  <div style={{ fontSize: "32px", marginBottom: "8px" }}>📄</div>
                  <div style={{ fontWeight: 600, marginBottom: "4px", fontSize: "14px" }}>PDF 파일을 드래그하거나 클릭해서 업로드</div>
                  <div style={{ fontSize: "12px", color: "#aaa" }}>공고문, 보도자료, 안내문 등 · AI가 주제 자동 추출</div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", background: "#f7f7f8", borderRadius: "10px" }}>
                  <span style={{ fontSize: "24px" }}>📄</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#171719" }}>{pdfFile.name}</div>
                    <div style={{ fontSize: "12px", color: pdfExtracting ? "#0066FF" : "#16a34a" }}>
                      {pdfExtracting ? "텍스트 추출 중…" : "추출 완료 ✓"}
                    </div>
                  </div>
                  <button onClick={() => { setPdfFile(null); setFileContent(""); }} style={{ border: "none", background: "none", cursor: "pointer", color: "#aaa", fontSize: "18px" }}>×</button>
                </div>
              )}
            </div>
          </>
        )}

        {/* 사진 업로드 */}
        {isPhotoType && (
          <>
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
