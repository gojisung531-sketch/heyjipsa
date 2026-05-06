#!/usr/bin/env python3
"""
home-tips-qa: 팁 추가 스크립트

사용법:
  python add_tip.py --category 청소 --tip "전자레인지에 레몬 돌리면 냄새 제거됨"
  python add_tip.py --category 청소 --tip "..." --source "https://youtube.com/..."
  python add_tip.py --category 청소 --title "전자레인지 냄새 제거" --tip "..." --source "..."

동작:
  1. 카테고리 화이트리스트 확인
  2. 중복 검사: 기존 팁 내용과 80% 이상 일치하면 중복으로 판단 (저장 거부)
  3. 제목 미지정 시 tip 첫 30자에서 자동 생성
  4. tips_db.md 끝에 append
"""

import argparse
import re
import sys
from datetime import date
from pathlib import Path

CATEGORIES = ["청소", "빨래", "요리", "수납정리", "생활꿀팁", "절약"]
DB_PATH = Path(__file__).parent.parent / "tips_db.md"


def _normalize(s: str) -> str:
    """공백·구두점 제거 + 소문자화. 한국어 조사 차이에 둔감하게 만들기 위함."""
    s = s.lower()
    # 한글, 영숫자만 남기고 다 제거 (조사/공백/구두점은 모두 노이즈로 취급)
    s = re.sub(r"[^\w가-힣]", "", s, flags=re.UNICODE)
    return s


def _bigrams(s: str) -> set:
    """문자 단위 bigram 집합. 한국어처럼 단어 경계가 모호한 언어에 효과적."""
    s = _normalize(s)
    if len(s) < 2:
        return {s} if s else set()
    return {s[i : i + 2] for i in range(len(s) - 1)}


def jaccard_similarity(a: str, b: str) -> float:
    """글자 bigram 기반 Jaccard 유사도. 한국어 조사("을/를/이/가") 차이에 강함."""
    set_a = _bigrams(a)
    set_b = _bigrams(b)
    if not set_a or not set_b:
        return 0.0
    inter = set_a & set_b
    union = set_a | set_b
    return len(inter) / len(union)


def load_existing_tips(db_path: Path) -> list:
    """기존 팁의 (category, tip 내용) 튜플 리스트 반환. 중복 검사용."""
    if not db_path.exists():
        return []

    tips = []
    current_cat = None
    current_tip = None
    header_re = re.compile(r"^##\s*\[([^\]]+)\]\s*(.+)$")
    tip_re = re.compile(r"^-\s*tip:\s*(.*)$")

    with db_path.open(encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            h = header_re.match(line)
            if h:
                if current_cat and current_tip:
                    tips.append((current_cat, current_tip))
                current_cat = h.group(1).strip()
                current_tip = None
                continue
            t = tip_re.match(line)
            if t and current_cat:
                current_tip = t.group(1).strip()

    if current_cat and current_tip:
        tips.append((current_cat, current_tip))
    return tips


def is_duplicate(new_tip: str, existing: list, threshold: float = 0.8) -> tuple:
    """중복 여부 + 가장 비슷한 기존 팁 반환."""
    best_sim = 0.0
    best_existing = None
    for cat, tip_content in existing:
        sim = jaccard_similarity(new_tip, tip_content)
        if sim > best_sim:
            best_sim = sim
            best_existing = (cat, tip_content)
    return (best_sim >= threshold, best_sim, best_existing)


def auto_title(tip: str, max_len: int = 30) -> str:
    """tip 내용에서 자동 제목 생성. 첫 max_len자 + 정리."""
    cleaned = re.sub(r"\s+", " ", tip.strip())
    if len(cleaned) <= max_len:
        return cleaned
    return cleaned[:max_len].rstrip() + "..."


def append_tip(category: str, title: str, tip: str, source: str, db_path: Path):
    """tips_db.md 끝에 새 팁 추가."""
    today = date.today().isoformat()
    block = (
        f"\n## [{category}] {title}\n"
        f"- tip: {tip}\n"
        f"- source: {source}\n"
        f"- added: {today}\n"
    )
    # 파일이 없으면 헤더와 함께 생성
    if not db_path.exists():
        db_path.parent.mkdir(parents=True, exist_ok=True)
        with db_path.open("w", encoding="utf-8") as f:
            f.write("# Home Tips DB\n")
            f.write(block)
    else:
        with db_path.open("a", encoding="utf-8") as f:
            f.write(block)


def main():
    parser = argparse.ArgumentParser(description="home-tips-qa 팁 추가")
    parser.add_argument(
        "--category",
        required=True,
        choices=CATEGORIES,
        help=f"카테고리 ({', '.join(CATEGORIES)})",
    )
    parser.add_argument("--tip", required=True, help="팁 내용")
    parser.add_argument("--title", default=None, help="팁 제목 (생략 시 자동 생성)")
    parser.add_argument("--source", default="", help="출처 (URL 또는 자유 텍스트)")
    parser.add_argument(
        "--force",
        action="store_true",
        help="중복 검사 무시하고 강제 저장",
    )
    args = parser.parse_args()

    tip_text = args.tip.strip()
    if not tip_text:
        print("ERROR: --tip 내용이 비어있습니다.", file=sys.stderr)
        sys.exit(2)

    title = args.title.strip() if args.title else auto_title(tip_text)

    # 중복 검사
    existing = load_existing_tips(DB_PATH)
    is_dup, sim, similar = is_duplicate(tip_text, existing)
    if is_dup and not args.force:
        print(f"WARN: 비슷한 팁이 이미 있습니다 (유사도 {sim:.0%}).")
        if similar:
            print(f"  기존: [{similar[0]}] {similar[1]}")
        print("  → 강제 저장하려면 --force 옵션을 사용하세요.")
        sys.exit(1)

    append_tip(args.category, title, tip_text, args.source.strip(), DB_PATH)

    print("OK: 팁 저장 완료")
    print(f"  카테고리: {args.category}")
    print(f"  제목: {title}")
    print(f"  내용: {tip_text}")
    print(f"  출처: {args.source if args.source else '(없음)'}")


if __name__ == "__main__":
    main()
