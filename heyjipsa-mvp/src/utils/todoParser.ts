// 한국어 자연어 → 할 일(카테고리/항목/우선순위/기한) 추출
// → voice-to-todo/parser.py 포팅

import type { TodoPriority } from '../types';

export interface ParsedTodo {
  category: string;
  item: string;
  priority: TodoPriority;
  deadline: string | null;
  raw: string;
}

// 카테고리 키워드 사전
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  장보기: [
    '사야', '사와', '사올', '사다', '구매', '장보', '장 보', '마트',
    '주문', '택배', '배송', '쇼핑',
    '휴지', '우유', '계란', '쌀', '물', '과일', '야채', '고기',
    '샴푸', '치약', '세제', '비누',
  ],
  집안일: [
    '청소', '빨래', '설거지', '정리', '버리', '버려', '분리수거',
    '쓰레기', '세탁', '다림질', '환기', '걸레',
    '화장실', '주방', '거실', '방 정리',
  ],
  업무: [
    '보고서', '회의', '미팅', '제출', '발표', '프레젠테이션', 'PT',
    '이메일', '메일', '답장', '회신', '전화',
    '마감', '제안서', '기획안', '보고', '결재',
    '프로젝트', '과제', '리포트', '레포트', '논문', '스터디',
    '수업', '강의', '출석', '공부',
  ],
  경조사: [
    '생일', '생신', '결혼', '결혼식', '장례', '조의', '축의',
    '돌잔치', '돌', '환갑', '칠순', '기일',
    '선물', '축하', '조문', '부조',
    '엄마', '아빠', '할머니', '할아버지', '이모', '고모', '삼촌',
  ],
};

const HIGH_PRIORITY = ['급', '빨리', '당장', '오늘', '내일까지', '마감', '긴급', 'ASAP', 'asap'];
const LOW_PRIORITY = ['언젠가', '여유', '천천히', '나중에', '시간 날 때'];

const WEEKDAYS = [
  '월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일',
  '월욜', '화욜', '수욜', '목욜', '금욜', '토욜', '일욜',
];
const RELATIVE_DATES = [
  '오늘', '내일', '모레', '글피', '이번 주', '이번주', '다음 주', '다음주',
  '이번 달', '이번달', '다음 달', '다음달', '주말',
];
const DATE_PATTERN = /(\d{1,2})월\s*(\d{1,2})일/;

/** 양끝에서 지정 문자들 트림 */
function stripChars(s: string): string {
  return s.replace(/^[\s,.~-]+/, '').replace(/[\s,.~-]+$/, '');
}

/** 여러 할 일이 한 덩어리로 들어왔을 때 분리. (split_input 포팅) */
export function splitInput(text: string): string[] {
  if (!text || !text.trim()) return [];

  const splitter =
    /(?<=[다요함])[.,]\s*|\s*하고\s*[,]\s*|\s*그리고나서\s+|\s*그리고\s+|\s*그래서\s+|\s+하고\s+(?=[가-힣])/;
  const leadingConj = /^(그리고|그래서|그러고|또한|또|그리고나서)\s+/;

  const result: string[] = [];
  for (const line of text.split('\n')) {
    for (let p of line.split(splitter)) {
      if (!p) continue;
      p = stripChars(p);
      p = p.replace(leadingConj, '').trim();
      if (p) result.push(p);
    }
  }
  return result;
}

/** 키워드 매칭으로 카테고리 결정. 매칭 없으면 '기타'. (detect_category 포팅) */
export function detectCategory(text: string): string {
  const cats = Object.keys(CATEGORY_KEYWORDS);
  let bestCat = cats[0];
  let bestScore = -1;
  for (const cat of cats) {
    let score = 0;
    for (const kw of CATEGORY_KEYWORDS[cat]) if (text.includes(kw)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      bestCat = cat;
    }
  }
  return bestScore <= 0 ? '기타' : bestCat;
}

/** 기한 표현 추출. 못 찾으면 null. (detect_deadline 포팅) */
export function detectDeadline(text: string): string | null {
  const m = text.match(DATE_PATTERN);
  if (m) return `${m[1]}월 ${m[2]}일`;
  for (const w of WEEKDAYS) if (text.includes(w)) return w.replace('욜', '요일');
  for (const d of RELATIVE_DATES) if (text.includes(d)) return d;
  return null;
}

/** 우선순위 추정. 기본 '중'. (detect_priority 포팅) */
export function detectPriority(text: string): TodoPriority {
  for (const kw of HIGH_PRIORITY) if (text.includes(kw)) return '상';
  for (const kw of LOW_PRIORITY) if (text.includes(kw)) return '하';
  if (text.includes('까지') && detectDeadline(text)) return '상';
  return '중';
}

const ENDINGS = [
  '해야 한다', '해야한다', '해야 함', '해야함', '해야 돼', '해야돼',
  '해야 해', '해야해', '해야겠다', '해야지',
  '사와야 돼', '사와야돼', '사와야 함', '사와야함', '사와야 해', '사와야해',
  '사야 돼', '사야돼', '사야 함', '사야함', '사야 해', '사야해',
  '사와야', '사와', '사오', '사올', '사기',
  '준비해야', '예약해야', '보내야', '내야',
  '도 해야', '도 사야',
  '하기', '보내기',
];

/** 항목명 추출. 종결어미·조사·기한·우선순위 제거. (extract_item 포팅) */
export function extractItem(text: string): string {
  let item = text;

  item = item.replace(DATE_PATTERN, '');
  for (const w of [...WEEKDAYS, ...RELATIVE_DATES, ...HIGH_PRIORITY, ...LOW_PRIORITY]) {
    item = item.split(w).join('');
  }
  item = item.replace(/까지|안에|전에|이내/g, '');
  for (const e of ENDINGS) item = item.split(e).join('');

  item = item.trim().replace(/[을를이가는도에서의]\s*$/, '');
  item = item.replace(/\s+/g, ' ');
  item = stripChars(item);

  if (!item) item = text.trim();
  return item;
}

/** 한 문장 → ParsedTodo. (parse_todo 포팅) */
export function parseTodo(text: string): ParsedTodo {
  const t = text.trim();
  return {
    category: detectCategory(t),
    item: extractItem(t),
    priority: detectPriority(t),
    deadline: detectDeadline(t),
    raw: t,
  };
}

/** 여러 줄/문장 입력 → ParsedTodo[]. (parse_batch 포팅) */
export function parseBatch(text: string): ParsedTodo[] {
  return splitInput(text)
    .filter(Boolean)
    .map((s) => parseTodo(s));
}
