"""household-checklist - 가구 조건에 맞춰 인터랙티브 HTML 체크리스트 생성.

사용 예:
    from generate_checklist import build_checklist
    html = build_checklist({
        "size": "single",
        "dual_income": False,
        "pet": ["dog"],
        "plant": True,
        "child": False,
    })

CLI 사용:
    python generate_checklist.py --config config.json --output checklist.html
"""

from __future__ import annotations

import argparse
import json
import html
from pathlib import Path

try:
    # 패키지 형태로 import 됐을 때
    from .templates import CATEGORY_TEMPLATES, PERIODS, PERIOD_LABELS
except ImportError:
    # 단독 스크립트로 실행될 때
    from templates import CATEGORY_TEMPLATES, PERIODS, PERIOD_LABELS


def resolve_categories(config: dict) -> list[str]:
    """config에서 활성화할 카테고리 키 리스트 산출.

    Why: 사용자가 입력한 가구 형태에 따라 어떤 템플릿 묶음을 합칠지 결정.
    공통(common)은 항상 포함.
    """
    cats = ["common"]

    size = config.get("size", "single")
    if size == "single":
        cats.append("single")
    elif size == "couple":
        cats.append("couple")
    elif size == "family":
        # family면 child도 자동 추가 (config.child=False여도 가구는 가족형)
        cats.append("couple")
        if config.get("child", True):
            cats.append("child")

    if config.get("dual_income"):
        cats.append("dual_income")

    if config.get("child") and "child" not in cats:
        cats.append("child")

    pets = config.get("pet", []) or []
    for p in pets:
        key = f"pet_{p}"
        if key in CATEGORY_TEMPLATES:
            cats.append(key)
        else:
            # 알 수 없는 종은 other로 매핑
            if "pet_other" not in cats:
                cats.append("pet_other")

    if config.get("plant"):
        cats.append("plant")

    # 중복 제거 (순서 유지)
    seen = set()
    return [c for c in cats if not (c in seen or seen.add(c))]


def collect_items(categories: list[str], excluded_ids: set[str]) -> dict:
    """주기별로 항목 모으기. excluded_ids는 빼기."""
    result = {p: [] for p in PERIODS}
    for cat in categories:
        tmpl = CATEGORY_TEMPLATES.get(cat, {})
        for period in PERIODS:
            for item in tmpl.get(period, []):
                if item["id"] in excluded_ids:
                    continue
                result[period].append(item)
    return result


def render_html(items_by_period: dict, config: dict) -> str:
    """인터랙티브 HTML 생성. localStorage 미사용 (in-memory only)."""

    # 헤더 정보
    summary_parts = []
    size_label = {"single": "1인 가구", "couple": "2인 가구", "family": "가족"}.get(
        config.get("size", "single"), "가구"
    )
    summary_parts.append(size_label)
    if config.get("dual_income"):
        summary_parts.append("맞벌이")
    if config.get("child"):
        summary_parts.append("아이 있음")
    pets = config.get("pet", []) or []
    if pets:
        pet_label = {"dog": "강아지", "cat": "고양이", "other": "기타 반려동물"}
        summary_parts.append("반려: " + ", ".join(pet_label.get(p, p) for p in pets))
    if config.get("plant"):
        summary_parts.append("식물")
    header_summary = " · ".join(summary_parts)

    total_items = sum(len(v) for v in items_by_period.values())
    daily_count = len(items_by_period["daily"])

    # 섹션 HTML 생성
    sections_html = []
    for period in PERIODS:
        items = items_by_period[period]
        if not items:
            continue
        label = PERIOD_LABELS[period]
        rows = []
        for it in items:
            iid = html.escape(it["id"])
            name = html.escape(it["name"])
            cat = html.escape(it["category"])
            rows.append(
                f'<li class="item" data-id="{iid}" data-period="{period}">'
                f'<label><input type="checkbox" class="chk" data-period="{period}"> '
                f'<span class="name">{name}</span></label>'
                f'<span class="tag">{cat}</span>'
                f'<button class="remove" title="이 항목 빼기">×</button>'
                f"</li>"
            )
        sections_html.append(
            f'<section class="period" data-period="{period}">'
            f'<h2>{label} <span class="count" id="count-{period}">0/{len(items)}</span></h2>'
            f'<ul class="list">{"".join(rows)}</ul>'
            f"</section>"
        )

    sections = "\n".join(sections_html)

    # 단일 HTML 파일 (CSS/JS 인라인)
    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>집안일 체크리스트 · {html.escape(header_summary)}</title>
<style>
  * {{ box-sizing: border-box; }}
  body {{
    font-family: -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
    max-width: 720px; margin: 0 auto; padding: 24px;
    background: #fafaf7; color: #222; line-height: 1.5;
  }}
  header {{
    background: #fff; padding: 20px; border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 20px;
  }}
  h1 {{ margin: 0 0 8px; font-size: 22px; }}
  .summary {{ color: #666; font-size: 14px; margin-bottom: 12px; }}
  .progress-wrap {{ background: #eee; border-radius: 8px; height: 12px; overflow: hidden; }}
  .progress-bar {{ height: 100%; background: linear-gradient(90deg, #6ab04c, #badc58); width: 0; transition: width 0.3s; }}
  .progress-label {{ font-size: 13px; color: #555; margin-top: 6px; }}
  section.period {{
    background: #fff; padding: 16px 20px; border-radius: 12px;
    margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }}
  section.period h2 {{
    font-size: 16px; margin: 0 0 12px; display: flex; justify-content: space-between;
    align-items: center; border-bottom: 1px solid #eee; padding-bottom: 8px;
  }}
  .count {{ font-size: 13px; color: #888; font-weight: normal; }}
  ul.list {{ list-style: none; padding: 0; margin: 0; }}
  li.item {{
    display: flex; align-items: center; padding: 8px 0;
    border-bottom: 1px solid #f3f3f3;
  }}
  li.item:last-child {{ border-bottom: none; }}
  li.item label {{ flex: 1; cursor: pointer; user-select: none; }}
  li.item.done .name {{ color: #aaa; text-decoration: line-through; }}
  .chk {{ width: 18px; height: 18px; margin-right: 8px; vertical-align: middle; }}
  .tag {{
    font-size: 11px; background: #eef3ee; color: #4a7a4a;
    padding: 2px 8px; border-radius: 10px; margin-left: 8px;
  }}
  .remove {{
    background: none; border: none; color: #c44; font-size: 18px;
    cursor: pointer; padding: 0 6px; margin-left: 4px; line-height: 1;
  }}
  .remove:hover {{ color: #a00; }}
  li.item.removed {{ display: none; }}
  footer {{
    text-align: center; color: #999; font-size: 12px; margin-top: 20px;
  }}
  .reset-btn {{
    background: #fff; border: 1px solid #ccc; padding: 6px 14px;
    border-radius: 6px; cursor: pointer; font-size: 13px;
  }}
  .reset-btn:hover {{ background: #f5f5f5; }}
</style>
</head>
<body>
  <header>
    <h1>집안일 체크리스트</h1>
    <div class="summary">{html.escape(header_summary)} · 매일 {daily_count}개 / 총 {total_items}개</div>
    <div class="progress-wrap"><div class="progress-bar" id="progressBar"></div></div>
    <div class="progress-label" id="progressLabel">오늘 진행률 0/{daily_count}</div>
  </header>

  {sections}

  <footer>
    <button class="reset-btn" onclick="resetAll()">전체 체크 해제</button>
    <p>× 버튼으로 안 하는 항목 빼기 · 새로고침 시 체크 초기화</p>
  </footer>

<script>
  // 진행률 계산: 매일(daily) 항목 기준 (오늘 할 일 진행률)
  function updateProgress() {{
    const dailyChks = document.querySelectorAll('section[data-period="daily"] li.item:not(.removed) .chk');
    const total = dailyChks.length;
    let done = 0;
    dailyChks.forEach(c => {{ if (c.checked) done++; }});
    const pct = total === 0 ? 0 : (done / total) * 100;
    document.getElementById('progressBar').style.width = pct + '%';
    document.getElementById('progressLabel').textContent = `오늘 진행률 ${{done}}/${{total}}`;

    // 각 섹션별 카운트도 업데이트
    document.querySelectorAll('section.period').forEach(sec => {{
      const period = sec.dataset.period;
      const items = sec.querySelectorAll('li.item:not(.removed)');
      const checked = sec.querySelectorAll('li.item:not(.removed) .chk:checked');
      const el = document.getElementById('count-' + period);
      if (el) el.textContent = checked.length + '/' + items.length;
    }});
  }}

  // 체크 변화 감지
  document.querySelectorAll('.chk').forEach(c => {{
    c.addEventListener('change', e => {{
      const li = e.target.closest('li.item');
      if (e.target.checked) li.classList.add('done');
      else li.classList.remove('done');
      updateProgress();
    }});
  }});

  // × 버튼: 항목 빼기 (DOM에서 숨김 처리)
  document.querySelectorAll('.remove').forEach(b => {{
    b.addEventListener('click', e => {{
      const li = e.target.closest('li.item');
      if (confirm(`"${{li.querySelector('.name').textContent}}" 항목을 빼시겠어요?`)) {{
        li.classList.add('removed');
        updateProgress();
      }}
    }});
  }});

  function resetAll() {{
    document.querySelectorAll('.chk').forEach(c => {{
      c.checked = false;
      const li = c.closest('li.item');
      if (li) li.classList.remove('done');
    }});
    updateProgress();
  }}

  updateProgress();
</script>
</body>
</html>
"""


def build_checklist(config: dict) -> str:
    """메인 함수: config dict 받아 HTML 문자열 반환."""
    excluded = set(config.get("excluded_ids") or [])
    cats = resolve_categories(config)
    items = collect_items(cats, excluded)
    return render_html(items, config)


def main():
    parser = argparse.ArgumentParser(description="가구 조건에 맞는 집안일 체크리스트 HTML 생성")
    parser.add_argument("--config", type=str, help="config JSON 파일 경로")
    parser.add_argument("--output", type=str, default="checklist.html", help="출력 HTML 파일 경로")
    parser.add_argument("--size", choices=["single", "couple", "family"], help="가구 인원")
    parser.add_argument("--dual-income", action="store_true", help="맞벌이 여부")
    parser.add_argument("--child", action="store_true", help="아이 있음")
    parser.add_argument("--pet", nargs="*", default=[], help="반려동물 (dog/cat/other 가능)")
    parser.add_argument("--plant", action="store_true", help="식물 키움")
    args = parser.parse_args()

    if args.config:
        config = json.loads(Path(args.config).read_text(encoding="utf-8"))
    else:
        config = {
            "size": args.size or "single",
            "dual_income": args.dual_income,
            "child": args.child,
            "pet": args.pet,
            "plant": args.plant,
        }

    html_str = build_checklist(config)
    out_path = Path(args.output)
    out_path.write_text(html_str, encoding="utf-8")
    print(f"체크리스트 생성 완료: {out_path.resolve()}")


if __name__ == "__main__":
    main()
