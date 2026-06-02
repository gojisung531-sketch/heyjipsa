// 자연어 → 가사노동 기록 파싱
// → chore-logger/scripts/log_chore.py 의 파싱 로직 포팅
//   (담당자 / 카테고리(복수) / 소요시간 / 날짜 추출)

import type { ChoreCategory, ChoreEntry, FamilyMember } from '../types';
import { todayStr, uid } from './storage';

interface CatDef {
  code: ChoreCategory;
  label: string;
  keywords: string[];
  defaultMinutes: number;
}

// 카테고리 정의 (키워드는 부분 문자열 매칭). log_chore.py CATEGORIES 포팅.
export const CHORE_CATEGORIES: CatDef[] = [
  { code: 'dishes', label: '설거지', keywords: ['설거지', '그릇 닦', '접시 닦'], defaultMinutes: 20 },
  { code: 'laundry', label: '빨래', keywords: ['빨래', '세탁', '건조기 돌'], defaultMinutes: 10 },
  { code: 'cleaning', label: '청소', keywords: ['청소', '청소기', '걸레질', '바닥 닦', '방 정리'], defaultMinutes: 30 },
  {
    code: 'cooking',
    label: '요리',
    keywords: ['요리', '밥 했', '밥 함', '저녁 했', '아침 했', '점심 했', '음식 만', '반찬'],
    defaultMinutes: 40,
  },
  { code: 'trash', label: '쓰레기', keywords: ['쓰레기', '분리수거', '음쓰', '음식물'], defaultMinutes: 5 },
  { code: 'shopping', label: '장보기', keywords: ['장보', '장 봐', '장 봤', '마트', '쇼핑'], defaultMinutes: 60 },
];

export const CHORE_CATEGORY_LABELS: Record<ChoreCategory, string> = {
  dishes: '설거지',
  laundry: '빨래',
  cleaning: '청소',
  cooking: '요리',
  trash: '쓰레기',
  shopping: '장보기',
  other: '기타',
};

// 1인칭 별칭 (self_aliases)
const SELF_PRONOUNS = ['내가', '제가', '나', '저'];

function aliasesOf(m: FamilyMember): string[] {
  return [m.name, m.nickname].filter((x): x is string => !!x && x.trim() !== '');
}

/**
 * 담당자 한 명 찾기. family[0]을 본인(self)으로 간주.
 * 다른 구성원 이름/별칭이 1인칭보다 우선 (구체적 신호). 못 찾으면 본인.
 * (detect_person 포팅)
 */
export function detectPerson(text: string, family: FamilyMember[]): string {
  if (family.length === 0) return '나';
  const self = family[0];
  const others = family.slice(1);

  for (const m of others) {
    for (const alias of aliasesOf(m)) {
      if (text.includes(alias)) return m.name;
    }
  }
  for (const alias of [...aliasesOf(self), ...SELF_PRONOUNS]) {
    if (text.includes(alias)) return self.name;
  }
  return self.name;
}

/** 매칭되는 모든 카테고리(중복 없이, 순서대로). 없으면 기타 1건. (detect_chores 포팅) */
export function detectChores(text: string): CatDef[] {
  const found: CatDef[] = [];
  const seen = new Set<ChoreCategory>();
  for (const cat of CHORE_CATEGORIES) {
    for (const kw of cat.keywords) {
      if (text.includes(kw) && !seen.has(cat.code)) {
        found.push(cat);
        seen.add(cat.code);
        break;
      }
    }
  }
  if (found.length === 0) {
    found.push({ code: 'other', label: '기타', keywords: [], defaultMinutes: 15 });
  }
  return found;
}

/** 명시된 소요시간(분). "30분","1시간","1시간 30분" 처리. 없으면 null. (detect_duration 포팅) */
export function detectDuration(text: string): number | null {
  const h = text.match(/(\d+)\s*시간/);
  const m = text.match(/(\d+)\s*분/);
  const hours = h ? parseInt(h[1], 10) : 0;
  const minutes = m ? parseInt(m[1], 10) : 0;
  const total = hours * 60 + minutes;
  return total > 0 ? total : null;
}

/** 날짜 키워드 추출. 기본 오늘. (detect_date 포팅) */
export function detectDate(text: string, now: Date = new Date()): string {
  if (text.includes('그제') || text.includes('그저께')) {
    const d = new Date(now);
    d.setDate(d.getDate() - 2);
    return todayStr(d);
  }
  if (text.includes('어제')) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return todayStr(d);
  }
  return todayStr(now);
}

/**
 * 입력 텍스트 → ChoreEntry 리스트.
 * 카테고리가 여러 개면 entry도 여러 개. 명시 소요시간은 모든 entry에 동일 적용. (parse 포팅)
 */
export function parseChore(text: string, family: FamilyMember[]): ChoreEntry[] {
  const person = detectPerson(text, family);
  const chores = detectChores(text);
  const explicit = detectDuration(text);
  const date = detectDate(text);

  return chores.map((c) => ({
    id: uid('chore'),
    date,
    person,
    task: c.label,
    category: c.code,
    durationMinutes: explicit ?? c.defaultMinutes,
  }));
}
