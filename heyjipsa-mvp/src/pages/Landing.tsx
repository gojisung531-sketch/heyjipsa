// 랜딩 페이지 `/` — 아이콘만 중앙 + 하단 시작하기 버튼 (그 외 문구 없음)
import { useNavigate } from 'react-router-dom';
import { STORAGE_KEYS, loadJSON } from '../utils/storage';

export default function Landing() {
  const navigate = useNavigate();
  const onboarded = loadJSON<boolean>(STORAGE_KEYS.ONBOARDING_DONE, false);

  const start = () => navigate(onboarded ? '/home' : '/onboarding');

  return (
    <div className="min-h-dvh w-full bg-gradient-to-b from-white to-light">
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-8 py-12">
        {/* 아이콘 중앙 */}
        <div className="flex flex-1 items-center justify-center">
          <img
            src="/logo.png"
            alt="헤이집사"
            className="w-[72%] max-w-[300px] select-none"
            draggable={false}
            onError={(e) => {
              e.currentTarget.style.visibility = 'hidden';
            }}
          />
        </div>

        {/* 하단 시작하기 버튼 */}
        <button
          onClick={start}
          className="w-full rounded-2xl bg-navy py-4 text-lg font-bold text-white shadow-lg transition active:scale-[0.98]"
        >
          {onboarded ? '이어서 시작하기' : '시작하기'}
        </button>
      </div>
    </div>
  );
}
