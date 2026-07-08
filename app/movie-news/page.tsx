import type { Metadata } from "next";
import NewsLanding from "@/components/movie-news/news-landing";

export const metadata: Metadata = {
  title: "오늘의 영화소식 | MK Studio",
  description: "박스오피스·신작 소식 자동 수집과 AI 포스팅 초안",
};

export const dynamic = "force-dynamic";

export default function MovieNewsPage() {
  return <NewsLanding />;
}
