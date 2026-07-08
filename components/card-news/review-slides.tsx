"use client";

import { forwardRef } from "react";

/**
 * 리뷰 카드뉴스 본문/엔딩 슬라이드 (1080×1350).
 * 표지(card-canvas.tsx)와 같은 "웹사이트 화면" 디자인 언어 — MK LINK 탑바·사이드바·푸터 공통,
 * 슬라이드마다 사이드바 활성 탭이 이동해 "같은 사이트의 다른 페이지"처럼 보인다.
 */

const px = (url?: string) =>
  url ? (url.startsWith("data:") ? url : `/api/card-news/img?u=${encodeURIComponent(url)}`) : "";

const sideIcons = [
  <><path key="a" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline key="b" points="9 22 9 12 15 12 15 22" /></>,
  <path key="a" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  <><rect key="a" x="3" y="3" width="7" height="7" /><rect key="b" x="14" y="3" width="7" height="7" /><rect key="c" x="14" y="14" width="7" height="7" /><rect key="d" x="3" y="14" width="7" height="7" /></>,
  <polygon key="a" points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9 12 2" />,
  <><rect key="a" x="3" y="3" width="18" height="18" rx="2" /><circle key="b" cx="8.5" cy="8.5" r="1.5" /><polyline key="c" points="21 15 16 10 5 21" /></>,
  <><path key="a" d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline key="b" points="22,6 12,13 2,6" /></>,
];
const sideLabels = ["홈", "리뷰", "장르", "추천", "갤러리", "문의"];
const socialIcons = [
  <><rect key="a" x="2" y="2" width="20" height="20" rx="5" /><path key="b" d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line key="c" x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></>,
  <path key="a" d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />,
  <><path key="a" d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.54C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" /><polygon key="b" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" /></>,
  <><path key="a" d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect key="b" x="2" y="9" width="4" height="12" /><circle key="c" cx="4" cy="4" r="2" /></>,
  <path key="a" d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
];

function TopBar({ navy, active }: { navy: string; active: number }) {
  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: 1080, height: 72 }}>
      <div style={{ position: "absolute", left: 36, top: 24, fontSize: 22, fontWeight: 800, color: navy, letterSpacing: 0.5 }}>MK LINK</div>
      <div style={{ position: "absolute", left: "50%", top: 24, transform: "translateX(-50%)", display: "flex", gap: 30 }}>
        {sideLabels.map((t, i) => (
          <span key={t} style={{ fontSize: 15, color: i === active ? navy : "#555", fontWeight: i === active ? 700 : 400, borderBottom: i === active ? `2px solid ${navy}` : "none", paddingBottom: 4 }}>{t}</span>
        ))}
      </div>
      <div style={{ position: "absolute", right: 36, top: 19, display: "flex", alignItems: "center", gap: 16 }}>
        <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="#555" strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: navy, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
        </div>
      </div>
    </div>
  );
}

function SideBar({ navy, active }: { navy: string; active: number }) {
  return (
    <div style={{ position: "absolute", left: 0, top: 80, width: 115, height: 560, background: navy, borderRadius: "0 26px 26px 0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-evenly", padding: "24px 0" }}>
      {sideIcons.map((icon, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, opacity: i === active ? 1 : 0.78 }}>
          <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
          <span style={{ fontSize: 12, color: "white", fontWeight: i === active ? 700 : 400 }}>{sideLabels[i]}</span>
        </div>
      ))}
    </div>
  );
}

function FooterBar({ navy, creditText }: { navy: string; creditText: string }) {
  return (
    <div style={{ position: "absolute", left: 130, top: 1262, width: 920, height: 76, background: "white", borderRadius: 22, boxShadow: "0 14px 44px rgba(20,30,70,0.08)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 9 }}>
      <div style={{ display: "flex", gap: 30 }}>
        {socialIcons.map((icon, i) => (
          <svg key={i} viewBox="0 0 24 24" width={22} height={22} fill="none" stroke={navy} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
        ))}
      </div>
      <div style={{ fontSize: 12, color: "#aaa", letterSpacing: 0.5 }}>{creditText}</div>
    </div>
  );
}

const frameFont = "'Pretendard Variable','Pretendard',-apple-system,sans-serif";

// ── 본문 슬라이드 (2~4장) ──────────────────────────
export interface BodySlideProps {
  index: number; // 0~2 → 01·02·03
  headline: string;
  quote: string;
  imageUrl: string;
  movieTitle: string;
  accentColor: string;
  bgColor: string;
  creditText: string;
}

export const BodySlideCanvas = forwardRef<HTMLDivElement, BodySlideProps>(function BodySlideCanvas(
  { index, headline, quote, imageUrl, movieTitle, accentColor, bgColor, creditText },
  ref,
) {
  const navy = accentColor;
  const headLen = (headline || "").length;
  const headSize = headLen <= 12 ? 52 : headLen <= 18 ? 44 : 38;
  return (
    <div ref={ref} style={{ width: 1080, height: 1350, position: "relative", background: bgColor, overflow: "hidden", flexShrink: 0, fontFamily: frameFont }}>
      <TopBar navy={navy} active={1} />
      <SideBar navy={navy} active={1} />

      {/* 스틸컷 배너 */}
      <div style={{ position: "absolute", left: 130, top: 80, width: 920, height: 600, borderRadius: 24, overflow: "hidden", boxShadow: "0 18px 50px rgba(20,30,70,0.2)" }}>
        {imageUrl
          ? <img src={px(imageUrl)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          : <div style={{ width: "100%", height: "100%", background: "#445" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(18,28,68,0.25) 0%, rgba(18,28,68,0.05) 35%, rgba(18,28,68,0.82) 100%)" }} />
        <div style={{ position: "absolute", left: 52, top: 36, fontSize: 120, fontWeight: 800, color: "rgba(255,255,255,0.32)", letterSpacing: 2, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          {String(index + 1).padStart(2, "0")}
        </div>
        <div style={{ position: "absolute", left: 52, top: 168, width: 64, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.85)" }} />
        <div style={{ position: "absolute", left: 56, right: 56, bottom: 52 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.8)", letterSpacing: 3, marginBottom: 16 }}>MK REVIEW POINT</div>
          <div style={{ fontSize: headSize, fontWeight: 800, color: "white", lineHeight: 1.25, letterSpacing: -0.5, wordBreak: "keep-all", textShadow: "0 4px 20px rgba(0,0,0,0.35)" }}>
            {headline || "리뷰 포인트"}
          </div>
        </div>
      </div>

      {/* 리뷰 발췌 카드 */}
      <div style={{ position: "absolute", left: 130, top: 712, width: 920, height: 518, background: "white", borderRadius: 22, boxShadow: "0 16px 50px rgba(20,30,70,0.13)", padding: "48px 64px", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 96, fontWeight: 800, color: navy, lineHeight: 0.7, height: 58, fontFamily: "Georgia, serif", opacity: 0.9 }}>“</div>
        <div style={{ flex: 1, fontSize: 30, lineHeight: 1.8, color: "#333", fontWeight: 500, wordBreak: "keep-all", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 6, WebkitBoxOrient: "vertical", marginTop: 10 }}>
          {quote || "리뷰 발췌 문장이 여기에 들어갑니다."}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: navy, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 13, fontWeight: 800 }}>MK</div>
            <span style={{ fontSize: 16, color: "#999", fontWeight: 600 }}>MK 리뷰 중에서</span>
          </div>
          <span style={{ fontSize: 16, color: "#bbb" }}>{movieTitle}</span>
        </div>
      </div>

      <FooterBar navy={navy} creditText={creditText} />
    </div>
  );
});

// ── 엔딩 슬라이드 (5장) ──────────────────────────
export interface EndingSlideProps {
  hook: string;
  triggerKeyword: string;
  followLine: string;
  posterUrl: string;
  movieTitle: string;
  accentColor: string;
  bgColor: string;
  creditText: string;
}

export const EndingSlideCanvas = forwardRef<HTMLDivElement, EndingSlideProps>(function EndingSlideCanvas(
  { hook, triggerKeyword, followLine, posterUrl, movieTitle, accentColor, bgColor, creditText },
  ref,
) {
  const navy = accentColor;
  return (
    <div ref={ref} style={{ width: 1080, height: 1350, position: "relative", background: bgColor, overflow: "hidden", flexShrink: 0, fontFamily: frameFont }}>
      <TopBar navy={navy} active={5} />
      <SideBar navy={navy} active={5} />

      {/* 훅 히어로 */}
      <div style={{ position: "absolute", left: 130, top: 80, width: 920, height: 700, borderRadius: 24, background: navy, overflow: "hidden", boxShadow: "0 18px 50px rgba(20,30,70,0.25)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 80px" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(500px 320px at 50% 0%, rgba(255,255,255,0.14), transparent 70%)" }} />
        {posterUrl && (
          <div style={{ width: 168, height: 240, borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.45)", marginBottom: 36, position: "relative", zIndex: 1 }}>
            <img src={px(posterUrl)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        )}
        <div style={{ position: "relative", zIndex: 1, fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.75)", letterSpacing: 4, marginBottom: 18 }}>{movieTitle}</div>
        <div style={{ position: "relative", zIndex: 1, fontSize: 48, fontWeight: 800, color: "white", lineHeight: 1.3, letterSpacing: -0.5, wordBreak: "keep-all" }}>
          {hook || "이 리뷰의 전문이 궁금하다면?"}
        </div>
      </div>

      {/* 댓글 트리거 카드 */}
      <div style={{ position: "absolute", left: 130, top: 812, width: 920, height: 418, background: "white", borderRadius: 22, boxShadow: "0 16px 50px rgba(20,30,70,0.13)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 72px" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: navy, letterSpacing: 4, marginBottom: 22 }}>SECRET LINK</div>
        <div style={{ fontSize: 38, fontWeight: 800, color: "#1a1a2e", lineHeight: 1.4, wordBreak: "keep-all" }}>
          💬 댓글에{" "}
          <span style={{ display: "inline-block", background: `${navy}14`, color: navy, borderRadius: 14, padding: "2px 22px" }}>
            {triggerKeyword || "리뷰"}
          </span>
          {" "}남겨주세요
        </div>
        <div style={{ fontSize: 21, color: "#666", marginTop: 18, fontWeight: 500 }}>
          리뷰 전문 링크를 DM으로 바로 보내드려요
        </div>
        <div style={{ width: 72, height: 1.5, background: "#e5e6ee", margin: "30px 0 24px" }} />
        <div style={{ fontSize: 19, color: "#888", fontWeight: 600 }}>
          🔔 {followLine || "팔로우하면 다음 리뷰도 만나볼 수 있어요"}
        </div>
      </div>

      <FooterBar navy={navy} creditText={creditText} />
    </div>
  );
});
