// 하단 네비게이션 (모바일 앱 스타일, 고정)
import { NavLink } from 'react-router-dom';

const ITEMS = [
  { to: '/home', icon: '🏠', label: '홈' },
  { to: '/shopping', icon: '🛒', label: '장보기' },
  { to: '/checklist', icon: '✅', label: '체크' },
  { to: '/chores', icon: '👥', label: '가사분담' },
  { to: '/budget', icon: '💰', label: '가계' },
  { to: '/tips', icon: '💡', label: '팁' },
];

export default function BottomNav() {
  return (
    <nav className="sticky bottom-0 z-20 border-t border-light bg-white/95 backdrop-blur">
      <ul className="mx-auto flex max-w-[430px] items-stretch justify-between px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1.5">
        {ITEMS.map((it) => (
          <li key={it.to} className="flex-1">
            <NavLink
              to={it.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium transition ${
                  isActive ? 'text-navy' : 'text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`text-lg leading-none transition ${
                      isActive ? 'scale-110' : 'opacity-70 grayscale'
                    }`}
                  >
                    {it.icon}
                  </span>
                  <span>{it.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
