// 가계 관리 `/budget` — 장바구니 분석 / 배송비 낚시 필터 / 월간 고정비 캘린더
import { useState } from 'react';
import type { ReactNode } from 'react';
import type { ExpenseCategory, FixedExpense } from '../types';
import { PageHeader } from '../components/Layout';
import { Button } from '../components/ui';
import { analyzeCart } from '../utils/budgetGuard';
import { SUMMARY_ORDER, BUDGET_CATEGORIES } from '../data/budgetCategories';
import { parseTextInput, detectBait } from '../utils/shippingFilter';
import {
  daysUntilDue,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_EMOJI,
} from '../utils/expenses';
import { STORAGE_KEYS, loadJSON, saveJSON, uid } from '../utils/storage';
import { won } from '../utils/format';

type Tab = 'cart' | 'shipping' | 'fixed';
const EXPENSE_CATS: ExpenseCategory[] = [
  'rent',
  'utilities',
  'education',
  'insurance',
  'other',
];

export default function Budget() {
  const [tab, setTab] = useState<Tab>('cart');

  return (
    <div>
      <PageHeader title="가계 관리" />

      <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1">
        {(
          [
            ['cart', '장바구니 분석'],
            ['shipping', '배송비 필터'],
            ['fixed', '고정비'],
          ] as Array<[Tab, string]>
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === k ? 'bg-navy text-white' : 'bg-white text-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'cart' && <CartAnalysis />}
      {tab === 'shipping' && <ShippingFilter />}
      {tab === 'fixed' && <FixedExpenses />}
    </div>
  );
}

// ── 1. 장바구니 분석 ────────────────────────────────────
function CartAnalysis() {
  const [text, setText] = useState('');
  const [budget, setBudget] = useState('');

  const monthlyBudget = budget.trim() ? parseInt(budget, 10) : null;
  const a = text.trim()
    ? analyzeCart(text, Number.isNaN(monthlyBudget as number) ? null : monthlyBudget)
    : null;

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder={'장바구니를 한 줄에 하나씩 붙여넣으세요:\n휴지 24롤 - 18,000원\n샤넬 립스틱 - 52,000원\n라면 5개 - 4,500원'}
        className="w-full resize-none rounded-2xl border border-light bg-white px-4 py-3 text-sm outline-none focus:border-blue"
      />
      <label className="mt-2 flex items-center gap-2 text-sm text-muted">
        월 예산(선택)
        <input
          type="number"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="예: 300000"
          className="w-32 rounded-lg border border-light px-2 py-1 text-right text-ink outline-none focus:border-blue"
        />
        원
      </label>

      {a?.error && (
        <p className="mt-3 rounded-xl bg-cream px-4 py-3 text-sm text-muted">
          {a.error}
        </p>
      )}

      {a && !a.error && (
        <div className="mt-4 space-y-4">
          {/* 분류 결과 */}
          <ul className="space-y-1.5">
            {a.items.map((it, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm"
              >
                <span>{it.icon}</span>
                <span className="flex-1 text-ink">{it.name}</span>
                <span className="text-muted">
                  {it.price ? won(it.price) : '-'}
                </span>
              </li>
            ))}
          </ul>

          {/* 카테고리별 요약 */}
          <div className="rounded-2xl bg-white p-4">
            {SUMMARY_ORDER.filter((c) => a.totals[c]).map((c) => {
              const t = a.totals[c];
              const ratio = a.total_price
                ? (t.price / a.total_price) * 100
                : 0;
              return (
                <div key={c} className="mb-2 last:mb-0">
                  <div className="flex justify-between text-sm">
                    <span>
                      {BUDGET_CATEGORIES[c].icon} {c} · {t.count}개
                    </span>
                    <span className="text-muted">
                      {won(t.price)} ({Math.round(ratio)}%)
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-light">
                    <div
                      className={`h-full rounded-full ${
                        c === '사치품'
                          ? 'bg-danger'
                          : c === '준생필품'
                            ? 'bg-blue'
                            : 'bg-mint'
                      }`}
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="mt-3 flex justify-between border-t border-light pt-2 font-bold text-navy">
              <span>총 합계</span>
              <span>{won(a.total_price)}</span>
            </div>
          </div>

          {/* 경고 */}
          {a.luxury_items.length > 0 && (
            <Warn tone="danger" title="🚨 사치품 경고">
              {a.luxury_items.map((it, i) => (
                <li key={i}>
                  {it.name}
                  {it.price ? ` (${won(it.price)})` : ''} — 정말 필요한가요?
                </li>
              ))}
            </Warn>
          )}
          {a.repeat_warnings.length > 0 && (
            <Warn tone="blue" title="⚠️ 반복 구매 경고">
              {a.repeat_warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </Warn>
          )}
          {a.budget_warnings.length > 0 && (
            <Warn tone="danger" title="💰 예산 경고">
              {a.budget_warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </Warn>
          )}
        </div>
      )}
    </div>
  );
}

function Warn({
  tone,
  title,
  children,
}: {
  tone: 'danger' | 'blue';
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl p-4 text-sm ${
        tone === 'danger' ? 'bg-danger/10 text-danger' : 'bg-blue/10 text-blue'
      }`}
    >
      <p className="mb-1 font-bold">{title}</p>
      <ul className="list-inside list-disc space-y-0.5">{children}</ul>
    </div>
  );
}

// ── 2. 배송비 낚시 필터 ─────────────────────────────────
function ShippingFilter() {
  const [text, setText] = useState('');
  const results = detectBait(parseTextInput(text));

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder={'상품명, 가격, 배송비 (한 줄에 하나씩):\nA상품, 990, 3500\nB상품, 3200, 0\nC상품, 2500, 2500'}
        className="w-full resize-none rounded-2xl border border-light bg-white px-4 py-3 text-sm outline-none focus:border-blue"
      />

      {results.length > 0 && (
        <div className="mt-4 space-y-2">
          {results.map((r, i) => (
            <div key={i} className="rounded-2xl bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink">
                  <span className="mr-2 text-muted">{i + 1}.</span>
                  {r.name}
                </span>
                <span className="font-bold text-navy">{won(r.real_price)}</span>
              </div>
              <div className="mt-1 flex gap-3 text-xs text-muted">
                <span>상품가 {won(r.price)}</span>
                <span>
                  배송비 {r.shipping === 0 ? '무료' : won(r.shipping)}
                </span>
              </div>
              {r.is_bait && (
                <p className="mt-2 rounded-lg bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger">
                  🚨 {r.bait_reasons.join(', ')}
                </p>
              )}
            </div>
          ))}
          <div className="rounded-2xl bg-mint/10 p-4 text-sm font-semibold text-mint">
            ✅ 실질가격 최저가: {results[0].name} ({won(results[0].real_price)})
          </div>
        </div>
      )}
    </div>
  );
}

// ── 3. 월간 고정비 캘린더 ───────────────────────────────
function FixedExpenses() {
  const [list, setList] = useState<FixedExpense[]>(() =>
    loadJSON<FixedExpense[]>(STORAGE_KEYS.FIXED_EXPENSES, []),
  );
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('1');
  const [category, setCategory] = useState<ExpenseCategory>('rent');

  const save = (next: FixedExpense[]) => {
    setList(next);
    saveJSON(STORAGE_KEYS.FIXED_EXPENSES, next);
  };

  const add = () => {
    const amt = parseInt(amount, 10);
    const day = parseInt(dueDay, 10);
    if (!name.trim() || Number.isNaN(amt) || amt <= 0) return;
    const d = Math.min(31, Math.max(1, Number.isNaN(day) ? 1 : day));
    save([
      ...list,
      { id: uid('exp'), name: name.trim(), amount: amt, dueDay: d, category, paid: false },
    ]);
    setName('');
    setAmount('');
  };

  const togglePaid = (id: string) =>
    save(list.map((e) => (e.id === id ? { ...e, paid: !e.paid } : e)));
  const remove = (id: string) => save(list.filter((e) => e.id !== id));

  const sorted = [...list]
    .map((e) => ({ ...e, dday: daysUntilDue(e.dueDay) }))
    .sort((a, b) => Number(a.paid) - Number(b.paid) || a.dday - b.dday);

  const total = list.reduce((s, e) => s + e.amount, 0);
  const paidCount = list.filter((e) => e.paid).length;

  return (
    <div>
      {/* 요약 */}
      {list.length > 0 && (
        <div className="mb-4 flex gap-3">
          <div className="flex-1 rounded-2xl bg-white p-4">
            <p className="text-xs text-muted">월 고정비 합계</p>
            <p className="mt-1 text-2xl font-extrabold text-navy">{won(total)}</p>
          </div>
          <div className="flex-1 rounded-2xl bg-white p-4">
            <p className="text-xs text-muted">납부 완료</p>
            <p className="mt-1 text-2xl font-extrabold text-mint">
              {paidCount}/{list.length}
            </p>
          </div>
        </div>
      )}

      {/* 목록 */}
      <ul className="space-y-2">
        {sorted.map((e) => (
          <li
            key={e.id}
            className={`flex items-center gap-3 rounded-2xl bg-white px-4 py-3 ${
              e.paid ? 'opacity-60' : ''
            }`}
          >
            <button
              onClick={() => togglePaid(e.id)}
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-xs ${
                e.paid ? 'border-mint bg-mint text-white' : 'border-gray-300 text-transparent'
              }`}
            >
              ✓
            </button>
            <span className="text-xl">{EXPENSE_CATEGORY_EMOJI[e.category]}</span>
            <div className="flex-1">
              <p className={`font-semibold ${e.paid ? 'text-muted line-through' : 'text-ink'}`}>
                {e.name}
              </p>
              <p className="text-xs text-muted">
                매월 {e.dueDay}일 · {EXPENSE_CATEGORY_LABELS[e.category]}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-navy">{won(e.amount)}</p>
              {!e.paid && (
                <p
                  className={`text-xs font-semibold ${
                    e.dday <= 3 ? 'text-danger' : 'text-blue'
                  }`}
                >
                  {e.dday === 0 ? '오늘' : `D-${e.dday}`}
                </p>
              )}
            </div>
            <button
              aria-label="삭제"
              onClick={() => remove(e.id)}
              className="text-danger hover:opacity-70"
            >
              ✕
            </button>
          </li>
        ))}
        {list.length === 0 && (
          <li className="rounded-2xl bg-white p-6 text-center text-sm text-muted">
            월세·관리비·공과금·학원비를 등록하면 납부일을 D-day로 챙겨드려요.
          </li>
        )}
      </ul>

      {/* 추가 폼 */}
      <div className="mt-4 rounded-2xl bg-white p-4">
        <p className="mb-2 text-sm font-bold text-navy">+ 고정비 추가</p>
        <div className="space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="항목명 (예: 월세, 인터넷)"
            className="w-full rounded-lg border border-light px-3 py-2 text-sm outline-none focus:border-blue"
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="금액"
              className="flex-1 rounded-lg border border-light px-3 py-2 text-sm outline-none focus:border-blue"
            />
            <div className="flex items-center gap-1 rounded-lg border border-light px-2">
              <span className="text-xs text-muted">매월</span>
              <input
                type="number"
                min={1}
                max={31}
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                className="w-12 py-2 text-center text-sm outline-none"
              />
              <span className="text-xs text-muted">일</span>
            </div>
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            className="w-full rounded-lg border border-light bg-white px-3 py-2 text-sm outline-none focus:border-blue"
          >
            {EXPENSE_CATS.map((c) => (
              <option key={c} value={c}>
                {EXPENSE_CATEGORY_EMOJI[c]} {EXPENSE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <Button
            className="w-full"
            disabled={!name.trim() || !amount.trim()}
            onClick={add}
          >
            추가
          </Button>
        </div>
      </div>
    </div>
  );
}
