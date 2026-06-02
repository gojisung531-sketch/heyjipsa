// P1/P2 예정 페이지 스텁 (하단 네비 연결 유지용)
import { PageHeader } from '../components/Layout';

export default function ComingSoon({
  title,
  emoji,
  desc,
  phase,
}: {
  title: string;
  emoji: string;
  desc: string;
  phase: string;
}) {
  return (
    <div>
      <PageHeader title={title} />
      <div className="mt-10 flex flex-col items-center text-center">
        <div className="grid h-20 w-20 place-items-center rounded-3xl bg-white text-4xl shadow-sm">
          {emoji}
        </div>
        <p className="mt-5 text-base font-semibold text-ink">곧 만나요!</p>
        <p className="mt-1 max-w-[16rem] text-sm text-muted">{desc}</p>
        <span className="mt-4 rounded-full bg-light px-3 py-1 text-xs font-medium text-blue">
          {phase} 예정 기능
        </span>
      </div>
    </div>
  );
}
