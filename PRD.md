# MK Studio V3 — PRD

> 영화 평론가 MK의 개인 포스팅 작업실. Python/Streamlit V2 → Next.js V3 완전 재설계.

---

## 1. 배경 & 목표

**왜 다시 만드나:**
- Streamlit: 커스터마이징 자유도 낮음, session_state 비효율, 단일 파일 1000줄 비대화
- 이미지 작업실(MK_STUDIO.html)이 포스팅 워크플로와 단절
- "진짜 작업실" UX가 아닌 도구 모음 수준

**목표:**
- 디자인 파일(`MK Studio Workspace.dc.html`) 기반의 VS Code형 작업실 구현
- 포스팅 생성 → 저장 → 이미지 작업 → 네이버 발행 준비까지 원스톱

---

## 2. 기술 스택

| 항목 | 결정 |
|---|---|
| 프레임워크 | Next.js 15 (App Router) |
| 배포 | Railway |
| DB | Google Sheets API (기존 `MK_CINELAB_DB` 유지) |
| AI | Claude Sonnet 4.6 (Anthropic SDK) |
| 폰트 | Pretendard |
| 인증 | 없음 (Railway obscure URL + API 키 서버사이드) |

**레포 위치:** `C:\Users\shock\Desktop\MK AI\웹 배포\mk-studio`

---

## 3. 레이아웃 & 디자인 시스템

디자인 파일(`MK Studio Workspace.dc.html`) 픽셀 퍼펙트 구현.

```
┌─────────────┬──────────────────────────────────────┐
│  SIDEBAR    │  HEADER (52px)                       │
│  (228px)    │──────────────────────────────────────│
│  #171719    │                                      │
│             │  MAIN CONTENT                        │
│  로고        │  (flex:1, overflow-y:auto)           │
│  네비        │                                      │
│  설정/유저   │                                      │
└─────────────┴──────────────────────────────────────┘
```

**디자인 토큰:**
- 사이드바 배경: `#171719`
- 액센트 블루: `#0066FF`
- 페이지 배경: `#F7F7F8`
- 패널: `white`, `box-shadow: inset 0 0 0 1px rgba(112,115,124,0.13)`
- 폰트: `Pretendard JP / Pretendard`

**모바일:** 사이드바 숨김 + 하단 네비바 (홈/작성/히스토리/이미지)

---

## 4. 네비게이션 구조

사이드바 4개 항목:

| 아이콘 | 라벨 | 라우트 |
|---|---|---|
| 🏠 | 홈 | `/` |
| ✏️ | 리뷰 작성 | `/write` |
| 🕐 | 히스토리 | `/history` |
| 🖼️ | 이미지 작업실 | `/images` |

---

## 5. 페이지별 스펙

### 5-1. 홈 (대시보드) `/`

**컴포넌트:**
- 인사 + 오늘 날짜
- 통계 3칸 그리드: 총 리뷰 수 · 이번 달 작성 수 · 평균 평점
- 박스오피스 TOP 5 (KOBIS API, 전일 기준) — 기존 `영화검색` 탭 흡수
- 최근 리뷰 3개 그리드 (포스터 컬러 + 제목 + 평점 + 날짜)

**헤더 우측:** `새 리뷰` 버튼 → `/write` 이동

---

### 5-2. 리뷰 작성 `/write`

**레이아웃:** 좌측 메타패널(264px) + 우측 에디터(flex:1)

#### 메타패널 (왼쪽)
- **포스팅 타입 선택기** (드롭다운) — 7개 타입 전환 시 하단 필드 동적 교체
- 포스터 이미지 (타입별 자동 or 수동 업로드)
- 공통 필드: 제목, 장르 태그, 상태(임시저장/발행됨)
- 타입별 고유 필드 (아래 섹션 참조)

#### 에디터 (오른쪽)
- 리뷰 제목 입력 (26px, 폰트웨이트 800)
- 툴바: B / I / U / H1 / H2 / 목록 / 링크 / 이미지
- 텍스트에어리어 (min-height: 400px)
- 하단: 글자수 · 자동저장 표시

#### 헤더 우측: `임시저장` + `발행하기` 버튼

**발행하기 플로우:**
1. Claude API 호출 (서버 액션) → 완성 후 HTML 반환
2. Google Sheets 저장 (timestamp · movie_title · post_type · content · status)
3. 에디터에 생성 결과 표시
4. HTML 복사 버튼 → 네이버 블로그 수동 붙여넣기

---

### 5-3. 포스팅 타입별 메타패널 필드

| 타입 | 고유 입력 필드 |
|---|---|
| 🎥 영화 리뷰 | TMDB 영화 검색 → 포스터 자동, 평점★(1~5), 관람 계기 |
| 📅 개봉 프리뷰 | TMDB 영화 검색, 개봉일, 기대 포인트 |
| 🎬 큐레이션 리스트 | 테마 키워드, 영화 여러 편 추가 |
| 📺 정주행 추천 | 시리즈명, 회차 구성 |
| 📸 사진 포스팅 | 사진 여러 장 업로드, 장소명, PDF(선택) |
| 📢 로컬소식/공고문 | PDF 업로드(복수), 소개 목적 |
| 📄 PDF 요약 | PDF 업로드(복수), 카테고리, 추가 맥락 |

---

### 5-4. 히스토리 `/history`

- 필터 탭: 전체 · 발행됨 · 임시저장
- 리스트: 포스터컬러 썸네일 + 제목 + 평점 + 장르 + 날짜 + 상태 뱃지
- 헤더 우측: 검색

---

### 5-5. 이미지 작업실 `/images`

**두 가지 모드:**

**A. 갤러리**
- 업로드존 (드래그 & 드롭, PNG/JPG/WEBP, 최대 10MB)
- 4열 그리드 뷰 / 목록 뷰 전환
- 갤러리에서 선택 → 에디터 메타패널 포스터로 삽입 가능

**B. 썸네일 제작기**
- 기존 `MK_STUDIO.html`의 T05 / T06 Canvas 기능 완전 이식
- 새 디자인 시스템(`#171719`, `#0066FF`, Pretendard)으로 UI 전면 리디자인
- 기능(Canvas 렌더링, 텍스트 레이어, 내보내기) 100% 보존

---

## 6. AI 아키텍처

### 호출 방식
- Next.js Server Action 또는 API Route
- `await anthropic.messages.create()` — 완성 후 JSON 응답 (스트리밍 없음)
- 타임아웃 없음 (Railway, 생성 1~2분 허용)
- API 키는 서버 환경변수에만 (`ANTHROPIC_API_KEY`)

### 문체 학습 (RAG-lite)
- 포스팅 생성 시 Google Sheets에서 최근 포스팅 N개 조회
- 시스템 프롬프트에 `_get_reference_prompt(reference_posts)` 패턴으로 주입
- 기존 `BasePromptBuilder._get_design_system()` · `_get_common_constraints()` 로직 TypeScript로 이식

### 프롬프트 모듈 (TypeScript 이식 대상)
- `BasePromptBuilder` → `lib/prompts/base.ts`
- `PromptBuilder` (영화리뷰/개봉프리뷰/큐레이션/정주행) → `lib/prompts/movie.ts`
- `DailyPromptBuilder` (PDF요약) → `lib/prompts/daily.ts`
- `LocalNewsPromptBuilder` → `lib/prompts/local.ts`

---

## 7. 외부 API

| API | 용도 | 기존 유지 여부 |
|---|---|---|
| Anthropic Claude Sonnet 4.6 | 포스팅 생성 | ✅ |
| Google Sheets API (gspread → googleapis) | DB 저장/조회 | ✅ |
| TMDB | 영화 검색, 포스터, 메타데이터 | ✅ |
| KOBIS | 박스오피스, 영화 상세 | ✅ |
| OMDB | 영화 평점 | ✅ |
| Naver Search API | 영화 줄거리 폴백 | ✅ |

---

## 8. Google Sheets DB 스키마

기존 `MK_CINELAB_DB` 시트 구조 유지 + `status` 컬럼 추가:

| 컬럼 | 내용 |
|---|---|
| A: timestamp | `YYYY-MM-DD HH:MM:SS` |
| B: movie_title | 포스팅 제목 / 영화명 |
| C: post_type | `review` / `preview` / `curation` / `binge` / `photo` / `local` / `pdf` |
| D: content | 생성된 HTML 전문 |
| E: status | `published` / `draft` |

---

## 9. 프로젝트 디렉토리 구조

```
mk-studio/
├── app/
│   ├── layout.tsx          # 사이드바 + 레이아웃
│   ├── page.tsx            # 홈 (대시보드)
│   ├── write/
│   │   └── page.tsx        # 리뷰 작성
│   ├── history/
│   │   └── page.tsx        # 히스토리
│   ├── images/
│   │   └── page.tsx        # 이미지 작업실
│   └── api/
│       ├── generate/
│       │   └── route.ts    # Claude 포스팅 생성
│       ├── boxoffice/
│       │   └── route.ts    # KOBIS 박스오피스
│       └── tmdb/
│           └── route.ts    # TMDB 영화 검색
├── components/
│   ├── sidebar.tsx
│   ├── header.tsx
│   ├── dashboard/
│   ├── write/
│   │   ├── meta-panel.tsx
│   │   ├── editor.tsx
│   │   └── type-fields/    # 타입별 고유 필드 컴포넌트
│   ├── history/
│   └── images/
│       ├── gallery.tsx
│       └── thumbnail-maker.tsx  # T05/T06 Canvas 이식
├── lib/
│   ├── prompts/
│   │   ├── base.ts
│   │   ├── movie.ts
│   │   ├── daily.ts
│   │   └── local.ts
│   ├── google-sheets.ts    # gspread 대체
│   ├── tmdb.ts
│   ├── kobis.ts
│   └── claude.ts
└── PRD.md
```

---

## 10. Phase 계획

### Phase 1 — 기반 + 영화 리뷰 MVP
- [ ] Next.js 15 프로젝트 세팅 (App Router, Pretendard, 디자인 토큰)
- [ ] 사이드바 + 레이아웃 (디자인 파일 픽셀 퍼펙트)
- [ ] 대시보드: 박스오피스 TOP5 + 최근 리뷰 3개 + 통계
- [ ] 영화 리뷰 타입 작성 화면 (TMDB 검색 + 메타패널 + 에디터)
- [ ] Claude API 연동 (영화 리뷰 프롬프트 이식)
- [ ] Google Sheets 저장/조회
- [ ] 히스토리 목록 (필터 + 리스트)
- [ ] Railway 배포

### Phase 2 — 나머지 6개 포스팅 타입
- [ ] 개봉 프리뷰
- [ ] 큐레이션 리스트
- [ ] 정주행 추천
- [ ] 사진 포스팅 (이미지 업로드 포함)
- [ ] 로컬소식/공고문 (PDF 업로드)
- [ ] PDF 요약

### Phase 3 — 이미지 작업실
- [ ] 갤러리 (업로드 + 4열 그리드)
- [ ] T05/T06 썸네일 제작기 리디자인 + 이식
- [ ] 갤러리 → 에디터 포스터 연동

### Phase 4 — UX 고도화
- [ ] 임시저장 자동화
- [ ] 히스토리 검색
- [ ] 모바일 하단 네비
- [ ] 대시보드 통계 고도화

---

## 11. 환경변수

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
