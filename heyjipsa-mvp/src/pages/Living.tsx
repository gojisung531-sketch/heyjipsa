// 살림 `/living` — 집안일·소모품(체크리스트) + 가사분담을 한 탭에 통합.
// 기존 Checklist/Chores 페이지를 embedded로 재사용한다(중복 구현 없음).
import { useState } from 'react';
import { PageHeader } from '../components/Layout';
import Checklist from './Checklist';
import Chores from './Chores';

type Sub = 'home' | 'chores';

export default function Living() {
  const [sub, setSub] = useState<Sub>('home');

  return (
    <div>
      <PageHeader title="살림" subtitle="집안일·소모품·가사분담을 한곳에서" />

      <div className="mb-4 flex gap-2">
        {(
          [
            ['home', '집안일·소모품'],
            ['chores', '가사분담'],
          ] as Array<[Sub, string]>
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setSub(k)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
              sub === k ? 'bg-navy text-white' : 'bg-white text-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {sub === 'home' ? <Checklist embedded /> : <Chores embedded />}
    </div>
  );
}
