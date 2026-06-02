// 구매 기록 저장/검증 (receipt-scanner 수동 입력 대체)
// → receipt-scanner/scripts/receipt_to_xlsx.py 의 데이터 스키마 + validate_item 포팅
//   (xlsx 쓰기 대신 localStorage)

import type { PurchaseRecord } from '../types';
import { STORAGE_KEYS, loadJSON, saveJSON, uid } from './storage';

/** "3,000원" 같은 문자열도 정수로. (validate_item 숫자 변환 포팅) */
export function toAmount(v: string | number): number {
  if (typeof v === 'number') return Math.trunc(v);
  const cleaned = v.replace(/[,원₩\s]/g, '');
  if (cleaned === '') return 0;
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? 0 : Math.trunc(n);
}

export function loadPurchases(): PurchaseRecord[] {
  return loadJSON<PurchaseRecord[]>(STORAGE_KEYS.PURCHASE_RECORDS, []);
}

export function savePurchases(records: PurchaseRecord[]): void {
  saveJSON(STORAGE_KEYS.PURCHASE_RECORDS, records);
}

// 패턴 데모용 샘플 (purchase-pattern/sample_data 축약본)
const SAMPLE: Array<[string, string, number, number]> = [
  // [date, item, unitPrice, qty]
  ['2026-01-05', '휴지 30롤', 12900, 1],
  ['2026-01-30', '휴지 30롤', 12900, 1],
  ['2026-02-26', '휴지 30롤', 12900, 1],
  ['2026-03-22', '휴지 30롤', 13500, 1],
  ['2026-04-19', '휴지 30롤', 12900, 1],
  ['2026-01-08', '우유 1L', 3200, 1],
  ['2026-01-21', '우유 1L', 3200, 1],
  ['2026-02-05', '우유 1L', 3200, 1],
  ['2026-02-21', '우유 1L', 3200, 2],
  ['2026-03-09', '우유 1L', 3300, 1],
  ['2026-01-12', '바나나', 4500, 1],
  ['2026-02-08', '바나나', 4800, 1],
  ['2026-03-08', '바나나', 4500, 1],
  ['2026-02-01', '라면 5개입', 4500, 2],
  ['2026-04-01', '라면 5개입', 4900, 2],
];

export function buildSamplePurchases(): PurchaseRecord[] {
  return SAMPLE.map(([date, item, unitPrice, qty]) => ({
    id: uid('buy'),
    date,
    store: '마트',
    item,
    qty,
    unitPrice,
    total: unitPrice * qty,
    category: '',
  }));
}
