/**
 * MK 프로필 (인터뷰 누적 개인화) 프롬프트.
 * - groupOf: postType → 3그룹(movie/photo/info)
 * - 머지: 기존 프로필 + 이번 인터뷰 → 갱신된 프로필
 * - 주입: 프로필을 전략/인터뷰/생성 프롬프트에 넣을 블록
 */
import type { ChatMessage } from "@/lib/workflow-store";
import type { ProfileGroup, MkProfile } from "@/lib/google-sheets";

const MAX_PROFILE_CHARS = 600;
const MAX_QUOTES = 5;

/** postType → 프로필 그룹. */
export function groupOf(postType: string): ProfileGroup {
  if (["review", "preview", "curation", "binge"].includes(postType)) return "movie";
  if (postType === "photo") return "photo";
  return "info"; // local, pdf
}

const GROUP_LABEL: Record<ProfileGroup, string> = {
  movie: "영화 포스팅",
  photo: "사진 포스팅",
  info: "로컬소식·PDF 포스팅",
};

/** 그룹별로 프로필에 담아야 할 차원 (머지 시 AI 가이드). */
const GROUP_DIMENSIONS: Record<ProfileGroup, string> = {
  movie:
    "- 좋아하는 감독·장르·배우·작품 경향\n- 평가 기준 (연출/서사/연기/세계관/감정 중 무엇을 중시하는지)\n- 작품을 보는 고유한 관점·해석 성향\n- 말투·문체 특징 (자주 쓰는 표현, 문장 리듬)",
  photo:
    "- 선호하는 장소·공간 분위기 (카페·맛집·여행·전시 취향)\n- 사진/현장에서 주목하는 요소 (인테리어·음식·동선·빛 등)\n- 묘사 톤과 표현 방식\n- 방문·기록 성향 (즉흥/계획, 혼자/함께 등)",
  info:
    "- 문체·톤 (정보를 전달하는 어투 특징)\n- 자주 쓰는 표현·문장 구조\n(주의: 공고·요약은 객관 정보 전달이므로 개인 취향이 아니라 '말투/전달 방식'만 누적)",
};

/** 인터뷰 메시지 → 평문 전사. */
export function transcribe(messages: ChatMessage[]): string {
  return messages
    .filter((m) => m.content?.trim())
    .map((m) => `${m.role === "user" ? "MK" : "인터뷰어"}: ${m.content}`)
    .join("\n");
}

export function buildProfileMergeSystem(group: ProfileGroup): string {
  return `당신은 블로거 'MK'의 개인 프로필을 관리하는 분석가입니다.
지금 갱신할 프로필 그룹: ${GROUP_LABEL[group]}

기존 프로필과 이번 인터뷰 대화를 종합해, 이 그룹에 대한 MK의 누적 프로필을 갱신하세요.

[프로필에 담을 차원]
${GROUP_DIMENSIONS[group]}

[규칙]
- profileText: 위 차원을 종합한 산문 요약. ${MAX_PROFILE_CHARS}자 이내. 기존 프로필을 버리지 말고 이번 인터뷰에서 드러난 새 정보를 통합·갱신하라. 모순되면 최신 인터뷰를 우선하되 일회성 발언은 일반화하지 말 것.
- quotes: MK의 실제 말투가 잘 드러나는 날것의 발언(인터뷰 중 MK가 한 말)에서 대표 표현 최대 ${MAX_QUOTES}개. 기존 인용구와 합쳐 가장 특징적인 것만 남기고 오래되거나 평범한 것은 버려라 (롤링).
- 이번 인터뷰에 그룹과 무관한 내용뿐이면 기존 프로필을 거의 그대로 유지하라.
- 단정적 신상정보 날조 금지. 인터뷰·기존 프로필에 근거한 것만.`;
}

export function buildProfileMergeUser(
  existing: MkProfile | null,
  messages: ChatMessage[],
  topic: string,
): string {
  const prev = existing?.profileText?.trim()
    ? `${existing.profileText}\n\n[기존 대표 표현]\n${(existing.quotes ?? []).join("\n")}`
    : "(기존 프로필 없음 — 이번 인터뷰로 처음 작성)";
  return `[기존 프로필]
${prev}

[이번 포스팅 주제]
${topic}

[이번 인터뷰 대화]
${transcribe(messages)}

위를 종합해 update_profile 함수를 호출하세요.`;
}

/** 프로필을 프롬프트에 주입할 블록. 프로필 없으면 빈 문자열. */
export function buildProfileInjection(profile: MkProfile | null): string {
  if (!profile || !profile.profileText.trim()) return "";
  const quotes = (profile.quotes ?? []).length
    ? `\n[MK 말투 표본 — 문체 참고]\n${profile.quotes.map((q) => `"${q}"`).join("\n")}`
    : "";
  return `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━
[🧠 MK 프로필 — 과거 인터뷰 누적, 이 사람답게 반영]
━━━━━━━━━━━━━━━━━━━━━━━━━
${profile.profileText}${quotes}`;
}

export const PROFILE_MAX_QUOTES = MAX_QUOTES;
