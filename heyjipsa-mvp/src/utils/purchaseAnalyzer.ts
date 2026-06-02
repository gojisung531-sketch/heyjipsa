// 구매 기록 패턴 분석 (재구매 주기 예측)
// → purchase-pattern/scripts/analyze.py 포팅 (pandas → 순수 TS, 파일 I/O 제외)

import type { PurchaseRecord } from '../types';

export interface PatternRow {
  item: string; // 표시명 (최빈 원본)
  item_norm: string;
  category: string;
  count: number;
  avg_cycle_days: number | null;
  avg_price: number;
  total_spend: number;
  first_date: string;
  last_date: string;
  next_date: string | null;
  days_until_next: number | null;
}

export interface PurchaseSummary {
  total_spend: number;
  avg_monthly: number;
  period_start: string;
  period_end: string;
  n_tx: number;
  n_items: number;
}

const DAY = 86_400_000;

/** 품목명 정규화: 표기 차이를 묶기 위함. (normalize_item_name 포팅) */
export function normalizeItemName(name: string): string {
  if (typeof name !== 'string') return '';
  let s = name.trim().toLowerCase();
  s = s.replace(/([가-힣])(\d)/g, '$1 $2');
  s = s.replace(/(\d)([가-힣])/g, '$1 $2');
  s = s.split('리터').join('l').split('미리리터').join('ml');
  s = s.replace(/\s+/g, ' ');
  s = s.replace(/^[\s.,_/()[\]{}-]+/, '').replace(/[\s.,_/()[\]{}-]+$/, '');
  return s;
}

function parseDate(s: string): Date | null {
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;

/** 최빈값 (동점이면 먼저 등장한 것). */
function mode(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0] ?? '';
  let bestN = -1;
  for (const v of values) {
    const n = counts.get(v)!;
    if (n > bestN) {
      bestN = n;
      best = v;
    }
  }
  return best;
}

interface Norm {
  date: Date;
  item_norm: string;
  item_display: string;
  price: number;
  qty: number;
  category: string;
}

function normalize(records: PurchaseRecord[], doNormalize = true): Norm[] {
  const out: Norm[] = [];
  for (const r of records) {
    const date = parseDate(r.date);
    const price = Number(r.unitPrice);
    if (!date || isNaN(price)) continue;
    const display = String(r.item).trim();
    const itemNorm = doNormalize ? normalizeItemName(r.item) : display;
    if (!itemNorm) continue;
    out.push({
      date,
      item_norm: itemNorm,
      item_display: display,
      price,
      qty: Number(r.qty) || 1,
      category: r.category ?? '',
    });
  }
  return out;
}

/** 품목별 집계 + 재구매 주기/다음 예상일. (analyze 포팅) */
export function analyzePatterns(
  records: PurchaseRecord[],
  minCount = 2,
  top = 30,
): PatternRow[] {
  const df = normalize(records);
  if (df.length === 0) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // group by item_norm (insertion order 유지)
  const groups = new Map<string, Norm[]>();
  for (const n of df) {
    if (!groups.has(n.item_norm)) groups.set(n.item_norm, []);
    groups.get(n.item_norm)!.push(n);
  }

  const rows: PatternRow[] = [];
  for (const [itemNorm, gRaw] of groups) {
    const g = [...gRaw].sort((a, b) => a.date.getTime() - b.date.getTime());
    const count = g.length;
    if (count < minCount) continue;

    const totalSpend = g.reduce((s, x) => s + x.price * x.qty, 0);
    const avgPrice = g.reduce((s, x) => s + x.price, 0) / count;
    const firstDate = g[0].date;
    const lastDate = g[count - 1].date;

    let avgCycleDays: number | null = null;
    let nextDate: Date | null = null;
    if (count >= 2) {
      let sumDiff = 0;
      for (let i = 1; i < count; i++) {
        sumDiff += Math.round((g[i].date.getTime() - g[i - 1].date.getTime()) / DAY);
      }
      avgCycleDays = sumDiff / (count - 1);
      nextDate = new Date(lastDate.getTime() + Math.round(avgCycleDays) * DAY);
    }

    rows.push({
      item: mode(g.map((x) => x.item_display)) || itemNorm,
      item_norm: itemNorm,
      category: mode(g.map((x) => x.category)),
      count,
      avg_cycle_days: avgCycleDays,
      avg_price: avgPrice,
      total_spend: totalSpend,
      first_date: fmtDate(firstDate),
      last_date: fmtDate(lastDate),
      next_date: nextDate ? fmtDate(nextDate) : null,
      days_until_next: nextDate
        ? Math.round((nextDate.getTime() - today.getTime()) / DAY)
        : null,
    });
  }

  // count desc, total_spend desc
  rows.sort((a, b) => b.count - a.count || b.total_spend - a.total_spend);
  return rows.slice(0, top);
}

/** 월별 총 지출 (차트용). */
export function monthlySpend(records: PurchaseRecord[]): {
  labels: string[];
  values: number[];
} {
  const df = normalize(records);
  const map = new Map<string, number>();
  for (const n of df) {
    const key = `${n.date.getFullYear()}-${String(n.date.getMonth() + 1).padStart(2, '0')}`;
    map.set(key, (map.get(key) ?? 0) + n.price * n.qty);
  }
  const labels = [...map.keys()].sort();
  return { labels, values: labels.map((k) => Math.round(map.get(k)!)) };
}

/** KPI 요약. */
export function purchaseSummary(records: PurchaseRecord[]): PurchaseSummary | null {
  const df = normalize(records);
  if (df.length === 0) return null;
  const totalSpend = df.reduce((s, x) => s + x.price * x.qty, 0);
  const dates = df.map((x) => x.date.getTime());
  const m = monthlySpend(records);
  const avgMonthly = m.values.length
    ? Math.round(m.values.reduce((s, v) => s + v, 0) / m.values.length)
    : 0;
  return {
    total_spend: totalSpend,
    avg_monthly: avgMonthly,
    period_start: fmtDate(new Date(Math.min(...dates))),
    period_end: fmtDate(new Date(Math.max(...dates))),
    n_tx: df.length,
    n_items: new Set(df.map((x) => x.item_norm)).size,
  };
}

/** 주기 표시 포맷. (fmt_cycle 포팅) */
export function fmtCycle(days: number | null): string {
  if (days === null || isNaN(days)) return '-';
  if (days < 14) return `${Math.round(days)}일`;
  return `${Math.round(days)}일 (${(days / 7).toFixed(1)}주)`;
}
