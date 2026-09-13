# 네이버 웹문서·뉴스 검색

도구 ID: `naver_web`, `naver_news`. 실행 입력 스키마는 `lib/writing/tools.ts`와 모델 도구 스키마가 관리한다.

웹문서는 일반 개념, 제품 공식 정보, 기관 공지, 지역 소식의 출처 후보를 찾을 때 사용한다. 뉴스는 최근 보도와 발표를 확인할 때 사용한다. query는 고유명사와 해결할 질문을 조합한다. 현재 날짜가 필요한 검색에만 연도·기간을 붙인다.

반환은 제목, URL, 요약, 수집일이며 뉴스에는 보도일이 추가된다. 요약만 보고 전문을 읽었다고 말하지 않는다. 중요한 조건·날짜·인용은 반환 URL을 read_url로 읽거나 첨부 원문에서 확인한다. 다른 사람의 후기를 MK 경험으로 쓰지 않는다.

동일 보도자료의 재배포는 독립 근거로 중복 계산하지 않는다. 결과 없음, API 미설정, 오류를 구분한다. 최대 4개 결과를 반환하며 전체 작업 예산을 초과해 검색하지 않는다.

공식 명세: https://developers.naver.com/docs/serviceapi/search/web/web.md
뉴스 명세: https://developers.naver.com/docs/serviceapi/search/news/news.md
확인일: 2026-09-13
