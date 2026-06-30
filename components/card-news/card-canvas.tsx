"use client";

import { forwardRef } from "react";

export interface InfoRow { label: string; value: string }
export interface RatingItem { source: string; value: string }

export interface CardCanvasProps {
  movieTitle: string;
  heroTagline: string;
  bodyCopy: string;
  heroUrl: string;
  posterUrl: string;
  accentColor: string;
  bgColor: string;
  badgeText: string;
  metaLine: string;
  ratings: RatingItem[];
  infoRows: InfoRow[];
  ostTitle: string;
  ostBgUrl: string;
  galleryUrls: string[];
  creditText: string;
}

const px = (url?: string) =>
  url ? `/api/card-news/img?u=${encodeURIComponent(url)}` : "";

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

const CardCanvas = forwardRef<HTMLDivElement, CardCanvasProps>(function CardCanvas(
  {
    movieTitle, heroTagline, bodyCopy, heroUrl, posterUrl,
    accentColor, bgColor, badgeText, metaLine, ratings,
    infoRows, ostTitle, ostBgUrl, galleryUrls, creditText,
  },
  ref,
) {
  const navy = accentColor;
  const titleLen = (movieTitle || "").length;
  const titleSize = titleLen <= 8 ? 56 : titleLen <= 12 ? 47 : titleLen <= 16 ? 39 : titleLen <= 22 ? 33 : 28;
  const arrow = (
    <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
  );

  return (
    <div
      ref={ref}
      style={{
        width: 1080, height: 1350, position: "relative", background: bgColor,
        overflow: "hidden", flexShrink: 0,
        fontFamily: "'Pretendard Variable','Pretendard',-apple-system,sans-serif",
      }}
    >
      {/* Top bar */}
      <div style={{ position: "absolute", top: 0, left: 0, width: 1080, height: 72 }}>
        <div style={{ position: "absolute", left: 36, top: 24, fontSize: 22, fontWeight: 800, color: navy, letterSpacing: 0.5 }}>MK LINK</div>
        <div style={{ position: "absolute", left: "50%", top: 24, transform: "translateX(-50%)", display: "flex", gap: 30 }}>
          {["홈", "리뷰", "장르", "추천", "갤러리", "문의"].map((t, i) => (
            <span key={t} style={{ fontSize: 15, color: i === 0 ? navy : "#555", fontWeight: i === 0 ? 700 : 400, borderBottom: i === 0 ? `2px solid ${navy}` : "none", paddingBottom: 4 }}>{t}</span>
          ))}
        </div>
        <div style={{ position: "absolute", right: 36, top: 19, display: "flex", alignItems: "center", gap: 16 }}>
          <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="#555" strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: navy, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div style={{ position: "absolute", left: 0, top: 80, width: 115, height: 560, background: navy, borderRadius: "0 26px 26px 0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-evenly", padding: "24px 0" }}>
        {sideIcons.map((icon, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, opacity: i === 0 ? 1 : 0.78 }}>
            <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
            <span style={{ fontSize: 12, color: "white" }}>{sideLabels[i]}</span>
          </div>
        ))}
      </div>

      {/* Hero */}
      <div style={{ position: "absolute", left: 130, top: 80, width: 920, height: 545, borderRadius: 24, overflow: "hidden", boxShadow: "0 18px 50px rgba(20,30,70,0.2)" }}>
        {heroUrl
          ? <img src={px(heroUrl)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          : <div style={{ width: "100%", height: "100%", background: "#445" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(100deg, rgba(18,28,68,0.9) 0%, rgba(18,28,68,0.55) 38%, rgba(18,28,68,0.05) 62%, transparent 80%)" }} />
        <div style={{ position: "absolute", left: 56, top: 80, width: 430, zIndex: 2 }}>
          {badgeText && <div style={{ display: "inline-block", padding: "9px 20px", border: "1.5px solid rgba(255,255,255,0.7)", borderRadius: 30, fontSize: 14, color: "white", marginBottom: 26 }}>{badgeText}</div>}
          <div style={{ fontSize: titleSize, fontWeight: 800, color: "white", lineHeight: 1.12, marginBottom: 22, letterSpacing: -1, wordBreak: "keep-all" }}>{movieTitle || "영화 제목"}</div>
          <div style={{ fontSize: 21, color: "rgba(255,255,255,0.92)", lineHeight: 1.55, fontWeight: 500, marginBottom: 34 }}>{heroTagline || "핵심 메시지"}</div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "white", color: navy, fontWeight: 700, fontSize: 16, padding: "15px 30px", borderRadius: 12 }}>자세히 보기 {arrow}</div>
        </div>
      </div>

      {/* Info card (overlap hero) */}
      <div style={{ position: "absolute", left: 130, top: 600, width: 920, height: 285, background: "white", borderRadius: 22, boxShadow: "0 16px 50px rgba(20,30,70,0.13)", padding: "28px 32px", display: "flex", gap: 28, zIndex: 6 }}>
        <div style={{ width: 150, height: 216, borderRadius: 14, overflow: "hidden", flexShrink: 0, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", background: "#eee" }}>
          {posterUrl && <img src={px(posterUrl)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 24, borderRight: "1px solid #ececf0" }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: "#1a1a2e", marginBottom: 10 }}>{movieTitle}</div>
          <div style={{ fontSize: 14, color: "#888", marginBottom: 16 }}>{metaLine}</div>
          <div style={{ fontSize: 14, color: "#555", lineHeight: 1.7, marginBottom: 16, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical" }}>{bodyCopy}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ color: "#f5b50a", fontSize: 18, marginRight: 2 }}>★</span>
            {ratings.slice(0, 3).map((r, i) => (
              <div key={i} style={{ background: "#f1f2f6", borderRadius: 10, padding: "7px 13px", display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 11, color: "#999", fontWeight: 700, letterSpacing: 0.2 }}>{r.source}</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#1a1a2e" }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ width: 250, flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e", marginBottom: 18 }}>주요 정보</div>
          {infoRows.map((r, i) => (
            <div key={i} style={{ display: "flex", marginBottom: 14, fontSize: 14 }}>
              <span style={{ width: 56, color: "#999", flexShrink: 0 }}>{r.label}</span>
              <span style={{ color: "#1a1a2e", fontWeight: 500 }}>{r.value}</span>
            </div>
          ))}
          <div style={{ marginTop: 22, width: "100%", background: "#eef0fb", color: navy, fontSize: 15, fontWeight: 700, padding: 14, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>리뷰 보기 {arrow}</div>
        </div>
      </div>

      {/* Gallery card */}
      <div style={{ position: "absolute", left: 130, top: 915, width: 448, height: 332, background: "white", borderRadius: 22, boxShadow: "0 14px 44px rgba(20,30,70,0.08)", padding: "24px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ fontSize: 19, fontWeight: 800, color: "#1a1a2e" }}>갤러리</h3>
          <span style={{ fontSize: 13, color: "#999", display: "flex", alignItems: "center", gap: 5 }}>전체보기 <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="#999" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ aspectRatio: "1", borderRadius: 12, overflow: "hidden", background: "#eee" }}>
              {galleryUrls[i] && <img src={px(galleryUrls[i])} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
            </div>
          ))}
        </div>
      </div>

      {/* OST photo card */}
      <div style={{ position: "absolute", left: 602, top: 915, width: 448, height: 332, borderRadius: 22, boxShadow: "0 16px 50px rgba(20,30,70,0.22)", overflow: "hidden", color: "white" }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          {ostBgUrl && <img src={px(ostBgUrl)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "brightness(0.62) saturate(1.1)" }} />}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(15,20,40,0.35) 0%, rgba(15,20,40,0.2) 40%, rgba(15,20,40,0.7) 100%)" }} />
        </div>
        <div style={{ position: "relative", zIndex: 1, height: "100%", padding: "24px 28px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 18 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
              지금 재생 중
            </span>
            <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 17a8 8 0 0 1 14 0" /><path d="M8.5 14a4.5 4.5 0 0 1 7 0" /><circle cx="12" cy="11" r="1" /></svg>
          </div>
          <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 18 }}>
            <div style={{ width: 96, height: 96, borderRadius: 14, overflow: "hidden", flexShrink: 0, boxShadow: "0 12px 30px rgba(0,0,0,0.5)", background: "#223" }}>
              {posterUrl && <img src={px(posterUrl)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 25, fontWeight: 800, lineHeight: 1.2, marginBottom: 8, textShadow: "0 2px 10px rgba(0,0,0,0.5)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{ostTitle || "OST 곡명"}</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.78)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", textShadow: "0 1px 8px rgba(0,0,0,0.5)" }}>{movieTitle}</div>
            </div>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.3)", borderRadius: 2, marginBottom: 8, marginTop: "auto", position: "relative" }}>
            <div style={{ width: "38%", height: "100%", background: "white", borderRadius: 2, position: "relative" }}>
              <div style={{ position: "absolute", right: -4, top: "50%", transform: "translateY(-50%)", width: 10, height: 10, borderRadius: "50%", background: "white" }} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.8)", marginBottom: 16 }}>
            <span>1:24</span><span>3:47</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 26 }}>
            <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /><polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" /><line x1="4" y1="4" x2="9" y2="9" /></svg>
            <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="19 20 9 12 19 4 19 20" /><line x1="5" y1="19" x2="5" y2="5" /></svg>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,0.95)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(0,0,0,0.35)" }}>
              <svg viewBox="0 0 24 24" width={19} height={19} fill="#1a1a2e"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            </div>
            <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" /></svg>
            <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>
          </div>
        </div>
      </div>

      {/* Footer bar */}
      <div style={{ position: "absolute", left: 130, top: 1262, width: 920, height: 76, background: "white", borderRadius: 22, boxShadow: "0 14px 44px rgba(20,30,70,0.08)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 9 }}>
        <div style={{ display: "flex", gap: 30 }}>
          {socialIcons.map((icon, i) => (
            <svg key={i} viewBox="0 0 24 24" width={22} height={22} fill="none" stroke={navy} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "#aaa", letterSpacing: 0.5 }}>{creditText}</div>
      </div>
    </div>
  );
});

export default CardCanvas;
