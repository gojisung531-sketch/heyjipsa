"""
voice-to-todo 진입점 스크립트
입력 텍스트를 받아 TODO.md 에 append 하고 마크다운 결과를 출력한다.

사용법:
    python add_todo.py "엄마 생신 선물 준비, 금요일까지 보고서 제출"
    python add_todo.py --file input.txt
    python add_todo.py --todo-path ./TODO.md "휴지 사야 돼"
"""

import argparse
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

from parser import parse_batch, Todo

CATEGORY_ORDER = ["업무", "장보기", "집안일", "경조사", "기타"]


def read_existing(todo_path: Path) -> list[Todo]:
    """기존 TODO.md 를 읽어 Todo 리스트로 복원. 없으면 빈 리스트."""
    if not todo_path.exists():
        return []

    text = todo_path.read_text(encoding="utf-8")
    todos: list[Todo] = []
    current_cat = "기타"
    # 형식: "## 카테고리" 헤더 아래 "- [ ] 항목 (우선순위[, ~기한])"
    line_pattern = re.compile(
        r"^- \[[ x]\] (?P<item>.+?)\s*\((?P<priority>[상중하])(?:,\s*~(?P<deadline>.+?))?\)\s*$"
    )

    for line in text.splitlines():
        line = line.rstrip()
        if line.startswith("## "):
            current_cat = line[3:].strip()
            continue
        m = line_pattern.match(line)
        if m:
            todos.append(Todo(
                category=current_cat,
                item=m.group("item").strip(),
                priority=m.group("priority"),
                deadline=m.group("deadline"),
                raw=line,
            ))
    return todos


def dedupe_and_merge(existing: list[Todo], new: list[Todo]) -> tuple[list[Todo], list[Todo]]:
    """중복(같은 카테고리·항목명) 제거. (병합된 전체, 실제로 추가된 새 항목) 반환."""
    seen = {(t.category, t.item) for t in existing}
    actually_added: list[Todo] = []
    for t in new:
        key = (t.category, t.item)
        if key in seen:
            continue
        seen.add(key)
        existing.append(t)
        actually_added.append(t)
    return existing, actually_added


def render_markdown(all_todos: list[Todo]) -> str:
    """카테고리별 그룹 마크다운."""
    grouped: dict[str, list[Todo]] = defaultdict(list)
    for t in all_todos:
        grouped[t.category].append(t)

    out_lines = ["# 할 일 리스트\n"]
    for cat in CATEGORY_ORDER:
        if cat not in grouped:
            continue
        out_lines.append(f"## {cat}")
        # 우선순위 상→중→하 정렬
        prio_rank = {"상": 0, "중": 1, "하": 2}
        items = sorted(grouped[cat], key=lambda x: prio_rank.get(x.priority, 1))
        for t in items:
            tail = t.priority
            if t.deadline:
                tail += f", ~{t.deadline}"
            out_lines.append(f"- [ ] {t.item} ({tail})")
        out_lines.append("")
    return "\n".join(out_lines).rstrip() + "\n"


def render_added_table(added: list[Todo]) -> str:
    """새로 추가된 항목 테이블."""
    if not added:
        return "(추가된 항목 없음 — 모두 중복이거나 입력이 비어있음)"
    lines = [
        "| 카테고리 | 항목 | 우선순위 | 기한 |",
        "|---------|------|---------|------|",
    ]
    for t in added:
        lines.append(
            f"| {t.category} | {t.item} | {t.priority} | {t.deadline or '-'} |"
        )
    return "\n".join(lines)


def main():
    p = argparse.ArgumentParser(description="음성/텍스트 → 할 일 리스트")
    p.add_argument("text", nargs="?", default="", help="할 일 텍스트(여러 줄 가능)")
    p.add_argument("--file", "-f", help="텍스트 파일에서 읽기")
    p.add_argument(
        "--todo-path", "-t",
        default="TODO.md",
        help="할 일 리스트 파일 경로 (기본 ./TODO.md)",
    )
    p.add_argument("--dry-run", action="store_true", help="파일 안 쓰고 결과만 출력")
    args = p.parse_args()

    if args.file:
        text = Path(args.file).read_text(encoding="utf-8")
    elif args.text:
        text = args.text
    else:
        text = sys.stdin.read()

    if not text.strip():
        print("추가할 할 일을 알려주세요.")
        sys.exit(0)

    todo_path = Path(args.todo_path)
    existing = read_existing(todo_path)
    new_todos = parse_batch(text)

    merged, added = dedupe_and_merge(existing, new_todos)

    print("## 새로 추가된 항목")
    print(render_added_table(added))
    print()
    print("## 전체 리스트(카테고리별)")
    print(render_markdown(merged))

    if not args.dry_run:
        # 손상된 파일이 있을 가능성에 대비해 백업
        if todo_path.exists():
            backup = todo_path.with_suffix(".bak.md")
            backup.write_text(todo_path.read_text(encoding="utf-8"), encoding="utf-8")
        todo_path.write_text(render_markdown(merged), encoding="utf-8")
        print(f"\n저장 완료: {todo_path.resolve()}")


if __name__ == "__main__":
    main()
