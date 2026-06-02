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
- chart.js / react-chartjs-2 (가사 대시보드 차트)

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

### ✅ P1 (완료)

6. **가사노동 기록 & 대시보드** `/chores` — 자연어 기록 파싱 + 가족 구성원 설정 +
   구성원/카테고리별 차트(Chart.js) + 공정성 점수 + 주간 추이 + 불균형 알림
7. **살림 팁** `/tips` — 60개 팁 카테고리 탭 + 키워드 검색

### ✅ P2 (완료)

8. **가계 관리** `/budget` — 3개 탭:
   - **장바구니 분석**: 텍스트 붙여넣기 → 생필품/준생필품/사치품 분류 + 사치품·반복구매·예산 경고
   - **배송비 낚시 필터**: 상품·가격·배송비 입력 → 실질가격 재정렬 + 낚시 의심 표시
   - **월간 고정비 캘린더**: 월세·관리비·공과금·학원비 등록 + 납부일 D-day + 납부 체크

> P0·P1·P2 전 기능 구현 완료. 하단 네비 6개 탭 모두 실제 동작합니다.

## 기존 Python 스킬 → TypeScript 포팅 맵

| 원본 (Python) | 포팅 (TS) | 내용 |
|---|---|---|
| `household-checklist/scripts/templates.py` | `src/data/templates.ts` | 가구 유형별 집안일 템플릿(한국어) |
| `household-checklist/scripts/generate_checklist.py` | `src/utils/checklist.ts` | 카테고리 해석·항목 수집 로직 |
| `smart-cart-optimizer/platforms.json` | `src/data/platforms.ts` | 플랫폼 DB + 품목 가격 범위 |
| `smart-cart-optimizer/optimizer.py` | `src/utils/cartOptimizer.ts` | 무료배송 기준 묶음 최적화 알고리즘 |
| `chore-logger/scripts/log_chore.py` | `src/utils/choreParser.ts` | 자연어 → 가사노동 기록 파싱 |
| `chore-dashboard/scripts/dashboard.py` | `src/utils/choreAnalytics.ts` + `src/components/ChoreDashboard.tsx` | 분석 파이프라인 + Chart.js 시각화 |
| `home-tips-qa/tips_db.md` | `src/data/tips.ts` | 살림 팁 60개 (원본 파서로 자동 생성) |
| `home-tips-qa/scripts/search_tips.py` | `src/utils/tipSearch.ts` | 팁 검색 스코어링 |
| `budget-guard/config.json` | `src/data/budgetCategories.ts` | 생필품/준생필품/사치품 키워드 DB(117개) |
| `budget-guard/classifier.py` | `src/utils/budgetGuard.ts` | 장바구니 분류 + 경고 |
| `shipping-fee-filter/filter.py` | `src/utils/shippingFilter.ts` | 배송비 낚시 필터 + 실질가격 재정렬 |

> 포팅 결과는 동일 입력에 대해 원본 Python과 **출력이 정확히 일치**함을 교차 검증했습니다
> (배송비 묶음·절약액, 체크리스트 항목 수, 가사 파싱·공정성 점수·추이·분배, 팁 검색 순위,
> 장바구니 분류·예산 경고, 배송비 낚시 판별·정렬).

스펙 표에 있으나 전용 페이지가 없어 아직 미통합인 스킬:
`voice-to-todo/parser.py`, `purchase-pattern/scripts/analyze.py`,
`receipt-scanner`(MVP에서는 수동 입력으로 대체).

## 디렉터리 구조

```
src/
├── App.tsx              # 라우터 (HashRouter)
├── main.tsx
├── index.css            # Tailwind v4 + 디자인 토큰(@theme)
├── types.ts             # 공통 타입 (HouseholdConfig, ShoppingItem 등)
├── data/                # 포팅된 데이터
│   ├── templates.ts
│   ├── platforms.ts
│   ├── tips.ts          # 살림 팁 60개 (tips_db.md 자동 생성)
│   └── budgetCategories.ts # 분류 키워드 DB (config.json 자동 생성)
├── utils/               # 포팅된 로직 + 저장소
│   ├── checklist.ts     # generate_checklist.py 포팅
│   ├── checklistState.ts
│   ├── cartOptimizer.ts # optimizer.py 포팅
│   ├── choreParser.ts   # log_chore.py 포팅
│   ├── choreAnalytics.ts# dashboard.py 분석부 포팅
│   ├── tipSearch.ts     # search_tips.py 포팅
│   ├── budgetGuard.ts   # classifier.py 포팅
│   ├── shippingFilter.ts# filter.py 포팅
│   ├── expenses.ts      # 고정비 D-day·라벨
│   ├── shopping.ts
│   ├── storage.ts       # localStorage 래퍼 (STORAGE_KEYS)
│   └── format.ts
├── components/          # Layout, BottomNav, ChoreDashboard(Chart.js), UI 프리미티브
└── pages/               # Landing, Onboarding, Home, Shopping, Checklist, Chores, Tips, Budget
```

## 디자인 시스템

Navy `#1F3864` · Blue `#2E75B6` · Mint `#5BA480` · Cream `#FFF4E6` ·
Light `#D9E7F5` · Danger `#C0504D`. 폰트 Pretendard. 모바일 퍼스트(max-w 430px).
`src/index.css`의 `@theme`에 토큰으로 정의되어 `bg-navy`, `text-mint` 등으로 사용.
