// 살림 팁 검색 — home-tips-qa/scripts/search_tips.py 의 스코어링 로직 포팅
//
// 매칭 방식:
//   - 쿼리를 공백으로 분리 → 각 토큰이 제목/내용에 포함되면 +1
//   - 카테고리 일치 시 +2
//   - 점수 높은 순 정렬 (동점이면 카테고리 사전순) 후 limit 만큼 반환

import type { Tip } from '../types';

/** 팁 매칭 점수. 0이면 매칭 안 됨. (score_tip 포팅) */
export function scoreTip(
  tip: Tip,
  tokens: string[],
  categoryFilter: string | null,
): number {
  let score = 0;
  const haystack = `${tip.title} ${tip.tip}`.toLowerCase();

  // 카테고리 필터가 있으면 일치할 때만 살리고 +2
  if (categoryFilter) {
    if (tip.category !== categoryFilter) return 0;
    score += 2;
  }

  // 토큰 매칭
  for (const tok of tokens) {
    if (tok && haystack.includes(tok.toLowerCase())) score += 1;
  }

  // 카테고리 필터만 있고 토큰 없으면 통과
  if (categoryFilter && tokens.length === 0) return score;

  // 토큰이 있는데 하나도 안 맞으면 0
  if (tokens.length > 0 && score === (categoryFilter ? 2 : 0)) return 0;

  return score;
}

/** 검색 실행. (search 포팅) */
export function searchTips(
  tips: Tip[],
  query: string,
  category: string | null = null,
  limit = Number.MAX_SAFE_INTEGER,
): Tip[] {
  const tokens = query ? query.trim().split(/\s+/).filter(Boolean) : [];

  const scored: Array<{ score: number; tip: Tip }> = [];
  for (const tip of tips) {
    const s = scoreTip(tip, tokens, category);
    if (s > 0) scored.push({ score: s, tip });
  }

  // 점수 내림차순, 같은 점수면 카테고리 코드포인트 순 (Python 기본 문자열 비교와 동일)
  scored.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    const ca = a.tip.category;
    const cb = b.tip.category;
    return ca < cb ? -1 : ca > cb ? 1 : 0;
  });

  return scored.slice(0, limit).map((x) => x.tip);
}
