// 소모품 소비주기 학습 → 곧 떨어질 품목을 「이번 주 장보기」에 자동 추가
// = 집안일/구매 "인식" → 소비주기 학습 → 자동 장보기 → 배송비 최적화 파이프라인의 허리.
//
// 학습 로직은 purchase-pattern(analyze.py)의 "평균 재구매 주기" 아이디어를
// 소모품(품목) 단위로 적용한다. 보충 이력(fills)과 구매 기록(영수증/OCR)을
// 함께 모아 평균 주기를 구하고, 마지막 보충일 + 주기로 다음 보충일을 예측한다.

import type { Consumable, PurchaseRecord } from '../types';
import { STORAGE_KEYS, loadJSON, saveJSON, todayStr, uid } from './storage';
import { normalizeItemName } from './purchaseAnalyzer';
import { loadPurchases } from './receipts';
import {
  estimatedPriceOf,
  getShoppingList,
  saveShoppingList,
} from './shopping';

const DAY = 86_400_000;

/** 다음 보충까지 7일 이내(또는 이미 지남)면 자동으로 장보기에 담는다. */
export const RESTOCK_THRESHOLD_DAYS = 7;

// 기본 소모품 카탈로그. fillsDaysAgo(=며칠 전 보충)로 데모 시 일부가
// "곧 필요" 상태가 되도록 시드한다. (생필품 위주 + 학습 예시 1종)
interface DefaultConsumable {
  name: string;
  category: string;
  cycleDays: number;
  fillsDaysAgo: number[]; // 보충 이력(일 전). 마지막 원소가 가장 최근.
}
const DEFAULTS: DefaultConsumable[] = [
  { name: '휴지', category: '생필품', cycleDays: 24, fillsDaysAgo: [30] }, // 지남 → 자동 담김
  { name: '세제', category: '세탁', cycleDays: 30, fillsDaysAgo: [59, 28] }, // 학습 31일·D-3 → 담김
  { name: '생수', category: '식품', cycleDays: 10, fillsDaysAgo: [9] }, // D-1 → 담김
  { name: '물티슈', category: '생필품', cycleDays: 20, fillsDaysAgo: [10] },
  { name: '주방세제', category: '주방', cycleDays: 30, fillsDaysAgo: [15] },
  { name: '섬유유연제', category: '세탁', cycleDays: 45, fillsDaysAgo: [20] },
  { name: '샴푸', category: '위생', cycleDays: 45, fillsDaysAgo: [30] },
];

const daysAgoStr = (n: number) => todayStr(new Date(Date.now() - n * DAY));

function buildDefaults(): Consumable[] {
  return DEFAULTS.map((d) => {
    const fills = d.fillsDaysAgo.map(daysAgoStr);
    return {
      id: uid('cons'),
      name: d.name,
      category: d.category,
      cycleDays: d.cycleDays,
      lastBought: fills[fills.length - 1],
      fills,
      lowSince: null,
      source: 'default' as const,
    };
  });
}

export function getConsumables(): Consumable[] {
  const raw = loadJSON<Consumable[] | null>(STORAGE_KEYS.CONSUMABLES, null);
  if (raw && Array.isArray(raw)) return raw;
  const seeded = buildDefaults();
  saveJSON(STORAGE_KEYS.CONSUMABLES, seeded);
  return seeded;
}

export function saveConsumables(list: Consumable[]): void {
  saveJSON(STORAGE_KEYS.CONSUMABLES, list);
}

function parseISO(s: string): number | null {
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
}

/** 구매 기록 중 이 소모품과 매칭되는 날짜들.
 *  (품목명을 정규화해 소모품명을 포함하면 동일 품목으로 간주 → 영수증도 학습에 반영) */
function matchingPurchaseDates(name: string, purchases: PurchaseRecord[]): number[] {
  const key = normalizeItemName(name);
  if (!key) return [];
  const out: number[] = [];
  for (const p of purchases) {
    if (normalizeItemName(p.item).includes(key)) {
      const t = parseISO(p.date);
      if (t !== null) out.push(t);
    }
  }
  return out;
}

export interface Restock {
  cycleDays: number;
  learned: boolean; // 기록으로 학습됐는지(기본값이 아닌지)
  eventCount: number;
  lastBought: string;
  nextDate: string;
  daysUntilNext: number;
  low: boolean; // "거의 다 썼어요" 표시 상태
}

const fmt = (t: number) => todayStr(new Date(t));

/** 소모품 1개의 다음 보충 예측. 구매 기록을 학습에 포함. */
export function predictRestock(
  c: Consumable,
  purchases: PurchaseRecord[] = [],
): Restock {
  const dates = new Set<number>();
  for (const f of c.fills) {
    const t = parseISO(f);
    if (t !== null) dates.add(t);
  }
  for (const t of matchingPurchaseDates(c.name, purchases)) dates.add(t);
  const sorted = [...dates].sort((a, b) => a - b);

  let cycleDays = c.cycleDays;
  let learned = false;
  if (sorted.length >= 2) {
    let sum = 0;
    for (let i = 1; i < sorted.length; i++) {
      sum += Math.round((sorted[i] - sorted[i - 1]) / DAY);
    }
    const avg = Math.round(sum / (sorted.length - 1));
    if (avg >= 1) {
      cycleDays = avg;
      learned = true;
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const base = sorted.length ? sorted[sorted.length - 1] : parseISO(c.lastBought) ?? today.getTime();

  let nextT = base + cycleDays * DAY;
  const low = !!c.lowSince;
  if (low) nextT = Math.min(nextT, today.getTime()); // 다 썼으면 즉시 필요

  return {
    cycleDays,
    learned,
    eventCount: sorted.length,
    lastBought: fmt(base),
    nextDate: fmt(nextT),
    daysUntilNext: Math.round((nextT - today.getTime()) / DAY),
    low,
  };
}

export const isDue = (r: Restock): boolean =>
  r.daysUntilNext <= RESTOCK_THRESHOLD_DAYS;

// ── 변경 액션 ───────────────────────────────────────────
/** "샀어요/채웠어요": 주기 리셋 + 보충 이력 누적(→ 다음엔 더 정확히 학습). */
export function markBought(id: string): Consumable[] {
  const today = todayStr();
  const list = getConsumables().map((c) =>
    c.id === id
      ? { ...c, lastBought: today, fills: [...c.fills, today].slice(-12), lowSince: null }
      : c,
  );
  saveConsumables(list);
  return list;
}

/** "거의 다 썼어요": 즉시 보충 필요로 표시 → 바로 장보기에 담김. */
export function markLow(id: string): Consumable[] {
  const today = todayStr();
  const list = getConsumables().map((c) =>
    c.id === id ? { ...c, lowSince: today } : c,
  );
  saveConsumables(list);
  return list;
}

export function addConsumable(name: string, cycleDays = 30): Consumable[] {
  const n = name.trim();
  const list = getConsumables();
  if (!n) return list;
  const today = todayStr();
  const next = [
    ...list,
    {
      id: uid('cons'),
      name: n,
      category: '기타',
      cycleDays,
      lastBought: today,
      fills: [today],
      lowSince: null,
      source: 'user' as const,
    },
  ];
  saveConsumables(next);
  return next;
}

export function removeConsumable(id: string): Consumable[] {
  const next = getConsumables().filter((c) => c.id !== id);
  saveConsumables(next);
  return next;
}

// ── 파이프라인: 곧 떨어질 소모품 ↔ 장보기 자동 동기화 ─────
export interface AutoSyncResult {
  added: string[];
  removed: string[];
  dueCount: number;
}

/** 예측을 장보기 리스트에 반영: 곧 필요한 건 담고, 더 이상 필요 없는 자동항목은 뺀다.
 *  여러 번 호출해도 결과가 같도록(idempotent) 이름 기준으로 중복을 막는다. */
export function syncAutoRestock(): AutoSyncResult {
  const purchases = loadPurchases();
  const dueNames = new Set<string>();
  for (const c of getConsumables()) {
    if (isDue(predictRestock(c, purchases))) dueNames.add(c.name);
  }

  const list = getShoppingList();
  const present = new Set(list.map((it) => it.name));
  const added: string[] = [];
  const removed: string[] = [];

  // 1) 더 이상 필요 없어진 "자동" 항목 제거 (수동 추가 항목은 건드리지 않음)
  let next = list.filter((it) => {
    if (it.auto && !dueNames.has(it.name)) {
      removed.push(it.name);
      return false;
    }
    return true;
  });

  // 2) 곧 필요한데 목록에 없는 항목 자동 추가
  for (const name of dueNames) {
    if (present.has(name)) continue;
    next = [
      ...next,
      {
        id: uid('shop'),
        name,
        category: '소모품',
        estimatedPrice: estimatedPriceOf(name),
        quantity: 1,
        preferBrand: false,
        auto: true,
      },
    ];
    added.push(name);
  }

  if (added.length || removed.length) saveShoppingList(next);
  return { added, removed, dueCount: dueNames.size };
}

// ── UI용 뷰: 소모품 + 예측, 임박한 순 정렬 ───────────────
export interface ConsumableView extends Consumable {
  restock: Restock;
}
export function viewConsumables(): ConsumableView[] {
  const purchases = loadPurchases();
  return getConsumables()
    .map((c) => ({ ...c, restock: predictRestock(c, purchases) }))
    .sort((a, b) => a.restock.daysUntilNext - b.restock.daysUntilNext);
}
