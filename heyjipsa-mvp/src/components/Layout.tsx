// 앱 셸: 모바일 퍼스트(max-w 430) 중앙 정렬 + 하단 네비.
// 온보딩 미완료 시 랜딩으로 가드.
import { Navigate, Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import VoiceFab from './VoiceFab';
import { STORAGE_KEYS, loadJSON } from '../utils/storage';

export default function Layout() {
  const onboarded = loadJSON<boolean>(STORAGE_KEYS.ONBOARDING_DONE, false);
  if (!onboarded) return <Navigate to="/" replace />;

  return (
    <div className="min-h-dvh w-full bg-light">
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-cream shadow-xl">
        <main className="flex-1 px-5 pb-6 pt-5">
          <Outlet />
        </main>
        <BottomNav />
      </div>
      <VoiceFab />
    </div>
  );
}

// 페이지 상단 공통 헤더
export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-4">
      <h1 className="text-2xl font-bold text-navy">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
    </header>
  );
}
