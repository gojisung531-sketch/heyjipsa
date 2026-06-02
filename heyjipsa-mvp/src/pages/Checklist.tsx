// 집안일 체크리스트 `/checklist`
import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import type { ChecklistState, HouseholdConfig, Period } from '../types';
import { PageHeader } from '../components/Layout';
import { ProgressBar } from '../components/ui';
import { STORAGE_KEYS, loadJSON } from '../utils/storage';
import { buildChecklist } from '../utils/checklist';
import { loadChecklistState, saveChecklistState } from '../utils/checklistState';
import { PERIODS, PERIOD_TAB_LABELS, PERIOD_LABELS } from '../data/templates';

export default function Checklist() {
  const config = loadJSON<HouseholdConfig | null>(
    STORAGE_KEYS.HOUSEHOLD_CONFIG,
    null,
  );

  const byPeriod = useMemo(
    () => (config ? buildChecklist(config).byPeriod : null),
    [config],
  );

  const [state, setState] = useState<ChecklistState>(() =>
    config
      ? loadChecklistState(config)
      : { checked: [], dailyDate: '' },
  );
  const [tab, setTab] = useState<Period>('daily');

  if (!config || !byPeriod) return <Navigate to="/onboarding" replace />;

  const checkedSet = new Set(state.checked);

  const toggle = (id: string) => {
    const next = new Set(checkedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    const newState: ChecklistState = {
      checked: [...next],
      dailyDate: state.dailyDate,
    };
    setState(newState);
    saveChecklistState(newState);
  };

  const items = byPeriod[tab];
  const doneInTab = items.filter((i) => checkedSet.has(i.id)).length;

  return (
    <div>
      <PageHeader title="집안일 체크리스트" subtitle="할 일을 탭해서 완료하세요" />

      {/* 탭 */}
      <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1">
        {PERIODS.map((p) => {
          const count = byPeriod[p].length;
          const active = tab === p;
          return (
            <button
              key={p}
              onClick={() => setTab(p)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                active ? 'bg-navy text-white' : 'bg-white text-muted'
              }`}
            >
              {PERIOD_TAB_LABELS[p]}{' '}
              <span className={active ? 'text-white/70' : 'text-blue'}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 진행률 */}
      <div className="mb-4 rounded-2xl bg-white p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold text-ink">
            {PERIOD_LABELS[tab]} 진행률
          </span>
          <span className="text-muted">
            {doneInTab}/{items.length}
          </span>
        </div>
        <ProgressBar value={doneInTab} total={items.length} />
      </div>

      {/* 항목 리스트 */}
      <ul className="space-y-2">
        {items.map((it) => {
          const done = checkedSet.has(it.id);
          return (
            <li key={it.id}>
              <button
                onClick={() => toggle(it.id)}
                className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left transition active:scale-[0.99]"
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-xs transition ${
                    done
                      ? 'border-mint bg-mint text-white'
                      : 'border-gray-300 text-transparent'
                  }`}
                >
                  ✓
                </span>
                <span
                  className={`flex-1 ${
                    done ? 'text-muted line-through' : 'text-ink'
                  }`}
                >
                  {it.name}
                </span>
                <span className="rounded-full bg-light px-2.5 py-0.5 text-[11px] text-blue">
                  {it.category}
                </span>
              </button>
            </li>
          );
        })}
        {items.length === 0 && (
          <li className="rounded-2xl bg-white p-6 text-center text-sm text-muted">
            이 주기에는 할 일이 없어요 🎉
          </li>
        )}
      </ul>
    </div>
  );
}
