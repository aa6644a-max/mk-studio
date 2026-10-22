# 청년도전지원사업 성과공유회 · 5분 모션 프레젠테이션 (2026.10.29)

`docs/`의 레퍼런스 팩(작업 지시서·PDF·스토리보드)을 기반으로 만든 10장면 HTML 발표본.
외부 CDN/빌드 없이 `index.html`을 더블클릭하면 오프라인에서 실행됩니다.

## 조작
`→`/Space 다음 · `←` 이전 · `F` 전체화면 · `N` 노트(로컬 토글) · `P` 발표자 창(보조 모니터, 메인엔 노트 미노출) · `H` UI 숨김 · `Home/End`
자동 재생 없음. `?scene=5` 로 특정 장면 시작, `?static` 은 모션 끝 상태 고정.

## 내용 교체
`src/content.json`만 수정 → `node tools/build-content.mjs` (file:// 에서 fetch가 막혀 `content.js`로 변환).
`[대괄호]` 문구는 실제 경험으로 교체할 자리이며 임의로 채우지 않았습니다. 사진은 `assets/photos/`에 넣고 `photo` 경로 입력.

## 정지본 PDF
`pip install playwright pillow && python3 tools/export-pdf.py` → `fallback/presentation-static.pdf`

## 폰트
Pretendard → NanumSquare → Noto Sans KR → 시스템 폰트 순. 라이선스를 확인한 폰트 파일은 행사 PC에 설치하거나 `assets/fonts/`에 추가하세요.
