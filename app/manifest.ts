import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MK Studio",
    short_name: "MK Studio",
    description: "영화 평론가 MK의 AI 블로그 포스팅 스튜디오",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0066FF",
    orientation: "portrait",
    icons: [
      { src: "/api/icon?size=192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/api/icon?size=512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/api/icon?size=512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
