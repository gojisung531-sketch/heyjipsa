// 헤이집사 공통 타입 정의 (MVP_SPEC.md "데이터 구조" 기준)

// ── 가구 설정 (온보딩 결과) ─────────────────────────────
export type HouseholdType =
  | 'single' // 1인 자취
  | 'couple' // 2인 맞벌이
  | 'couple_1kid' // 부부 + 아이 1명
  | 'couple_2kids' // 부부 + 아이 2명 이상
  | 'with_parents'; // 부모님 동거

export type PetType = 'dog' | 'cat' | 'other';
export type PlantCount = 'few' | 'many';

export interface HouseholdConfig {
  type: HouseholdType;
  options: {
    pet: null | PetType;
    plants: null | PlantCount;
    car: boolean;
    rental_appliances: boolean;
  };
  removedItems: string[]; // 사용자가 뺀 항목 id 목록 (opt-out)
  addedItems?: ChecklistItem[]; // 사용자가 추가한 커스텀 집안일
  completedAt: string; // ISO date
}

// ── 장보기 ──────────────────────────────────────────────
export interface ShoppingItem {
  id: string;
  name: string;
  category: string;
  estimatedPrice: number;
  quantity: number;
  preferBrand: boolean; // true면 브랜드 우선, false면 최저가 우선
  platform?: string;
  auto?: boolean; // 소모품 소비주기 예측으로 자동 추가된 항목
}

// ── 집안일 체크리스트 ───────────────────────────────────
export type Period = 'daily' | 'weekly' | 'monthly' | 'seasonal';

export interface ChecklistItem {
  id: string;
  name: string;
  category: string;
  period: Period;
}

export interface ChecklistState {
  checked: string[]; // 완료 체크된 항목 id
  dailyDate: string; // daily 항목 자동 리셋 기준 날짜 (YYYY-MM-DD)
}

// ── 가사노동 기록 (P1) ──────────────────────────────────
export type ChoreCategory =
  | 'cleaning'
  | 'laundry'
  | 'cooking'
  | 'dishes'
  | 'trash'
  | 'shopping'
  | 'other';

export interface ChoreEntry {
  id: string;
  date: string;
  person: string;
  task: string;
  category: ChoreCategory;
  durationMinutes: number;
}

export interface FamilyMember {
  id: string;
  name: string;
  nickname?: string;
}

// ── 가계 관리 (P2) ──────────────────────────────────────
export type ExpenseCategory =
  | 'rent'
  | 'utilities'
  | 'education'
  | 'insurance'
  | 'other';

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  dueDay: number; // 매월 N일
  category: ExpenseCategory;
  paid: boolean;
}

export interface BudgetEntry {
  id: string;
  date: string;
  name: string;
  amount: number;
}

// ── 살림 팁 (P1) ────────────────────────────────────────
export interface Tip {
  category: string; // 청소 / 빨래 / 요리 / 수납정리 / 생활꿀팁 / 절약
  title: string;
  tip: string;
  added: string; // YYYY-MM-DD
}

// ── 할 일 (voice-to-todo) ───────────────────────────────
export type TodoCategory = '장보기' | '집안일' | '업무' | '경조사' | '기타';
export type TodoPriority = '상' | '중' | '하';

export interface Todo {
  id: string;
  category: TodoCategory | string;
  item: string;
  priority: TodoPriority;
  deadline: string | null;
  raw: string;
  done: boolean;
  createdAt: string;
}

// ── 구매 기록 (receipt-scanner 수동 입력 + purchase-pattern) ──
export interface PurchaseRecord {
  id: string;
  date: string; // YYYY-MM-DD (날짜)
  store: string; // 매장명
  item: string; // 품목
  qty: number; // 수량
  unitPrice: number; // 단가
  total: number; // 합계
  category: string; // 카테고리
}

// ── 소모품 (집안일 인식 → 소비주기 학습 → 자동 장보기 파이프라인) ──
export interface Consumable {
  id: string;
  name: string; // 세제, 휴지, 생수 ...
  category: string; // 생필품 / 식품 / 주방 / 위생 / 세탁 ...
  cycleDays: number; // 기본 소비 주기 (학습 전 fallback)
  lastBought: string; // 마지막 보충일 (YYYY-MM-DD)
  fills: string[]; // 보충 일자 이력 (평균 주기 학습용)
  uses: string[]; // 사용 이벤트 일자 (연동 집안일 체크 등) — 사용빈도 학습용
  linkedChoreIds: string[]; // 체크 시 '사용'으로 집계할 집안일(체크리스트) id
  lowSince: string | null; // "거의 다 썼어요" 표시일 → 즉시 보충 필요
  source: 'default' | 'user';
}
