# MK Studio V3

영화 평론가 MK의 개인 포스팅 작업실. Next.js 16 (App Router) + Tailwind v4.
포스팅 생성(Claude) → Sheets 저장 → 이미지 작업 → 네이버 발행 준비 원스톱.

자세한 기획은 [PRD.md](./PRD.md) 참고.

## 기능

- **홈 대시보드** — KOBIS 박스오피스 TOP5, 통계, 최근 리뷰
- **리뷰 작성** — 7개 포스팅 타입(영화리뷰/프리뷰/큐레이션/정주행/사진/공고문/PDF요약),
  TMDB 검색, Claude(Sonnet 4.6) 생성, 자동 임시저장, HTML 복사
- **히스토리** — 필터 탭 + 제목 검색 (Google Sheets 조회)
- **이미지 작업실** — 갤러리(업로드/그리드·목록) + 썸네일 제작기(Canvas) + 에디터 포스터 연동

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # 키 채우기 (없으면 mock 데이터로 동작)
npm run dev                  # http://localhost:3000
```

> API 키가 없어도 모든 화면이 mock 데이터/폴백으로 동작합니다. 실제 데이터는 키 설정 후.

## 환경변수

| 변수 | 용도 | 필수 |
|---|---|---|
| `ANTHROPIC_API_KEY` | 포스팅 생성 (Claude) | 생성 기능 |
| `TMDB_API_KEY` | 영화 검색·포스터 | 영화 타입 |
| `KOBIS_API_KEY` | 박스오피스 | 대시보드 |
| `GOOGLE_CREDENTIALS_JSON` | 서비스 계정 JSON (한 줄) | DB 저장/조회 |
| `GOOGLE_SPREADSHEET_ID` | 시트 ID (우선) | DB |
| `GOOGLE_SPREADSHEET_NAME` | 시트 이름 (검색, 기본 `MK_CINELAB_DB`) | DB |
| `OMDB_API_KEY` / `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` | 평점·줄거리 폴백 | 선택 |

## Railway 배포

1. Railway 프로젝트 생성 → 이 GitHub 레포 연결 (`aa6644a-max/mk-studio`)
2. `railway.json`이 빌드/시작/헬스체크를 자동 구성 (Nixpacks, `npm run build` → `npm run start`)
3. Railway **Variables**에 위 환경변수 등록 (`PORT`는 Railway가 자동 주입, `next start`가 사용)
4. 배포 후 발급된 obscure URL로 접속 (PRD §2: 인증 없음, URL 비공개 + API 키 서버사이드)

> Node 20.9+ 필요 (`engines`에 명시). 생성은 1~2분 소요될 수 있어 `/api/generate`에
> `maxDuration=300` 설정 (Railway는 서버리스 타임아웃 제한 없음).
