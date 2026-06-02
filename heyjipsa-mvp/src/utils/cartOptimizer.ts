// 무료배송 기준에 맞춘 장바구니 묶음 최적화
// → smart-cart-optimizer/optimizer.py 로직 포팅

import type { ShoppingItem } from '../types';
import { PLATFORM_DB } from '../data/platforms';
import type { PlatformDB } from '../data/platforms';

export type ItemTag = 'lowest' | 'brand' | 'any';

export interface OptimizerInput {
  name: string;
  price?: number; // 누락 시 DB에서 추정
  tag?: ItemTag;
  platform_pref?: string;
}

export interface NormalizedItem {
  name: string;
  price: number;
  price_range: [number, number] | null;
  tag: ItemTag;
  platform_pref?: string;
}

export interface Bundle {
  platform: string;
  items: NormalizedItem[];
  subtotal: number;
  threshold: number | null;
  shipping: number;
  free_shipping: boolean;
  deficit: number; // 무배까지 부족분 (0이면 충족)
  url: string;
}

export interface OptimizeResult {
  bundles: Bundle[];
  total_shipping: number;
  saved_vs_naive: number;
  warnings: string[];
}

/** 품목 이름 → 예상 가격 (중간값). 사전에 없으면 [null, null]. */
function estimatePrice(
  itemName: string,
  db: PlatformDB,
): [number, [number, number]] | [null, null] {
  const prices = db.default_item_prices;
  for (const key of Object.keys(prices)) {
    if (itemName.includes(key)) {
      const [low, high] = prices[key];
      return [Math.floor((low + high) / 2), [low, high]];
    }
  }
  return [null, null];
}

/** 입력 표준화. price 누락 시 DB에서 추정. */
function normalizeItems(
  items: OptimizerInput[],
  db: PlatformDB,
): { normalized: NormalizedItem[]; warnings: string[] } {
  const normalized: NormalizedItem[] = [];
  const warnings: string[] = [];
  for (const it of items) {
    const name = (it.name ?? '').trim();
    if (!name) continue;
    let price = it.price;
    let priceRange: [number, number] | null = null;
    if (price === undefined || price === null) {
      const [est, range] = estimatePrice(name, db);
      if (est === null) {
        warnings.push(`'${name}' 가격 정보 없음 -- 0원 처리`);
        price = 0;
      } else {
        price = est;
        priceRange = range;
      }
    }
    normalized.push({
      name,
      price: Math.trunc(price),
      price_range: priceRange,
      tag: it.tag ?? 'any',
      platform_pref: it.platform_pref,
    });
  }
  return { normalized, warnings };
}

/** 1차 배분: 태그/강제 플랫폼 기준. */
function assignInitialPlatform(
  items: NormalizedItem[],
  db: PlatformDB,
): { groups: Record<string, NormalizedItem[]>; pendingAny: NormalizedItem[] } {
  const groups: Record<string, NormalizedItem[]> = {};
  for (const p of Object.keys(db.platforms)) groups[p] = [];
  const pendingAny: NormalizedItem[] = [];

  for (const it of items) {
    const pref = it.platform_pref;
    if (pref && pref in groups) {
      groups[pref].push(it);
      continue;
    }
    const tag = it.tag ?? 'any';
    if (tag === 'lowest') {
      groups['쿠팡'].push(it);
    } else if (tag === 'brand') {
      groups['마켓컬리'].push(it);
    } else {
      pendingAny.push(it);
    }
  }
  return { groups, pendingAny };
}

/** 그리디로 부족분 채울 후보 선택 (가격 큰 순). */
function pickToCover(
  candidates: NormalizedItem[],
  deficit: number,
): NormalizedItem[] {
  const sorted = [...candidates].sort((a, b) => b.price - a.price);
  const chosen: NormalizedItem[] = [];
  let acc = 0;
  for (const c of sorted) {
    if (acc >= deficit) break;
    chosen.push(c);
    acc += c.price;
  }
  return chosen;
}

/** 2차 배분: pendingAny로 무배 기준 부족 플랫폼 채움. 작은 gap 우선. */
function fillToThreshold(
  groups: Record<string, NormalizedItem[]>,
  pendingAny: NormalizedItem[],
  db: PlatformDB,
): Record<string, NormalizedItem[]> {
  const platforms = db.platforms;
  const deficits: Array<[string, number]> = [];
  for (const p of Object.keys(groups)) {
    const threshold = platforms[p].free_shipping_threshold;
    if (threshold === null) continue;
    const total = groups[p].reduce((s, i) => s + i.price, 0);
    if (total > 0 && total < threshold) {
      deficits.push([p, threshold - total]);
    }
  }
  deficits.sort((a, b) => a[1] - b[1]); // 작은 gap부터

  let pending = pendingAny;
  for (const [p, deficit] of deficits) {
    const chosen = pickToCover(pending, deficit);
    const chosenSet = new Set(chosen);
    for (const c of chosen) groups[p].push(c);
    pending = pending.filter((c) => !chosenSet.has(c));
  }
  if (pending.length > 0) {
    groups['쿠팡'].push(...pending);
  }
  return groups;
}

/** 플랫폼별 요약 + 절약 금액. */
function summarize(
  groups: Record<string, NormalizedItem[]>,
  db: PlatformDB,
): Omit<OptimizeResult, 'warnings'> {
  const platforms = db.platforms;
  const bundles: Bundle[] = [];
  let totalShippingOptimized = 0;
  let totalShippingNaive = 0;

  for (const p of Object.keys(groups)) {
    const items = groups[p];
    if (items.length === 0) continue;
    const threshold = platforms[p].free_shipping_threshold;
    const fee = platforms[p].shipping_fee;
    const total = items.reduce((s, i) => s + i.price, 0);

    let shipping: number;
    let freeShipping: boolean;
    if (threshold !== null && total >= threshold) {
      shipping = 0;
      freeShipping = true;
    } else {
      shipping = fee;
      freeShipping = false;
    }
    totalShippingOptimized += shipping;
    totalShippingNaive += fee;

    bundles.push({
      platform: p,
      items,
      subtotal: total,
      threshold,
      shipping,
      free_shipping: freeShipping,
      deficit: threshold !== null && total < threshold ? threshold - total : 0,
      url: platforms[p].url,
    });
  }

  return {
    bundles,
    total_shipping: totalShippingOptimized,
    saved_vs_naive: totalShippingNaive - totalShippingOptimized,
  };
}

/** 진입점. */
export function optimize(
  items: OptimizerInput[],
  db: PlatformDB = PLATFORM_DB,
): OptimizeResult {
  const { normalized, warnings } = normalizeItems(items, db);
  const { groups, pendingAny } = assignInitialPlatform(normalized, db);
  const filled = fillToThreshold(groups, pendingAny, db);
  const result = summarize(filled, db);
  return { ...result, warnings };
}

/** ShoppingItem[] → optimizer 입력 변환.
 *  preferBrand: true → 브랜드 우선(마켓컬리 후보), false → 최저가 우선(쿠팡). */
export function fromShoppingItems(items: ShoppingItem[]): OptimizerInput[] {
  return items.map((it) => ({
    name: it.name,
    price: Math.max(0, Math.round(it.estimatedPrice)) * Math.max(1, it.quantity),
    tag: it.preferBrand ? 'brand' : 'lowest',
    platform_pref: it.platform,
  }));
}
