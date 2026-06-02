// 이번 주 장보기 `/shopping` — 품목 관리 + 배송비 최적화
import { useState } from 'react';
import type { ShoppingItem } from '../types';
import { PageHeader } from '../components/Layout';
import { Button } from '../components/ui';
import {
  getShoppingList,
  saveShoppingList,
  estimatedPriceOf,
} from '../utils/shopping';
import { optimize, fromShoppingItems } from '../utils/cartOptimizer';
import { uid } from '../utils/storage';
import { won } from '../utils/format';

export default function Shopping() {
  const [items, setItems] = useState<ShoppingItem[]>(() => getShoppingList());
  const [newName, setNewName] = useState('');

  const update = (next: ShoppingItem[]) => {
    setItems(next);
    saveShoppingList(next);
  };

  const addItem = () => {
    const name = newName.trim();
    if (!name) return;
    const item: ShoppingItem = {
      id: uid('shop'),
      name,
      category: '기타',
      estimatedPrice: estimatedPriceOf(name),
      quantity: 1,
      preferBrand: false,
    };
    update([...items, item]);
    setNewName('');
  };

  const setQty = (id: string, delta: number) =>
    update(
      items.map((it) =>
        it.id === id
          ? { ...it, quantity: Math.max(1, it.quantity + delta) }
          : it,
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

  const estTotal = items.reduce(
    (s, it) => s + it.estimatedPrice * it.quantity,
    0,
  );
  // React Compiler가 자동 메모이즈 (items 변경 시에만 재계산)
  const result = optimize(fromShoppingItems(items));

  return (
    <div>
      <PageHeader
        title="이번 주 장보기"
        subtitle={`품목 ${items.length}개 · 예상 ${won(estTotal)}`}
      />

      {/* 품목 리스트 */}
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
                {/* 수량 ± */}
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

      {/* 품목 추가 */}
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

      {/* 배송비 최적화 결과 */}
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

        {/* 총계 */}
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
