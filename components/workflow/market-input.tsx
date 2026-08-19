"use client";

import { useRef, useState } from "react";
import { useWorkflowStore } from "@/lib/workflow-store";
import type { MarketHost } from "@/lib/types";

/**
 * market 타입 입력 패널.
 * 참여 팀이 10~15팀이라 인터뷰로 받으면 대화가 끝나지 않으므로
 * 팀 목록·팀별 현장 메모·팀별 사진 파일명을 여기서 구조화해 받는다.
 */

const LABEL: React.CSSProperties = {
  fontSize: "12px",
  color: "#5a5c63",
  fontWeight: 600,
};
const INPUT: React.CSSProperties = {
  width: "100%",
  border: "1.5px solid rgba(112,115,124,0.2)",
  borderRadius: "10px",
  padding: "9px 12px",
  fontSize: "14px",
  outline: "none",
  fontFamily: "inherit",
  color: "#171719",
  background: "#fff",
  boxSizing: "border-box",
};
const AREA: React.CSSProperties = {
  ...INPUT,
  fontSize: "13px",
  resize: "vertical",
  lineHeight: 1.6,
};
const CARD: React.CSSProperties = {
  background: "#fff",
  borderRadius: "12px",
  border: "1.5px solid rgba(112,115,124,0.2)",
  padding: "12px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

export default function MarketInput() {
  const { marketInfo, setMarketInfo } = useWorkflowStore();
  const { hosts } = marketInfo;
  const [bulk, setBulk] = useState("");
  const [bulkOpen, setBulkOpen] = useState(true);
  const hostPhotoRef = useRef<HTMLInputElement>(null);
  const [photoTarget, setPhotoTarget] = useState<number | null>(null);

  function updateHost(idx: number, patch: Partial<MarketHost>) {
    const next = [...hosts];
    next[idx] = { ...next[idx], ...patch };
    setMarketInfo({ hosts: next });
  }

  function addHost() {
    setMarketInfo({
      hosts: [...hosts, { name: "", handle: "", emoji: "", note: "", photoNames: [] }],
    });
  }

  function removeHost(idx: number) {
    setMarketInfo({ hosts: hosts.filter((_, i) => i !== idx) });
  }

  function moveHost(idx: number, dir: -1 | 1) {
    const to = idx + dir;
    if (to < 0 || to >= hosts.length) return;
    const next = [...hosts];
    [next[idx], next[to]] = [next[to], next[idx]];
    setMarketInfo({ hosts: next });
  }

  /**
   * 공지문 붙여넣기 → 팀 목록 생성.
   * "🐰 안녕난요정 @hello.im.pixy" 같은 줄에서 이모지·팀명·핸들만 뽑는다.
   * 소개 문구는 일부러 가져오지 않는다 — 같은 행사 예고글에 이미 실린 문장이라
   * 본문에 그대로 들어가면 네이버 유사문서 판정에서 이 글이 예고글에 밀린다.
   */
  function parseBulk() {
    const parsed: MarketHost[] = [];
    for (const rawLine of bulk.split("\n")) {
      const line = rawLine.trim();
      if (!line) continue;
      const m = line.match(/@([A-Za-z0-9._]+)/);
      if (!m) continue;
      const before = line.slice(0, m.index).trim();
      const em = before.match(/^([^\w가-힣]+)\s*/);
      const emoji = em ? em[1].trim() : "";
      const name = (em ? before.slice(em[0].length) : before).trim();
      if (!name) continue;
      parsed.push({ name, handle: m[1], emoji, note: "", photoNames: [] });
    }
    if (!parsed.length) return;
    setMarketInfo({ hosts: [...hosts, ...parsed] });
    setBulk("");
    setBulkOpen(false);
  }

  function handleHostPhotos(files: File[]) {
    if (photoTarget === null) return;
    const h = hosts[photoTarget];
    if (!h) return;
    updateHost(photoTarget, {
      photoNames: [...h.photoNames, ...files.map((f) => f.name)],
    });
    setPhotoTarget(null);
  }

  const noted = hosts.filter((h) => h.name.trim() && h.note.trim()).length;
  const totalPhotos = hosts.reduce((n, h) => n + h.photoNames.length, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* 숨은 파일 입력 — 업로드 없이 파일명만 수집 */}
      <input
        ref={hostPhotoRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) handleHostPhotos(Array.from(e.target.files));
          e.target.value = "";
        }}
      />

      {/* ① 행사 기본 정보 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <span style={LABEL}>① 행사 기본 정보</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <input
            style={INPUT}
            value={marketInfo.venueName}
            onChange={(e) => setMarketInfo({ venueName: e.target.value })}
            placeholder="장소명 (예: 대화장)"
          />
          <input
            style={INPUT}
            value={marketInfo.venueAddress}
            onChange={(e) => setMarketInfo({ venueAddress: e.target.value })}
            placeholder="주소 (예: 대구 중구 북성로 104-15)"
          />
          <input
            style={INPUT}
            value={marketInfo.eventDate}
            onChange={(e) => setMarketInfo({ eventDate: e.target.value })}
            placeholder="날짜 (예: 2026.08.16.(일))"
          />
          <input
            style={INPUT}
            value={marketInfo.eventTime}
            onChange={(e) => setMarketInfo({ eventTime: e.target.value })}
            placeholder="시간 (예: 13:00–19:00)"
          />
        </div>
      </div>

      {/* ② 장소 메모 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <span style={LABEL}>
          ② 장소 메모{" "}
          <span style={{ color: "#aaa", fontWeight: 400 }}>
            — 이 글에서 예고글과 겹치지 않는 유일한 정보 축
          </span>
        </span>
        <textarea
          style={AREA}
          rows={5}
          value={marketInfo.venueInfo}
          onChange={(e) => setMarketInfo({ venueInfo: e.target.value })}
          placeholder={
            "건물 이력, 내부 공간 구성, 간판·벽면 문구, 분위기 등\n\n예)\n1920년대 여관 건물을 고쳐 만든 문화 공간\n슬로건: 낯선 대화로 세상을 바꾸는 문화여관\n내부가 거실·살롱·창고·사진관으로 나뉘어 있어 부스가 방마다 흩어져 있었음"
          }
        />
      </div>

      {/* ③ 시리즈·남은 일정 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <span style={LABEL}>
          ③ 시리즈·남은 일정 메모{" "}
          <span style={{ color: "#aaa", fontWeight: 400 }}>(선택)</span>
        </span>
        <textarea
          style={AREA}
          rows={4}
          value={marketInfo.seriesInfo}
          onChange={(e) => setMarketInfo({ seriesInfo: e.target.value })}
          placeholder={
            "마켓 성격, 회차 라인업, 다음 일정, 참가 모집 조건 등\n\n예)\n매주 일요일 다른 테마로 진행, 판매자를 셀러가 아니라 HOST라고 부름\n8/23 빈티지 · 8/30 마법소녀 · 9/6 포켓몬VS디지몬(연기)"
          }
        />
      </div>

      {/* ④ 참여 팀 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <span style={LABEL}>
          ④ 참여 팀 {hosts.length > 0 && <span style={{ color: "#0066FF" }}>{hosts.length}팀</span>}{" "}
          <span style={{ color: "#aaa", fontWeight: 400 }}>— 포스팅에 나갈 순서대로</span>
        </span>

        {/* 공지문 일괄 입력 */}
        {bulkOpen && (
          <div style={{ ...CARD, border: "2px dashed rgba(112,115,124,0.3)" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#5a5c63" }}>
              ⚡ 공지문 붙여넣기 — 이모지·팀명·핸들만 자동으로 뽑습니다
            </span>
            <textarea
              style={{ ...AREA, fontSize: "12px" }}
              rows={5}
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              placeholder={"🐰 안녕난요정 @hello.im.pixy\n📚 나루글방 @naru_books\n🐈 다그림 @dagreem"}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
              <span style={{ fontSize: "11px", color: "#aaa" }}>
                소개 문구는 일부러 안 가져옵니다 (예고글과 문장이 겹치면 유사문서 위험)
              </span>
              <button
                onClick={parseBulk}
                disabled={!bulk.trim()}
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1.5px solid rgba(112,115,124,0.2)",
                  background: bulk.trim() ? "#fff" : "#f7f7f8",
                  color: bulk.trim() ? "#0066FF" : "#aaa",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: bulk.trim() ? "pointer" : "default",
                  fontFamily: "inherit",
                  flexShrink: 0,
                }}
              >
                팀 불러오기
              </button>
            </div>
          </div>
        )}

        {/* 팀 카드 */}
        {hosts.map((h, i) => (
          <div key={i} style={CARD}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "18px", fontSize: "12px", fontWeight: 700, color: "#aaa", flexShrink: 0 }}>
                {i + 1}
              </span>
              <input
                style={{ ...INPUT, width: "44px", textAlign: "center", padding: "8px 4px", flexShrink: 0 }}
                value={h.emoji}
                onChange={(e) => updateHost(i, { emoji: e.target.value })}
                placeholder="🐰"
              />
              <input
                style={{ ...INPUT, fontWeight: 600, minWidth: 0, flex: 1 }}
                value={h.name}
                onChange={(e) => updateHost(i, { name: e.target.value })}
                placeholder="팀명"
              />
              <input
                style={{ ...INPUT, width: "130px", fontSize: "12px", flexShrink: 0 }}
                value={h.handle}
                onChange={(e) => updateHost(i, { handle: e.target.value.replace(/^@/, "") })}
                placeholder="인스타 핸들"
              />
              <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
                <button
                  onClick={() => moveHost(i, -1)}
                  disabled={i === 0}
                  style={arrowBtn(i === 0)}
                >
                  ▲
                </button>
                <button
                  onClick={() => moveHost(i, 1)}
                  disabled={i === hosts.length - 1}
                  style={arrowBtn(i === hosts.length - 1)}
                >
                  ▼
                </button>
              </div>
              <button
                onClick={() => removeHost(i)}
                style={{ border: "none", background: "none", cursor: "pointer", color: "#aaa", fontSize: "18px", flexShrink: 0 }}
              >
                ×
              </button>
            </div>

            <textarea
              style={AREA}
              rows={3}
              value={h.note}
              onChange={(e) => updateHost(i, { note: e.target.value })}
              placeholder="부스에서 본 것 — 어떤 굿즈가 있었는지, 진열이 어땠는지, 특이했던 점 (가격은 적지 마세요)"
            />

            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  setPhotoTarget(i);
                  hostPhotoRef.current?.click();
                }}
                style={{
                  padding: "5px 10px",
                  borderRadius: "8px",
                  border: "1.5px dashed rgba(112,115,124,0.3)",
                  background: "#fff",
                  color: "#5a5c63",
                  fontSize: "12px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                📷 이 팀 사진 선택 ({h.photoNames.length}장)
              </button>
              {h.photoNames.map((n, j) => (
                <span
                  key={j}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "#f7f7f8",
                    borderRadius: "6px",
                    padding: "3px 7px",
                    fontSize: "11px",
                    color: "#5a5c63",
                  }}
                >
                  {n}
                  <button
                    onClick={() =>
                      updateHost(i, { photoNames: h.photoNames.filter((_, k) => k !== j) })
                    }
                    style={{ border: "none", background: "none", cursor: "pointer", color: "#aaa", fontSize: "13px", padding: 0 }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        ))}

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={addHost}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "10px",
              border: "2px dashed rgba(112,115,124,0.3)",
              background: "#fff",
              color: "#5a5c63",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ＋ 팀 추가
          </button>
          {!bulkOpen && (
            <button
              onClick={() => setBulkOpen(true)}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1.5px solid rgba(112,115,124,0.2)",
                background: "#fff",
                color: "#5a5c63",
                fontSize: "12px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              ⚡ 공지문 붙여넣기
            </button>
          )}
        </div>

        {hosts.length > 0 && (
          <p style={{ fontSize: "11px", color: noted < hosts.length ? "#d97706" : "#16a34a", margin: 0, textAlign: "right" }}>
            현장 메모 {noted}/{hosts.length}팀 · 팀 사진 {totalPhotos}장
            {noted < hosts.length && " — 메모 없는 팀은 두 문장으로만 짧게 나옵니다"}
          </p>
        )}
      </div>

      {/* 섹션 색상 */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={LABEL}>섹션 헤더 색상</span>
        <input
          type="color"
          value={marketInfo.brandColor}
          onChange={(e) => setMarketInfo({ brandColor: e.target.value })}
          style={{ width: "48px", height: "30px", padding: 0, border: "1.5px solid rgba(112,115,124,0.2)", borderRadius: "6px", cursor: "pointer", background: "#fff" }}
        />
        <span style={{ fontSize: "12px", color: "#aaa" }}>{marketInfo.brandColor}</span>
      </div>
    </div>
  );
}

function arrowBtn(disabled: boolean): React.CSSProperties {
  return {
    border: "none",
    background: "none",
    cursor: disabled ? "default" : "pointer",
    color: disabled ? "#ddd" : "#aaa",
    fontSize: "9px",
    lineHeight: 1.1,
    padding: 0,
  };
}
