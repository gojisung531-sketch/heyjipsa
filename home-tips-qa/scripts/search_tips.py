#!/usr/bin/env python3
"""
home-tips-qa: 팁 검색 스크립트

사용법:
  python search_tips.py "검색어"
  python search_tips.py --category 청소
  python search_tips.py --category 절약 --limit 3
  python search_tips.py "수건 냄새" --limit 5

매칭 방식:
  - 키워드를 공백으로 분리 → 각 토큰이 팁 제목 또는 내용에 포함되면 점수 +1
  - 카테고리 일치 시 점수 +2
  - 점수 높은 순으로 정렬 후 limit 만큼 반환
"""

import argparse
import json
import re
import sys
from pathlib import Path

# 카테고리 화이트리스트 — 새 팁 추가 시 이 안에 있어야 함
CATEGORIES = ["청소", "빨래", "요리", "수납정리", "생활꿀팁", "절약"]

# DB 경로: 스크립트 기준 상위 폴더의 tips_db.md
DB_PATH = Path(__file__).parent.parent / "tips_db.md"

# 헤더 패턴: "## [카테고리] 제목"
HEADER_RE = re.compile(r"^##\s*\[([^\]]+)\]\s*(.+)$")
FIELD_RE = re.compile(r"^-\s*(\w+):\s*(.*)$")


def parse_db(db_path: Path):
    """tips_db.md를 읽어서 팁 리스트로 파싱.
    각 팁은 {category, title, tip, source, added} 딕셔너리.
    """
    if not db_path.exists():
        return []

    tips = []
    current = None
    with db_path.open(encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            header_match = HEADER_RE.match(line)
            if header_match:
                # 새 팁 시작 — 이전 팁 저장
                if current:
                    tips.append(current)
                current = {
                    "category": header_match.group(1).strip(),
                    "title": header_match.group(2).strip(),
                    "tip": "",
                    "source": "",
                    "added": "",
                }
                continue

            if current is None:
                continue

            field_match = FIELD_RE.match(line)
            if field_match:
                key = field_match.group(1).strip()
                val = field_match.group(2).strip()
                if key in current:
                    current[key] = val

    # 마지막 팁 처리
    if current:
        tips.append(current)

    return tips


def score_tip(tip: dict, tokens: list, category_filter: str | None) -> int:
    """팁의 매칭 점수 계산. 0이면 매칭 안 됨."""
    score = 0
    haystack = f"{tip['title']} {tip['tip']}".lower()

    # 카테고리 필터가 있으면 일치할 때만 살리고 +2
    if category_filter:
        if tip["category"] != category_filter:
            return 0
        score += 2

    # 토큰 매칭
    for tok in tokens:
        if tok and tok.lower() in haystack:
            score += 1

    # 카테고리 필터만 있고 토큰 없는 경우도 통과해야 함
    if category_filter and not tokens:
        return score

    # 토큰이 있는데 하나도 안 맞으면 0
    if tokens and score == (2 if category_filter else 0):
        return 0

    return score


def search(query: str, category: str | None, limit: int) -> list:
    """검색 실행."""
    tips = parse_db(DB_PATH)
    tokens = [t for t in re.split(r"\s+", query.strip()) if t] if query else []

    scored = []
    for tip in tips:
        s = score_tip(tip, tokens, category)
        if s > 0:
            scored.append((s, tip))

    # 점수 내림차순, 같은 점수면 카테고리 순서대로
    scored.sort(key=lambda x: (-x[0], x[1]["category"]))
    return [t for _, t in scored[:limit]]


def format_results(results: list, as_json: bool = False) -> str:
    if as_json:
        return json.dumps(results, ensure_ascii=False, indent=2)

    if not results:
        return "검색 결과 없음. DB에 등록된 팁이 없거나 매칭이 안 됐어요."

    lines = []
    for r in results:
        lines.append(f"[{r['category']}] {r['title']}")
        lines.append(f"  - 내용: {r['tip']}")
        if r["source"]:
            lines.append(f"  - 출처: {r['source']}")
        lines.append("")
    return "\n".join(lines).rstrip()


def main():
    parser = argparse.ArgumentParser(description="home-tips-qa 팁 검색")
    parser.add_argument("query", nargs="?", default="", help="검색어")
    parser.add_argument(
        "--category",
        choices=CATEGORIES,
        help=f"카테고리 필터 ({', '.join(CATEGORIES)})",
    )
    parser.add_argument("--limit", type=int, default=3, help="최대 결과 수 (기본 3)")
    parser.add_argument("--json", action="store_true", help="JSON 형식으로 출력")
    args = parser.parse_args()

    if not args.query and not args.category:
        print("검색어 또는 --category 중 하나는 필요해요.", file=sys.stderr)
        sys.exit(2)

    results = search(args.query, args.category, args.limit)
    print(format_results(results, as_json=args.json))


if __name__ == "__main__":
    main()
