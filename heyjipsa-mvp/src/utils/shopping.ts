// 장보기 리스트 저장/시드.
// 초기 품목은 smart-cart-optimizer 의 품목 가격 DB(default_item_prices)에서
// 자주 사는 생필품 위주로 시드한다.

import type { ShoppingItem } from '../types';
import { PLATFORM_DB } from '../data/platforms';
import { STORAGE_KEYS, loadJSON, saveJSON, uid } from './storage';

// 시드 품목: [품목명, 카테고리]
const SEED: Array<[string, string]> = [
  ['휴지', '생필품'],
  ['물티슈', '생필품'],
  ['세제', '생필품'],
  ['생수', '식품'],
  ['우유', '식품'],
  ['계란', '식품'],
  ['라면', '식품'],
];

/** 품목 가격 DB의 중간값으로 예상가 추정 (estimate_price와 동일 규칙) */
export function estimatedPriceOf(name: string): number {
  const prices = PLATFORM_DB.default_item_prices;
  for (const key of Object.keys(prices)) {
    if (name.includes(key)) {
      const [low, high] = prices[key];
      return Math.floor((low + high) / 2);
    }
  }
  return 0;
}

function buildSeed(): ShoppingItem[] {
  return SEED.map(([name, category]) => ({
    id: uid('shop'),
    name,
    category,
    estimatedPrice: estimatedPriceOf(name),
    quantity: 1,
    preferBrand: false,
  }));
}

/** 저장된 장보기 리스트. 없으면(최초) 기본 품목을 시드해서 저장 후 반환. */
export function getShoppingList(): ShoppingItem[] {
  const raw = loadJSON<ShoppingItem[] | null>(STORAGE_KEYS.SHOPPING_LIST, null);
  if (raw && Array.isArray(raw)) return raw;
  const seeded = buildSeed();
  saveJSON(STORAGE_KEYS.SHOPPING_LIST, seeded);
  return seeded;
}

export function saveShoppingList(items: ShoppingItem[]): void {
  saveJSON(STORAGE_KEYS.SHOPPING_LIST, items);
}
