// 홈 (메인 대시보드) `/home`
import { Navigate, useNavigate } from 'react-router-dom';
import type { FixedExpense, HouseholdConfig, HouseholdType } from '../types';
import { Card, ProgressBar } from '../components/ui';
import { STORAGE_KEYS, loadJSON } from '../utils/storage';
import { getShoppingList } from '../utils/shopping';
import { optimize, fromShoppingItems } from '../utils/cartOptimizer';
import { buildChecklist } from '../utils/checklist';
import { loadChecklistState } from '../utils/checklistState';
import { daysUntilDue } from '../utils/expenses';
import { won } from '../utils/format';

const TYPE_LABEL: Record<HouseholdType, string> = {
  single: '1인 자취',
  couple: '2인 맞벌이',
  couple_1kid: '부부 + 아이 1명',
  couple_2kids: '부부 + 아이 2명 이상',
  with_parents: '부모님 동거',
};

export default function Home() {
  const navigate = useNavigate();
  const config = loadJSON<HouseholdConfig | null>(
    STORAGE_KEYS.HOUSEHOLD_CONFIG,
    null,
  );
  if (!config) return <Navigate to="/onboarding" replace />;

  // ── 장보기 요약 ──
  const shopping = getShoppingList();
  const estTotal = shopping.reduce(
    (s, it) => s + it.estimatedPrice * it.quantity,
    0,
  );
  const opt = optimize(fromShoppingItems(shopping));
  const freeAll = opt.total_shipping === 0 && shopping.length > 0;

  // ── 오늘의 집안일 ──
  const { byPeriod } = buildChecklist(config);
  const daily = byPeriod.daily;
  const state = loadChecklistState(config);
  const checkedSet = new Set(state.checked);
  const doneToday = daily.filter((i) => checkedSet.has(i.id)).length;
  const dailyPreview = daily.slice(0, 5);

  // ── 이번 달 고정비 ──
  const expenses = loadJSON<FixedExpense[]>(STORAGE_KEYS.FIXED_EXPENSES, []);
  const upcoming = expenses
    .filter((e) => !e.paid)
    .map((e) => ({ ...e, dday: daysUntilDue(e.dueDay) }))
    .sort((a, b) => a.dday - b.dday)
    .slice(0, 2);

  return (
    <div>
      <header className="mb-5">
        <p className="text-sm text-muted">{TYPE_LABEL[config.type]} 집사</p>
        <h1 className="text-2xl font-bold text-navy">이번 주, 제가 챙길게요</h1>
      </header>

      {/* 카드 1: 이번 주 장보기 (가장 크게) */}
      <Card onClick={() => navigate('/shopping')} className="mb-4 bg-navy text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-white/70">🛒 이번 주 장보기</p>
            <p className="mt-1 text-3xl font-extrabold">{won(estTotal)}</p>
            <p className="mt-0.5 text-sm text-white/80">
              필요 품목 {shopping.length}개
            </p>
          </div>
          <span className="text-white/70">→</span>
        </div>
        <div className="mt-4 rounded-xl bg-white/15 px-3 py-2 text-sm font-medium">
          {freeAll
            ? '✅ 쿠팡에서 한 번에 주문하면 배송비 0원'
            : opt.saved_vs_naive > 0
              ? `📦 묶음 최적화로 배송비 ${won(opt.saved_vs_naive)} 절약`
              : '품목을 담고 배송비를 최적화해 보세요'}
        </div>
      </Card>

      {/* 카드 2: 오늘의 집안일 */}
      <Card onClick={() => navigate('/checklist')} className="mb-4">
        <div className="flex items-center justify-between">
          <p className="font-bold text-ink">✅ 오늘의 집안일</p>
          <span className="text-sm text-muted">
            {doneToday}/{daily.length}
          </span>
        </div>
        <ProgressBar value={doneToday} total={daily.length} className="mt-2" />
        <ul className="mt-3 space-y-1.5">
          {dailyPreview.map((it) => {
            const done = checkedSet.has(it.id);
            return (
              <li key={it.id} className="flex items-center gap-2 text-sm">
                <span
                  className={`grid h-4 w-4 place-items-center rounded-full border text-[9px] ${
                    done
                      ? 'border-mint bg-mint text-white'
                      : 'border-gray-300 text-transparent'
                  }`}
                >
                  ✓
                </span>
                <span className={done ? 'text-muted line-through' : 'text-ink'}>
                  {it.name}
                </span>
              </li>
            );
          })}
          {daily.length === 0 && (
            <li className="text-sm text-muted">오늘 할 일이 없어요 🎉</li>
          )}
        </ul>
      </Card>

      {/* 카드 3: 이번 달 고정비 */}
      <Card onClick={() => navigate('/budget')} className="mb-2">
        <div className="flex items-center justify-between">
          <p className="font-bold text-ink">💰 이번 달 고정비</p>
          <span className="text-muted">→</span>
        </div>
        {upcoming.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {upcoming.map((e) => (
              <li key={e.id} className="flex items-center justify-between text-sm">
                <span className="text-ink">{e.name}</span>
                <span
                  className={`font-semibold ${
                    e.dday <= 3 ? 'text-danger' : 'text-blue'
                  }`}
                >
                  {e.dday === 0 ? '오늘' : `D-${e.dday}`} · {won(e.amount)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">
            등록된 고정비가 없어요. 월세·관리비를 등록해 D-day로 챙겨드릴게요.
          </p>
        )}
      </Card>
    </div>
  );
}
