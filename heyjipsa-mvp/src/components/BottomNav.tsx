// 하단 네비게이션 (3탭: 홈 · 살림 · 더보기). 모바일 앱 스타일, 고정.
// 살림/더보기는 통합 탭이라, 그 안에서 도달하는 기존 라우트도 같은 탭으로 활성화한다.
import { Link, useLocation } from 'react-router-dom';

const ITEMS = [
  { to: '/home', icon: '🏠', label: '홈', match: ['/home'] },
  { to: '/living', icon: '🧹', label: '살림', match: ['/living', '/checklist', '/chores'] },
  { to: '/more', icon: '☰', label: '더보기', match: ['/more', '/shopping', '/budget', '/tips'] },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="sticky bottom-0 z-20 border-t border-light bg-white/95 backdrop-blur">
      <ul className="mx-auto flex max-w-[430px] items-stretch justify-between px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1.5">
        {ITEMS.map((it) => {
          const isActive = it.match.some(
            (m) => pathname === m || pathname.startsWith(m + '/'),
          );
          return (
            <li key={it.to} className="flex-1">
              <Link
                to={it.to}
                className={`flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium transition ${
                  isActive ? 'text-navy' : 'text-muted'
                }`}
              >
                <span
                  className={`text-xl leading-none transition ${
                    isActive ? 'scale-110' : 'opacity-70 grayscale'
                  }`}
                >
                  {it.icon}
                </span>
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
