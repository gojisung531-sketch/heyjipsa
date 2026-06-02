// 살림 팁 `/tips` — 카테고리 탭 + 검색 + 팁 카드
import { useState } from 'react';
import type { Tip } from '../types';
import { PageHeader } from '../components/Layout';
import { TIPS, TIP_CATEGORIES } from '../data/tips';
import { searchTips } from '../utils/tipSearch';

// DB 카테고리 → 탭 표시 라벨 (스펙: 청소|빨래|요리|수납|꿀팁|절약)
const CAT_LABEL: Record<string, string> = {
  청소: '청소',
  빨래: '빨래',
  요리: '요리',
  수납정리: '수납',
  생활꿀팁: '꿀팁',
  절약: '절약',
};

function TipCard({ tip }: { tip: Tip }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl bg-white p-4">
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded-full bg-light px-2.5 py-0.5 text-[11px] font-medium text-blue">
          {CAT_LABEL[tip.category] ?? tip.category}
        </span>
        <h3 className="font-bold text-ink">{tip.title}</h3>
      </div>
      <p className={`text-sm text-muted ${open ? '' : 'line-clamp-2'}`}>
        {tip.tip}
      </p>
      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-1 text-xs font-medium text-blue"
      >
        {open ? '접기' : '더보기'}
      </button>
    </div>
  );
}

export default function Tips() {
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const q = query.trim();
  const visible: Tip[] = q
    ? searchTips(TIPS, q, category)
    : category
      ? TIPS.filter((t) => t.category === category)
      : TIPS;

  const tabs: Array<{ key: string | null; label: string }> = [
    { key: null, label: '전체' },
    ...TIP_CATEGORIES.map((c) => ({ key: c, label: CAT_LABEL[c] ?? c })),
  ];

  return (
    <div>
      <PageHeader title="살림 팁" subtitle={`생활 꿀팁 ${TIPS.length}개`} />

      {/* 검색 */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="🔍 검색 (예: 수건 냄새, 기름때, 전기세)"
        className="mb-3 w-full rounded-xl border border-light bg-white px-4 py-3 text-sm outline-none focus:border-blue"
      />

      {/* 카테고리 탭 */}
      <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1">
        {tabs.map((t) => {
          const active = category === t.key;
          return (
            <button
              key={t.label}
              onClick={() => setCategory(t.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                active ? 'bg-navy text-white' : 'bg-white text-muted'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 팁 목록 */}
      <div className="space-y-2">
        {visible.map((tip, i) => (
          <TipCard key={`${tip.category}-${tip.title}-${i}`} tip={tip} />
        ))}
        {visible.length === 0 && (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-muted">
            "{q}" 검색 결과가 없어요. 다른 키워드로 찾아보세요.
          </p>
        )}
      </div>
    </div>
  );
}
