// localStorage 래퍼 (MVP: DB 없이 클라이언트 저장)

export const STORAGE_KEYS = {
  HOUSEHOLD_CONFIG: 'heyjipsa_household', // HouseholdConfig
  SHOPPING_LIST: 'heyjipsa_shopping', // ShoppingItem[]
  CHECKLIST_STATE: 'heyjipsa_checklist', // ChecklistState
  CHORE_LOG: 'heyjipsa_chores', // ChoreEntry[]
  FAMILY_MEMBERS: 'heyjipsa_family', // FamilyMember[]
  FIXED_EXPENSES: 'heyjipsa_expenses', // FixedExpense[]
  BUDGET_HISTORY: 'heyjipsa_budget', // BudgetEntry[]
  ONBOARDING_DONE: 'heyjipsa_onboarded', // boolean
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/** JSON 파싱해서 읽기. 없거나 손상 시 fallback 반환. */
export function loadJSON<T>(key: StorageKey, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** JSON 직렬화해서 저장. */
export function saveJSON<T>(key: StorageKey, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 용량 초과 등은 MVP에서 무시
  }
}

export function removeKey(key: StorageKey): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(key);
}

/** YYYY-MM-DD (로컬 기준) */
export function todayStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 간단한 고유 id. */
export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}
