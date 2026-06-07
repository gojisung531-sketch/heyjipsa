// 장보기 리스트 저장/조회.
// 품목은 소모품 소비주기 파이프라인(syncAutoRestock)이 자동으로 채우거나,
// 사용자가 직접/재구매 패턴에서 담는다. 그래서 초기값은 비어 있다.

import type { ShoppingItem } from '../types';
import { PLATFORM_DB } from '../data/platforms';
import { STORAGE_KEYS, loadJSON, saveJSON } from './storage';

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

/** 저장된 장보기 리스트. 없으면 빈 배열로 시작(소모품 파이프라인이 채움). */
export function getShoppingList(): ShoppingItem[] {
  const raw = loadJSON<ShoppingItem[] | null>(STORAGE_KEYS.SHOPPING_LIST, null);
  if (raw && Array.isArray(raw)) return raw;
  saveJSON(STORAGE_KEYS.SHOPPING_LIST, []);
  return [];
}

export function saveShoppingList(items: ShoppingItem[]): void {
  saveJSON(STORAGE_KEYS.SHOPPING_LIST, items);
}
