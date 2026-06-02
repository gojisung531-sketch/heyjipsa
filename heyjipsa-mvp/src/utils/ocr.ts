// 클라이언트 OCR (Tesseract.js) — 이미지에서 한국어/숫자 텍스트 추출
// 모델·워커는 런타임에 CDN에서 받아온다(인터넷 필요). 백엔드 없음.
// tesseract.js는 동적 import → 실제 인식할 때만 로드(초기 번들에서 분리).

/** 이미지(File/Blob) → 인식된 텍스트. onProgress: 0~1 */
export async function recognizeImage(
  file: File | Blob,
  onProgress?: (p: number) => void,
): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('kor+eng', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(m.progress);
    },
  });
  try {
    const { data } = await worker.recognize(file);
    return (data.text ?? '').trim();
  } finally {
    await worker.terminate();
  }
}
