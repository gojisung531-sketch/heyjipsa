#!/usr/bin/env python3
"""
chore-logger: 자연어 집안일 기록기.

사용법:
    python log_chore.py "오늘 내가 설거지 하고 빨래 돌림"
    python log_chore.py "엄마가 30분 청소함" --dry-run

입력 텍스트를 파싱해서 (date, time, person, category, duration_min, raw_input)
형태로 CSV 로그에 append한다.
"""
import argparse
import csv
import json
import re
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

# 카테고리 정의: 키워드 매칭 + 기본 소요시간(분).
# 키워드는 부분 문자열 매칭이므로 어간만 적어도 됨.
# (예: "밥 했" → "밥 했어/했음/하고" 다 잡힘)
CATEGORIES = {
    "설거지": {
        "keywords": ["설거지", "그릇 닦", "접시 닦"],
        "default_minutes": 20,
    },
    "빨래": {
        "keywords": ["빨래", "세탁", "건조기 돌"],
        "default_minutes": 10,
    },
    "청소": {
        "keywords": ["청소", "청소기", "걸레질", "바닥 닦", "방 정리"],
        "default_minutes": 30,
    },
    "요리": {
        "keywords": [
            "요리", "밥 했", "밥 함", "저녁 했", "아침 했", "점심 했",
            "음식 만", "반찬",
        ],
        "default_minutes": 40,
    },
    "쓰레기": {
        "keywords": ["쓰레기", "분리수거", "음쓰", "음식물"],
        "default_minutes": 5,
    },
    "장보기": {
        "keywords": ["장보", "장 봐", "장 봤", "마트", "쇼핑"],
        "default_minutes": 60,
    },
}

DEFAULT_FAMILY = {
    "self_name": "나",
    "self_aliases": ["내가", "나", "제가", "저"],
    "members": [
        {"name": "엄마", "aliases": ["엄마", "어머니", "맘"]},
        {"name": "아빠", "aliases": ["아빠", "아버지"]},
    ],
}

CSV_FIELDS = ["date", "time", "person", "category", "duration_min", "raw_input"]


def load_family(path: Path) -> dict:
    """family.json 로드. 없으면 기본값으로 생성."""
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    # 첫 실행 시 자동 생성. 사용자가 직접 수정하라고 표준 출력에 안내.
    path.write_text(
        json.dumps(DEFAULT_FAMILY, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(
        f"[알림] {path} 가 없어서 기본 가족 설정으로 생성했음. "
        "자기 가족에 맞게 수정하면 더 정확하게 인식됨.",
        file=sys.stderr,
    )
    return DEFAULT_FAMILY


def detect_person(text: str, family: dict) -> str:
    """텍스트에서 담당자 한 명 찾기.

    가족 구성원 별칭 매칭이 1인칭보다 우선 (구체적인 이름이 더 강한 신호).
    아무것도 못 찾으면 self_name 반환.
    """
    for member in family["members"]:
        for alias in member["aliases"]:
            if alias in text:
                return member["name"]
    for alias in family["self_aliases"]:
        if alias in text:
            return family["self_name"]
    return family["self_name"]


def detect_chores(text: str) -> list:
    """텍스트에 매칭되는 모든 카테고리를 순서대로 리스트로 반환.

    한 카테고리는 한 번만 추가 (같은 카테고리 키워드가 여러 개여도 중복 X).
    아무것도 못 찾으면 '기타' 한 건 반환.
    """
    found = []
    seen = set()
    for cat, info in CATEGORIES.items():
        for kw in info["keywords"]:
            if kw in text and cat not in seen:
                found.append({
                    "category": cat,
                    "default_minutes": info["default_minutes"],
                })
                seen.add(cat)
                break
    if not found:
        found.append({"category": "기타", "default_minutes": 15})
    return found


def detect_duration(text: str):
    """텍스트에서 명시된 소요시간(분 단위) 추출. 없으면 None.

    "30분", "1시간", "1시간 30분" 모두 처리.
    """
    hours = 0
    minutes = 0
    h_match = re.search(r"(\d+)\s*시간", text)
    m_match = re.search(r"(\d+)\s*분", text)
    if h_match:
        hours = int(h_match.group(1))
    if m_match:
        minutes = int(m_match.group(1))
    total = hours * 60 + minutes
    return total if total > 0 else None


def detect_date(text: str) -> date:
    """텍스트에서 날짜 키워드 추출. 기본은 오늘."""
    today = date.today()
    if "그제" in text or "그저께" in text:
        return today - timedelta(days=2)
    if "어제" in text:
        return today - timedelta(days=1)
    return today


def parse(text: str, family: dict) -> list:
    """입력 텍스트 → entry 리스트.

    한 문장에 카테고리가 여러 개면 entry도 여러 개.
    명시적 소요시간이 있으면 모든 entry에 동일하게 적용 (단순화).
    """
    person = detect_person(text, family)
    chores = detect_chores(text)
    explicit_duration = detect_duration(text)
    log_date = detect_date(text)
    now_time = datetime.now().strftime("%H:%M")

    entries = []
    for chore in chores:
        duration = explicit_duration if explicit_duration else chore["default_minutes"]
        entries.append({
            "date": log_date.isoformat(),
            "time": now_time,
            "person": person,
            "category": chore["category"],
            "duration_min": duration,
            "raw_input": text,
        })
    return entries


def append_log(entries: list, log_path: Path) -> None:
    """CSV에 append. 파일 없으면 헤더부터 작성."""
    new_file = not log_path.exists()
    with log_path.open("a", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        if new_file:
            writer.writeheader()
        for e in entries:
            writer.writerow(e)


def format_summary(entries: list) -> str:
    """사람이 읽기 쉬운 콘솔 요약."""
    lines = [f"기록 완료: {len(entries)}건"]
    for e in entries:
        lines.append(
            f"  - {e['date']} {e['time']} | {e['person']} | "
            f"{e['category']} | {e['duration_min']}분"
        )
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="자연어 집안일 기록기. 'X가 Y 했다' → CSV 로그.",
    )
    parser.add_argument(
        "text",
        nargs="?",
        help="기록할 자연어 입력. 생략하면 stdin에서 읽음.",
    )
    parser.add_argument(
        "--log",
        default="chore_log.csv",
        help="로그 파일 경로 (기본값: ./chore_log.csv)",
    )
    parser.add_argument(
        "--family",
        default="family.json",
        help="가족 설정 파일 경로 (기본값: ./family.json)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="기록하지 않고 파싱 결과만 JSON으로 출력",
    )
    args = parser.parse_args()

    text = args.text if args.text else sys.stdin.read().strip()
    if not text:
        print("입력 없음. 자연어 문장을 인자나 stdin으로 넘기세요.", file=sys.stderr)
        sys.exit(1)

    try:
        family = load_family(Path(args.family))
    except (json.JSONDecodeError, OSError) as e:
        print(f"가족 설정 로드 실패: {e}", file=sys.stderr)
        sys.exit(2)

    entries = parse(text, family)

    if args.dry_run:
        print(json.dumps(entries, ensure_ascii=False, indent=2))
        return

    try:
        append_log(entries, Path(args.log))
    except OSError as e:
        print(f"로그 파일 쓰기 실패: {e}", file=sys.stderr)
        sys.exit(3)

    print(format_summary(entries))


if __name__ == "__main__":
    main()
