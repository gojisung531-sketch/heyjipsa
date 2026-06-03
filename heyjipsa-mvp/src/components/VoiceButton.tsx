// 음성으로 입력 (인라인) — 누르면 듣고, 결과 텍스트를 onText로 전달
import { useRef, useState } from 'react';
import { isVoiceSupported, startVoice } from '../utils/voice';
import type { VoiceController } from '../utils/voice';

export default function VoiceButton({
  onText,
  className = '',
}: {
  onText: (text: string) => void;
  className?: string;
}) {
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState('');
  const ctrl = useRef<VoiceController | null>(null);

  if (!isVoiceSupported()) return null;

  const start = async () => {
    setPartial('');
    setListening(true);
    ctrl.current = await startVoice({
      onPartial: setPartial,
      onResult: (t) => {
        setListening(false);
        ctrl.current = null;
        if (t) onText(t);
      },
      onError: () => {
        setListening(false);
        ctrl.current = null;
      },
    });
  };

  return (
    <button
      type="button"
      onClick={() => (listening ? ctrl.current?.stop() : start())}
      className={`w-full truncate rounded-xl border border-dashed py-3 text-sm font-medium transition active:scale-[0.98] ${
        listening
          ? 'animate-pulse border-danger bg-danger/10 text-danger'
          : 'border-mint/60 text-mint'
      } ${className}`}
    >
      {listening
        ? partial
          ? `● ${partial}`
          : '● 듣는 중… (탭해서 완료)'
        : '🎤 음성으로 입력'}
    </button>
  );
}
