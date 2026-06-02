// 가사노동 기록 & 대시보드 `/chores`
import { useState } from 'react';
import type { ChoreEntry, FamilyMember } from '../types';
import { PageHeader } from '../components/Layout';
import { Button } from '../components/ui';
import ChoreDashboard from '../components/ChoreDashboard';
import { STORAGE_KEYS, loadJSON, saveJSON, todayStr, uid } from '../utils/storage';
import {
  parseChore,
  CHORE_CATEGORY_LABELS,
  CHORE_CATEGORIES,
} from '../utils/choreParser';

type Tab = 'log' | 'dashboard';

function buildSamples(family: FamilyMember[]): ChoreEntry[] {
  const names = family.map((f) => f.name);
  if (names.length === 0) return [];
  const a = names[0];
  const b = names[1 % names.length];
  const today = new Date();
  const dateAgo = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return todayStr(d);
  };
  const rows: Array<[number, string, ChoreEntry['category'], number]> = [
    [0, a, 'dishes', 20],
    [0, b, 'cooking', 40],
    [1, a, 'cleaning', 30],
    [2, b, 'laundry', 10],
    [3, a, 'trash', 5],
    [8, b, 'shopping', 60],
    [9, a, 'dishes', 20],
    [10, b, 'cleaning', 30],
  ];
  return rows.map(([d, person, category, dur]) => ({
    id: uid('chore'),
    date: dateAgo(d),
    person,
    task: CHORE_CATEGORY_LABELS[category],
    category,
    durationMinutes: dur,
  }));
}

export default function Chores() {
  const [family, setFamily] = useState<FamilyMember[]>(() =>
    loadJSON<FamilyMember[]>(STORAGE_KEYS.FAMILY_MEMBERS, []),
  );
  const [entries, setEntries] = useState<ChoreEntry[]>(() =>
    loadJSON<ChoreEntry[]>(STORAGE_KEYS.CHORE_LOG, []),
  );
  const [editingFamily, setEditingFamily] = useState(family.length === 0);
  const [tab, setTab] = useState<Tab>('log');
  const [text, setText] = useState('');

  // 가족 설정 임시 입력
  const [draft, setDraft] = useState<string[]>(
    family.length ? family.map((f) => f.name) : ['나'],
  );

  const saveEntries = (next: ChoreEntry[]) => {
    setEntries(next);
    saveJSON(STORAGE_KEYS.CHORE_LOG, next);
  };

  const saveFamily = () => {
    const members: FamilyMember[] = draft
      .map((n) => n.trim())
      .filter(Boolean)
      .map((name) => ({ id: uid('fam'), name }));
    if (members.length === 0) return;
    setFamily(members);
    saveJSON(STORAGE_KEYS.FAMILY_MEMBERS, members);
    setEditingFamily(false);
  };

  const preview = text.trim() ? parseChore(text, family) : [];

  const addRecord = () => {
    if (preview.length === 0) return;
    saveEntries([...entries, ...preview]);
    setText('');
  };

  const removeEntry = (id: string) =>
    saveEntries(entries.filter((e) => e.id !== id));

  // ── 가족 설정 화면 ──
  if (editingFamily) {
    return (
      <div>
        <PageHeader
          title="가족 구성원"
          subtitle="함께 사는 사람을 등록하세요. 첫 번째가 본인(나)이에요."
        />
        <div className="space-y-2">
          {draft.map((name, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={name}
                onChange={(e) =>
                  setDraft(draft.map((d, j) => (j === i ? e.target.value : d)))
                }
                placeholder={i === 0 ? '나 (본인)' : '구성원 이름'}
                className="flex-1 rounded-xl border border-light bg-white px-4 py-3 text-sm outline-none focus:border-blue"
              />
              {i === 0 ? (
                <span className="rounded-full bg-navy px-2.5 py-1 text-[11px] text-white">
                  나
                </span>
              ) : (
                <button
                  aria-label="삭제"
                  onClick={() => setDraft(draft.filter((_, j) => j !== i))}
                  className="grid h-9 w-9 place-items-center rounded-full text-danger hover:bg-danger/10"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={() => setDraft([...draft, ''])}
          className="mt-3 w-full rounded-xl border border-dashed border-blue/50 py-3 text-sm font-medium text-blue"
        >
          + 구성원 추가
        </button>
        <Button
          variant="mint"
          className="mt-5 w-full"
          disabled={draft.filter((d) => d.trim()).length === 0}
          onClick={saveFamily}
        >
          완료
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="가사노동 기록" />

      {/* 가족 + 탭 */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">
          {family.map((f) => f.name).join(' · ')}
        </p>
        <button
          onClick={() => {
            setDraft(family.map((f) => f.name));
            setEditingFamily(true);
          }}
          className="text-xs text-blue underline"
        >
          구성원 수정
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        {(['log', 'dashboard'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
              tab === t ? 'bg-navy text-white' : 'bg-white text-muted'
            }`}
          >
            {t === 'log' ? '기록' : '대시보드'}
          </button>
        ))}
      </div>

      {tab === 'log' ? (
        <div>
          {/* 입력 */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="예: 오늘 내가 설거지하고 빨래 돌림 / 엄마가 30분 청소함"
            className="w-full resize-none rounded-2xl border border-light bg-white px-4 py-3 text-sm outline-none focus:border-blue"
          />

          {/* 파싱 미리보기 */}
          {preview.length > 0 && (
            <div className="mt-2 rounded-xl bg-cream px-3 py-2 text-xs text-muted">
              {preview.map((p, i) => (
                <span key={i} className="mr-2 inline-block">
                  <b className="text-ink">{p.person}</b> · {p.task} ·{' '}
                  {p.durationMinutes}분
                </span>
              ))}
            </div>
          )}

          <Button className="mt-3 w-full" disabled={preview.length === 0} onClick={addRecord}>
            기록 추가
          </Button>

          {/* 히스토리 */}
          <h2 className="mb-2 mt-6 text-sm font-bold text-navy">
            최근 기록 {entries.length > 0 && `(${entries.length})`}
          </h2>
          <ul className="space-y-2">
            {[...entries].reverse().map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm"
              >
                <span className="rounded-full bg-light px-2 py-0.5 text-[11px] text-blue">
                  {CHORE_CATEGORY_LABELS[e.category]}
                </span>
                <span className="flex-1 text-ink">
                  <b>{e.person}</b> · {e.task} · {e.durationMinutes}분
                </span>
                <span className="text-[11px] text-muted">{e.date.slice(5)}</span>
                <button
                  aria-label="삭제"
                  onClick={() => removeEntry(e.id)}
                  className="text-danger hover:opacity-70"
                >
                  ✕
                </button>
              </li>
            ))}
            {entries.length === 0 && (
              <li className="rounded-xl bg-white p-6 text-center text-sm text-muted">
                첫 기록을 추가해 보세요. 카테고리: {CHORE_CATEGORIES.map((c) => c.label).join(', ')}
              </li>
            )}
          </ul>
        </div>
      ) : (
        <div>
          {entries.length === 0 && (
            <button
              onClick={() => saveEntries(buildSamples(family))}
              className="mb-3 w-full rounded-xl border border-dashed border-mint/60 py-3 text-sm font-medium text-mint"
            >
              ✨ 샘플 기록 넣어 대시보드 미리보기
            </button>
          )}
          <ChoreDashboard records={entries} />
        </div>
      )}
    </div>
  );
}
