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

// 작성 화면 드래프트 상태
export type PostDraft = {
  postType: PostType;
  title: string; // 포스팅/리뷰 제목
  posterUrl: string | null;
  genres: string[];
  status: PostStatus;
  // 영화 리뷰 고유
  movieTitle: string;
  rating: number; // 1~5
  watchReason: string;
  // 프리뷰: 개봉일 / 기대 포인트
  releaseDate: string;
  expectPoints: string;
  // 큐레이션·정주행: 항목 목록 (영화 여러 편 / 회차 구성)
  items: string[];
  // 사진 포스팅: 장소명 / 업로드 이미지 이름
  placeName: string;
  imageNames: string[];
  // PDF 요약: 카테고리, 공고문: 소개 목적 / 추출 텍스트
  category: string;
  purpose: string;
  pdfText: string; // PDF에서 추출한 본문 (서버 추출)
  pdfNames: string[];
  // 본문 (사용자 메모/지시) + 생성 결과
  body: string;
  generatedHtml: string;
};

export function emptyDraft(postType: PostType = "review"): PostDraft {
  return {
    postType,
    title: "",
    posterUrl: null,
    genres: [],
    status: "draft",
    movieTitle: "",
    rating: 0,
    watchReason: "",
    releaseDate: "",
    expectPoints: "",
    items: [],
    placeName: "",
    imageNames: [],
    category: "",
    purpose: "",
    pdfText: "",
    pdfNames: [],
    body: "",
    generatedHtml: "",
  };
}

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
