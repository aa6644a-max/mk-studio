# MK 블로그 워크플로우 V4 — PRD

> V3 포스팅 타입별 폼 방식 → 대화형 인터뷰 + 마케팅 스킬 통합 워크플로우로 전면 재설계.

---

## 1. 배경 & 목표

**왜 바꾸나:**
- V3 `/write`: 타입 선택 → 폼 채우기 → 생성. 기계적, 마케팅 관점 없음
- 마케팅 전략 탭과 포스팅 생성이 완전 단절
- SEO/콘텐츠 전략 없이 주제만 던지면 AI가 씀
- 인터뷰 없이 폼만 채우니 AI가 맥락 부족한 글 생성

**목표:**
- 주제 하나 던지면 → 전략 수립 → 인터뷰 → 고품질 포스팅까지 원스톱
- 마케팅 스킬(content-strategy / copywriting / ai-seo) 워크플로우에 내장
- 문체 복제 + 외부 API + 마케팅 프레임워크 삼중 적용
- Class101 파트너스도 동일 워크플로우로 통일

---

## 2. 기술 스택

| 항목 | 결정 |
|---|---|
| 프레임워크 | Next.js 15 (App Router) — 기존 유지 |
| 배포 | Railway — 기존 유지 |
| DB | Google Sheets API (`MK_CINELAB_DB`) — 기존 유지 |
| AI | Claude Sonnet 4.6 — **스트리밍 전환** |
| 스트리밍 | Vercel AI SDK `streamText` 또는 Anthropic SDK `stream()` |
| UI | 채팅 버블 컴포넌트 (모바일 퍼스트) |

---

## 3. 새 워크플로우 전체 흐름

```
┌─────────────────────────────────────────────┐
│  1. 주제 입력                                │
│     "어벤져스 리뷰 써줘"                      │
│     "대구 청년지원사업 공고 정리해줘"           │
└────────────────┬────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────┐
│  2. 전략 카드 (자동 생성, 수정 가능)           │
│                                              │
│  감지된 타입: 🎥 영화 리뷰  [변경 ▾]          │
│  ─────────────────────────────────────────  │
│  📌 SEO 키워드: 어벤져스 리뷰, 마블 추천      │
│  🎯 타겟 독자: 마블 팬, 액션 영화 좋아하는 20대│
│  📐 콘텐츠 각도: 감정 중심 리뷰 + 캐릭터 분석 │
│                                              │
│              [이 전략으로 시작]               │
└────────────────┬────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────┐
│  3. AI 인터뷰 (채팅 버블, 스트리밍)           │
│                                              │
│  AI: 어떤 어벤져스예요? 엔드게임인가요?        │
│  나: 인피니티 워                              │
│  AI: 언제 보셨어요? 관람 계기가 있었나요?      │
│  나: 친구 추천으로 어제 CGV에서                │
│  AI: 가장 기억에 남는 장면이나 캐릭터는요?     │
│  나: 타노스 손가락 튕기는 장면                 │
│  AI: 충분해요. 지금 포스팅 생성할게요. ✓      │
└────────────────┬────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────┐
│  4. 포스팅 생성 (스트리밍)                    │
│     - 문체 RSS 상시 주입                     │
│     - 타입별 HTML 레이아웃 자동 적용           │
│     - 외부 API 데이터 (TMDB 스틸컷 등) 포함   │
└────────────────┬────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────┐
│  5. 결과                                     │
│     - HTML 미리보기                           │
│     - SEO 제목 5개 제안                       │
│     - [HTML 복사] [Google Sheets 저장]        │
└─────────────────────────────────────────────┘
```

---

## 4. 단계별 상세 스펙

### 4-1. 주제 입력

- 빈 채팅창 + 큰 placeholder: `"어떤 포스팅 쓸까요? 주제를 자유롭게 말해주세요"`
- 제출 → 전략 카드 생성 트리거

### 4-2. 전략 카드

**AI가 주제 분석 후 자동 생성하는 카드:**

| 필드 | 내용 |
|---|---|
| 감지된 포스팅 타입 | 7타입 중 자동 선택 + [변경] 드롭다운 |
| SEO 키워드 | 네이버 검색 기반 2~4개 키워드 제안 |
| 타겟 독자 | 구체적 독자 설명 |
| 콘텐츠 각도 | Searchable / Shareable / Both 판단 + 구조 제안 |
| Naver DataLab 트렌드 | 관련 키워드 최근 28일 트렌드 (가능한 경우) |

사용자 확인 → "이 전략으로 시작" 버튼 → 인터뷰 시작

**마케팅 스킬 적용 지점:**
- `content-strategy`: 콘텐츠 각도/구조 설계
- `ai-seo`: 네이버 AI 검색 최적화 키워드
- `copywriting`: 헤드라인 방향 제안

### 4-3. AI 인터뷰

- 채팅 버블 UI (AI 왼쪽 / 사용자 오른쪽)
- AI 질문 스트리밍 출력
- 종료 조건: **AI 자율 판단** — 포스팅 생성에 충분한 정보 수집 시 선언
- 인터뷰 내내 상시 주입:
  - RSS 최근 포스팅 5개 (문체 학습)
  - Google Sheets 동일 타입 레퍼런스 3개
  - 전략 카드 결과 (SEO 키워드, 타겟 독자, 각도)
- 타입별 인터뷰 포커스:

| 타입 | 핵심 질문 영역 |
|---|---|
| 영화 리뷰 | 영화명, 관람 계기, 기억에 남는 장면, 평점 |
| 개봉 프리뷰 | 영화명, 기대 포인트, 개봉일 |
| 큐레이션 | 테마, 추천 작품들, 추천 이유 |
| 정주행 추천 | 시리즈명, 회차/볼륨, 추천 포인트 |
| 사진 포스팅 | 장소/카테고리, 분위기, 사진 설명 |
| 로컬소식 | PDF 업로드 → 인터뷰 없이 바로 생성 |
| PDF 요약 | PDF 업로드 → 카테고리, 추가 맥락 |

### 4-4. 포스팅 생성

**스트리밍 방식:**
- `anthropic.messages.stream()` 사용
- Server-Sent Events로 클라이언트에 실시간 전달
- 기존 타입별 HTML 레이아웃 프롬프트 그대로 재사용 (`movie.ts` / `daily.ts` / `local.ts`)
- 외부 API 자동 호출 (타입에 따라):
  - 영화 타입 → TMDB 포스터 + 스틸컷 자동 삽입
  - 로컬 타입 → MK LINK 시그니처 코드 강제 주입 (버그 픽스 반영)

### 4-5. 결과 화면

- HTML 미리보기 (iframe 또는 인라인)
- SEO 제목 5개 클릭 선택
- [HTML 복사] 버튼 → 네이버 블로그 붙여넣기
- [저장] 버튼 → Google Sheets `MK_CINELAB_DB` 저장

---

## 5. Class101 파트너스 통합

**변경 전:**
```
카테고리 입력창 + 강의명 입력창 → 생성
```

**변경 후 (동일 워크플로우):**
```
"어떤 Class101 강의 포스팅할까요?" 채팅창
  ↓
전략 카드 (타입: class101 자동 감지)
  ↓
AI 인터뷰 (카테고리, 강의명, 수강생 타겟, 강점 등)
  ↓
파트너스 포스팅 생성 (기존 class101.ts 프롬프트 재사용)
```

페이지 위치: `/partnerships/class101` 유지, UI만 워크플로우로 교체.

---

## 6. AI 아키텍처

### 6-1. 전략 카드 생성 API
```
POST /api/workflow/strategy
Body: { topic: string }
Response: { type: PostType, keywords: string[], target: string, angle: string, trend?: TrendResult }
```
- 마케팅 스킬 프레임워크 시스템 프롬프트 주입
- Naver DataLab 트렌드 병렬 조회

### 6-2. 인터뷰 API (스트리밍)
```
POST /api/workflow/interview
Body: { messages: ChatMessage[], strategy: StrategyCard, postType: PostType }
Response: SSE stream
```
- 시스템 프롬프트: 문체 RSS + 레퍼런스 + 전략 카드 + 인터뷰 종료 판단 지시
- 스트리밍 응답

### 6-3. 포스팅 생성 API (스트리밍)
```
POST /api/workflow/generate
Body: { interviewLog: ChatMessage[], strategy: StrategyCard, postType: PostType }
Response: SSE stream (HTML)
```
- 기존 `buildPrompt()` 재사용
- TMDB/KOBIS 데이터 병렬 조회 후 프롬프트 주입
- 스트리밍 응답

---

## 7. UI 컴포넌트 구조

```
app/write/page.tsx                   ← 워크플로우 진입점 (교체)
app/partnerships/class101/page.tsx   ← 워크플로우 적용 (교체)

components/workflow/
  ├── workflow-shell.tsx             ← 전체 레이아웃 (모바일 퍼스트)
  ├── topic-input.tsx                ← 주제 입력창
  ├── strategy-card.tsx              ← 전략 카드 + 타입 변경
  ├── chat-interview.tsx             ← 채팅 버블 인터뷰
  ├── chat-bubble.tsx                ← 말풍선 (AI/사용자)
  ├── stream-output.tsx              ← 스트리밍 포스팅 출력
  └── result-panel.tsx              ← HTML 미리보기 + 복사 + 저장
```

**모바일 레이아웃:**
- 전략 카드: 풀스크린 카드 (스크롤)
- 채팅: iOS 메시지앱 스타일, 키보드 올라와도 입력창 고정
- 결과: 전체 화면 HTML 미리보기 + 하단 액션 버튼

---

## 8. 데이터 플로우

```typescript
// 워크플로우 상태 (클라이언트 zustand)
type WorkflowState = {
  stage: "input" | "strategy" | "interview" | "generating" | "result";
  topic: string;
  strategy: StrategyCard | null;
  messages: ChatMessage[];       // 인터뷰 대화 로그
  postType: PostType;
  generatedHtml: string;
  seoTitles: string[];
};
```

저장 대상 (Google Sheets):
- 인터뷰 대화 로그: **저장 안 함**
- 최종 결과만: timestamp / 제목 / postType / HTML / status

---

## 9. 기존 코드 재사용 목록

| 기존 | V4 활용 방식 |
|---|---|
| `lib/prompts/movie.ts` | 포스팅 생성 시 그대로 재사용 |
| `lib/prompts/daily.ts` | 포스팅 생성 시 그대로 재사용 |
| `lib/prompts/local.ts` | 포스팅 생성 시 그대로 재사용 (+ MK LINK 강제 주입 버그픽스 적용) |
| `lib/prompts/class101.ts` | Class101 워크플로우 생성 시 재사용 |
| `lib/google-sheets.ts` | 그대로 유지 |
| `lib/tmdb.ts` | 그대로 유지 |
| `lib/kobis.ts` | 그대로 유지 |
| `lib/naver-datalab.ts` | 전략 카드 트렌드 데이터로 활용 |
| `lib/rss-client.ts` | 인터뷰 시스템 프롬프트에 상시 주입 |
| `lib/html-formatter.ts` | 그대로 유지 |

**삭제 대상:**
- `components/write/wizard.tsx`
- `components/write/write-workspace.tsx`
- `components/write/meta-panel.tsx` (또는 대폭 축소)

---

## 10. Phase 계획

### Phase 1 — 워크플로우 코어
- [ ] `WorkflowState` zustand 스토어
- [ ] 주제 입력 → 전략 카드 생성 (`/api/workflow/strategy`)
- [ ] 전략 카드 UI (타입 변경 포함)
- [ ] 채팅 인터뷰 UI + 스트리밍 (`/api/workflow/interview`)
- [ ] 포스팅 생성 스트리밍 (`/api/workflow/generate`)
- [ ] 결과 패널 (HTML 미리보기 + 복사 + 저장)
- [ ] `/write` 교체

### Phase 2 — Class101 통합
- [ ] Class101 전략 카드 (파트너스 특화 마케팅 각도)
- [ ] `/partnerships/class101` 워크플로우로 교체

### Phase 3 — 마케팅 스킬 고도화
- [ ] Naver DataLab 트렌드 → 전략 카드 실시간 반영
- [ ] SEO 제목 A/B 제안 고도화 (copywriting 스킬 심화 적용)
- [ ] 인터뷰 질문 품질 개선 (타입별 특화 질문 셋)

### Phase 4 — 모바일 UX 완성
- [ ] 모바일 채팅 키보드 대응
- [ ] 하단 네비 업데이트 (워크플로우 탭)
- [ ] PWA 추가 고려

---

## 11. 환경변수 (기존 유지)

```env
ANTHROPIC_API_KEY=
TMDB_API_KEY=
KOBIS_API_KEY=
OMDB_API_KEY=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
GOOGLE_CREDENTIALS_JSON=
GOOGLE_SPREADSHEET_NAME=MK_CINELAB_DB
```
