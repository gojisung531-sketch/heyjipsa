// 표시용 포맷 헬퍼

/** 1234567 → "1,234,567원" */
export function won(n: number): string {
  return `${Math.round(n).toLocaleString('ko-KR')}원`;
}

/** 1234567 → "1,234,567" */
export function num(n: number): string {
  return Math.round(n).toLocaleString('ko-KR');
}
