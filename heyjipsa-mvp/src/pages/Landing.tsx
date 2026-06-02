// 랜딩 페이지 `/`
import { useNavigate } from 'react-router-dom';
import { STORAGE_KEYS, loadJSON } from '../utils/storage';

const INTROS = [
  { emoji: '😮‍💨', text: '집안일, 기억하느라 지치셨죠?' },
  { emoji: '🧹', text: '헤이집사가 이번 주를 통째로 관리해드려요' },
  { emoji: '👆', text: '5번만 탭하면 우리 집 맞춤 집사가 준비됩니다' },
];

export default function Landing() {
  const navigate = useNavigate();
  const onboarded = loadJSON<boolean>(STORAGE_KEYS.ONBOARDING_DONE, false);

  const start = () => navigate(onboarded ? '/home' : '/onboarding');

  return (
    <div className="min-h-dvh w-full bg-gradient-to-br from-navy via-blue to-mint">
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-6 py-10 text-white">
        {/* 헤더 */}
        <div className="flex flex-1 flex-col justify-center">
          <p className="text-sm font-semibold tracking-widest text-white/70">
            HEYJIPSA
          </p>
          <h1 className="mt-2 text-4xl font-extrabold leading-tight">
            헤이집사
          </h1>
          <p className="mt-3 text-lg font-medium text-white/90">
            이 집의 이번 주를 통째로 관리하는
            <br />
            AI 집사
          </p>

          {/* 인트로 3개 */}
          <div className="mt-10 space-y-3">
            {INTROS.map((it, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm"
              >
                <span className="text-2xl">{it.emoji}</span>
                <span className="text-[15px] font-medium text-white/95">
                  {it.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="pt-8">
          <button
            onClick={start}
            className="w-full rounded-2xl bg-white py-4 text-lg font-bold text-navy shadow-lg transition active:scale-[0.98]"
          >
            {onboarded ? '이어서 시작하기' : '시작하기'}
          </button>
          <p className="mt-3 text-center text-xs text-white/60">
            입력하지 마세요. 필요 없는 것만 빼면 됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
