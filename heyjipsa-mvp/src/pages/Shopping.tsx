// 이번 주 장보기 `/shopping` — 장보기 / 구매 기록 / 재구매 패턴
import { useState } from 'react';
import type { PurchaseRecord, ShoppingItem } from '../types';
import { PageHeader } from '../components/Layout';
import { Button } from '../components/ui';
import PurchasePattern from '../components/PurchasePattern';
import {
  getShoppingList,
  saveShoppingList,
  estimatedPriceOf,
} from '../utils/shopping';
import { optimize, fromShoppingItems } from '../utils/cartOptimizer';
import {
  loadPurchases,
  savePurchases,
  buildSamplePurchases,
  toAmount,
} from '../utils/receipts';
import { uid, todayStr } from '../utils/storage';
import { won } from '../utils/format';

type Tab = 'list' | 'records' | 'pattern';

export default function Shopping() {
  const [tab, setTab] = useState<Tab>('list');
  const [records, setRecords] = useState<PurchaseRecord[]>(() => loadPurchases());

  const saveRecords = (next: PurchaseRecord[]) => {
    setRecords(next);
    savePurchases(next);
  };

  // 재구매 패턴 → 장보기 리스트에 담기
  const addToCart = (name: string) => {
    const list = getShoppingList();
    if (list.some((it) => it.name === name)) return;
    saveShoppingList([
      ...list,
      {
        id: uid('shop'),
        name,
        category: '기타',
        estimatedPrice: estimatedPriceOf(name),
        quantity: 1,
        preferBrand: false,
      },
    ]);
  };

  return (
    <div>
      <PageHeader title="장보기" />
      <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1">
        {(
          [
            ['list', '이번 주 장보기'],
            ['records', '구매 기록'],
            ['pattern', '재구매 패턴'],
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

      {tab === 'list' && <ShoppingListTab />}
      {tab === 'records' && (
        <PurchaseRecordsTab records={records} onSave={saveRecords} />
      )}
      {tab === 'pattern' && (
        <PurchasePattern records={records} onAddToCart={addToCart} />
      )}
    </div>
  );
}

// ── 이번 주 장보기 (품목 관리 + 배송비 최적화) ──────────
function ShoppingListTab() {
  const [items, setItems] = useState<ShoppingItem[]>(() => getShoppingList());
  const [newName, setNewName] = useState('');

  const update = (next: ShoppingItem[]) => {
    setItems(next);
    saveShoppingList(next);
  };

  const addItem = () => {
    const name = newName.trim();
    if (!name) return;
    update([
      ...items,
      {
        id: uid('shop'),
        name,
        category: '기타',
        estimatedPrice: estimatedPriceOf(name),
        quantity: 1,
        preferBrand: false,
      },
    ]);
    setNewName('');
  };

  const setQty = (id: string, delta: number) =>
    update(
      items.map((it) =>
        it.id === id ? { ...it, quantity: Math.max(1, it.quantity + delta) } : it,
      ),
    );
  const setPrice = (id: string, price: number) =>
    update(
      items.map((it) =>
        it.id === id ? { ...it, estimatedPrice: Math.max(0, price) } : it,
      ),
    );
  const toggleBrand = (id: string) =>
    update(
      items.map((it) =>
        it.id === id ? { ...it, preferBrand: !it.preferBrand } : it,
      ),
    );
  const remove = (id: string) => update(items.filter((it) => it.id !== id));

  const estTotal = items.reduce((s, it) => s + it.estimatedPrice * it.quantity, 0);
  const result = optimize(fromShoppingItems(items));

  return (
    <div>
      <p className="mb-3 text-sm text-muted">
        품목 {items.length}개 · 예상 {won(estTotal)}
      </p>

      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id} className="rounded-2xl bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-ink">{it.name}</span>
              <button
                onClick={() => toggleBrand(it.id)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  it.preferBrand ? 'bg-mint/15 text-mint' : 'bg-light text-blue'
                }`}
              >
                {it.preferBrand ? '브랜드 우선' : '최저가 우선'}
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <label className="flex items-center gap-1 text-sm text-muted">
                ₩
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={it.estimatedPrice}
                  onChange={(e) => setPrice(it.id, Number(e.target.value) || 0)}
                  className="w-24 rounded-lg border border-light px-2 py-1 text-right text-ink outline-none focus:border-blue"
                />
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center overflow-hidden rounded-lg border border-light">
                  <button
                    onClick={() => setQty(it.id, -1)}
                    className="px-2.5 py-1 text-lg leading-none text-navy"
                  >
                    −
                  </button>
                  <span className="min-w-7 text-center text-sm">{it.quantity}</span>
                  <button
                    onClick={() => setQty(it.id, 1)}
                    className="px-2.5 py-1 text-lg leading-none text-navy"
                  >
                    +
                  </button>
                </div>
                <button
                  aria-label="삭제"
                  onClick={() => remove(it.id)}
                  className="grid h-8 w-8 place-items-center rounded-full text-danger transition hover:bg-danger/10"
                >
                  ✕
                </button>
              </div>
            </div>
          </li>
        ))}
        {items.length === 0 && (
          <li className="rounded-2xl bg-white p-6 text-center text-sm text-muted">
            품목이 없어요. 아래에서 추가해 보세요.
          </li>
        )}
      </ul>

      <div className="mt-3 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          placeholder="+ 품목 추가 (예: 휴지, 샴푸)"
          className="flex-1 rounded-xl border border-light bg-white px-4 py-3 text-sm outline-none focus:border-blue"
        />
        <Button onClick={addItem} disabled={!newName.trim()}>
          추가
        </Button>
      </div>

      <section className="mt-7">
        <h2 className="mb-1 text-lg font-bold text-navy">📦 배송비 최적화</h2>
        <p className="mb-3 text-sm text-muted">
          무료배송 기준에 맞춰 플랫폼별로 묶었어요.
        </p>

        {result.warnings.length > 0 && (
          <p className="mb-3 rounded-xl bg-cream px-3 py-2 text-xs text-muted">
            ⚠️ {result.warnings.join(' / ')}
          </p>
        )}

        <div className="space-y-3">
          {result.bundles.map((b) => (
            <div key={b.platform} className="rounded-2xl bg-white p-4">
              <div className="flex items-center justify-between">
                <a
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-navy underline-offset-2 hover:underline"
                >
                  {b.platform} ↗
                </a>
                {b.free_shipping ? (
                  <span className="rounded-full bg-mint/15 px-2.5 py-1 text-xs font-semibold text-mint">
                    무료배송 ✅
                  </span>
                ) : (
                  <span className="rounded-full bg-danger/10 px-2.5 py-1 text-xs font-semibold text-danger">
                    배송비 {won(b.shipping)}
                  </span>
                )}
              </div>
              <ul className="mt-2 space-y-1">
                {b.items.map((it, i) => (
                  <li
                    key={`${it.name}-${i}`}
                    className="flex justify-between text-sm text-ink"
                  >
                    <span>{it.name}</span>
                    <span className="text-muted">{won(it.price)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex justify-between border-t border-light pt-2 text-sm">
                <span className="font-semibold text-ink">합계</span>
                <span className="font-bold text-navy">{won(b.subtotal)}</span>
              </div>
              {!b.free_shipping && b.deficit > 0 && (
                <p className="mt-1 text-xs text-danger">
                  무료배송까지 {won(b.deficit)} 부족
                </p>
              )}
            </div>
          ))}
          {result.bundles.length === 0 && (
            <p className="rounded-2xl bg-white p-6 text-center text-sm text-muted">
              품목을 추가하면 묶음 추천이 나와요.
            </p>
          )}
        </div>

        {result.bundles.length > 0 && (
          <div className="mt-4 rounded-2xl bg-navy p-4 text-white">
            <div className="flex justify-between">
              <span className="text-white/80">총 배송비</span>
              <span className="font-bold">{won(result.total_shipping)}</span>
            </div>
            {result.saved_vs_naive > 0 && (
              <div className="mt-1 flex justify-between text-mint">
                <span>절약 (따로 주문 대비)</span>
                <span className="font-bold">{won(result.saved_vs_naive)}</span>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

// ── 구매 기록 (영수증 수동 입력) ────────────────────────
function PurchaseRecordsTab({
  records,
  onSave,
}: {
  records: PurchaseRecord[];
  onSave: (r: PurchaseRecord[]) => void;
}) {
  const [date, setDate] = useState(todayStr());
  const [item, setItem] = useState('');
  const [store, setStore] = useState('');
  const [qty, setQty] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [category, setCategory] = useState('');

  const add = () => {
    const name = item.trim();
    const price = toAmount(unitPrice);
    const q = Math.max(1, toAmount(qty) || 1);
    if (!name || price <= 0) return;
    onSave([
      ...records,
      {
        id: uid('buy'),
        date: date || todayStr(),
        store: store.trim(),
        item: name,
        qty: q,
        unitPrice: price,
        total: price * q,
        category: category.trim(),
      },
    ]);
    setItem('');
    setUnitPrice('');
    setStore('');
    setQty('1');
    setCategory('');
  };

  const remove = (id: string) => onSave(records.filter((r) => r.id !== id));

  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  const total = records.reduce((s, r) => s + r.total, 0);

  return (
    <div>
      {/* 입력 폼 */}
      <div className="rounded-2xl bg-white p-4">
        <p className="mb-2 text-sm font-bold text-navy">+ 구매 품목 추가</p>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 rounded-lg border border-light px-3 py-2 text-sm outline-none focus:border-blue"
            />
            <input
              value={store}
              onChange={(e) => setStore(e.target.value)}
              placeholder="매장(선택)"
              className="w-28 rounded-lg border border-light px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </div>
          <input
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="품목명 (예: 휴지 30롤)"
            className="w-full rounded-lg border border-light px-3 py-2 text-sm outline-none focus:border-blue"
          />
          <div className="flex gap-2">
            <input
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              inputMode="numeric"
              placeholder="단가"
              className="flex-1 rounded-lg border border-light px-3 py-2 text-sm outline-none focus:border-blue"
            />
            <div className="flex items-center gap-1 rounded-lg border border-light px-2">
              <span className="text-xs text-muted">수량</span>
              <input
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                inputMode="numeric"
                className="w-12 py-2 text-center text-sm outline-none"
              />
            </div>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="분류(선택)"
              className="w-24 rounded-lg border border-light px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </div>
          <Button className="w-full" disabled={!item.trim() || !unitPrice.trim()} onClick={add}>
            기록 추가
          </Button>
        </div>
      </div>

      {/* 요약 */}
      {records.length > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-navy p-4 text-white">
          <span className="text-white/80">누적 구매 {records.length}건</span>
          <span className="font-bold">{won(total)}</span>
        </div>
      )}

      {/* 목록 */}
      <ul className="mt-3 space-y-2">
        {sorted.map((r) => (
          <li
            key={r.id}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm"
          >
            <span className="text-[11px] text-muted">{r.date.slice(5)}</span>
            <span className="flex-1 text-ink">
              <b>{r.item}</b>
              {r.qty > 1 && <span className="text-muted"> ×{r.qty}</span>}
              {r.store && <span className="text-muted"> · {r.store}</span>}
            </span>
            <span className="font-semibold text-navy">{won(r.total)}</span>
            <button
              aria-label="삭제"
              onClick={() => remove(r.id)}
              className="text-danger hover:opacity-70"
            >
              ✕
            </button>
          </li>
        ))}
        {records.length === 0 && (
          <li className="rounded-2xl bg-white p-6 text-center text-sm text-muted">
            영수증 품목을 기록하면 <b>재구매 패턴</b>을 분석해드려요.
            <br />
            <button
              onClick={() => onSave(buildSamplePurchases())}
              className="mt-3 rounded-xl border border-dashed border-mint/60 px-4 py-2 font-medium text-mint"
            >
              ✨ 샘플 기록 넣어보기
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
