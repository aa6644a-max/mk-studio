"use client";

import { useEffect, useRef, useState } from "react";
import { useWorkflowStore } from "@/lib/workflow-store";
import type { MarketHost } from "@/lib/types";
import MarketInput from "./market-input";

/**
 * AI 맞춤 작성 진입 화면.
 *
 * 타입 칩을 먼저 고르게 하지 않는다 — 검색창 하나에 자유 텍스트를 치면
 * /api/workflow/strategy의 자동분류(STRATEGY_SYSTEM)가 review/preview/
 * curation/binge/essay 중 postType을 판단한다.
 *
 * photo·PDF·마켓 3종은 자유 텍스트로 판단하기 어렵거나(사진 성격, 마켓 팀 목록)
 * 아예 다른 성격의 데이터라, 이 셋만 [+] 첨부 버튼으로 명시적으로 골라 들어간다.
 * PDF는 pdf(정리)와 local(공고문)이 내용만으로 구분되므로 selectedType을
 * 강제하지 않고 분류기 판단에 맡긴다 (기존 STRATEGY_SYSTEM 규칙 그대로 재사용).
 */

type Mode = "text" | "photo" | "pdf" | "market";

const PHOTO_CATEGORIES: { value: string; label: string; icon: string }[] = [
  { value: "맛집카페", label: "맛집·카페", icon: "🍽️" },
  { value: "일상기록", label: "일상", icon: "📔" },
  { value: "여행나들이", label: "여행·나들이", icon: "🧳" },
  { value: "전시문화", label: "전시·문화", icon: "🎭" },
  { value: "제품리뷰", label: "제품·리뷰", icon: "📦" },
];

const MOVIE_TYPES = ["review", "preview", "curation", "binge"];

/** market 참여 팀 정보 → 전략 분석용 topic 문장 조립 (market-input.tsx 흐름과 동일). */
function marketTopic(info: { venueName: string; eventDate: string; hosts: MarketHost[] }): string {
  const parts = [
    info.venueName && `${info.venueName} 마켓 후기`,
    info.eventDate && info.eventDate,
    info.hosts.length ? `참여 ${info.hosts.length}팀` : "",
  ].filter(Boolean);
  return parts.join(" · ");
}

export default function SmartTopicInput() {
  const [mode, setMode] = useState<Mode>("text");
  const [attachOpen, setAttachOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 사진
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageCaptions, setImageCaptions] = useState<string[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [photoCategory, setPhotoCategory] = useState("맛집카페");
  const photoInputRef = useRef<HTMLInputElement>(null);

  // PDF
  const [pdfDocs, setPdfDocs] = useState<{ id: string; name: string; text: string; extracting: boolean; error: boolean }[]>([]);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const pdfExtracting = pdfDocs.some((d) => d.extracting);

  const {
    fileContent, marketInfo,
    setTopic, setStrategy, setStage, setError, setPostType,
    setFileContent, setImageData,
  } = useWorkflowStore();

  // 추출 완료된 PDF 텍스트를 하나로 합쳐 store에 반영 (topic-input.tsx와 동일 패턴)
  useEffect(() => {
    if (mode !== "pdf") return;
    const done = pdfDocs.filter((d) => !d.extracting && !d.error && d.text);
    const merged = done
      .map((d) => (done.length > 1 ? `[문서: ${d.name}]\n${d.text}` : d.text))
      .join("\n\n---\n\n");
    setFileContent(merged);
  }, [pdfDocs, mode, setFileContent]);

  async function handlePdfSelect(files: File[]) {
    const pdfs = files.filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    if (pdfs.length === 0) return;
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
        } catch {
          setPdfDocs((prev) => prev.map((d) => (d.id === id ? { ...d, extracting: false, error: true } : d)));
        }
      }),
    );
  }

  function handlePhotoSelect(files: File[]) {
    const combined = [...imageFiles, ...files].slice(0, 10);
    const combinedCaptions = [...imageCaptions, ...files.map(() => "")].slice(0, 10);
    const combinedUrls = [...imagePreviewUrls, ...files.map((f) => URL.createObjectURL(f))].slice(0, 10);
    setImageFiles(combined);
    setImageCaptions(combinedCaptions);
    setImagePreviewUrls(combinedUrls);
    setImageData(combined.map((f) => f.name), combinedCaptions, combinedUrls);
  }

  function pickAttach(next: Mode) {
    setMode(next);
    setAttachOpen(false);
  }

  function backToText() {
    setMode("text");
  }

  function canSubmit(): boolean {
    if (loading) return false;
    if (mode === "photo") return imageFiles.length > 0;
    if (mode === "pdf") return pdfDocs.some((d) => !d.error) && !pdfExtracting;
    if (mode === "market") return !!marketInfo.venueName.trim() && marketInfo.hosts.some((h) => h.name.trim());
    return !!input.trim();
  }

  async function handleSubmit() {
    if (!canSubmit()) return;
    setLoading(true);
    setErrorMsg("");
    setError("");

    try {
      let body: Record<string, unknown>;

      if (mode === "photo") {
        const imageInfo = imageFiles
          .map((f, i) => `파일명: ${f.name}${imageCaptions[i] ? ` — 캡션: ${imageCaptions[i]}` : ""}`)
          .join("\n");
        body = { selectedType: "photo", imageInfo, photoCategory, topic: input.trim() || undefined };
      } else if (mode === "pdf") {
        // selectedType 생략 — pdf(정리) vs local(공고문)은 STRATEGY_SYSTEM이 내용만으로 판단
        body = { pdfText: fileContent };
      } else if (mode === "market") {
        body = { selectedType: "market", topic: marketTopic(marketInfo) };
      } else {
        // selectedType 생략 — review/preview/curation/binge/essay 중 자동판단
        body = { topic: input.trim() };
      }

      const res = await fetch("/api/workflow/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("전략 분석 실패");
      const strategy = await res.json();

      if (MOVIE_TYPES.includes(strategy.postType)) {
        // 영화 계열은 TMDB 검색이 먼저 필요 — 원문 그대로 넘겨야 작품 검색이 정확함
        setTopic(mode === "text" ? input.trim() : strategy.topic || input.trim());
        setPostType(strategy.postType);
        setStage("tmdb-search");
      } else {
        setTopic(strategy.topic || input.trim() || "포스팅");
        setStrategy(strategy);
        setStage("strategy");
      }
    } catch (e) {
      setErrorMsg((e as Error).message ?? "요청 중 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey && mode === "text") {
      e.preventDefault();
      handleSubmit();
    }
  }

  const ATTACH_OPTIONS: { mode: Mode; icon: string; label: string }[] = [
    { mode: "photo", icon: "📸", label: "사진 첨부" },
    { mode: "pdf", icon: "📄", label: "PDF 첨부" },
    { mode: "market", icon: "🎪", label: "마켓 후기" },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: mode === "text" ? "center" : "flex-start",
        height: "100%",
        padding: "24px",
        gap: "20px",
        overflowY: "auto",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#171719", margin: "0 0 8px" }}>
          🪄 무엇을 쓰고 싶으세요?
        </h1>
        <p style={{ fontSize: "14px", color: "#5a5c63", margin: 0 }}>
          타입을 고르지 않아도 돼요 — 설명만 적으면 AI가 알맞은 형식을 골라 진행합니다
        </p>
      </div>

      {/* 검색창 모드 */}
      {mode === "text" && (
        <div style={{ width: "100%", maxWidth: "640px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "8px",
              background: "#fff",
              borderRadius: "24px",
              border: "1.5px solid rgba(112,115,124,0.2)",
              boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
              padding: "10px 10px 10px 20px",
              position: "relative",
            }}
          >
            <button
              onClick={() => setAttachOpen((v) => !v)}
              title="사진·PDF·마켓 후기 첨부"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                flexShrink: 0,
                border: "1.5px solid rgba(112,115,124,0.25)",
                background: attachOpen ? "#EBF2FF" : "#fff",
                color: attachOpen ? "#0066FF" : "#5a5c63",
                fontSize: "18px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              +
            </button>

            {attachOpen && (
              <div
                style={{
                  position: "absolute",
                  bottom: "56px",
                  left: "10px",
                  background: "#fff",
                  borderRadius: "14px",
                  border: "1.5px solid rgba(112,115,124,0.15)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  padding: "6px",
                  zIndex: 10,
                  display: "flex",
                  flexDirection: "column",
                  minWidth: "160px",
                }}
              >
                {ATTACH_OPTIONS.map((opt) => (
                  <button
                    key={opt.mode}
                    onClick={() => pickAttach(opt.mode)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "9px 12px",
                      borderRadius: "10px",
                      border: "none",
                      background: "transparent",
                      fontSize: "14px",
                      color: "#171719",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "inherit",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f7f7f8")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span>{opt.icon}</span> {opt.label}
                  </button>
                ))}
              </div>
            )}

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="예) 어벤져스 인피니티 워 리뷰 써줘 / 그림자 아이 GV 다녀온 이야기 정리해줘"
              disabled={loading}
              rows={1}
              style={{
                flex: 1,
                resize: "none",
                border: "none",
                outline: "none",
                fontFamily: "inherit",
                fontSize: "15px",
                color: "#171719",
                background: "transparent",
                padding: "8px 0",
                minHeight: "20px",
              }}
            />

            <button
              onClick={handleSubmit}
              disabled={!canSubmit()}
              style={{
                padding: "10px 18px",
                borderRadius: "16px",
                flexShrink: 0,
                background: canSubmit() ? "#0066FF" : "#e8e9eb",
                color: canSubmit() ? "#fff" : "#aaa",
                border: "none",
                fontSize: "14px",
                fontWeight: 600,
                cursor: canSubmit() ? "pointer" : "default",
              }}
            >
              {loading ? "분석 중…" : "시작 →"}
            </button>
          </div>
        </div>
      )}

      {/* 사진 첨부 모드 */}
      {mode === "photo" && (
        <div style={{ width: "100%", maxWidth: "600px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <BackRow onBack={backToText} label="📸 사진 첨부" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {PHOTO_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setPhotoCategory(cat.value)}
                style={{
                  padding: "7px 13px",
                  borderRadius: "18px",
                  border: photoCategory === cat.value ? "2px solid #0066FF" : "1.5px solid rgba(112,115,124,0.2)",
                  background: photoCategory === cat.value ? "#EBF2FF" : "#fff",
                  color: photoCategory === cat.value ? "#0066FF" : "#5a5c63",
                  fontSize: "13px",
                  fontWeight: photoCategory === cat.value ? 700 : 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="무엇에 대한 포스팅인가요? (선택)"
            style={textInputStyle}
          />
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) handlePhotoSelect(Array.from(e.target.files));
              e.target.value = "";
            }}
          />
          <div style={uploadBoxOuter}>
            {imageFiles.map((file, idx) => (
              <div key={idx} style={uploadRow}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreviewUrls[idx]}
                  alt=""
                  style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "#aaa", marginBottom: 4 }}>{file.name}</div>
                  <input
                    type="text"
                    placeholder="사진 설명 (예: 입구 외관)"
                    value={imageCaptions[idx] ?? ""}
                    onChange={(e) => {
                      const next = [...imageCaptions];
                      next[idx] = e.target.value;
                      setImageCaptions(next);
                      setImageData(imageFiles.map((f) => f.name), next, imagePreviewUrls);
                    }}
                    style={{
                      width: "100%",
                      border: "1px solid rgba(112,115,124,0.2)",
                      borderRadius: 6,
                      padding: "4px 8px",
                      fontSize: 13,
                      outline: "none",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <button
                  onClick={() => {
                    const nf = imageFiles.filter((_, i) => i !== idx);
                    const nc = imageCaptions.filter((_, i) => i !== idx);
                    const nu = imagePreviewUrls.filter((_, i) => i !== idx);
                    setImageFiles(nf);
                    setImageCaptions(nc);
                    setImagePreviewUrls(nu);
                    setImageData(nf.map((f) => f.name), nc, nu);
                  }}
                  style={{ border: "none", background: "none", cursor: "pointer", color: "#aaa", fontSize: 18, flexShrink: 0 }}
                >
                  ×
                </button>
              </div>
            ))}
            <div
              onClick={() => photoInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handlePhotoSelect(Array.from(e.dataTransfer.files));
              }}
              style={dropZoneStyle(imageFiles.length > 0)}
            >
              {imageFiles.length === 0 ? (
                <>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📸</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>사진을 드래그하거나 클릭</div>
                </>
              ) : (
                <span style={{ fontSize: 13 }}>+ 사진 추가 ({imageFiles.length}/10)</span>
              )}
            </div>
          </div>
          <SubmitBar loading={loading} disabled={!canSubmit()} onSubmit={handleSubmit} />
        </div>
      )}

      {/* PDF 첨부 모드 */}
      {mode === "pdf" && (
        <div style={{ width: "100%", maxWidth: "600px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <BackRow onBack={backToText} label="📄 PDF 첨부" />
          <p style={{ fontSize: 12, color: "#aaa", margin: 0 }}>
            정리글로 쓸지 공고문으로 쓸지는 내용을 보고 AI가 알아서 판단합니다
          </p>
          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) handlePdfSelect(Array.from(e.target.files));
              e.target.value = "";
            }}
          />
          <div style={uploadBoxOuter}>
            {pdfDocs.map((doc) => (
              <div key={doc.id} style={uploadRow}>
                <span style={{ fontSize: 24 }}>📄</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {doc.name}
                  </div>
                  <div style={{ fontSize: 12, color: doc.extracting ? "#0066FF" : doc.error ? "#dc2626" : "#16a34a" }}>
                    {doc.extracting ? "텍스트 추출 중…" : doc.error ? "추출 실패 ✕" : "추출 완료 ✓"}
                  </div>
                </div>
                <button
                  onClick={() => setPdfDocs((prev) => prev.filter((d) => d.id !== doc.id))}
                  style={{ border: "none", background: "none", cursor: "pointer", color: "#aaa", fontSize: 18, flexShrink: 0 }}
                >
                  ×
                </button>
              </div>
            ))}
            <div
              onClick={() => pdfInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handlePdfSelect(Array.from(e.dataTransfer.files));
              }}
              style={dropZoneStyle(pdfDocs.length > 0)}
            >
              {pdfDocs.length === 0 ? (
                <>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>PDF를 드래그하거나 클릭</div>
                </>
              ) : (
                <span style={{ fontSize: 13 }}>+ PDF 추가 ({pdfDocs.length}개)</span>
              )}
            </div>
          </div>
          <SubmitBar loading={loading} disabled={!canSubmit()} onSubmit={handleSubmit} />
        </div>
      )}

      {/* 마켓 후기 모드 — 기존 market-input.tsx 화면 그대로 재사용 */}
      {mode === "market" && (
        <div style={{ width: "100%", maxWidth: "640px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <BackRow onBack={backToText} label="🎪 마켓 후기" />
          <MarketInput />
          <SubmitBar loading={loading} disabled={!canSubmit()} onSubmit={handleSubmit} label="다음 →" />
        </div>
      )}

      {errorMsg && (
        <p style={{ color: "#dc2626", fontSize: 13, background: "#FEF2F2", padding: "8px 14px", borderRadius: 10 }}>
          {errorMsg}
        </p>
      )}
    </div>
  );
}

function BackRow({ onBack, label }: { onBack: () => void; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button onClick={onBack} style={{ border: "none", background: "none", color: "#5a5c63", fontSize: 13, cursor: "pointer", padding: 0 }}>
        ← 뒤로
      </button>
      <span style={{ fontSize: 15, fontWeight: 700, color: "#171719" }}>{label}</span>
    </div>
  );
}

function SubmitBar({
  loading, disabled, onSubmit, label,
}: {
  loading: boolean;
  disabled: boolean;
  onSubmit: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onSubmit}
      disabled={disabled}
      style={{
        padding: "12px 24px",
        borderRadius: 12,
        background: disabled ? "#e8e9eb" : "#0066FF",
        color: disabled ? "#aaa" : "#fff",
        border: "none",
        fontSize: 15,
        fontWeight: 600,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {loading ? "분석 중…" : (label ?? "시작 →")}
    </button>
  );
}

const textInputStyle: React.CSSProperties = {
  width: "100%",
  border: "1.5px solid rgba(112,115,124,0.2)",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
  color: "#171719",
  background: "#fff",
  boxSizing: "border-box",
};
const uploadBoxOuter: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  border: "1.5px solid rgba(112,115,124,0.2)",
  boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};
const uploadRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 8,
  background: "#f7f7f8",
  borderRadius: 10,
};
function dropZoneStyle(hasItems: boolean): React.CSSProperties {
  return {
    border: "2px dashed rgba(112,115,124,0.3)",
    borderRadius: 12,
    padding: hasItems ? 12 : 32,
    textAlign: "center",
    cursor: "pointer",
    color: "#5a5c63",
  };
}
