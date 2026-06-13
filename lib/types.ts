// 포스팅 타입 (PRD §8 post_type 컬럼 값)
export type PostType =
  | "review" // 영화 리뷰
  | "preview" // 개봉 프리뷰
  | "curation" // 큐레이션 리스트
  | "binge" // 정주행 추천
  | "photo" // 사진 포스팅
  | "local" // 로컬소식/공고문
  | "pdf"; // PDF 요약

export type PostStatus = "published" | "draft";

// MK_CINELAB_DB 한 행 (A~E 컬럼)
export type Post = {
  timestamp: string; // A: YYYY-MM-DD HH:MM:SS
  movieTitle: string; // B
  postType: PostType; // C
  content: string; // D: HTML 전문
  status: PostStatus; // E
};

export const POST_TYPE_META: Record<
  PostType,
  { label: string; icon: string }
> = {
  review: { label: "영화 리뷰", icon: "🎥" },
  preview: { label: "개봉 프리뷰", icon: "📅" },
  curation: { label: "큐레이션 리스트", icon: "🎬" },
  binge: { label: "정주행 추천", icon: "📺" },
  photo: { label: "사진 포스팅", icon: "📸" },
  local: { label: "로컬소식/공고문", icon: "📢" },
  pdf: { label: "PDF 요약", icon: "📄" },
};
