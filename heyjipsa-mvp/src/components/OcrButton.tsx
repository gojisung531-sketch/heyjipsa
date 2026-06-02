// 영수증/스크린샷 → OCR → 텍스트 콜백 (재사용)
//  웹: 파일 선택 + Tesseract / 네이티브: 카메라 + ML Kit
import { useRef, useState } from 'react';
import { recognizeImage, captureAndRecognizeNative, isNativeOCR } from '../utils/ocr';

export default function OcrButton({
  onText,
  label = '📷 영수증·스크린샷 인식',
  className = '',
}: {
  onText: (text: string) => void;
  label?: string;
  className?: string;
}) {
  const native = isNativeOCR();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState(false);

  const runWeb = async (file: File) => {
    setBusy(true);
    setErr(false);
    setPct(0);
    try {
      const text = await recognizeImage(file, (p) => setPct(Math.round(p * 100)));
      if (text) onText(text);
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  };

  const runNative = async () => {
    setBusy(true);
    setErr(false);
    try {
      const text = await captureAndRecognizeNative();
      if (text) onText(text);
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      {!native && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) runWeb(file);
          }}
        />
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => (native ? runNative() : inputRef.current?.click())}
        className="w-full rounded-xl border border-dashed border-blue/50 py-3 text-sm font-medium text-blue transition active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? (native ? '인식 중…' : `인식 중… ${pct}%`) : label}
      </button>
      {err && (
        <p className="mt-1 text-center text-xs text-danger">
          인식에 실패했어요. 다른 이미지로 다시 시도해 주세요.
        </p>
      )}
    </div>
  );
}
