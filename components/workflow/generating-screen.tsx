"use client";

export default function GeneratingScreen() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: "20px",
        color: "#5a5c63",
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          border: "3px solid #e8e9eb",
          borderTopColor: "#0066FF",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <div style={{ textAlign: "center" }}>
        <p
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "#171719",
            margin: "0 0 6px",
          }}
        >
          포스팅 생성 중…
        </p>
        <p style={{ fontSize: "13px", margin: 0 }}>
          인터뷰 내용을 바탕으로 HTML을 작성하고 있어요 (최대 2분 소요)
        </p>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
