# Claude Code 인수인계 — AI 맞춤 작성

작성일: 2026-09-13 (Asia/Seoul)

이 문서는 MK Studio에서 진행한 주제 적응형 포스팅 기능의 대화 맥락, 구현 과정과 검증 상태를 다음 Claude Code 세션에 전달한다. 아래 상태는 작성 시점 기준이며, 작업을 시작할 때 현재 코드와 Git 상태를 다시 확인한다.

## 1. 사용자가 원하는 결과

사용자 요청은 다음 순서로 발전했다.

1. 현재 프로젝트의 포스팅 프롬프트를 분석한다.
2. **사용자의 문체와 MK 페르소나는 반드시 유지**하면서 어떤 주제든 자료를 찾아 전략을 수립하고 글을 작성하도록 개선한다.
3. 네이버 검색 API, TMDB 등 자료 조사 도구를 AI용 wiki로 제공한다.
4. 이 기능을 **AI 맞춤 작성 탭(`/smart-write`)에 적용**한다.
5. 구현 진행을 승인했고, 이후 작업 계속 진행과 현재 인수인계 문서 작성을 요청했다.

여기서 ‘반응형 자동화’는 입력 주제·자료·부족한 정보에 따라 조사와 작성 전략을 조정하는 의미로 구현했다. 모바일 화면 대응도 별도로 확인했다. wiki는 현재 AI가 읽는 Markdown 도구 안내서로 해석했으며, 사용자용 위키 편집 화면은 만들지 않았다.

현재 목표의 1차 구현은 완료됐다. 다음 세션에서 처음부터 다시 설계하거나 구현 허가를 재요청할 필요는 없다. 다만 후속 기능 전체가 이미 구현된 것으로 해석하거나, 초안 생성을 네이버 직접 발행으로 표현하면 안 된다.

## 2. 먼저 읽을 자료

이 문서가 `docs/CLAUDE-CODE-HANDOFF.md`에 있다는 기준으로 링크한다. 상세 기능·API·설정은 기존 문서를 원본으로 삼고 여기서 중복 관리하지 않는다.

| 문서 | 읽는 이유 |
|---|---|
| [smart-write.md](./smart-write.md) | 실제 구현 범위, 환경변수, 저장 방식, API, 실행 명령 |
| [adaptive-posting.md](./plans/adaptive-posting.md) | 최초 주제 적응형 포스팅 설계와 의도 |
| [smart-write-implementation.md](./plans/smart-write-implementation.md) | AI 맞춤 작성 탭 적용 계획, A~D 개발 묶음 |
| [naver-search.md](./writing-tools/naver-search.md) | 네이버 도구 안내서 |
| [tmdb.md](./writing-tools/tmdb.md) | 작품 식별·상세 조회 안내서 |
| [read-url.md](./writing-tools/read-url.md) | 공개 원문 읽기 안내서 |

계획 문서의 세부 제안보다 현재 코드와 `smart-write.md`의 실제 구현 설명을 우선한다. 예를 들어 전용 Zustand store 제안은 React 훅으로 구현했고, 전략 수정 API는 PATCH 제안에서 POST로 구현했다.

## 3. 작업 환경과 변경사항 보존

- 프로젝트: `C:\Users\shock\Desktop\MK AI\웹 배포\mk-studio`
- 셸: Windows PowerShell. UTF-8 문서는 `Get-Content -Encoding utf8`로 읽는다.
- 기술 스택: Next.js App Router, TypeScript, React, Anthropic SDK, Postgres. 정확한 버전은 `package.json`과 lockfile 참조.
- 이번 구현에 대한 커밋·PR·배포·네이버 발행은 수행하지 않았다. 변경 파일과 신규 파일이 작업 트리에 남아 있다.
- `.env.local`의 비밀값을 출력하거나 인수인계 문서·커밋에 복사하지 않는다.

**이번 기능 구현 시작 시 이미 변경되어 있었고, 이번 구현에서 덮어쓰지 않은 파일:**

`lib/post-lint.ts`, `lib/prompts/base.ts`, `lib/prompts/class101.ts`, `lib/prompts/daily.ts`, `lib/prompts/local.ts`, `lib/prompts/market.ts`, `lib/prompts/movie.ts`, `lib/prompts/workflow.ts`.

이 8개 파일의 Git diff를 새 기능 구현자가 전부 만든 변경으로 취급하거나 일괄 되돌리지 않는다. 새 작성기는 현재 작업 트리에 있는 공통 문체 기준을 가져와 사용한다.

이번 구현의 주요 변경 영역은 `app/smart-write/page.tsx`, `app/api/smart-write/`, `components/smart-write/`, `lib/writing/`, `scripts/smart-write.test.cjs`, 관련 `docs/`, `.env.example`, `.gitignore`, `next.config.ts`, `package.json`이다. 파일 목록은 `git status --short`로 확인한다.

## 4. 구현 과정에서 확정한 결정

### 기존 작성 화면과 상태 분리

기존 `/smart-write`는 `/write`와 같은 WorkflowShell·전역 상태를 사용했다. 작업 복원과 조사 상태를 위해 별도 workspace와 `components/smart-write/use-smart-write.ts`를 만들었다. 기존 일반 작성 화면은 기존 흐름을 유지한다.

### 문체의 공통 기준 유지

`lib/writing/prompts.ts`가 기존 base의 `getMkVoiceBlock`, `getCommonConstraints`, `buildStyleReference`를 조합한다. RSS 문체 표본과 누적 프로필은 보조 자료로 저장하며, 이번 사용자 경험·판단을 덮어쓰는 근거로 사용하지 않는다. 글 주제는 기존 PostType enum으로 제한하지 않는다.

정보 전달과 경험 중심 글에 기존 full/light 문체 강도를 적용한다. 이 선택을 MK 정체성을 다른 페르소나로 바꾸는 기능으로 확장하면 안 된다.

### 단계 실행과 저장

`lib/writing/engine.ts`가 조사·전략·질문·작성·검수를 실행한다. 브라우저는 서버에 단계별 요청을 순차 전송한다. 상태는 모델 문장에 특정 종료 문구가 있는지로 판단하지 않고 구조화된 값으로 관리한다.

중복 생성은 클라이언트 UUID로 처리하고, 변경 시 버전과 4분 잠금으로 동시 실행·오래된 응답 저장을 제한한다. 재시도는 저장된 실패 단계에서 이어진다. 현재 저장 구조는 최신 payload와 로그이며, 모든 과거 원고를 되돌릴 수 있는 개별 리비전 보관함은 없다.

운영은 `repository.ts`의 Postgres 저장소, 개발은 `local-repository.ts`의 파일 저장소를 사용한다. 운영 환경에서 DB가 없으면 명시적으로 실패한다. 작업 접근 권한은 브라우저 HttpOnly 쿠키에 연결하며, 이는 계정 기반 로그인 체계가 아니다.

### 자료와 경험의 구분

문서, 검색 요약, 읽은 원문, TMDB 정보를 별도 출처로 보존한다. 출처 ID 존재 여부와 주장이 실제 출처 내용으로 뒷받침되는지는 각각 검사한다. 사용자 경험도 별도 참조 ID를 사용한다.

TMDB 기존 코드에는 키가 없을 때 mock을 쓰는 경로가 있어 새 어댑터에서 설정 여부를 먼저 검사한다. 여러 작품 후보는 사용자 확인을 받는다. TV의 추정 시간 기본값과 사진·장면을 추론하게 할 수 있는 이미지 필드는 검증된 사실처럼 전달하지 않는다.

원문 읽기는 공개 주소만 허용하고 DNS 결과 IP를 고정해 요청한다. 리디렉션도 재검증한다. 조사 도구·호출 수·입력 길이에 한도가 있으며 임의 URL이나 임의 도구를 실행하지 않는다.

### 구조화 원고와 검수

모델은 원고 구조를 반환하고 `render.ts`가 HTML과 시그니처를 만든다. 텍스트 이스케이프와 제한된 굵은 강조를 적용한다. 본문은 출처·경험·사진 참조를 가진다.

검수는 코드 규칙 검사와 모델의 근거·경험·문체 대조를 함께 사용한다. 오류가 있으면 최대 2회 수정한다. 남은 경고나 전략의 자료 한계가 있으면 `needs_review`이므로, `issues=[]`인데 `needs_review`인 경우에도 `strategy.limitations`를 확인한다.

## 5. 실제 검증에서 발견하고 수정한 문제

| 문제 | 적용한 수정 |
|---|---|
| Next 개발 서버가 127.0.0.1을 localhost로 정규화해 정상 요청이 403 | `http.ts`에서 실제 Host 헤더와 Origin을 비교. 타 출처·cross-site 차단 회귀 테스트 추가 |
| Windows에서 원문 도메인 `resolve4`가 ETIMEOUT | OS `lookup`의 IPv4 결과를 사용하고 검증한 IP를 요청에 고정. 실제 원문 조회 성공 확인 |
| 모바일 헤더의 새 글 버튼과 기존 햄버거 겹침 | smart workspace 헤더에 모바일 우측 여백 추가 |
| Playwright에서 미리보기 iframe의 opaque origin 관련 오류 | sandbox를 `allow-same-origin`으로 설정. scripts 권한은 추가하지 않음 |
| 생성물이 메모에 없는 고개 끄덕임·현장 분위기를 추가하고 제목에서 대상을 바꿈 | 사소한 행동도 창작 경험이라는 작성·검수 지침 추가. 제목 5개 전체와 가상 기록 전제도 검사하도록 보강 |
| 개발 파일 저장 코드로 인해 Turbopack이 프로젝트 전체를 파일 추적 | 개발 저장소를 별도 모듈로 분리하고 production 분기에서 import를 제외. 최종 빌드 경고 해결 |

파일 추적 문제는 ignore 주석과 경로 조정만으로 해결되지 않아 저장소를 분리한 것이다. 이 분리를 되돌리지 않는다. `next.config.ts`의 도구 wiki 포함 및 `.env*`·`.data/` 제외 설정도 유지한다.

## 6. 검증 결과와 증거의 범위

최종 코드 기준 자동 테스트 12개와 운영 빌드가 통과했다. 독립 타입 검사도 통과했으며, 마지막 저장소 분리 후에는 운영 빌드 내 TypeScript 검사까지 통과했다.

```powershell
npm run test:smart-write
npx tsc --noEmit --incremental false
npm run build
```

자동 테스트는 실제 유료 API를 호출하지 않는다. 복합 입력, 공개 주소 검사, 요청 출처 검사, 운영 DB 필수 조건, 도구 제한, mock 차단, HTML 처리, 문체·참조 검사, 저장 소유권·동시성, 전체 단계 전환·수정, 수정 횟수 한도, 실패 체크포인트를 확인한다.

별도 실연동 검증 결과:

- 실제 AI로 제공된 가상 독서모임 기록을 전략→초안→검수→수정까지 완주했다. 지침 보강 후 가상 기록 전제를 본문에 유지했고 이전에 추가됐던 행동 묘사가 제거됐다. 이는 한 사례의 검증이며 문체·사실 정확성 전체를 보증하는 결과는 아니다.
- 보강 후 사례는 약 49,548 input+output 토큰, 수정 1회였다. 일반적인 모든 글의 예상 비용·시간으로 사용하지 않는다.
- 네이버 웹·뉴스 검색 각각 4개 결과, 공개 원문 추출, TMDB 후보 3개 및 인셉션(2010) 상세·러닝타임을 실제 API로 확인했다.
- 실제 API 경로에서 PDF/TXT 추출 성공, 잘못된 PDF 400 응답을 확인했다.
- 브라우저 UI는 모의 API를 사용해 복합 첨부 전달, 질문 복원, 자동 단계 전환, 제목 선택·HTML 저장, 전략 수정, 390px 가로 넘침 없음, 기존 `/write` 화면 표시를 확인했다. 이 UI 검증을 모든 실제 서비스가 연결된 단일 E2E 검증으로 표현하지 않는다.
- 최종 4개 smart-write API 배포 파일 목록에서 비공개 환경·작업 파일은 0개였고, 각 목록에 wiki 3개가 포함된 것을 확인했다.

로컬 증거는 Git에서 제외된 `.data/` 아래에 있다. 다른 체크아웃에는 없을 수 있다.

| 경로 | 내용 |
|---|---|
| `.data/smart-write-live.cjs`, `smart-write-live-result.json` | 실 AI 호출 스크립트와 마지막 결과 |
| `.data/smart-write-search-live.cjs` | 실 검색·원문·TMDB 연결 확인 |
| `.data/smart-write-materials-live.cjs` | 문서 업로드·추출 확인 |
| `.data/smart-write-browser.cjs`, `smart-write-browser-results.json` | 모의 API 브라우저 검증 |
| `.data/smart-write-input-desktop.png`, `smart-write-result-desktop.png`, `smart-write-result-mobile.png` | 화면 확인 자료 |

브라우저 스크립트는 당시 머신의 npm 캐시 Playwright와 Chrome 경로를 사용한 임시 도구다. CI에 바로 사용할 수 있는 이식 가능한 테스트로 간주하지 않는다. 개발 서버는 검증 당시 `127.0.0.1:3002`로 실행했으며 현재도 실행 중인지는 확인이 필요하다.

## 7. 미완료 범위와 다음 세션의 우선순위

**배포 전 아직 확인하지 못한 것:** 로컬에 `DATABASE_URL`이 없어 실제 Postgres 연결로 저장·복원·동시성·권한·잠금 만료를 검증하지 않았다. 파일 저장 테스트 통과를 운영 DB 검증 완료로 간주하면 안 된다. 배포 환경의 연결과 테이블 생성 권한을 먼저 확인한다.

**명시적인 후속 범위:** 탭을 닫아도 계속 도는 서버 worker, 일부 문단만 수정, 과거 원고 리비전 조회, 추가 조사 제공자, 사진 픽셀 분석, Sheets 내보내기, 네이버 직접 발행. 현재 사진은 파일명·사용자 메모로 배치하며, 마켓 참여 팀 등 반복 정보는 경험란 또는 문서로 받는다.

다음 세션은 사용자의 새 요청에 맞춰 범위를 선택한다. 별도 방향이 없다면 다음 순서가 합리적이다.

1. Git 상태와 위 보존 대상 파일을 확인하고 기존 변경 위에 이어서 작업한다.
2. 현재 기능을 운영에 반영할 작업이라면 실제 Postgres 검증부터 한다.
3. 영화·로컬 정보·일반 설명 사례를 실제 사용자 자료로 비교해 문체 보존과 사실 검수의 실패 패턴을 모은다. 사용자가 강조한 표현·판단을 기준으로 평가한다.
4. 후속 기능은 현재 단계 실행기를 재사용해 확장한다. 백그라운드 실행이나 직접 발행이 이미 제공되는 것처럼 UI 문구만 바꾸지 않는다.

단순 인수인계 문서 작성 요청을 배포·커밋·외부 발행 요청으로 확장하지 않는다. 현재 새로 만든 것은 이 문서 한 개다.

## 8. Claude Code용 시작 프롬프트

> `docs/CLAUDE-CODE-HANDOFF.md`를 읽고 MK Studio AI 맞춤 작성 작업을 이어받아줘. 실제 구현 안내는 `docs/smart-write.md`를 기준으로 하고, 최초 계획과 현재 구현의 차이를 구분해줘. 기존 MK 문체·페르소나와 이번 사용자 경험·핵심 표현을 최우선으로 보존해줘. Git에 이미 남아 있는 프롬프트 수정사항은 되돌리지 말고, 완료한 검증과 아직 못 한 운영 DB 검증을 구분한 뒤 내 다음 요청에 맞춰 진행해줘.

다음 세션에 필수인 추가 스킬은 없다. 구조 개편 요청이 생길 때만 사용 가능한 architecture 관련 스킬을 검토하고, 다시 인수인계할 때는 handoff 스킬을 사용할 수 있다. Codex 전용 스킬 경로가 Claude Code에서도 제공된다고 가정하지 않는다.
