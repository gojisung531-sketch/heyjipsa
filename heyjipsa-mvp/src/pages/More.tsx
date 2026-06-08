// 더보기 `/more` — 장보기·가계·팁 등 나머지 기능 모음 메뉴.
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/Layout';

const ITEMS = [
  {
    to: '/shopping',
    icon: '🛒',
    title: '장보기',
    desc: '이번 주 장보기 · 구매 기록 · 재구매 패턴 · 배송비 최적화',
  },
  {
    to: '/budget',
    icon: '💰',
    title: '가계관리',
    desc: '장바구니 분석 · 고정비 D-day',
  },
  {
    to: '/tips',
    icon: '💡',
    title: '살림 팁',
    desc: '청소 · 요리 · 절약 꿀팁 검색',
  },
];

export default function More() {
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader title="더보기" subtitle="필요한 기능을 골라보세요" />

      <ul className="space-y-3">
        {ITEMS.map((it) => (
          <li key={it.to}>
            <button
              onClick={() => navigate(it.to)}
              className="flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm transition active:scale-[0.99]"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cream text-2xl">
                {it.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-ink">{it.title}</span>
                <span className="mt-0.5 block text-xs text-muted">{it.desc}</span>
              </span>
              <span className="text-muted">→</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
