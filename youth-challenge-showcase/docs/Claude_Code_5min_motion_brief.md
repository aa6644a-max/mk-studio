# 청년도전지원사업 성과공유회 | 5분 HTML 모션 프레젠테이션

> **Claude Code 작업 지시서 (레퍼런스)**  
> 발표일: 2026년 10월 29일(목) / 달서구 청년도전지원사업 성과공유회  
> 발표: 5분 사례발표. 대본 및 개인 성과는 아직 확정되지 않았으므로 **임의로 만들어내지 말 것**.

## 1. 첨부 레퍼런스 읽는 순서

1. `youth_motion_design_reference.pdf`: 시각 방향, 컬러, 타이포, 8장면 스토리보드, 구현 원칙, 출처.
2. `youth_motion_storyboard.png`: 시각적으로 한 번에 보는 8장면 배치.
3. `youth_motion_reference.html`: 브라우저에서 실행 가능한 **디자인 레퍼런스 프로토타입**. 이 파일은 개인 사실을 담은 최종본이 아닌 *샘플*이다.
4. 이 문서: 최종 프레젠테이션으로 발전시키기 위한 구현 규격.

## 2. 목표 및 전달해야 할 감정

행사 공지의 요청은 '참여하며 이룬 꿈, 달성한 목표, 참여 후 달라진 점'에 대한 사례발표다. 사업 실적 보고서 같은 기업 PPT로 만들지 말고, 발표자가 주인공인 짧은 **에디토리얼 모션 스토리**로 제작한다.

**핵심 콘셉트:** `BEFORE → ACTION → CHANGE → NEXT`.  
**권장 미술 방향:** A Cinematic Editorial(60%) + B Kinetic Typography(25%) + C Journey Timeline(15%).  
**톤:** 절제된 감정, 개인적인 진정성, 활기, 구체성. 과장된 드라마틱 자막·글리치·빠른 플래시·불필요한 파티클은 금지.  
**한 장면 원칙:** 가독성 높은 제목 한 문장, 구체적 증거 한 개(필요할 때만), 발표자의 목소리를 위한 여백.

## 3. 8개 장면과 발화 시간표

| 장면 | 구간 | 역할 | 예시 화면 문구 — **실제 경험으로 교체할 것** | 비주얼/전환 |
|---|---|---|---|---|
| 01 Hook | 00:00–00:25 | 변화의 방향 예고 | `다음 장면은 지금부터.` | 다크 배경 + 라임 원형 경로, 타이틀 마스크 리빌 |
| 02 Before | 00:25–00:55 | 참여 이전의 상황 | `출발선 앞에서 잠시 멈췄습니다.` | 아이보리+코랄, 거대한 '?' 배경, 정적 대비 |
| 03 Doubt | 00:55–01:25 | 솔직한 감정 한 줄 | `정말 할 수 있을까?` | 코랄 배경, 반복 키네틱 타이포, 등장 후 2초 정지 |
| 04 Turning point | 01:25–02:05 | 참여 계기 또는 첫 행동 | `그래도 시작했습니다.` | 코발트 배경, 01 숫자, 단어 리빌 |
| 05 Experience | 02:05–03:00 | 활동 사례 2–3개 | `배웠습니다 / 시도했습니다 / 연결됐습니다` | 3개 정보 카드 순차 등장. 실제 사진·활동으로 교체 |
| 06 Journey | 03:00–03:45 | 전후 비교 | `그 과정에서 무엇이 달라졌을까요?` | BEFORE–ACTION–TODAY의 연결선·노드 |
| 07 Today | 03:45–04:25 | 지금 확인 가능한 성과 | `지금의 저는 [나의 변화]` | 본인 사진/프로젝트 결과물 1개, 단문 |
| 08 Next | 04:25–05:00 | 다음 목표와 감사 인사 | `다음 장면은 제가 만듭니다.` | 라임·블루 엔딩, 원형 확장, 정지 |

시간 배분은 권장안. **자동 재생 금지.** 발표자의 발화가 끝난 시점에 키보드로 넘길 수 있어야 한다.

## 4. 디자인 토큰

```css
:root {
  --ink: #10151B;
  --paper: #F4F0E8;
  --lime: #D8FB65;
  --coral: #FC684F;
  --blue: #4568F7;
  --teal: #DDECE5;
  --heading-font: "Pretendard", "NanumSquare", "Noto Sans KR", sans-serif;
  --ease-emphasis: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-cut: cubic-bezier(0.76, 0, 0.24, 1);
  --scene-enter: 0.7s;
  --scene-transition: 0.6s;
  --safe-margin: 6.5%;
}
```

- 기준 캔버스 **1920×1080, 16:9**, projection-safe area 좌우/상하 6–8%.
- 제목 **92–160px**, 보조 본문 **28–38px**, 발표장 기준 부가 라벨도 18–24px 이상. 진짜 발표 화면에는 작은 개발 UI를 숨길 것.
- 헤드라인은 한 화면에 1–2줄, 한 줄 글자 수는 최대한 짧게. 장문 설명은 **발표자 노트**에 둔다.
- 배경·제목은 명확한 대비. 코랄/라임은 장시간 읽는 본문색이 아니라 강조색.
- 서체는 사용권한을 확인한 폰트만 사용. 대체 폰트에 대한 줄바꿈 테스트 필수.

## 5. 애니메이션 룰

**전역**
- 대부분 `transform`과 `opacity` 중심(합성 단계에서 가볍게 실행).
- 문장 리빌: `y: 24~45px → 0`, `opacity: 0 → 1`, `duration: 0.65~0.85`, `ease: power3.out`, 단어별 스태거 0.05~0.08초.
- 슬라이드 전체 전환: 약 0.5~0.9초. 완전한 무음/정적 구간을 남길 것.
- 애니메이션 **끝 상태를 안정적으로 유지**. 발표자가 다음 장면을 넘길 때까지 루프 금지.

**장면별 기법**
1. Hook: 얇은 큰 원형 오브젝트(화면 밖 일부 크롭), 제목 2단 리빌.
2. Before: 어두운 첫 컷 대비 밝은 배경으로 커트, `?`는 낮은 대비의 거대 배경 오브젝트.
3. Doubt: 배경 반복 타이포는 미세 이동을 한 번만 수행. 핵심 문구는 먼저 정착하고 2초간 유지.
4. Turn: 01 등의 장식 숫자 스케일 다운, 중앙 주요 문장은 마스크 리빌.
5. Experience: 카드 3개 순차 등장. 실제 사진을 넣으면 **사진 클릭 확대** 기능은 옵션이며, 현장에서는 자동 모달을 띄우지 말 것.
6. Journey: SVG path의 `stroke-dasharray / dashoffset`로 곡선이 그려지고 노드가 차례로 활성화.
7. Today: 본인 결과물 사진이 서서히 나타나며 타이틀 정착. 불필요한 필터 금지.
8. Next: 원형 오브젝트의 느린 확장 후 고정. 감사 인사를 위한 정적인 장면.

**모션 구현 기술 선택**
- 단일 HTML/CSS/JS만으로 기본 레퍼런스는 실행할 수 있다.
- 더 정교한 모션이 필요하면 **GSAP Timeline**을 택하되, 이전 타임라인을 `kill()`/reset하고 장면별 애니메이션 생명주기를 관리한다.
- 위치/크기가 바뀌는 카드 전환에는 GSAP Flip 활용 가능.
- 글자 단위 애니메이션은 한국어에서 자모 분리 오류/줄바꿈 깨짐 가능성이 있으므로 **문장 또는 단어 단위가 기본**. 분할시 폰트 로딩 후 실행, SplitText의 `autoSplit` 고려.
- 대안으로 reveal.js 사용 시 키보드·speaker view·PDF export를 활용할 수 있다. 기존 제작 구조가 있다면 전면 교체하지 말고 동일 기능만 차용.

## 6. 제어/발표 환경 기능

- `ArrowRight` / `Space` = 다음 장면, `ArrowLeft` = 이전 장면.
- `F` = fullscreen, `N` = 발표자 노트 토글, `H` = 발표 시 개발 UI 숨기기.
- 오작동 방지를 위해 애니메이션 진행 중 중복 입력은 적절하게 무시하거나, 상태 전이를 안전하게 취소·재설정.
- **노트는 프로젝트를 보여주는 메인 화면에 노출하면 안 됨.** 외부 출력/보조 창 사용이 어려울 경우 로컬 키보드 토글 테스트.
- 오프라인에서 실행되는 정적 배포 폴더를 제공. 외부 CDN 미사용을 우선시하며, 오프라인 테스트 필수.
- 레퍼런스 `youth_motion_reference.html`은 발표 노트를 화면에 띄우는 **간단한 데모**다. 실제 행사 발표자 모드를 별도 제작할 수 있다.
- 브라우저 확대·축소 시 16:9 슬라이드가 화면 안에 다 들어오도록 대응. projector 해상도 1920×1080 및 1280×720에서 테스트.
- 정지본 PDF(예비용)를 추가 출력하여 브라우저/PC 장애 시 대응.
- `prefers-reduced-motion: reduce` 설정 시 불필요한 모션을 최소화. 빠른 플래시, 강한 카메라 회전, 무한 스케일 루프 금지.

## 7. 콘텐츠 작성 시 지켜야 할 제약

- 이 레퍼런스의 문장들은 **실제 사용자의 과거·성과를 설명한 것이 아니다.**
- 참여 사업의 경험, 달성한 목표, 일상 변화, 성과 사진은 사용자의 확인 없이는 지어내지 말 것.
- `배웠습니다/시도했습니다/연결됐습니다`는 임시 카드 제목이므로 사실에 맞춰 수정 가능.
- 실제 본인이 활동한 업무·프로젝트를 넣더라도, 청년도전지원사업 참여 효과와의 관계는 발표자가 확인한 범위에서만 설명.
- 사용자 사진/성과물은 제공받은 자료만 활용. 출처 없는 스톡 인물사진으로 본인 경험을 대체하지 말 것.

## 8. 폴더 구조 제안

```text
youth-challenge-showcase/
  index.html
  src/
    styles.css
    motion.js
    scenes.js
    content.json
  assets/
    photos/                  # 사용자 사진 넣기 전까지 비워둠
  docs/
    Claude_Code_5min_motion_brief.md
    youth_motion_design_reference.pdf
  fallback/
    presentation-static.pdf
```

`content.json`에 사실/문구/사진 경로/발표 메모를 구분. 레이아웃과 애니메이션 파일에는 개인 이력·실적을 하드코딩하지 않는다.

## 9. Claude Code에 입력할 작업 프롬프트

> 동봉된 `youth_motion_design_reference.pdf`, `youth_motion_storyboard.png`, `youth_motion_reference.html`, 그리고 이 `Claude_Code_5min_motion_brief.md`를 참고하여, 2026년 10월 29일 달서구 청년도전지원사업 성과공유회에서 사용하는 5분 사례발표용 HTML 모션 프레젠테이션을 구현해 줘. 현재 작업물의 기술 구조가 있다면 기존 구조를 유지하고 디자인과 애니메이션만 개선해. 한 장면에 하나의 문장만 전면에 두고, 8장면의 스토리 리듬을 유지해. 팔레트와 타이포그래피는 레퍼런스를 따르되 코드로 관리 가능한 토큰으로 추출해. GSAP 또는 CSS 기반 장면 진입/퇴장 전환을 구현하고, 키보드 수동 넘김·전체화면·발표자 노트·오프라인 실행·정지본 PDF 내보내기를 지원해. 현재 HTML은 레퍼런스 프로토타입이므로 개인 경험은 실제 자료가 오기 전까지 [대괄호]로 남겨. 완료 후 1920×1080과 1280×720 화면에서 한글 겹침, 줄바꿈, 애니메이션 루프 오류를 확인하고 수정해.

## 10. 원본 레퍼런스/공식 문서

- Spotify 2025 Wrapped 캠페인 디자인: https://newsroom.spotify.com/2025-12-03/wrapped-marketing-campaign/
- Apple 시각 디자인/정보 집중: https://www.apple.com/kr/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/
- reveal.js 슬라이드 전환: https://revealjs.com/transitions/
- reveal.js 발표자 노트: https://revealjs.com/speaker-view/
- GSAP Flip: https://gsap.com/docs/v3/Plugins/Flip/
- GSAP SplitText: https://gsap.com/docs/v3/Plugins/SplitText/
- Motion animate API: https://motion.dev/docs/animate
- MDN Reduced Motion: https://developer.mozilla.org/ko/docs/Web/CSS/Guides/Media_queries/Using_for_accessibility

**레퍼런스 사이트의 이미지를 복제하는 것이 아니라 색 대비·정보 위계·장면 전환의 원리를 참고해 재설계합니다.**
