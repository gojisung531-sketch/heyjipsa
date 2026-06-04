// 온보딩 `/onboarding` — 3스텝, "빼기(opt-out)" 방식
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  ChecklistItem,
  HouseholdConfig,
  HouseholdType,
  PetType,
  PlantCount,
  Period,
} from '../types';
import { Button, Toggle } from '../components/ui';
import VoiceButton from '../components/VoiceButton';
import { buildFullPreview } from '../utils/checklist';
import { PERIODS, PERIOD_LABELS, PERIOD_TAB_LABELS } from '../data/templates';
import { STORAGE_KEYS, saveJSON, uid } from '../utils/storage';

const TYPES: Array<{ id: HouseholdType; emoji: string; title: string; desc: string }> = [
  { id: 'single', emoji: '🧍', title: '1인 자취', desc: '혼자 살아요' },
  { id: 'couple', emoji: '🧑‍🤝‍🧑', title: '2인 맞벌이', desc: '둘 다 일해요' },
  { id: 'couple_1kid', emoji: '👨‍👩‍👧', title: '부부 + 아이 1명', desc: '아이 한 명과 함께' },
  { id: 'couple_2kids', emoji: '👨‍👩‍👧‍👦', title: '부부 + 아이 2명 이상', desc: '다둥이 가정' },
  { id: 'with_parents', emoji: '👵', title: '부모님 동거', desc: '부모님과 함께 살아요' },
];

const PETS: Array<{ id: PetType; label: string }> = [
  { id: 'dog', label: '강아지' },
  { id: 'cat', label: '고양이' },
  { id: 'other', label: '기타' },
];

const PLANTS: Array<{ id: PlantCount; label: string }> = [
  { id: 'few', label: '1~3개' },
  { id: 'many', label: '4개 이상' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [type, setType] = useState<HouseholdType | null>(null);
  const [pet, setPet] = useState<PetType | null>(null);
  const [plants, setPlants] = useState<PlantCount | null>(null);
  const [car, setCar] = useState(false);
  const [rental, setRental] = useState(false);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<ChecklistItem[]>([]);
  const [newText, setNewText] = useState('');
  const [newPeriod, setNewPeriod] = useState<Period>('daily');

  // Step3 미리보기: 가구유형 + 옵션 기반 전체 항목
  const preview = useMemo(() => {
    if (!type) return null;
    return buildFullPreview({
      type,
      options: { pet, plants, car, rental_appliances: rental },
    });
  }, [type, pet, plants, car, rental]);

  const totalCount = preview
    ? PERIODS.reduce((s, p) => s + preview[p].length, 0)
    : 0;
  const keptCount = totalCount - removed.size + added.length;

  const toggleRemove = (id: string) => {
    setRemoved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addCustom = () => {
    const name = newText.trim();
    if (!name) return;
    setAdded((prev) => [
      ...prev,
      { id: uid('cust'), name, category: '직접 추가', period: newPeriod },
    ]);
    setNewText('');
  };
  const removeCustom = (id: string) =>
    setAdded((prev) => prev.filter((x) => x.id !== id));

  const finish = () => {
    if (!type) return;
    const config: HouseholdConfig = {
      type,
      options: { pet, plants, car, rental_appliances: rental },
      removedItems: [...removed],
      addedItems: added,
      completedAt: new Date().toISOString(),
    };
    saveJSON(STORAGE_KEYS.HOUSEHOLD_CONFIG, config);
    saveJSON<boolean>(STORAGE_KEYS.ONBOARDING_DONE, true);
    navigate('/home', { replace: true });
  };

  return (
    <div className="min-h-dvh w-full bg-light">
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-cream px-6 py-8">
        {/* 진행 표시 */}
        <div className="mb-6 flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${
                s <= step ? 'bg-navy' : 'bg-light'
              }`}
            />
          ))}
        </div>

        {/* ── Step 1: 가구 유형 ── */}
        {step === 1 && (
          <div className="flex flex-1 flex-col">
            <h2 className="text-2xl font-bold text-navy">어떤 집인가요?</h2>
            <p className="mt-1 text-sm text-muted">가구 유형을 하나만 골라주세요.</p>
            <div className="mt-6 space-y-3">
              {TYPES.map((t) => {
                const active = type === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id)}
                    className={`flex w-full items-center gap-4 rounded-2xl border-2 bg-white p-4 text-left transition active:scale-[0.99] ${
                      active ? 'border-navy shadow-sm' : 'border-transparent'
                    }`}
                  >
                    <span className="text-3xl">{t.emoji}</span>
                    <span className="flex-1">
                      <span className="block font-bold text-ink">{t.title}</span>
                      <span className="block text-xs text-muted">{t.desc}</span>
                    </span>
                    <span
                      className={`grid h-6 w-6 place-items-center rounded-full border-2 ${
                        active ? 'border-navy bg-navy text-white' : 'border-light'
                      }`}
                    >
                      {active ? '✓' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-auto pt-6">
              <Button className="w-full" disabled={!type} onClick={() => setStep(2)}>
                다음
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: 생활 옵션 ── */}
        {step === 2 && (
          <div className="flex flex-1 flex-col">
            <h2 className="text-2xl font-bold text-navy">생활 옵션</h2>
            <p className="mt-1 text-sm text-muted">
              해당되는 것만 켜주세요. 맞춤 집안일이 추가돼요.
            </p>

            <div className="mt-6 space-y-3">
              {/* 반려동물 */}
              <div className="rounded-2xl bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">🐾 반려동물 키워요</span>
                  <Toggle
                    label="반려동물"
                    checked={pet !== null}
                    onChange={(v) => setPet(v ? 'dog' : null)}
                  />
                </div>
                {pet !== null && (
                  <div className="mt-3 flex gap-2">
                    {PETS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setPet(p.id)}
                        className={`flex-1 rounded-xl border py-2 text-sm font-medium transition ${
                          pet === p.id
                            ? 'border-mint bg-mint text-white'
                            : 'border-light text-muted'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 식물 */}
              <div className="rounded-2xl bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">🪴 식물 키워요</span>
                  <Toggle
                    label="식물"
                    checked={plants !== null}
                    onChange={(v) => setPlants(v ? 'few' : null)}
                  />
                </div>
                {plants !== null && (
                  <div className="mt-3 flex gap-2">
                    {PLANTS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setPlants(p.id)}
                        className={`flex-1 rounded-xl border py-2 text-sm font-medium transition ${
                          plants === p.id
                            ? 'border-mint bg-mint text-white'
                            : 'border-light text-muted'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 차량 */}
              <div className="flex items-center justify-between rounded-2xl bg-white p-4">
                <span className="font-semibold text-ink">🚗 차량 보유</span>
                <Toggle label="차량" checked={car} onChange={setCar} />
              </div>

              {/* 렌탈 가전 */}
              <div className="flex items-center justify-between rounded-2xl bg-white p-4">
                <span className="font-semibold text-ink">
                  💧 정수기·공기청정기 렌탈
                </span>
                <Toggle label="렌탈 가전" checked={rental} onChange={setRental} />
              </div>
            </div>

            <div className="mt-auto flex gap-3 pt-6">
              <Button variant="ghost" onClick={() => setStep(1)}>
                이전
              </Button>
              <Button className="flex-1" onClick={() => setStep(3)}>
                다음
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: 템플릿 확인 & 빼기 ── */}
        {step === 3 && preview && (
          <div className="flex flex-1 flex-col">
            <h2 className="text-2xl font-bold text-navy">우리 집 집안일</h2>
            <p className="mt-1 text-sm text-muted">
              필요 없는 항목은 <span className="font-semibold text-danger">✕</span>로
              빼세요. {keptCount}개 유지 중
              {removed.size > 0 && (
                <button
                  onClick={() => setRemoved(new Set())}
                  className="ml-2 text-blue underline"
                >
                  되돌리기 ({removed.size})
                </button>
              )}
            </p>

            {/* 직접 추가 (텍스트 / 음성) */}
            <div className="mt-4 rounded-2xl bg-white p-3">
              <p className="mb-2 text-xs font-bold text-navy">
                + 우리 집만의 집안일 추가
              </p>
              <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto">
                {PERIODS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setNewPeriod(p)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                      newPeriod === p ? 'bg-navy text-white' : 'bg-light text-muted'
                    }`}
                  >
                    {PERIOD_TAB_LABELS[p]}
                  </button>
                ))}
              </div>
              <VoiceButton
                className="mb-2"
                onText={(t) => setNewText((prev) => (prev ? prev + ' ' + t : t))}
              />
              <div className="flex gap-2">
                <input
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustom()}
                  placeholder="예: 화분 물주기, 정수기 필터 갈기"
                  className="flex-1 rounded-lg border border-light px-3 py-2 text-sm outline-none focus:border-blue"
                />
                <Button onClick={addCustom} disabled={!newText.trim()}>
                  추가
                </Button>
              </div>
            </div>

            <div className="mt-5 flex-1 space-y-5">
              {PERIODS.map((period: Period) => {
                const items = preview[period].filter((it) => !removed.has(it.id));
                const customs = added.filter((a) => a.period === period);
                if (items.length === 0 && customs.length === 0) return null;
                return (
                  <section key={period}>
                    <h3 className="mb-2 text-sm font-bold text-blue">
                      {PERIOD_LABELS[period]}{' '}
                      <span className="font-normal text-muted">
                        {items.length + customs.length}
                      </span>
                    </h3>
                    <ul className="space-y-2">
                      {items.map((it) => (
                        <li
                          key={it.id}
                          className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5"
                        >
                          <span className="flex-1 text-sm text-ink">{it.name}</span>
                          <span className="rounded-full bg-light px-2 py-0.5 text-[11px] text-blue">
                            {it.category}
                          </span>
                          <button
                            aria-label="빼기"
                            onClick={() => toggleRemove(it.id)}
                            className="grid h-6 w-6 place-items-center rounded-full text-danger transition hover:bg-danger/10"
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                      {customs.map((it) => (
                        <li
                          key={it.id}
                          className="flex items-center gap-2 rounded-xl bg-mint/10 px-4 py-2.5"
                        >
                          <span className="flex-1 text-sm text-ink">{it.name}</span>
                          <span className="rounded-full bg-mint/20 px-2 py-0.5 text-[11px] text-mint">
                            직접 추가
                          </span>
                          <button
                            aria-label="삭제"
                            onClick={() => removeCustom(it.id)}
                            className="grid h-6 w-6 place-items-center rounded-full text-danger transition hover:bg-danger/10"
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>

            <div className="sticky bottom-0 -mx-6 mt-4 flex gap-3 bg-cream px-6 pb-2 pt-3">
              <Button variant="ghost" onClick={() => setStep(2)}>
                이전
              </Button>
              <Button variant="mint" className="flex-1" onClick={finish}>
                완료 · 집사 시작하기
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
