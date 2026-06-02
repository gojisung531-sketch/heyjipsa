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
