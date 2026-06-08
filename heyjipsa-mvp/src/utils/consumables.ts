// 소모품 소비주기 "스마트" 학습 → 곧 떨어질 품목을 「이번 주 장보기」에 자동 추가.
// = 집안일/구매 "인식" → 소비주기 학습 → 자동 장보기 → 배송비 최적화 파이프라인의 허리.
//
// 학습 고도화:
//  1) 재구매 주기: 보충 이력 + 구매 기록을 합치되, 수량 보정(2팩=2주기) →
//     이상치(휴가·대량구매) 제거 → 최근 가중 평균(EWMA)으로 추정 + 신뢰도(변동계수).
//  2) 사용 빈도: 연동된 집안일 체크/사용 이벤트의 "최근 페이스 / 평소 페이스"로
//     소진 속도(intensity)를 보정 — 자주 쓰면 앞당기고, 뜸하면 늦춘다.
//  3) 알림 시점(leadDays)을 주기·신뢰도에 맞춰 적응형으로.

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

export type Confidence = '높음' | '보통' | '낮음';
export type Trend = 'fast' | 'slow' | 'normal';

// 기본 소모품 카탈로그. fills(보충)·uses(사용)·linkedChoreIds(연동)로
// 데모 시 다양한 학습 상태가 보이도록 시드한다.
interface DefaultConsumable {
  name: string;
  category: string;
  cycleDays: number;
  fillsDaysAgo: number[]; // 보충 이력(일 전). 마지막이 최근.
  usesDaysAgo?: number[]; // 사용 이벤트(일 전).
  linkedChoreIds?: string[]; // 연동 집안일 id (templates.ts 참조)
}
const DEFAULTS: DefaultConsumable[] = [
  // 1회 보충 → 주기 미학습(기본값), 달력상 이미 지남
  { name: '휴지', category: '생필품', cycleDays: 24, fillsDaysAgo: [30] },
  // 4회 보충(31일 간격) → 학습·신뢰도 높음, D-2
  { name: '세제', category: '세탁', cycleDays: 30, fillsDaysAgo: [122, 91, 60, 29], linkedChoreIds: ['common_laundry'] },
  // 3회 보충(10일) → 학습, D-1
  { name: '생수', category: '식품', cycleDays: 10, fillsDaysAgo: [29, 19, 9] },
  // 달력상 D-8(아직)이지만 "최근 사용 급증" → 앞당겨져 자동 담김 (스마트 하이라이트)
  {
    name: '물티슈',
    category: '생필품',
    cycleDays: 20,
    fillsDaysAgo: [12],
    usesDaysAgo: [40, 33, 26, 4, 3, 2, 1],
    linkedChoreIds: ['common_floor_wipe'],
  },
  // 사용 잦지만 아직 여유 → 이유만 표시
  {
    name: '주방세제',
    category: '주방',
    cycleDays: 30,
    fillsDaysAgo: [15],
    usesDaysAgo: [27, 20, 13, 6, 3, 1],
    linkedChoreIds: ['common_dishes'],
  },
  { name: '섬유유연제', category: '세탁', cycleDays: 45, fillsDaysAgo: [20], linkedChoreIds: ['common_laundry'] },
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
      uses: (d.usesDaysAgo ?? []).map(daysAgoStr),
      linkedChoreIds: d.linkedChoreIds ?? [],
      lowSince: null,
      source: 'default' as const,
    };
  });
}

/** 저장된 항목을 v2 형태로 정규화(누락 필드 보강). */
function normalize(c: Partial<Consumable> & { id: string; name: string }): Consumable {
  return {
    id: c.id,
    name: c.name,
    category: c.category ?? '기타',
    cycleDays: typeof c.cycleDays === 'number' ? c.cycleDays : 30,
    lastBought: c.lastBought ?? todayStr(),
    fills: Array.isArray(c.fills) ? c.fills : [],
    uses: Array.isArray(c.uses) ? c.uses : [],
    linkedChoreIds: Array.isArray(c.linkedChoreIds) ? c.linkedChoreIds : [],
    lowSince: c.lowSince ?? null,
    source: c.source === 'user' ? 'user' : 'default',
  };
}

export function getConsumables(): Consumable[] {
  const raw = loadJSON<Consumable[] | null>(STORAGE_KEYS.CONSUMABLES, null);
  if (raw && Array.isArray(raw)) {
    if (raw.length === 0) return []; // 사용자가 비운 경우 존중
    if ('linkedChoreIds' in raw[0]) return raw.map(normalize); // 이미 v2
    // v1(구버전) 데이터 → v2 기본 카탈로그로 마이그레이션(재시드)
  }
  const seeded = buildDefaults();
  saveJSON(STORAGE_KEYS.CONSUMABLES, seeded);
  return seeded;
}

export function saveConsumables(list: Consumable[]): void {
  saveJSON(STORAGE_KEYS.CONSUMABLES, list);
}

// ── 수학 헬퍼 ───────────────────────────────────────────
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
function median(a: number[]): number {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function std(a: number[]): number {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(mean(a.map((x) => (x - m) ** 2)));
}
/** 최근 값에 더 큰 가중치(EWMA). vals: 오래된→최신 순. */
function recencyWeightedMean(vals: number[], alpha = 0.6): number {
  const n = vals.length;
  if (!n) return 0;
  let ws = 0;
  let vs = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.pow(alpha, n - 1 - i);
    ws += w;
    vs += w * vals[i];
  }
  return vs / ws;
}

function parseISO(s: string): number | null {
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
}
const fmt = (t: number) => todayStr(new Date(t));

interface RestockEv {
  t: number;
  qty: number;
}

/** 구매 기록 중 이 소모품과 매칭되는 (날짜, 수량). 영수증/OCR도 학습에 반영. */
function matchingPurchases(name: string, purchases: PurchaseRecord[]): RestockEv[] {
  const key = normalizeItemName(name);
  if (!key) return [];
  const out: RestockEv[] = [];
  for (const p of purchases) {
    if (normalizeItemName(p.item).includes(key)) {
      const t = parseISO(p.date);
      if (t !== null) out.push({ t, qty: Math.max(1, Number(p.qty) || 1) });
    }
  }
  return out;
}

/** 보충 이력 → 수량보정·이상치제거·최근가중 주기 + 신뢰도. */
function learnCycle(
  restocks: RestockEv[],
  fallback: number,
): { cycle: number; learned: boolean; confidence: Confidence } {
  const sorted = [...restocks].sort((a, b) => a.t - b.t);
  // 인접 보충 간격을 "앞 보충 수량"으로 나눠 1개당 소비 일수로 환산
  const perUnit: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const gap = (sorted[i].t - sorted[i - 1].t) / DAY;
    const pu = gap / Math.max(1, sorted[i - 1].qty);
    if (pu >= 0.5) perUnit.push(pu);
  }
  if (perUnit.length === 0) {
    return { cycle: fallback, learned: false, confidence: '낮음' };
  }
  const med = median(perUnit);
  let kept = perUnit.filter((g) => g >= med / 3 && g <= med * 3);
  if (kept.length === 0) kept = perUnit;

  const cycle = recencyWeightedMean(kept, 0.6);
  let confidence: Confidence = '보통';
  if (kept.length >= 2) {
    const cv = mean(kept) > 0 ? std(kept) / mean(kept) : 1;
    confidence = cv <= 0.25 ? '높음' : cv <= 0.6 ? '보통' : '낮음';
  }
  return { cycle: Math.max(1, cycle), learned: true, confidence };
}

export interface Restock {
  cycleDays: number; // 학습/기본 주기(1개당 소비 일수)
  learned: boolean;
  confidence: Confidence;
  restockCount: number;
  useCount: number;
  intensity: number; // 1=평소, >1 빨리 소진, <1 느리게
  trend: Trend;
  leadDays: number; // 이만큼 남으면 담는다(적응형 알림 시점)
  lastBought: string;
  nextDate: string;
  daysUntilNext: number;
  low: boolean;
}

/** 소모품 1개의 다음 보충 예측(스마트). */
export function predictRestock(
  c: Consumable,
  purchases: PurchaseRecord[] = [],
): Restock {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayT = today.getTime();

  // 1) 보충 이벤트 = 직접 보충(fills, 수량1) + 구매기록(수량 반영)
  const restocks: RestockEv[] = [];
  for (const f of c.fills) {
    const t = parseISO(f);
    if (t !== null) restocks.push({ t, qty: 1 });
  }
  restocks.push(...matchingPurchases(c.name, purchases));

  const { cycle: cycleRaw, learned, confidence } = learnCycle(restocks, c.cycleDays);
  const cycle = Math.max(1, Math.round(cycleRaw));

  // 2) 사용 빈도 강도(intensity): 최근 페이스 / 평소 페이스
  const uses = c.uses
    .map(parseISO)
    .filter((t): t is number => t !== null)
    .sort((a, b) => a - b);
  let intensity = 1;
  if (uses.length >= 4) {
    const spanDays = (todayT - uses[0]) / DAY;
    const win = clamp(Math.round(cycle / 2), 5, 30);
    if (spanDays >= win) {
      const histPace = uses.length / Math.max(spanDays, 1);
      const recentCount = uses.filter((t) => t >= todayT - win * DAY).length;
      const recentPace = recentCount / win;
      if (histPace > 0 && recentPace > 0) {
        intensity = clamp(recentPace / histPace, 0.5, 2);
      }
    }
  }
  const trend: Trend = intensity >= 1.15 ? 'fast' : intensity <= 0.85 ? 'slow' : 'normal';

  // 3) 결합: 달력 잔여를 사용강도로 보정
  const lastRestockT = restocks.length
    ? Math.max(...restocks.map((r) => r.t))
    : parseISO(c.lastBought) ?? todayT;
  const elapsed = (todayT - lastRestockT) / DAY;
  let rem = (cycle - elapsed) / intensity;
  const low = !!c.lowSince;
  if (low) rem = Math.min(rem, 0);

  // 적응형 알림 시점: 주기의 20%(2~10일) + 신뢰도 낮을수록 여유
  const pad = confidence === '낮음' ? 3 : confidence === '보통' ? 1 : 0;
  const leadDays = clamp(Math.round(cycle * 0.2), 2, 10) + pad;

  return {
    cycleDays: cycle,
    learned,
    confidence,
    restockCount: restocks.length,
    useCount: uses.length,
    intensity,
    trend,
    leadDays,
    lastBought: fmt(lastRestockT),
    nextDate: fmt(todayT + Math.round(rem) * DAY),
    daysUntilNext: Math.round(rem),
    low,
  };
}

export const isDue = (r: Restock): boolean =>
  r.low || r.daysUntilNext <= r.leadDays;

// ── 변경 액션 ───────────────────────────────────────────
function update(id: string, fn: (c: Consumable) => Consumable): Consumable[] {
  const list = getConsumables().map((c) => (c.id === id ? fn(c) : c));
  saveConsumables(list);
  return list;
}

/** "샀어요/채웠어요": 주기 리셋 + 보충 이력 누적(→ 더 정확히 학습). */
export function markBought(id: string): Consumable[] {
  const today = todayStr();
  return update(id, (c) => ({
    ...c,
    lastBought: today,
    fills: [...c.fills, today].slice(-12),
    lowSince: null,
  }));
}

/** "거의 다 썼어요": 즉시 보충 필요로 표시. */
export function markLow(id: string): Consumable[] {
  return update(id, (c) => ({ ...c, lowSince: todayStr() }));
}

export function addConsumable(name: string, cycleDays = 30): Consumable[] {
  const n = name.trim();
  const list = getConsumables();
  if (!n) return list;
  const today = todayStr();
  const next: Consumable[] = [
    ...list,
    {
      id: uid('cons'),
      name: n,
      category: '기타',
      cycleDays,
      lastBought: today,
      fills: [today],
      uses: [],
      linkedChoreIds: [],
      lowSince: null,
      source: 'user',
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

export function linkChore(id: string, choreId: string): Consumable[] {
  return update(id, (c) =>
    c.linkedChoreIds.includes(choreId)
      ? c
      : { ...c, linkedChoreIds: [...c.linkedChoreIds, choreId] },
  );
}
export function unlinkChore(id: string, choreId: string): Consumable[] {
  return update(id, (c) => ({
    ...c,
    linkedChoreIds: c.linkedChoreIds.filter((x) => x !== choreId),
  }));
}

/** 연동 집안일 체크 시: 해당 소모품에 '사용' 1건 기록(하루 1회 중복방지). */
export function logChoreUse(choreId: string): Consumable[] {
  const today = todayStr();
  const list = getConsumables().map((c) =>
    c.linkedChoreIds.includes(choreId) && !c.uses.includes(today)
      ? { ...c, uses: [...c.uses, today].slice(-60) }
      : c,
  );
  saveConsumables(list);
  return list;
}
/** 연동 집안일 체크 해제 시: 오늘 기록한 '사용' 되돌리기. */
export function unlogChoreUse(choreId: string): Consumable[] {
  const today = todayStr();
  const list = getConsumables().map((c) =>
    c.linkedChoreIds.includes(choreId)
      ? { ...c, uses: c.uses.filter((u) => u !== today) }
      : c,
  );
  saveConsumables(list);
  return list;
}

// ── 파이프라인: 곧 떨어질 소모품 ↔ 장보기 자동 동기화 ─────
export interface AutoSyncResult {
  added: string[];
  removed: string[];
  dueCount: number;
}
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

  let next = list.filter((it) => {
    if (it.auto && !dueNames.has(it.name)) {
      removed.push(it.name);
      return false;
    }
    return true;
  });
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
