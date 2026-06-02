// 체크리스트 완료 상태 저장 + daily 항목 자동 리셋(날짜 바뀌면)
import type { ChecklistState, HouseholdConfig } from '../types';
import { STORAGE_KEYS, loadJSON, saveJSON, todayStr } from './storage';
import { buildChecklist } from './checklist';

export function loadChecklistState(config: HouseholdConfig): ChecklistState {
  const state = loadJSON<ChecklistState>(STORAGE_KEYS.CHECKLIST_STATE, {
    checked: [],
    dailyDate: todayStr(),
  });
  const today = todayStr();
  if (state.dailyDate !== today) {
    // 새 날 → daily(오늘 할 일) 항목 체크만 초기화. 주/월/계절은 유지.
    const { byPeriod } = buildChecklist(config);
    const dailyIds = new Set(byPeriod.daily.map((i) => i.id));
    const checked = state.checked.filter((id) => !dailyIds.has(id));
    const reset: ChecklistState = { checked, dailyDate: today };
    saveJSON(STORAGE_KEYS.CHECKLIST_STATE, reset);
    return reset;
  }
  return state;
}

export function saveChecklistState(state: ChecklistState): void {
  saveJSON(STORAGE_KEYS.CHECKLIST_STATE, state);
}
