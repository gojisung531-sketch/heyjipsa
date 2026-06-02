// 월간 고정비 공용 유틸
import type { ExpenseCategory } from '../types';

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  rent: '월세',
  utilities: '공과금·관리비',
  education: '교육·학원',
  insurance: '보험',
  other: '기타',
};

export const EXPENSE_CATEGORY_EMOJI: Record<ExpenseCategory, string> = {
  rent: '🏠',
  utilities: '💡',
  education: '📚',
  insurance: '🛡️',
  other: '📌',
};

/** 매월 dueDay 기준 다음 납부일까지 남은 일수 (오늘=0). */
export function daysUntilDue(dueDay: number, now: Date = new Date()): number {
  const y = now.getFullYear();
  const m = now.getMonth();
  const todayMidnight = new Date(y, m, now.getDate());
  let due = new Date(y, m, dueDay);
  if (due.getTime() < todayMidnight.getTime()) {
    due = new Date(y, m + 1, dueDay);
  }
  return Math.round((due.getTime() - todayMidnight.getTime()) / 86_400_000);
}
