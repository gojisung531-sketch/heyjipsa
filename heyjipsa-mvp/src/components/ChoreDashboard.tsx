// 가사노동 분배 대시보드 (Chart.js)
// → chore-dashboard/scripts/dashboard.py 의 Chart.js 시각화 포팅
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import type { ChoreEntry } from '../types';
import { analyze } from '../utils/choreAnalytics';
import { CHORE_CATEGORY_LABELS } from '../utils/choreParser';
import { ProgressBar } from './ui';

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
);

// 구성원별 일관 색상 (dashboard.py PALETTE)
const PALETTE = [
  '#1F3864', '#2E75B6', '#5BA480', '#ec4899', '#0891b2',
  '#a855f7', '#eab308', '#64748b', '#C0504D', '#0ea5e9',
];

const baseOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' as const } },
};

export default function ChoreDashboard({ records }: { records: ChoreEntry[] }) {
  if (records.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center text-sm text-muted">
        아직 기록이 없어요. <b>기록 탭</b>에서 오늘 한 집안일을 적어보세요.
      </div>
    );
  }

  const a = analyze(records);
  const colorOf = (m: string) => PALETTE[a.members.indexOf(m) % PALETTE.length];

  const categories = Object.keys(a.category_distribution);
  const catLabel = (c: string) =>
    CHORE_CATEGORY_LABELS[c as keyof typeof CHORE_CATEGORY_LABELS] ?? c;

  return (
    <div className="space-y-4">
      {/* 요약: 총 기록 + 공정성 점수 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs text-muted">총 기록</p>
          <p className="mt-1 text-3xl font-extrabold text-navy">
            {a.total_records}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs text-muted">공정성 점수</p>
          <p className="mt-1 text-3xl font-extrabold text-blue">
            {a.fairness_score}
            <span className="text-base font-normal text-muted"> / 100</span>
          </p>
          <ProgressBar value={a.fairness_score} total={100} className="mt-2" />
        </div>
      </div>

      {/* 불균형 알림 */}
      <div
        className={`rounded-2xl p-4 text-sm ${
          a.imbalance.imbalanced
            ? 'bg-danger/10 text-danger'
            : 'bg-mint/10 text-mint'
        }`}
      >
        <b>{a.imbalance.imbalanced ? '⚠️ 불균형 감지' : '✅ 균형 양호'}</b> —{' '}
        {a.imbalance.message}
      </div>

      {/* 시간 기준 분배 (도넛) */}
      <div className="rounded-2xl bg-white p-4">
        <h3 className="mb-2 text-sm font-bold text-ink">시간 기준 분배 (분)</h3>
        <div className="relative h-60">
          <Doughnut
            data={{
              labels: a.members,
              datasets: [
                {
                  data: a.members.map((m) => a.member_stats[m].total_minutes),
                  backgroundColor: a.members.map(colorOf),
                  borderWidth: 2,
                  borderColor: '#fff',
                },
              ],
            }}
            options={baseOpts}
          />
        </div>
      </div>

      {/* 작업 수 기준 분배 (도넛) */}
      <div className="rounded-2xl bg-white p-4">
        <h3 className="mb-2 text-sm font-bold text-ink">작업 수 기준 분배</h3>
        <div className="relative h-60">
          <Doughnut
            data={{
              labels: a.members,
              datasets: [
                {
                  data: a.members.map((m) => a.member_stats[m].task_count),
                  backgroundColor: a.members.map(colorOf),
                  borderWidth: 2,
                  borderColor: '#fff',
                },
              ],
            }}
            options={baseOpts}
          />
        </div>
      </div>

      {/* 카테고리별 누적 막대 */}
      <div className="rounded-2xl bg-white p-4">
        <h3 className="mb-2 text-sm font-bold text-ink">카테고리별 분배 (분)</h3>
        <div className="relative h-72">
          <Bar
            data={{
              labels: categories.map(catLabel),
              datasets: a.members.map((m) => ({
                label: m,
                data: categories.map(
                  (c) => a.category_distribution[c][m] ?? 0,
                ),
                backgroundColor: colorOf(m),
              })),
            }}
            options={{
              ...baseOpts,
              scales: {
                x: { stacked: true },
                y: { stacked: true, beginAtZero: true },
              },
            }}
          />
        </div>
      </div>

      {/* 주간 추이 (라인) */}
      <div className="rounded-2xl bg-white p-4">
        <h3 className="mb-2 text-sm font-bold text-ink">주간 추이 (분)</h3>
        <div className="relative h-64">
          <Line
            data={{
              labels: a.weekly_trend.periods,
              datasets: a.members.map((m) => ({
                label: m,
                data: a.weekly_trend.periods.map(
                  (p) => a.weekly_trend.data[p][m] ?? 0,
                ),
                borderColor: colorOf(m),
                backgroundColor: colorOf(m) + '33',
                tension: 0.3,
                fill: false,
              })),
            }}
            options={{
              ...baseOpts,
              scales: { y: { beginAtZero: true } },
            }}
          />
        </div>
      </div>

      {/* 구성원별 통계 테이블 */}
      <div className="rounded-2xl bg-white p-4">
        <h3 className="mb-2 text-sm font-bold text-ink">구성원별 통계</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted">
              <th className="py-1 text-left">구성원</th>
              <th className="py-1 text-right">시간(분)</th>
              <th className="py-1 text-right">작업</th>
              <th className="py-1 text-right">평균</th>
            </tr>
          </thead>
          <tbody>
            {a.members.map((m) => {
              const s = a.member_stats[m];
              return (
                <tr key={m} className="border-t border-light">
                  <td className="py-1.5">
                    <span
                      className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                      style={{ background: colorOf(m) }}
                    />
                    {m}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">
                    {s.total_minutes.toLocaleString()}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">
                    {s.task_count}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">
                    {s.avg_minutes_per_task}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
