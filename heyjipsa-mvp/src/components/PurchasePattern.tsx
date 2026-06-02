// 재구매 패턴 대시보드 (Chart.js)
// → purchase-pattern/scripts/analyze.py 의 리포트 시각화 포팅
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { PurchaseRecord } from '../types';
import {
  analyzePatterns,
  monthlySpend,
  purchaseSummary,
  fmtCycle,
} from '../utils/purchaseAnalyzer';
import { won } from '../utils/format';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

function ddayLabel(d: number | null): { text: string; tone: 'over' | 'soon' | 'ok' | 'none' } {
  if (d === null) return { text: '-', tone: 'none' };
  if (d < 0) return { text: `${Math.abs(d)}일 지남`, tone: 'over' };
  if (d === 0) return { text: '오늘', tone: 'soon' };
  if (d <= 7) return { text: `D-${d}`, tone: 'soon' };
  return { text: `D-${d}`, tone: 'ok' };
}

export default function PurchasePattern({
  records,
  onAddToCart,
}: {
  records: PurchaseRecord[];
  onAddToCart?: (name: string) => void;
}) {
  const rows = analyzePatterns(records);
  const summary = purchaseSummary(records);
  const monthly = monthlySpend(records);

  if (!summary || rows.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center text-sm text-muted">
        같은 품목을 <b>2번 이상</b> 기록하면 재구매 주기를 예측해드려요.
        <br />
        <b>구매 기록</b> 탭에서 영수증 품목을 추가해 보세요.
      </div>
    );
  }

  // 곧 재구매(7일 이내 또는 이미 지남)
  const rebuy = rows
    .filter((r) => r.days_until_next !== null && r.days_until_next <= 7)
    .sort((a, b) => (a.days_until_next ?? 0) - (b.days_until_next ?? 0));

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs text-muted">총 지출</p>
          <p className="mt-1 text-2xl font-extrabold text-navy">
            {won(summary.total_spend)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs text-muted">월 평균</p>
          <p className="mt-1 text-2xl font-extrabold text-blue">
            {won(summary.avg_monthly)}
          </p>
        </div>
      </div>
      <p className="-mt-2 text-xs text-muted">
        {summary.period_start} ~ {summary.period_end} · 거래 {summary.n_tx}건 ·
        품목 {summary.n_items}개
      </p>

      {/* 곧 재구매 알림 */}
      {rebuy.length > 0 && (
        <div className="rounded-2xl bg-cream p-4">
          <p className="mb-2 text-sm font-bold text-danger">🛒 곧 다시 살 때예요</p>
          <ul className="space-y-2">
            {rebuy.map((r) => {
              const dd = ddayLabel(r.days_until_next);
              return (
                <li key={r.item_norm} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 text-ink">
                    <b>{r.item}</b>{' '}
                    <span className="text-muted">· 주기 {fmtCycle(r.avg_cycle_days)}</span>
                  </span>
                  <span
                    className={`font-semibold ${
                      dd.tone === 'over' ? 'text-danger' : 'text-blue'
                    }`}
                  >
                    {dd.text}
                  </span>
                  {onAddToCart && (
                    <button
                      onClick={() => onAddToCart(r.item)}
                      className="rounded-full bg-navy px-2.5 py-1 text-[11px] font-medium text-white"
                    >
                      담기
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* 월별 지출 */}
      {monthly.labels.length > 0 && (
        <div className="rounded-2xl bg-white p-4">
          <h3 className="mb-2 text-sm font-bold text-ink">월별 지출</h3>
          <div className="relative h-52">
            <Bar
              data={{
                labels: monthly.labels,
                datasets: [
                  {
                    label: '월 지출(원)',
                    data: monthly.values,
                    backgroundColor: '#2E75B6',
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } },
              }}
            />
          </div>
        </div>
      )}

      {/* 패턴 테이블 */}
      <div className="rounded-2xl bg-white p-4">
        <h3 className="mb-2 text-sm font-bold text-ink">품목별 재구매 패턴</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted">
              <th className="py-1 text-left">품목</th>
              <th className="py-1 text-right">횟수</th>
              <th className="py-1 text-right">주기</th>
              <th className="py-1 text-right">평균단가</th>
              <th className="py-1 text-right">다음</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const dd = ddayLabel(r.days_until_next);
              return (
                <tr key={r.item_norm} className="border-t border-light">
                  <td className="py-1.5">{r.item}</td>
                  <td className="py-1.5 text-right tabular-nums">{r.count}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {fmtCycle(r.avg_cycle_days)}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">
                    {won(r.avg_price)}
                  </td>
                  <td
                    className={`py-1.5 text-right tabular-nums ${
                      dd.tone === 'over'
                        ? 'text-danger'
                        : dd.tone === 'soon'
                          ? 'text-blue'
                          : 'text-muted'
                    }`}
                  >
                    {dd.text}
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
