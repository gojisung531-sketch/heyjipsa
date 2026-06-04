// 집안일 체크리스트 `/checklist` — 주기별 집안일 + 내 할일(자연어 캡처)
import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import type {
  ChecklistItem,
  ChecklistState,
  HouseholdConfig,
  Period,
  Todo,
  TodoPriority,
} from '../types';
import { PageHeader } from '../components/Layout';
import { ProgressBar } from '../components/ui';
import VoiceButton from '../components/VoiceButton';
import { STORAGE_KEYS, loadJSON, saveJSON, uid } from '../utils/storage';
import { buildChecklist } from '../utils/checklist';
import { loadChecklistState, saveChecklistState } from '../utils/checklistState';
import { parseBatch } from '../utils/todoParser';
import { PERIODS, PERIOD_TAB_LABELS, PERIOD_LABELS } from '../data/templates';

type Tab = Period | 'todos';

const PRIORITY_STYLE: Record<TodoPriority, string> = {
  상: 'bg-danger/10 text-danger',
  중: 'bg-blue/10 text-blue',
  하: 'bg-light text-muted',
};

export default function Checklist() {
  const [config, setConfig] = useState<HouseholdConfig | null>(() =>
    loadJSON<HouseholdConfig | null>(STORAGE_KEYS.HOUSEHOLD_CONFIG, null),
  );

  const byPeriod = useMemo(
    () => (config ? buildChecklist(config).byPeriod : null),
    [config],
  );

  const [state, setState] = useState<ChecklistState>(() =>
    config ? loadChecklistState(config) : { checked: [], dailyDate: '' },
  );
  const [tab, setTab] = useState<Tab>('daily');
  const [todos, setTodos] = useState<Todo[]>(() =>
    loadJSON<Todo[]>(STORAGE_KEYS.TODOS, []),
  );
  const [todoText, setTodoText] = useState('');
  const [newChore, setNewChore] = useState('');

  if (!config || !byPeriod) return <Navigate to="/onboarding" replace />;

  const checkedSet = new Set(state.checked);
  const toggle = (id: string) => {
    const next = new Set(checkedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    const newState: ChecklistState = { checked: [...next], dailyDate: state.dailyDate };
    setState(newState);
    saveChecklistState(newState);
  };

  const saveTodos = (next: Todo[]) => {
    setTodos(next);
    saveJSON(STORAGE_KEYS.TODOS, next);
  };
  const preview = todoText.trim() ? parseBatch(todoText) : [];
  const addTodos = () => {
    if (preview.length === 0) return;
    const now = new Date().toISOString();
    const created: Todo[] = preview.map((p) => ({
      id: uid('todo'),
      category: p.category,
      item: p.item,
      priority: p.priority,
      deadline: p.deadline,
      raw: p.raw,
      done: false,
      createdAt: now,
    }));
    saveTodos([...created, ...todos]);
    setTodoText('');
  };
  const toggleTodo = (id: string) =>
    saveTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const removeTodo = (id: string) => saveTodos(todos.filter((t) => t.id !== id));

  // 직접 추가한 집안일 (config.addedItems)
  const saveConfig = (c: HouseholdConfig) => {
    setConfig(c);
    saveJSON(STORAGE_KEYS.HOUSEHOLD_CONFIG, c);
  };
  const addChore = () => {
    const name = newChore.trim();
    if (!name || tab === 'todos') return;
    const item: ChecklistItem = {
      id: uid('cust'),
      name,
      category: '직접 추가',
      period: tab,
    };
    saveConfig({ ...config, addedItems: [...(config.addedItems ?? []), item] });
    setNewChore('');
  };
  const removeChore = (id: string) =>
    saveConfig({
      ...config,
      addedItems: (config.addedItems ?? []).filter((x) => x.id !== id),
    });
  const customIds = new Set((config.addedItems ?? []).map((a) => a.id));

  const isPeriod = tab !== 'todos';
  const items = isPeriod ? byPeriod[tab] : [];
  const doneInTab = items.filter((i) => checkedSet.has(i.id)).length;
  const openTodos = todos.filter((t) => !t.done).length;

  return (
    <div>
      <PageHeader title="집안일 체크리스트" subtitle="할 일을 탭해서 완료하세요" />

      {/* 탭 */}
      <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1">
        {PERIODS.map((p) => {
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
                {byPeriod[p].length}
              </span>
            </button>
          );
        })}
        <button
          onClick={() => setTab('todos')}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === 'todos' ? 'bg-navy text-white' : 'bg-white text-muted'
          }`}
        >
          내 할일{' '}
          <span className={tab === 'todos' ? 'text-white/70' : 'text-blue'}>
            {openTodos}
          </span>
        </button>
      </div>

      {isPeriod ? (
        <>
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
              const custom = customIds.has(it.id);
              return (
                <li
                  key={it.id}
                  className="flex items-center gap-1 rounded-2xl bg-white pr-2"
                >
                  <button
                    onClick={() => toggle(it.id)}
                    className="flex flex-1 items-center gap-3 px-4 py-3 text-left transition active:scale-[0.99]"
                  >
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-xs transition ${
                        done ? 'border-mint bg-mint text-white' : 'border-gray-300 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <span className={`flex-1 ${done ? 'text-muted line-through' : 'text-ink'}`}>
                      {it.name}
                    </span>
                  </button>
                  {custom ? (
                    <>
                      <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[11px] text-mint">
                        추가
                      </span>
                      <button
                        aria-label="삭제"
                        onClick={() => removeChore(it.id)}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-danger transition hover:bg-danger/10"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <span className="rounded-full bg-light px-2.5 py-0.5 text-[11px] text-blue">
                      {it.category}
                    </span>
                  )}
                </li>
              );
            })}
            {items.length === 0 && (
              <li className="rounded-2xl bg-white p-6 text-center text-sm text-muted">
                이 주기에는 할 일이 없어요 🎉
              </li>
            )}
          </ul>

          {/* 집안일 직접 추가 (텍스트 / 음성) */}
          <div className="mt-3 rounded-2xl bg-white p-3">
            <VoiceButton
              className="mb-2"
              onText={(t) => setNewChore((prev) => (prev ? prev + ' ' + t : t))}
            />
            <div className="flex gap-2">
              <input
                value={newChore}
                onChange={(e) => setNewChore(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addChore()}
                placeholder={`${PERIOD_LABELS[tab]}에 집안일 추가 (예: 화분 물주기)`}
                className="flex-1 rounded-lg border border-light px-3 py-2 text-sm outline-none focus:border-blue"
              />
              <button
                onClick={addChore}
                disabled={!newChore.trim()}
                className="rounded-xl bg-navy px-4 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
              >
                추가
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* 자연어 빠른 추가 (음성/텍스트) */}
          <VoiceButton
            className="mb-2"
            onText={(t) => setTodoText((prev) => (prev ? prev + ' ' + t : t))}
          />
          <textarea
            value={todoText}
            onChange={(e) => setTodoText(e.target.value)}
            rows={2}
            placeholder="할 일을 말하듯 적어보세요. 예: 금요일까지 보고서 제출하고 휴지 사야돼"
            className="w-full resize-none rounded-2xl border border-light bg-white px-4 py-3 text-sm outline-none focus:border-blue"
          />
          {preview.length > 0 && (
            <div className="mt-2 space-y-1 rounded-xl bg-cream px-3 py-2 text-xs text-muted">
              {preview.map((p, i) => (
                <div key={i}>
                  <b className="text-ink">{p.item}</b> · {p.category} · 우선순위 {p.priority}
                  {p.deadline ? ` · ${p.deadline}` : ''}
                </div>
              ))}
            </div>
          )}
          <button
            onClick={addTodos}
            disabled={preview.length === 0}
            className="mt-3 w-full rounded-xl bg-navy py-3 text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
          >
            할 일 추가
          </button>

          {/* 할일 목록 */}
          <ul className="mt-5 space-y-2">
            {todos.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3"
              >
                <button
                  onClick={() => toggleTodo(t.id)}
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-xs transition ${
                    t.done ? 'border-mint bg-mint text-white' : 'border-gray-300 text-transparent'
                  }`}
                >
                  ✓
                </button>
                <div className="flex-1">
                  <p className={t.done ? 'text-muted line-through' : 'text-ink'}>
                    {t.item}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-light px-2 py-0.5 text-[11px] text-blue">
                      {t.category}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${PRIORITY_STYLE[t.priority]}`}>
                      {t.priority}
                    </span>
                    {t.deadline && (
                      <span className="rounded-full bg-cream px-2 py-0.5 text-[11px] text-danger">
                        📅 {t.deadline}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  aria-label="삭제"
                  onClick={() => removeTodo(t.id)}
                  className="text-danger hover:opacity-70"
                >
                  ✕
                </button>
              </li>
            ))}
            {todos.length === 0 && (
              <li className="rounded-2xl bg-white p-6 text-center text-sm text-muted">
                자연어로 적으면 카테고리·우선순위·기한을 자동으로 정리해드려요.
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  );
}
