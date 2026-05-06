# chore-dashboard

가사노동 기록 → 가족 구성원별 분배가 한눈에 보이는 인터랙티브 HTML 대시보드.
Claude Cowork / Claude Code 스킬.

## 만든 이유

집안일 분담 얘기 나올 때마다 "내가 더 많이 한다" / "아니다 내가 더 한다" 무한 반복.
주관 빼고 데이터로 결론내고 싶었음. chore-logger로 기록하고, 이걸로 시각화하면 끝.

기존 가계부/할일 앱들은 시간 합산은 해줘도 "공정성 점수" 같은 직관적 지표가 없어서 직접 만듦.

## 무엇을 하는지

- chore-logger 출력물(.json) 또는 일반 CSV 입력
- **구성원별 총 시간 / 작업 수** — 파이차트 2개
- **카테고리별 분배** — 누가 요리 많이 했고 누가 청소 많이 했는지
- **주간 / 월간 추이** — 라인차트
- **공정성 점수 (0-100)** — 균등분배(1/n)에 가까울수록 100점
- **불균형 알림** — 한 명이 65% 이상 차지하면 빨간 경고

전부 단일 HTML 파일로 출력. 브라우저에서 바로 열림.

## 사용법

### Claude한테 시키기 (자연어)

- "가사노동 기록 분석해줘"
- "이 csv로 집안일 대시보드 만들어줘"
- "chore-logger 결과 시각화해줘"
- "이번 달 집안일 누가 더 많이 했는지 보여줘"

스킬이 알아서 호출됨.

### 수동 실행

```bash
python scripts/dashboard.py input.csv output.html
```

output 안 적으면 `chore_dashboard.html`로 저장.

## 입력 형식

CSV 또는 JSON. 컬럼명은 한국어/영어 자동 인식:

| 영어 | 한국어 | 설명 | 예시 |
|------|--------|------|------|
| date | 날짜 | 작업 날짜 | 2026-05-01 |
| member | 구성원 / 이름 | 한 사람 | 가은 |
| category | 카테고리 | 작업 분류 | 요리 |
| task | 작업 | 구체적 내용 (옵션) | 저녁 준비 |
| duration_minutes | 소요시간 / minutes | 분 단위 | 45 |

`examples/sample_chores.csv` 참고.

JSON은 두 가지 형식 다 됨:
```json
[{"date": "...", "member": "...", ...}, ...]
```
또는 chore-logger 형식:
```json
{"records": [{"date": "...", ...}, ...]}
```

## 공정성 점수 계산법

n명의 구성원, 각자의 비율을 sᵢ라고 할 때:

```
score = 100 × (1 - L1편차 / 최대편차)
L1편차 = Σ |sᵢ - 1/n|
최대편차 = 2(1 - 1/n)
```

- 50:50 → 100점
- 70:30 → 60점
- 100:0 → 0점

3명 이상도 동일 공식, n에 맞춰 자동 정규화.

## 출력 미리보기

`examples/preview.png` (대시보드 스크린샷)

## 한계

- 공정성 점수는 단순 균등분배 기준. 가족 합의로 비율을 다르게 정한 경우엔 의미 없음
- Chart.js를 CDN(jsdelivr)에서 로드 → 인터넷 연결 필요. 오프라인은 `chart.min.js` 받아서 HTML의 `<script src>` 경로만 수정
- chore-logger 외 다른 형식은 컬럼명이 너무 다르면 자동 매핑 실패. CSV로 컬럼만 맞춰서 변환하면 됨

## 설치

이 폴더 통째로 Cowork / Claude Code의 skills 디렉토리에 넣으면 됨.

```
~/.claude/skills/chore-dashboard/
├── SKILL.md
├── README.md
├── scripts/
│   └── dashboard.py
└── examples/
    └── sample_chores.csv
```

## 라이선스

MIT

## 함께 보면 좋은 스킬

- [chore-logger](../chore-logger) — 가사노동 기록 입력기. 이 스킬의 입력 데이터 만드는 도구.

## 만든 사람

가은 / [K-Skills](https://github.com/) 프로젝트의 일부
