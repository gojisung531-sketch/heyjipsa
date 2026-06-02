// 클라이언트 OCR — 플랫폼별 분기
//  - 웹: Tesseract.js (모델은 런타임 CDN, 동적 로드)
//  - 네이티브(Capacitor): 카메라 촬영 → 기기 내장 ML Kit 텍스트 인식 (오프라인·고정확도)
// 네이티브 플러그인/카메라는 동적 import → 웹 번들·렌더에 영향 없음.
import { Capacitor } from '@capacitor/core';

export const isNativeOCR = (): boolean => Capacitor.isNativePlatform();

/** 웹: 이미지(File/Blob) → 인식 텍스트. onProgress: 0~1 */
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

/** 네이티브: 카메라/갤러리 → ML Kit 텍스트 인식 → 텍스트 */
export async function captureAndRecognizeNative(): Promise<string> {
  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
  const { CapacitorPluginMlKitTextRecognition } = await import(
    '@pantrist/capacitor-plugin-ml-kit-text-recognition'
  );
  const photo = await Camera.getPhoto({
    quality: 90,
    resultType: CameraResultType.Base64,
    source: CameraSource.Prompt,
  });
  if (!photo.base64String) return '';
  const { text } = await CapacitorPluginMlKitTextRecognition.detectText({
    base64Image: photo.base64String,
  });
  return (text ?? '').trim();
}
