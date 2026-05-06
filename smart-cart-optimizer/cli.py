"""
smart-cart-optimizer CLI.
사용법:
  python cli.py "휴지,세제,우유:brand,라면:lowest"
  python cli.py --file items.txt
  python cli.py --json items.json
"""

import argparse
import json
import sys

from optimizer import optimize, format_report


def parse_inline(text):
    """
    인라인 입력 파싱.
    "휴지, 세제:any:5000, 우유:brand, 라면:lowest:쿠팡"
    형식: name[:tag][:price][:platform]
    """
    items = []
    for raw in text.split(","):
        raw = raw.strip()
        if not raw:
            continue
        parts = [p.strip() for p in raw.split(":")]
        item = {"name": parts[0]}
        for p in parts[1:]:
            if p in ("brand", "lowest", "any"):
                item["tag"] = p
            elif p.isdigit():
                item["price"] = int(p)
            else:
                item["platform_pref"] = p
        items.append(item)
    return items


def main():
    ap = argparse.ArgumentParser(description="플랫폼별 무배 기준 맞춰 장바구니 묶음 최적화")
    ap.add_argument("input", nargs="?", help="인라인 입력 (콤마 구분)")
    ap.add_argument("--file", help="텍스트 파일 (한 줄당 한 품목)")
    ap.add_argument("--json", help="JSON 파일 (items 배열)")
    ap.add_argument("--db", help="플랫폼 DB JSON 경로 (기본: platforms.json)")
    args = ap.parse_args()

    items = []
    if args.json:
        with open(args.json, "r", encoding="utf-8") as f:
            items = json.load(f)
    elif args.file:
        with open(args.file, "r", encoding="utf-8") as f:
            text = f.read().replace("\n", ",")
        items = parse_inline(text)
    elif args.input:
        items = parse_inline(args.input)
    else:
        print("입력이 비어 있습니다. --help 참고", file=sys.stderr)
        sys.exit(1)

    db_path = args.db
    if db_path:
        result = optimize(items, db_path=db_path)
    else:
        result = optimize(items)

    print(format_report(result))


if __name__ == "__main__":
    main()
