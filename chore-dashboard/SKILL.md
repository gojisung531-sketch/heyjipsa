---
name: chore-dashboard
description: chore-logger 출력물이나 가사노동 기록 CSV/JSON을 분석해서 가족 구성원별 분배를 시각화하는 단일 인터랙티브 HTML 대시보드 생성. 구성원별 시간/작업수 파이차트, 카테고리별 분배 누적바, 주간·월간 추이 라인차트, 공정성 점수(0-100), 불균형 알림 포함. "집안일 분담", "가사노동 분배", "누가 더 많이 했나", "chore dashboard", "집안일 통계", "가사 시각화", "공정성 점수" 같은 표현이 나올 때 사용.
---

# chore-dashboard

## What this skill does

chore-logger 출력물이나 가사노동 기록 CSV/JSON을 입력받아서, 가족 구성원별 분배를 한 페이지에 시각화한 단일 인터랙티브 HTML 대시보드를 생성. Chart.js 기반.

## When to use

- 사용자가 "집안일 분담 분석해줘" / "가사노동 시각화" / "chore dashboard 만들어줘" 같이 요청할 때
- chore-logger가 만든 .json 또는 .csv 파일을 첨부하며 "이거 분석해줘"라고 할 때
- "누가 얼마나 했는지", "카테고리별로 누가 많이 했는지" 보고 싶다고 할 때
- "공정성 점수", "불균형 알림" 같은 키워드가 나올 때

## How to use

1. 입력 파일 경로 확인 (.csv 또는 .json)
2. 스크립트 실행:
   ```bash
   python scripts/dashboard.py <input_file> [output.html]
   ```
3. output 미지정 시 `chore_dashboard.html`로 저장
4. 사용자에게 `computer://` 링크로 공유

입력 컬럼은 한국어/영어 자동 매핑:
- date / 날짜 / Date
- member / 구성원 / 이름 / name
- category / 카테고리 (없으면 "기타")
- task / 작업 (옵션)
- duration_minutes / duration / 소요시간 / minutes

## Output format

단일 HTML 파일 (외부 의존성: jsdelivr CDN의 Chart.js). 구성:

1. **상단 요약** — 총 기록 수, 공정성 점수 (0-100, 게이지 바), 불균형 경고 (해당 시 빨간 박스로)
2. **구성원별 통계 테이블** — 총 시간(분/시간), 작업 수, 평균 작업 시간
3. **파이차트 2개** — 시간 기준 / 작업 수 기준 분배
4. **카테고리별 누적 막대그래프** — 카테고리마다 구성원이 차지하는 비율
5. **주간 추이 라인차트** — ISO 주차별 구성원별 누적 분
6. **월간 추이 라인차트** — YYYY-MM별 구성원별 누적 분

모든 차트 인터랙티브 (호버 툴팁, 범례 클릭으로 토글).

## Examples

### Example 1: CSV 기본 사용

입력 (`chores.csv`):
```
date,member,category,task,duration_minutes
2026-05-01,가은,요리,저녁,45
2026-05-01,민수,청소,거실,30
2026-05-02,가은,설거지,,15
```

실행:
```bash
python scripts/dashboard.py chores.csv
```

콘솔 출력:
```
데이터 로딩 중: chores.csv
  -> 3개 기록 로드됨
분석 중...
  -> 구성원: 가은, 민수
  -> 공정성 점수: 50.0/100
  -> 가은님이 전체의 67%를 담당. 균형 조절 필요.
대시보드 생성 중: chore_dashboard.html
완료! 브라우저에서 chore_dashboard.html 파일을 열어보세요.
```

### Example 2: chore-logger JSON 직접 입력

입력 (`log_2026_04.json`):
```json
{"records": [
  {"date": "2026-04-15", "member": "엄마", "category": "요리", "duration_minutes": 60},
  {"date": "2026-04-15", "member": "아빠", "category": "청소", "duration_minutes": 25}
]}
```

실행:
```bash
python scripts/dashboard.py log_2026_04.json april_dashboard.html
```

→ `april_dashboard.html` 생성

### Example 3: 한국어 컬럼 CSV

입력 (`집안일.csv`):
```
날짜,구성원,카테고리,작업,소요시간
2026-05-03,가은,빨래,세탁기,10
2026-05-03,민수,요리,아침,20
```

실행:
```bash
python scripts/dashboard.py 집안일.csv
```

→ 한국어 컬럼명 자동 인식, 동일하게 동작

## Edge cases

- **입력 파일이 비어있을 때**: "기록이 없습니다" 출력 후 종료 (exit 1)
- **구성원이 1명뿐일 때**: 공정성 점수 100 고정, 파이차트는 단일 항목으로 표시
- **날짜 파싱 실패**: YYYY-MM-DD / YYYY/MM/DD / ISO 8601 자동 시도, 다 실패하면 해당 기록은 시계열 차트에서만 제외 (집계엔 포함)
- **카테고리 누락**: 자동으로 "기타"로 분류
- **duration_minutes가 0/누락/문자열**: 작업 수에는 카운트, 시간 합산엔 0으로 처리
- **컬럼명 한국어/영어 혼용**: 둘 다 인식
- **JSON이 dict가 아니라 list**: list 자체를 records로 처리

## Limitations

- 공정성 점수는 균등분배(1/n) 기준. 가족이 비율을 따로 정한 경우는 별도 계산 필요
- Chart.js를 CDN(jsdelivr)에서 로드하므로 첫 로딩 시 인터넷 연결 필요. 오프라인 사용은 `chart.min.js` 다운로드 후 HTML의 `<script src>` 경로 수정
- chore-logger 외 다른 도구의 출력은 컬럼명이 크게 다르면 자동 매핑 실패 — 이 경우 CSV로 컬럼명만 맞춰서 변환 필요
- 같은 작업을 여러 번 한 경우 자동 통합 안 함 (의도적 — 빈도까지 보존하기 위해)
