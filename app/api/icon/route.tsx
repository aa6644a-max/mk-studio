import { ImageResponse } from "next/og";

/** MK 텍스트 앱 아이콘 PNG 동적 생성. /api/icon?size=192|512 */
export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const size = Math.min(1024, Math.max(48, Number(searchParams.get("size") ?? 512)));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0066FF",
          color: "#ffffff",
          fontSize: size * 0.42,
          fontWeight: 800,
          letterSpacing: "-0.04em",
          fontFamily: "sans-serif",
        }}
      >
        MK
      </div>
    ),
    { width: size, height: size },
  );
}
