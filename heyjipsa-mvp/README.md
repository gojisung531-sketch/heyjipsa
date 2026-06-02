# 헤이집사 (HEYJIPSA) — MVP 웹앱

> "이 집의 이번 주를 통째로 관리하는 AI 집사"

맞벌이 가구의 가사 인지부하(mental load)를 줄여주는 서비스의 MVP입니다.
핵심 차별점: **입력하지 않고 빼는(opt-out) 온보딩** + 한국 커머스 플랫폼의
**무료배송 기준을 활용한 주간 묶음 최적화**.

기존 레포의 Python 스킬 로직/데이터를 TypeScript로 포팅해 프론트엔드 온리로 구현했습니다.

## 기술 스택

- Vite + React 19 + TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite`)
- react-router-dom (HashRouter — GitHub Pages/Vercel 정적 호스팅 호환)
- 상태: `localStorage` (백엔드·DB 없음)
- chart.js / react-chartjs-2 (P1 가사 대시보드용 — 설치만 됨)

## 실행

```bash
npm install
npm run dev      # 개발 서버
npm run build    # 타입체크(tsc) + 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
npm run lint     # ESLint
```

> GitHub Pages 프로젝트 사이트로 배포 시 `vite.config.ts`의 `base`를
> `'/<repo-name>/'`로 설정하세요. HashRouter라 새로고침 404는 없습니다.

## 구현 범위

### ✅ P0 (완료)

1. **랜딩** `/` — 그라데이션 히어로 + 인트로 3개 + 시작하기
2. **온보딩** `/onboarding` — 3스텝(가구유형 → 생활옵션 → 템플릿 빼기), opt-out 방식
3. **홈 대시보드** `/home` — 장보기/오늘의 집안일/이번 달 고정비 카드 + 하단 네비
4. **이번 주 장보기** `/shopping` — 품목 관리(추가/삭제/수량/가격/브랜드선호) + **배송비 최적화**
5. **집안일 체크리스트** `/checklist` — 오늘/이번 주/이번 달/계절 탭 + 진행률 + 완료 체크

### ⏳ 예정 (스텁 페이지 연결됨)

- P1: 가사노동 기록·대시보드 `/chores`, 살림 팁 `/tips`
- P2: 가계 관리(사치품 경고·배송비 낚시 필터·고정비 캘린더) `/budget`

## 기존 Python 스킬 → TypeScript 포팅 맵

| 원본 (Python) | 포팅 (TS) | 내용 |
|---|---|---|
| `household-checklist/scripts/templates.py` | `src/data/templates.ts` | 가구 유형별 집안일 템플릿(한국어) |
| `household-checklist/scripts/generate_checklist.py` | `src/utils/checklist.ts` | 카테고리 해석·항목 수집 로직 |
| `smart-cart-optimizer/platforms.json` | `src/data/platforms.ts` | 플랫폼 DB + 품목 가격 범위 |
| `smart-cart-optimizer/optimizer.py` | `src/utils/cartOptimizer.ts` | 무료배송 기준 묶음 최적화 알고리즘 |

> 포팅 결과는 동일 입력에 대해 원본 Python과 **출력이 정확히 일치**함을 교차 검증했습니다
> (배송비 묶음 구성·절약액, 체크리스트 카테고리/항목 수).

P1/P2에서 포팅 예정인 나머지 스킬: `budget-guard/classifier.py`,
`chore-logger/scripts/log_chore.py`, `chore-dashboard/scripts/dashboard.py`,
`voice-to-todo/parser.py`, `shipping-fee-filter/filter.py`,
`purchase-pattern/scripts/analyze.py`, `home-tips-qa`(tips_db + search).

## 디렉터리 구조

```
src/
├── App.tsx              # 라우터 (HashRouter)
├── main.tsx
├── index.css            # Tailwind v4 + 디자인 토큰(@theme)
├── types.ts             # 공통 타입 (HouseholdConfig, ShoppingItem 등)
├── data/                # 포팅된 데이터
│   ├── templates.ts
│   └── platforms.ts
├── utils/               # 포팅된 로직 + 저장소
│   ├── checklist.ts     # generate_checklist.py 포팅
│   ├── checklistState.ts
│   ├── cartOptimizer.ts # optimizer.py 포팅
│   ├── shopping.ts
│   ├── storage.ts       # localStorage 래퍼 (STORAGE_KEYS)
│   └── format.ts
├── components/          # Layout, BottomNav, UI 프리미티브
└── pages/               # Landing, Onboarding, Home, Shopping, Checklist, ComingSoon
```

## 디자인 시스템

Navy `#1F3864` · Blue `#2E75B6` · Mint `#5BA480` · Cream `#FFF4E6` ·
Light `#D9E7F5` · Danger `#C0504D`. 폰트 Pretendard. 모바일 퍼스트(max-w 430px).
`src/index.css`의 `@theme`에 토큰으로 정의되어 `bg-navy`, `text-mint` 등으로 사용.
