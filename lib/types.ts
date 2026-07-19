// 포스팅 타입 (PRD §8 post_type 컬럼 값)
export type PostType =
  | "review" // 영화 리뷰
  | "preview" // 개봉 프리뷰
  | "curation" // 큐레이션 리스트
  | "binge" // 정주행 추천
  | "photo" // 사진 포스팅
  | "local" // 로컬소식/공고문
  | "pdf" // PDF 요약
  | "essay"; // 일상·생각·경험 에세이 (GV 후기, 강연·행사 참석기 등)

export type PostStatus = "published" | "draft";

// TMDB 영화 상세 (V2 get_movie_details 이식)
export type MovieDetails = {
  id?: number;
  title: string;
  originalTitle?: string;
  country?: string;
  releaseDate?: string;
  director?: string;
  actors?: string;
  genres?: string;
  runtime?: number; // 러닝타임 (분)
  overview?: string;
  posterUrl?: string;
  backdropUrls?: string[];
};

// TMDB TV 상세 (정주행)
export type TvDetails = {
  id?: number;
  title: string;
  originalTitle?: string;
  country?: string;
  firstAirDate?: string;
  numberOfEpisodes?: number;
  numberOfSeasons?: number;
  episodeRuntime?: number;
  totalWatchTime?: string;
  genres?: string;
  overview?: string;
  cast?: string;
  posterUrl?: string;
  backdropUrls?: string[];
};

// MK_CINELAB_DB 한 행 (A~E 컬럼)
export type Post = {
  timestamp: string; // A: YYYY-MM-DD HH:MM:SS
  movieTitle: string; // B
  postType: PostType; // C
  content: string; // D: HTML 전문
  status: PostStatus; // E
};

// 큐레이션·정주행 단위 작품
export type CurationItem = {
  title: string;
  originalTitle?: string;
  posterUrl: string | null;
  tmdbId?: number;
  // movie (curation)
  country?: string;
  releaseDate?: string;
  director?: string;
  actors?: string;
  genres?: string;
  overview?: string;
  // TV/anime (binge)
  cast?: string;
  numberOfEpisodes?: number;
  numberOfSeasons?: number;
  episodeRuntime?: number;
  totalWatchTime?: string;
  // 사용자 입력: 이 작품을 추천하는 이유
  reason: string;
};

// 작성 화면 드래프트 상태
export type PostDraft = {
  postType: PostType;
  title: string; // 블로그 포스팅 제목 (SEO)
  posterUrl: string | null;
  genres: string[];
  status: PostStatus;
  // 영화 리뷰 고유
  movieTitle: string;
  rating: number; // 1~5
  watchReason: string; // 포스팅 계기/관람 이유 (reason)
  comment: string; // 나의 주관적 감상평 (review)
  details: MovieDetails | null; // TMDB 상세 (감독/배우/스틸컷 등)
  // 프리뷰: 개봉일 / 기대 포인트
  releaseDate: string;
  expectPoints: string;
  // 큐레이션·정주행: 테마 + 다중 작품 목록
  theme: string; // 포스팅 메인 테마 (예: "스티븐 스필버그의 필모그래피")
  items: CurationItem[];
  // 사진 포스팅: 카테고리 / 장소명 / 업로드 이미지 이름 + 캡션
  photoCategory: string; // 맛집카페 | 일상기록 | 여행나들이 | 전시문화
  placeName: string;
  imageNames: string[];
  imageCaptions: string[]; // imageNames와 1:1 대응
  imagePreviewUrls: string[]; // blob: URL (미리보기 전용, API 전송 안 함)
  // PDF 요약: 카테고리, 공고문: 소개 목적 / 추출 텍스트
  category: string;
  purpose: string;
  pdfText: string; // PDF에서 추출한 본문 (서버 추출)
  pdfNames: string[];
  // 로컬소식 브랜드 색상 (섹션 헤더 bg)
  brandColor: string;
  // 헤더 표시용 짧은 제목 (PDF·사진·로컬 전용, 비워두면 title 사용)
  shortTitle: string;
  // 본문 (사용자 메모/지시) + 생성 결과
  body: string;
  generatedHtml: string;
  seoTitles: string[]; // 생성 결과의 네이버 SEO 제목 5개
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
    comment: "",
    details: null,
    releaseDate: "",
    expectPoints: "",
    theme: "",
    items: [],
    photoCategory: "",
    placeName: "",
    imageNames: [],
    imageCaptions: [],
    imagePreviewUrls: [],
    category: "",
    purpose: "",
    pdfText: "",
    pdfNames: [],
    brandColor: "#1a2e4a",
    shortTitle: "",
    body: "",
    generatedHtml: "",
    seoTitles: [],
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
  essay: { label: "일상·생각·경험", icon: "✍️" },
};

/** 알 수 없는(레거시) post_type 도 안전 처리. */
export function postTypeMeta(t: string): { label: string; icon: string } {
  return POST_TYPE_META[t as PostType] ?? { label: t || "기타", icon: "📝" };
}
