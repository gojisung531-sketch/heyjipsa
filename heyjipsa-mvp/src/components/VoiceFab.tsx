// "시리처럼" 전역 음성 입력 — 말하면 자동으로 할 일 추가
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Todo, TodoPriority } from '../types';
import { isVoiceSupported, startVoice } from '../utils/voice';
import type { VoiceController } from '../utils/voice';
import { parseBatch } from '../utils/todoParser';
import { STORAGE_KEYS, loadJSON, saveJSON, uid } from '../utils/storage';

type Phase = 'listening' | 'review' | 'added' | 'error';

const PRIORITY_STYLE: Record<TodoPriority, string> = {
  상: 'bg-danger/10 text-danger',
  중: 'bg-blue/10 text-blue',
  하: 'bg-light text-muted',
};

export default function VoiceFab() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('listening');
  const [partial, setPartial] = useState('');
  const [transcript, setTranscript] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const [addedCount, setAddedCount] = useState(0);
  const ctrl = useRef<VoiceController | null>(null);

  if (!isVoiceSupported()) return null;

  const parsed = transcript.trim() ? parseBatch(transcript) : [];

  const beginListen = async () => {
    setPartial('');
    setTranscript('');
    setErrMsg('');
    setPhase('listening');
    ctrl.current = await startVoice({
      onPartial: setPartial,
      onResult: (t) => {
        ctrl.current = null;
        setTranscript(t);
        setPhase('review');
      },
      onError: (m) => {
        ctrl.current = null;
        setErrMsg(m);
        setPhase('error');
      },
    });
  };

  const openFab = () => {
    setOpen(true);
    void beginListen();
  };
  const close = () => {
    ctrl.current?.cancel();
    ctrl.current = null;
    setOpen(false);
  };

  const addTodos = () => {
    if (parsed.length === 0) return;
    const now = new Date().toISOString();
    const existing = loadJSON<Todo[]>(STORAGE_KEYS.TODOS, []);
    const created: Todo[] = parsed.map((p) => ({
      id: uid('todo'),
      category: p.category,
      item: p.item,
      priority: p.priority,
      deadline: p.deadline,
      raw: p.raw,
      done: false,
      createdAt: now,
    }));
    saveJSON(STORAGE_KEYS.TODOS, [...created, ...existing]);
    setAddedCount(created.length);
    setPhase('added');
  };

  return (
    <>
      {/* FAB (하단 네비 위, 컬럼 우측) */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[78px] z-30">
        <div className="pointer-events-none mx-auto flex max-w-[430px] justify-end px-4">
          <button
            onClick={openFab}
            aria-label="음성으로 할 일 추가"
            className="pointer-events-auto grid h-14 w-14 place-items-center rounded-full bg-navy text-2xl text-white shadow-lg transition active:scale-95"
          >
            🎤
          </button>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40"
          onClick={close}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="mx-auto w-full max-w-[430px] rounded-t-3xl bg-white px-6 pb-9 pt-6"
          >
            {phase === 'listening' && (
              <div className="text-center">
                <div className="mx-auto grid h-20 w-20 animate-pulse place-items-center rounded-full bg-navy text-4xl text-white">
                  🎤
                </div>
                <p className="mt-4 font-bold text-navy">말씀하세요…</p>
                <p className="mt-2 min-h-[2.5rem] text-sm text-ink">
                  {partial || (
                    <span className="text-muted">
                      예: “내일까지 보고서 제출하고 우유 사야돼”
                    </span>
                  )}
                </p>
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={close}
                    className="flex-1 rounded-xl border border-light py-3 text-sm font-semibold text-muted"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => ctrl.current?.stop()}
                    className="flex-1 rounded-xl bg-navy py-3 text-sm font-semibold text-white"
                  >
                    완료
                  </button>
                </div>
              </div>
            )}

            {phase === 'review' && (
              <div>
                <p className="text-sm text-muted">이렇게 들었어요</p>
                <p className="mt-1 font-semibold text-ink">“{transcript || '…'}”</p>
                {parsed.length > 0 ? (
                  <>
                    <p className="mb-2 mt-4 text-sm font-bold text-navy">
                      할 일 {parsed.length}개로 정리했어요
                    </p>
                    <ul className="space-y-2">
                      {parsed.map((p, i) => (
                        <li key={i} className="rounded-xl bg-cream px-3 py-2">
                          <span className="text-ink">{p.item}</span>
                          <span className="ml-2 rounded-full bg-light px-2 py-0.5 text-[11px] text-blue">
                            {p.category}
                          </span>
                          <span
                            className={`ml-1 rounded-full px-2 py-0.5 text-[11px] ${PRIORITY_STYLE[p.priority]}`}
                          >
                            {p.priority}
                          </span>
                          {p.deadline && (
                            <span className="ml-1 rounded-full bg-white px-2 py-0.5 text-[11px] text-danger">
                              📅 {p.deadline}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-5 flex gap-3">
                      <button
                        onClick={() => void beginListen()}
                        className="rounded-xl border border-light px-4 py-3 text-sm font-semibold text-muted"
                      >
                        다시
                      </button>
                      <button
                        onClick={addTodos}
                        className="flex-1 rounded-xl bg-mint py-3 text-sm font-semibold text-white"
                      >
                        할 일 추가
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="mt-4">
                    <p className="text-sm text-muted">할 일을 알아듣지 못했어요.</p>
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={close}
                        className="flex-1 rounded-xl border border-light py-3 text-sm font-semibold text-muted"
                      >
                        닫기
                      </button>
                      <button
                        onClick={() => void beginListen()}
                        className="flex-1 rounded-xl bg-navy py-3 text-sm font-semibold text-white"
                      >
                        다시 말하기
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {phase === 'added' && (
              <div className="text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-mint text-3xl text-white">
                  ✓
                </div>
                <p className="mt-4 font-bold text-navy">
                  할 일 {addedCount}개 추가했어요
                </p>
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={close}
                    className="flex-1 rounded-xl border border-light py-3 text-sm font-semibold text-muted"
                  >
                    닫기
                  </button>
                  <button
                    onClick={() => {
                      close();
                      navigate('/checklist');
                    }}
                    className="flex-1 rounded-xl bg-navy py-3 text-sm font-semibold text-white"
                  >
                    체크리스트 보기
                  </button>
                </div>
              </div>
            )}

            {phase === 'error' && (
              <div className="text-center">
                <p className="text-3xl">😕</p>
                <p className="mt-2 text-sm text-ink">{errMsg}</p>
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={close}
                    className="flex-1 rounded-xl border border-light py-3 text-sm font-semibold text-muted"
                  >
                    닫기
                  </button>
                  <button
                    onClick={() => void beginListen()}
                    className="flex-1 rounded-xl bg-navy py-3 text-sm font-semibold text-white"
                  >
                    다시
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
