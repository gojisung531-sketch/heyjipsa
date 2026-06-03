// 음성 인식(STT) — 플랫폼 분기
//  - 웹: 브라우저 SpeechRecognition(webkit) — HTTPS/localhost에서만 마이크 허용
//  - 네이티브(Capacitor): @capacitor-community/speech-recognition (on-device)
// 한국어(ko-KR). 결과 텍스트는 호출부에서 파서(todoParser 등)로 넘겨 자동 추가.
import { Capacitor } from '@capacitor/core';

export interface VoiceController {
  stop: () => void;
  cancel: () => void;
}
export interface VoiceHandlers {
  onPartial?: (text: string) => void;
  onResult: (text: string) => void;
  onError?: (message: string) => void;
}

// ── 웹 SpeechRecognition 최소 타입 ──
interface SRAlt {
  transcript: string;
}
interface SRRes {
  isFinal: boolean;
  0: SRAlt;
}
interface SREvent {
  resultIndex: number;
  results: ArrayLike<SRRes>;
}
interface SRInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SRCtor = new () => SRInstance;

function getSR(): SRCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SRCtor;
    webkitSpeechRecognition?: SRCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** 음성 입력 사용 가능 여부 (네이티브거나 브라우저 STT 지원 시) */
export function isVoiceSupported(): boolean {
  return Capacitor.isNativePlatform() || getSR() !== null;
}

function friendlyError(code: string): string {
  if (code === 'not-allowed' || code === 'service-not-allowed')
    return '마이크 권한이 필요해요. (웹은 https/localhost에서만 동작)';
  if (code === 'no-speech') return '음성이 들리지 않았어요. 다시 시도해 주세요.';
  if (code === 'network') return '네트워크 오류로 인식하지 못했어요.';
  return '음성 인식에 실패했어요. 다시 시도해 주세요.';
}

/** 듣기 시작. 컨트롤러(stop/cancel) 반환. onResult로 최종 텍스트 전달. */
export async function startVoice(handlers: VoiceHandlers): Promise<VoiceController> {
  if (Capacitor.isNativePlatform()) {
    const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
    try {
      const perm = await SpeechRecognition.requestPermissions();
      if (perm.speechRecognition !== 'granted') {
        handlers.onError?.('마이크·음성 인식 권한이 필요해요.');
        return { stop: () => {}, cancel: () => {} };
      }
    } catch {
      /* 권한 API 미구현 플랫폼은 무시 */
    }
    let last = '';
    let done = false;
    const handle = await SpeechRecognition.addListener('partialResults', (d: { matches: string[] }) => {
      if (d.matches?.length) {
        last = d.matches[0];
        handlers.onPartial?.(last);
      }
    });
    const finish = async (deliver: boolean) => {
      if (done) return;
      done = true;
      try {
        await SpeechRecognition.stop();
      } catch {
        /* already stopped */
      }
      await handle.remove();
      if (deliver) handlers.onResult(last.trim());
    };
    try {
      await SpeechRecognition.start({
        language: 'ko-KR',
        partialResults: true,
        popup: false,
      });
    } catch {
      handlers.onError?.('음성 인식을 시작하지 못했어요.');
      await finish(false);
    }
    return { stop: () => void finish(true), cancel: () => void finish(false) };
  }

  // ── 웹 ──
  const SR = getSR();
  if (!SR) {
    handlers.onError?.('이 브라우저는 음성 인식을 지원하지 않아요.');
    return { stop: () => {}, cancel: () => {} };
  }
  const rec = new SR();
  rec.lang = 'ko-KR';
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  let finalText = '';
  let delivered = false;
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    handlers.onPartial?.((finalText + interim).trim());
  };
  rec.onerror = (e) => {
    if (!delivered) {
      delivered = true;
      handlers.onError?.(friendlyError(e.error));
    }
  };
  rec.onend = () => {
    if (!delivered) {
      delivered = true;
      handlers.onResult(finalText.trim());
    }
  };
  try {
    rec.start();
  } catch {
    handlers.onError?.('음성 인식을 시작하지 못했어요.');
  }
  return {
    stop: () => rec.stop(),
    cancel: () => {
      delivered = true;
      rec.abort();
    },
  };
}
