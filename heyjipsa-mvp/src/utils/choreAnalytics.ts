// 가사노동 기록 분석 — chore-dashboard/scripts/dashboard.py 의 분석 파이프라인 포팅
// (HTML/Chart.js 렌더링부는 components/ChoreDashboard.tsx 가 대체)

import type { ChoreEntry } from '../types';

export interface MemberStat {
  total_minutes: number;
  total_hours: number;
  task_count: number;
  avg_minutes_per_task: number;
}

export interface TimeSeries {
  periods: string[];
  data: Record<string, Record<string, number>>;
}

export interface Imbalance {
  imbalanced: boolean;
  top_member?: string;
  top_share?: number;
  shares: Record<string, number>;
  message: string;
}

export interface ChoreAnalysis {
  total_records: number;
  members: string[];
  member_stats: Record<string, MemberStat>;
  category_distribution: Record<string, Record<string, number>>;
  weekly_trend: TimeSeries;
  monthly_trend: TimeSeries;
  fairness_score: number;
  fairness_score_by_count: number;
  imbalance: Imbalance;
}

const round1 = (x: number) => Math.round(x * 10) / 10;
const round2 = (x: number) => Math.round(x * 100) / 100;

/** 구성원별 총 시간 / 작업 수 집계. (calculate_member_stats 포팅) */
export function calculateMemberStats(
  records: ChoreEntry[],
): Record<string, MemberStat> {
  const agg: Record<string, { total: number; count: number }> = {};
  for (const r of records) {
    if (!agg[r.person]) agg[r.person] = { total: 0, count: 0 };
    agg[r.person].total += r.durationMinutes;
    agg[r.person].count += 1;
  }
  const out: Record<string, MemberStat> = {};
  for (const m of Object.keys(agg)) {
    const s = agg[m];
    out[m] = {
      total_minutes: round1(s.total),
      total_hours: round2(s.total / 60),
      task_count: s.count,
      avg_minutes_per_task: s.count ? round1(s.total / s.count) : 0,
    };
  }
  return out;
}

/** 카테고리별 구성원이 차지하는 분. (calculate_category_distribution 포팅) */
export function calculateCategoryDistribution(
  records: ChoreEntry[],
): Record<string, Record<string, number>> {
  const dist: Record<string, Record<string, number>> = {};
  for (const r of records) {
    if (!dist[r.category]) dist[r.category] = {};
    dist[r.category][r.person] =
      (dist[r.category][r.person] ?? 0) + r.durationMinutes;
  }
  const out: Record<string, Record<string, number>> = {};
  for (const cat of Object.keys(dist)) {
    out[cat] = {};
    for (const m of Object.keys(dist[cat])) out[cat][m] = round1(dist[cat][m]);
  }
  return out;
}

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** ISO 8601 주차 (year, week). Python date.isocalendar() 대응. */
function isoWeek(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // 해당 주의 목요일
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const fDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - fDayNum + 3);
  const week =
    1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return { year: date.getUTCFullYear(), week };
}

/** 주간(ISO)/월간 추이. (calculate_time_series 포팅) */
export function calculateTimeSeries(
  records: ChoreEntry[],
  freq: 'week' | 'month' = 'week',
): TimeSeries {
  const series: Record<string, Record<string, number>> = {};
  for (const r of records) {
    const dt = parseDate(r.date);
    if (!dt) continue;
    let key: string;
    if (freq === 'week') {
      const { year, week } = isoWeek(dt);
      key = `${year}-W${String(week).padStart(2, '0')}`;
    } else {
      key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    }
    if (!series[key]) series[key] = {};
    series[key][r.person] = (series[key][r.person] ?? 0) + r.durationMinutes;
  }
  const periods = Object.keys(series).sort();
  const data: Record<string, Record<string, number>> = {};
  for (const k of periods) {
    data[k] = {};
    for (const m of Object.keys(series[k])) data[k][m] = round1(series[k][m]);
  }
  return { periods, data };
}

/**
 * 공정성 점수 (0-100). 균등분배에 가까울수록 100.
 * score = 100 * (1 - L1편차 / 최대L1편차), 최대L1편차 = 2(1 - 1/n). (calculate_fairness_score 포팅)
 */
export function calculateFairnessScore(
  memberStats: Record<string, MemberStat>,
  metric: keyof MemberStat = 'total_minutes',
): number {
  const members = Object.keys(memberStats);
  const n = members.length;
  if (n < 2) return 100.0;
  const values = members.map((m) => memberStats[m][metric]);
  const total = values.reduce((a, b) => a + b, 0);
  if (total === 0) return 100.0;
  const uniform = 1 / n;
  const l1 = values.reduce((acc, v) => acc + Math.abs(v / total - uniform), 0);
  const maxL1 = 2 * (1 - 1 / n);
  const score = 100 * (1 - l1 / maxL1);
  return round1(Math.max(0, Math.min(100, score)));
}

/** 한 명이 threshold 이상 차지하면 불균형 알림. (detect_imbalance 포팅) */
export function detectImbalance(
  memberStats: Record<string, MemberStat>,
  threshold = 0.65,
  metric: keyof MemberStat = 'total_minutes',
): Imbalance {
  const members = Object.keys(memberStats);
  const values: Record<string, number> = {};
  for (const m of members) values[m] = memberStats[m][metric];
  const total = members.reduce((a, m) => a + values[m], 0);

  if (total === 0 || members.length < 2) {
    const shares: Record<string, number> = {};
    for (const m of members) shares[m] = 0.0;
    return {
      imbalanced: false,
      shares,
      message: '분석할 데이터가 충분하지 않습니다.',
    };
  }

  // argmax (동점이면 먼저 등장한 구성원)
  let top = members[0];
  for (const m of members) if (values[m] > values[top]) top = m;
  const topShare = values[top] / total;

  const sharesPct: Record<string, number> = {};
  for (const m of members) sharesPct[m] = round1((values[m] / total) * 100);

  if (topShare >= threshold) {
    return {
      imbalanced: true,
      top_member: top,
      top_share: round1(topShare * 100),
      shares: sharesPct,
      message: `${top}님이 전체의 ${Math.round(topShare * 100)}%를 담당. 균형 조절 필요.`,
    };
  }
  return {
    imbalanced: false,
    top_member: top,
    top_share: round1(topShare * 100),
    shares: sharesPct,
    message: '비교적 균형있게 분배되어 있습니다.',
  };
}

/** 전체 분석 파이프라인. (analyze 포팅) */
export function analyze(records: ChoreEntry[]): ChoreAnalysis {
  const memberStats = calculateMemberStats(records);
  return {
    total_records: records.length,
    members: Object.keys(memberStats),
    member_stats: memberStats,
    category_distribution: calculateCategoryDistribution(records),
    weekly_trend: calculateTimeSeries(records, 'week'),
    monthly_trend: calculateTimeSeries(records, 'month'),
    fairness_score: calculateFairnessScore(memberStats, 'total_minutes'),
    fairness_score_by_count: calculateFairnessScore(memberStats, 'task_count'),
    imbalance: detectImbalance(memberStats),
  };
}
