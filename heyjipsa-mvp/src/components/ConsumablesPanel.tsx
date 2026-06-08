// 소모품 소비주기 패널 — 집안일 체크리스트의 "소모품" 탭.
// 스마트 학습 결과(주기·신뢰도·사용빈도 보정)를 보여주고, 집안일과 연동한다.
import { useState } from 'react';
import VoiceButton from './VoiceButton';
import type { ConsumableView, Restock } from '../utils/consumables';
import {
  addConsumable,
  isDue,
  linkChore,
  markBought,
  markLow,
  removeConsumable,
  syncAutoRestock,
  unlinkChore,
  viewConsumables,
} from '../utils/consumables';
import { fmtCycle } from '../utils/purchaseAnalyzer';

export interface ChoreRef {
  id: string;
  name: string;
}

function dday(r: Restock): { text: string; tone: 'over' | 'soon' | 'ok' } {
  const d = r.daysUntilNext;
  const text = d < 0 ? `${Math.abs(d)}일 지남` : d === 0 ? '오늘' : `D-${d}`;
  const tone = d < 0 ? 'over' : d <= r.leadDays ? 'soon' : 'ok';
  return { text, tone };
}

export default function ConsumablesPanel({ chores = [] }: { chores?: ChoreRef[] }) {
  const [list, setList] = useState<ConsumableView[]>(() => {
    syncAutoRestock();
    return viewConsumables();
  });
  const [name, setName] = useState('');

  const refresh = () => {
    syncAutoRestock();
    setList(viewConsumables());
  };
  const add = () => {
    if (!name.trim()) return;
    addConsumable(name);
    setName('');
    refresh();
  };

  const choreName = (id: string) => chores.find((c) => c.id === id)?.name ?? id;
  const dueCount = list.filter((c) => isDue(c.restock)).length;

  return (
    <div>
      {/* 파이프라인 안내 */}
      <div className="mb-3 rounded-2xl bg-navy p-4 text-white">
        <p className="text-sm font-bold">🔁 소모품 자동 보충 (스마트 학습)</p>
        <p className="mt-1 text-xs leading-relaxed text-white/80">
          보충·구매 주기에 <b>사용 빈도</b>까지 학습해 곧 떨어질 때 「이번 주 장보기」에
          담고, 쿠팡 무료배송 기준으로 묶어드려요.
        </p>
        {dueCount > 0 && (
          <p className="mt-2 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium">
            지금 {dueCount}개가 장보기에 자동으로 담겼어요 🛒
          </p>
        )}
      </div>

      <ul className="space-y-2">
        {list.map((c) => {
          const r = c.restock;
          const dd = dday(r);
          const due = isDue(r);
          const linkable = chores.filter((ch) => !c.linkedChoreIds.includes(ch.id));
          return (
            <li
              key={c.id}
              className={`rounded-2xl bg-white p-4 ${due ? 'ring-1 ring-mint/50' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    {c.name}{' '}
                    <span className="align-middle rounded-full bg-light px-2 py-0.5 text-[11px] text-blue">
                      {c.category}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    주기 {fmtCycle(r.cycleDays)} · {r.learned ? '학습' : '기본'} · 신뢰도{' '}
                    {r.confidence}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-sm font-bold ${
                    dd.tone === 'over'
                      ? 'text-danger'
                      : dd.tone === 'soon'
                        ? 'text-blue'
                        : 'text-muted'
                  }`}
                >
                  {dd.text}
                </span>
              </div>

              {/* 사용 빈도 보정 이유 */}
              {r.trend === 'fast' && (
                <p className="mt-2 text-[11px] font-medium text-danger">
                  🔥 최근 사용이 잦아 예상보다 빨리 소진돼요
                </p>
              )}
              {r.trend === 'slow' && (
                <p className="mt-2 text-[11px] font-medium text-blue">
                  🐢 사용이 뜸해 여유가 더 있어요
                </p>
              )}

              {due && (
                <p className="mt-2 rounded-lg bg-mint/10 px-2.5 py-1 text-[11px] font-medium text-mint">
                  🛒 「이번 주 장보기」에 자동으로 담겼어요
                </p>
              )}

              {/* 연동 집안일 */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {c.linkedChoreIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-full bg-cream px-2 py-0.5 text-[11px] text-ink"
                  >
                    🔗 {choreName(id)}
                    <button
                      aria-label="연동 해제"
                      onClick={() => {
                        unlinkChore(c.id, id);
                        refresh();
                      }}
                      className="text-muted hover:text-danger"
                    >
                      ✕
                    </button>
                  </span>
                ))}
                {linkable.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      linkChore(c.id, e.target.value);
                      refresh();
                    }}
                    className="rounded-full border border-dashed border-light px-2 py-0.5 text-[11px] text-muted outline-none"
                  >
                    <option value="">+ 집안일 연동</option>
                    {linkable.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {ch.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => {
                    markBought(c.id);
                    refresh();
                  }}
                  className="flex-1 rounded-lg bg-navy py-2 text-xs font-semibold text-white transition active:scale-[0.98]"
                >
                  샀어요 / 채웠어요
                </button>
                <button
                  onClick={() => {
                    markLow(c.id);
                    refresh();
                  }}
                  disabled={due}
                  className="flex-1 rounded-lg border border-mint/60 py-2 text-xs font-semibold text-mint transition active:scale-[0.98] disabled:opacity-40"
                >
                  거의 다 썼어요
                </button>
                <button
                  aria-label="삭제"
                  onClick={() => {
                    removeConsumable(c.id);
                    refresh();
                  }}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-danger transition hover:bg-danger/10"
                >
                  ✕
                </button>
              </div>
            </li>
          );
        })}
        {list.length === 0 && (
          <li className="rounded-2xl bg-white p-6 text-center text-sm text-muted">
            소모품을 추가하면 소비 주기를 학습해 자동으로 챙겨드려요.
          </li>
        )}
      </ul>

      {/* 소모품 추가 (텍스트 / 음성) */}
      <div className="mt-3 rounded-2xl bg-white p-3">
        <VoiceButton
          className="mb-2"
          onText={(t) => setName((p) => (p ? p + ' ' + t : t))}
        />
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="소모품 추가 (예: 치약, 주방세제)"
            className="flex-1 rounded-lg border border-light px-3 py-2 text-sm outline-none focus:border-blue"
          />
          <button
            onClick={add}
            disabled={!name.trim()}
            className="rounded-xl bg-navy px-4 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
}
