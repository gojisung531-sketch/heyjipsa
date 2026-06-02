// 가구 조건 → 집안일 체크리스트 항목 산출
// → household-checklist/scripts/generate_checklist.py 의
//   resolve_categories / collect_items 로직 포팅.
//   (HTML 렌더링부는 React 컴포넌트가 대체)

import type { ChecklistItem, HouseholdConfig, Period } from '../types';
import { CATEGORY_TEMPLATES, PERIODS } from '../data/templates';

/** generate_checklist.py 가 받던 config 형태 */
export interface ChecklistConfig {
  size: 'single' | 'couple' | 'family';
  dual_income: boolean;
  child: boolean;
  pet: string[]; // 'dog' | 'cat' | 'other'
  plant: boolean;
  excluded_ids?: string[];
}

/**
 * 온보딩 HouseholdConfig → 체크리스트 config 매핑.
 * Why: MVP 온보딩 가구 유형(5종)을 Python 템플릿의 size/옵션 축으로 변환.
 */
export function mapHouseholdToConfig(h: HouseholdConfig): ChecklistConfig {
  let size: ChecklistConfig['size'] = 'single';
  let dual_income = false;
  let child = false;

  switch (h.type) {
    case 'single':
      size = 'single';
      break;
    case 'couple':
      size = 'couple';
      dual_income = true; // "2인 맞벌이"
      break;
    case 'couple_1kid':
    case 'couple_2kids':
      size = 'family';
      child = true;
      break;
    case 'with_parents':
      size = 'couple'; // 다인 성인 가구 (아이 없음 가정)
      break;
  }

  const pet = h.options.pet ? [h.options.pet] : [];
  const plant = h.options.plants !== null;

  return {
    size,
    dual_income,
    child,
    pet,
    plant,
    excluded_ids: h.removedItems,
  };
}

/**
 * config 에서 활성화할 카테고리 키 리스트 산출.
 * 공통(common)은 항상 포함. (resolve_categories 포팅)
 */
export function resolveCategories(config: ChecklistConfig): string[] {
  const cats: string[] = ['common'];

  const size = config.size ?? 'single';
  if (size === 'single') {
    cats.push('single');
  } else if (size === 'couple') {
    cats.push('couple');
  } else if (size === 'family') {
    // family면 child도 자동 추가
    cats.push('couple');
    if (config.child ?? true) {
      cats.push('child');
    }
  }

  if (config.dual_income) {
    cats.push('dual_income');
  }

  if (config.child && !cats.includes('child')) {
    cats.push('child');
  }

  const pets = config.pet ?? [];
  for (const p of pets) {
    const key = `pet_${p}`;
    if (key in CATEGORY_TEMPLATES) {
      cats.push(key);
    } else if (!cats.includes('pet_other')) {
      // 알 수 없는 종은 other로 매핑
      cats.push('pet_other');
    }
  }

  if (config.plant) {
    cats.push('plant');
  }

  // 중복 제거 (순서 유지)
  const seen = new Set<string>();
  return cats.filter((c) => {
    if (seen.has(c)) return false;
    seen.add(c);
    return true;
  });
}

/** 주기별로 항목 모으기. excludedIds는 빼기. (collect_items 포팅) */
export function collectItemsByPeriod(
  categories: string[],
  excludedIds: Set<string>,
): Record<Period, ChecklistItem[]> {
  const result: Record<Period, ChecklistItem[]> = {
    daily: [],
    weekly: [],
    monthly: [],
    seasonal: [],
  };
  for (const cat of categories) {
    const tmpl = CATEGORY_TEMPLATES[cat];
    if (!tmpl) continue;
    for (const period of PERIODS) {
      for (const item of tmpl[period]) {
        if (excludedIds.has(item.id)) continue;
        result[period].push({ ...item, period });
      }
    }
  }
  return result;
}

/** 평탄화된 전체 항목 리스트 */
export function collectItemsFlat(
  categories: string[],
  excludedIds: Set<string>,
): ChecklistItem[] {
  const byPeriod = collectItemsByPeriod(categories, excludedIds);
  return PERIODS.flatMap((p) => byPeriod[p]);
}

/** 메인 진입점: HouseholdConfig → 주기별 체크리스트 (removedItems 반영) */
export function buildChecklist(h: HouseholdConfig): {
  byPeriod: Record<Period, ChecklistItem[]>;
  flat: ChecklistItem[];
  categories: string[];
} {
  const config = mapHouseholdToConfig(h);
  const categories = resolveCategories(config);
  const excluded = new Set(h.removedItems ?? []);
  const byPeriod = collectItemsByPeriod(categories, excluded);
  const flat = PERIODS.flatMap((p) => byPeriod[p]);
  return { byPeriod, flat, categories };
}

/**
 * 온보딩 Step3 미리보기용: removedItems를 적용하지 않은 "전체" 항목.
 * (사용자가 화면에서 직접 빼도록)
 */
export function buildFullPreview(
  h: Pick<HouseholdConfig, 'type' | 'options'>,
): Record<Period, ChecklistItem[]> {
  const config = mapHouseholdToConfig({ ...h, removedItems: [], completedAt: '' });
  const categories = resolveCategories(config);
  return collectItemsByPeriod(categories, new Set());
}
