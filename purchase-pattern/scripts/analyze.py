#!/usr/bin/env python3
"""
Purchase Pattern Analyzer
구매 기록 파일(xlsx/csv/md) 여러 개를 읽어 품목별 패턴을 분석하고
HTML 리포트 + 마크다운 표를 생성한다.

사용:
    python analyze.py --input file1.csv file2.xlsx --output report.html
    python analyze.py --input-dir ./receipts --output report.html
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Iterable

import pandas as pd

# ---- 컬럼명 자동 감지 사전 (한/영 혼용) ----
COLUMN_ALIASES = {
    "date":  ["date", "날짜", "구매일", "일자", "purchased_at", "구매일자", "purchase_date"],
    "name":  ["item", "name", "품목", "상품명", "product", "물품", "상품"],
    "price": ["price", "가격", "금액", "amount", "total", "단가", "총액"],
    "qty":   ["qty", "quantity", "수량", "개수", "count"],
    "category": ["category", "카테고리", "분류", "종류"],
}


def detect_column(df: pd.DataFrame, key: str) -> str | None:
    """컬럼명 후보 중 매칭되는 첫 번째 컬럼 반환."""
    aliases = COLUMN_ALIASES[key]
    cols_lower = {c.lower().strip(): c for c in df.columns}
    for alias in aliases:
        if alias.lower() in cols_lower:
            return cols_lower[alias.lower()]
    return None


def read_markdown_table(path: Path) -> pd.DataFrame:
    """GitHub 형식 마크다운 표를 DataFrame으로 파싱."""
    text = path.read_text(encoding="utf-8")
    lines = [l.strip() for l in text.splitlines() if l.strip().startswith("|")]
    if len(lines) < 2:
        return pd.DataFrame()

    # 헤더, 구분선, 데이터
    header = [c.strip() for c in lines[0].strip("|").split("|")]
    rows = []
    for line in lines[2:]:  # 0=헤더, 1=구분선
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) == len(header):
            rows.append(cells)
    return pd.DataFrame(rows, columns=header)


def read_one(path: Path) -> pd.DataFrame:
    """파일 한 개를 DataFrame으로."""
    suffix = path.suffix.lower()
    try:
        if suffix == ".csv":
            return pd.read_csv(path)
        if suffix in (".xlsx", ".xls", ".xlsm"):
            return pd.read_excel(path)
        if suffix in (".md", ".markdown"):
            return read_markdown_table(path)
    except Exception as e:
        print(f"  [경고] {path.name} 읽기 실패: {e}", file=sys.stderr)
        return pd.DataFrame()
    print(f"  [경고] {path.name} - 지원하지 않는 형식 ({suffix})", file=sys.stderr)
    return pd.DataFrame()


def collect_files(inputs: list[str], input_dir: str | None) -> list[Path]:
    files: list[Path] = []
    if inputs:
        files.extend(Path(p) for p in inputs)
    if input_dir:
        d = Path(input_dir)
        if d.is_dir():
            for ext in ("*.csv", "*.xlsx", "*.xls", "*.xlsm", "*.md", "*.markdown"):
                files.extend(d.glob(ext))
    # 중복 제거, 존재하는 것만
    seen, result = set(), []
    for f in files:
        if f.exists() and f not in seen:
            seen.add(f)
            result.append(f)
    return result


def normalize_item_name(name: str) -> str:
    """
    품목명 정규화: 같은 물건이지만 표기가 다른 경우 묶기 위함.
    공백 통일, 소문자, 일부 특수문자 제거. 브랜드/단위는 보존.
    """
    if not isinstance(name, str):
        return ""
    s = name.strip().lower()
    # 한글-숫자/영문 사이 공백 일관성: "휴지30롤" -> "휴지 30롤"
    s = re.sub(r"([가-힣])(\d)", r"\1 \2", s)
    s = re.sub(r"(\d)([가-힣])", r"\1 \2", s)
    # 단위 표기 통일
    s = s.replace("리터", "l").replace("미리리터", "ml")
    # 다중 공백 -> 단일
    s = re.sub(r"\s+", " ", s)
    # 양끝 특수문자 트림
    s = s.strip(" .,-_/()[]{}")
    return s


def load_records(
    files: list[Path],
    name_col: str | None,
    date_col: str | None,
    price_col: str | None,
    qty_col: str | None,
    normalize: bool,
) -> pd.DataFrame:
    """모든 파일을 읽어 표준 스키마(date, item, price, qty, category?)로 통합."""
    frames = []
    for f in files:
        print(f"  읽는 중: {f.name}", file=sys.stderr)
        df = read_one(f)
        if df.empty:
            continue

        # 컬럼 감지
        nc = name_col or detect_column(df, "name")
        dc = date_col or detect_column(df, "date")
        pc = price_col or detect_column(df, "price")
        qc = qty_col  or detect_column(df, "qty")
        cc = detect_column(df, "category")

        if not nc or not dc or not pc:
            print(f"  [경고] {f.name} - 필수 컬럼(date/name/price) 못 찾음. 스킵.",
                  file=sys.stderr)
            continue

        std = pd.DataFrame({
            "date_raw": df[dc],
            "item_raw": df[nc].astype(str),
            "price_raw": df[pc],
            "qty_raw": df[qc] if qc and qc in df.columns else 1,
        })
        if cc:
            std["category"] = df[cc].astype(str)
        else:
            std["category"] = ""

        frames.append(std)

    if not frames:
        return pd.DataFrame()

    df = pd.concat(frames, ignore_index=True)

    # 타입 변환
    df["date"] = pd.to_datetime(df["date_raw"], errors="coerce")
    df["price"] = pd.to_numeric(
        df["price_raw"].astype(str).str.replace(r"[^\d.\-]", "", regex=True),
        errors="coerce",
    )
    df["qty"] = pd.to_numeric(df["qty_raw"], errors="coerce").fillna(1)

    df["item_norm"] = df["item_raw"].map(normalize_item_name) if normalize else df["item_raw"]
    df["item_display"] = df["item_raw"].astype(str).str.strip()

    # 무효 행 제거
    bad = df["date"].isna() | df["price"].isna() | (df["item_norm"] == "")
    if bad.any():
        print(f"  [경고] 파싱 실패 {bad.sum()}건 제외", file=sys.stderr)
    df = df[~bad].reset_index(drop=True)

    return df[["date", "item_norm", "item_display", "price", "qty", "category"]]


def analyze(df: pd.DataFrame, min_count: int, top: int) -> pd.DataFrame:
    """품목별 집계."""
    if df.empty:
        return df

    today = pd.Timestamp(datetime.now().date())
    rows = []
    for item, g in df.groupby("item_norm"):
        g = g.sort_values("date")
        count = len(g)
        if count < min_count:
            continue
        total_spend = float((g["price"] * g["qty"]).sum())
        avg_price = float(g["price"].mean())
        last_date = g["date"].max()
        first_date = g["date"].min()

        if count >= 2:
            diffs = g["date"].diff().dt.days.dropna()
            avg_cycle_days = float(diffs.mean())
            next_date = last_date + timedelta(days=round(avg_cycle_days))
        else:
            avg_cycle_days = None
            next_date = None

        # 표시용 이름은 가장 자주 등장한 원본
        display = g["item_display"].mode().iat[0] if not g["item_display"].mode().empty else item
        category = g["category"].mode().iat[0] if not g["category"].mode().empty else ""

        rows.append({
            "item": display,
            "item_norm": item,
            "category": category,
            "count": count,
            "avg_cycle_days": avg_cycle_days,
            "avg_price": avg_price,
            "total_spend": total_spend,
            "first_date": first_date,
            "last_date": last_date,
            "next_date": next_date,
            "days_until_next": (next_date - today).days if next_date is not None else None,
        })

    result = pd.DataFrame(rows)
    if result.empty:
        return result
    result = result.sort_values(["count", "total_spend"], ascending=False).head(top)
    return result.reset_index(drop=True)


def fmt_won(v: float) -> str:
    return f"{int(round(v)):,}원"


def fmt_cycle(days: float | None) -> str:
    if days is None or pd.isna(days):
        return "-"
    if days < 14:
        return f"{round(days)}일"
    weeks = days / 7
    return f"{round(days)}일 ({weeks:.1f}주)"


def fmt_date(d) -> str:
    if d is None or pd.isna(d):
        return "-"
    return pd.Timestamp(d).strftime("%Y-%m-%d")


def to_markdown_table(result: pd.DataFrame) -> str:
    if result.empty:
        return "_분석할 데이터가 없습니다._"
    lines = [
        "| 품목 | 횟수 | 평균 주기 | 평균 단가 | 총 지출 | 다음 예상일 |",
        "|---|---|---|---|---|---|",
    ]
    for _, r in result.iterrows():
        lines.append(
            f"| {r['item']} | {int(r['count'])} | {fmt_cycle(r['avg_cycle_days'])} "
            f"| {fmt_won(r['avg_price'])} | {fmt_won(r['total_spend'])} "
            f"| {fmt_date(r['next_date'])} |"
        )
    return "\n".join(lines)


def build_html(result: pd.DataFrame, raw: pd.DataFrame, output_path: Path) -> None:
    """단일 HTML 파일 생성. Chart.js는 CDN."""
    if result.empty:
        output_path.write_text(
            "<html><body><h1>분석할 데이터가 없습니다.</h1></body></html>",
            encoding="utf-8",
        )
        return

    today = datetime.now().date()
    total_spend = float((raw["price"] * raw["qty"]).sum())
    period_start = raw["date"].min().strftime("%Y-%m-%d")
    period_end = raw["date"].max().strftime("%Y-%m-%d")
    n_tx = len(raw)
    n_items = raw["item_norm"].nunique()

    # 월별 지출
    tmp = raw.assign(
        month=raw["date"].dt.to_period("M").astype(str),
        spend=raw["price"] * raw["qty"],
    )
    monthly = tmp.groupby("month")["spend"].sum().sort_index()
    monthly_labels = list(monthly.index)
    monthly_values = [round(v) for v in monthly.values]
    avg_monthly = round(sum(monthly_values) / len(monthly_values)) if monthly_values else 0

    # 품목별 지출 도넛 (top 10)
    top10 = result.head(10)
    donut_labels = top10["item"].tolist()
    donut_values = [round(v) for v in top10["total_spend"].tolist()]

    # 표 데이터
    table_rows = []
    for _, r in result.iterrows():
        row_class = ""
        if r["days_until_next"] is not None and not pd.isna(r["days_until_next"]):
            d = int(r["days_until_next"])
            if d < 0:
                row_class = "overdue"
            elif d <= 7:
                row_class = "soon"
        table_rows.append({
            "item": r["item"],
            "category": r["category"] or "-",
            "count": int(r["count"]),
            "cycle": fmt_cycle(r["avg_cycle_days"]),
            "avg_price": fmt_won(r["avg_price"]),
            "total": fmt_won(r["total_spend"]),
            "last": fmt_date(r["last_date"]),
            "next": fmt_date(r["next_date"]),
            "days_until": (
                f"{int(r['days_until_next'])}일 후"
                if r["days_until_next"] is not None and not pd.isna(r["days_until_next"]) and int(r["days_until_next"]) >= 0
                else (f"{abs(int(r['days_until_next']))}일 지남" if r["days_until_next"] is not None and not pd.isna(r["days_until_next"]) else "-")
            ),
            "row_class": row_class,
        })

    html = HTML_TEMPLATE.format(
        generated=today.isoformat(),
        total_spend=fmt_won(total_spend),
        avg_monthly=fmt_won(avg_monthly) if avg_monthly else "-",
        period=f"{period_start} ~ {period_end}",
        n_tx=n_tx,
        n_items=n_items,
        monthly_labels=json.dumps(monthly_labels, ensure_ascii=False),
        monthly_values=json.dumps(monthly_values),
        donut_labels=json.dumps(donut_labels, ensure_ascii=False),
        donut_values=json.dumps(donut_values),
        table_rows_json=json.dumps(table_rows, ensure_ascii=False),
    )
    output_path.write_text(html, encoding="utf-8")


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>구매 패턴 리포트</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
  * {{ box-sizing: border-box; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif;
         margin: 0; padding: 24px; background: #fafafa; color: #222; }}
  h1 {{ margin: 0 0 4px; font-size: 28px; }}
  .sub {{ color: #777; margin-bottom: 24px; }}
  .kpi {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
         gap: 12px; margin-bottom: 24px; }}
  .kpi .card {{ background: white; padding: 16px 20px; border-radius: 12px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.06); }}
  .kpi .label {{ font-size: 12px; color: #888; }}
  .kpi .value {{ font-size: 22px; font-weight: 700; margin-top: 4px; }}
  .charts {{ display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 24px; }}
  @media (max-width: 800px) {{ .charts {{ grid-template-columns: 1fr; }} }}
  .chart-card {{ background: white; padding: 16px; border-radius: 12px;
                 box-shadow: 0 1px 3px rgba(0,0,0,0.06); }}
  .chart-card h3 {{ margin: 0 0 12px; font-size: 14px; color: #555; }}
  table {{ width: 100%; background: white; border-collapse: collapse; border-radius: 12px;
          overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }}
  th, td {{ padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }}
  th {{ background: #f4f4f4; cursor: pointer; user-select: none; }}
  th:hover {{ background: #e9e9e9; }}
  tr.soon {{ background: #fff8db; }}
  tr.overdue {{ background: #ffe5e5; }}
  .legend {{ font-size: 12px; color: #777; margin-top: 8px; }}
  .legend .dot {{ display: inline-block; width: 10px; height: 10px; border-radius: 50%;
                  vertical-align: middle; margin-right: 6px; }}
</style>
</head>
<body>

<h1>구매 패턴 리포트</h1>
<div class="sub">생성일: {generated} · 분석 기간: {period}</div>

<div class="kpi">
  <div class="card"><div class="label">총 지출</div><div class="value">{total_spend}</div></div>
  <div class="card"><div class="label">월 평균 지출</div><div class="value">{avg_monthly}</div></div>
  <div class="card"><div class="label">분석된 거래</div><div class="value">{n_tx}건</div></div>
  <div class="card"><div class="label">고유 품목</div><div class="value">{n_items}개</div></div>
</div>

<div class="charts">
  <div class="chart-card">
    <h3>월별 총 지출</h3>
    <canvas id="monthlyChart" height="120"></canvas>
  </div>
  <div class="chart-card">
    <h3>품목별 지출 비중 (TOP 10)</h3>
    <canvas id="donutChart" height="200"></canvas>
  </div>
</div>

<div class="legend">
  <span class="dot" style="background:#fff8db;border:1px solid #e0c000"></span>다음 예상일 7일 이내
  &nbsp;&nbsp;
  <span class="dot" style="background:#ffe5e5;border:1px solid #d33"></span>이미 지남
</div>

<table id="mainTable">
  <thead>
    <tr>
      <th data-key="item">품목</th>
      <th data-key="category">카테고리</th>
      <th data-key="count">횟수</th>
      <th data-key="cycle">평균 주기</th>
      <th data-key="avg_price">평균 단가</th>
      <th data-key="total">총 지출</th>
      <th data-key="last">마지막</th>
      <th data-key="next">다음 예상</th>
      <th data-key="days_until">D-day</th>
    </tr>
  </thead>
  <tbody id="tbody"></tbody>
</table>

<script>
const monthlyLabels = {monthly_labels};
const monthlyValues = {monthly_values};
const donutLabels = {donut_labels};
const donutValues = {donut_values};
const rows = {table_rows_json};

// 월별 막대
new Chart(document.getElementById('monthlyChart'), {{
  type: 'bar',
  data: {{
    labels: monthlyLabels,
    datasets: [{{ label: '월 지출(원)', data: monthlyValues, backgroundColor: '#4e79a7' }}]
  }},
  options: {{ plugins: {{ legend: {{ display: false }} }}, scales: {{ y: {{ beginAtZero: true }} }} }}
}});

// 도넛
new Chart(document.getElementById('donutChart'), {{
  type: 'doughnut',
  data: {{
    labels: donutLabels,
    datasets: [{{ data: donutValues,
      backgroundColor: ['#4e79a7','#f28e2c','#e15759','#76b7b2','#59a14f',
                        '#edc949','#af7aa1','#ff9da7','#9c755f','#bab0ab'] }}]
  }},
  options: {{ plugins: {{ legend: {{ position: 'right', labels: {{ font: {{ size: 11 }} }} }} }} }}
}});

// 표 렌더 + 정렬
function render(arr) {{
  const tb = document.getElementById('tbody');
  tb.innerHTML = arr.map(r => `
    <tr class="${{r.row_class}}">
      <td>${{r.item}}</td>
      <td>${{r.category}}</td>
      <td>${{r.count}}</td>
      <td>${{r.cycle}}</td>
      <td>${{r.avg_price}}</td>
      <td>${{r.total}}</td>
      <td>${{r.last}}</td>
      <td>${{r.next}}</td>
      <td>${{r.days_until}}</td>
    </tr>`).join('');
}}
render(rows);

let sortKey = null, sortAsc = true;
document.querySelectorAll('th').forEach(th => {{
  th.addEventListener('click', () => {{
    const key = th.dataset.key;
    if (sortKey === key) sortAsc = !sortAsc; else {{ sortKey = key; sortAsc = true; }}
    const sorted = [...rows].sort((a, b) => {{
      const av = a[key], bv = b[key];
      const an = parseFloat(String(av).replace(/[^0-9.\\-]/g, ''));
      const bn = parseFloat(String(bv).replace(/[^0-9.\\-]/g, ''));
      let cmp;
      if (!isNaN(an) && !isNaN(bn)) cmp = an - bn;
      else cmp = String(av).localeCompare(String(bv), 'ko');
      return sortAsc ? cmp : -cmp;
    }});
    render(sorted);
  }});
}});
</script>

</body>
</html>
"""


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="누적 구매 기록 패턴 분석")
    p.add_argument("--input", nargs="*", default=[], help="분석할 파일들")
    p.add_argument("--input-dir", default=None, help="분석할 폴더")
    p.add_argument("--output", default="report.html", help="HTML 리포트 저장 경로")
    p.add_argument("--min-count", type=int, default=2, help="최소 구매 횟수 (이하면 제외)")
    p.add_argument("--top", type=int, default=30, help="상위 N개")
    p.add_argument("--no-normalize", action="store_true", help="품목명 정규화 끄기")
    p.add_argument("--name-col", default=None)
    p.add_argument("--date-col", default=None)
    p.add_argument("--price-col", default=None)
    p.add_argument("--qty-col", default=None)
    args = p.parse_args(argv)

    files = collect_files(args.input, args.input_dir)
    if not files:
        print("입력 파일을 찾지 못했습니다. --input 또는 --input-dir 확인.", file=sys.stderr)
        return 1

    print(f"분석할 파일: {len(files)}개", file=sys.stderr)
    raw = load_records(
        files,
        name_col=args.name_col,
        date_col=args.date_col,
        price_col=args.price_col,
        qty_col=args.qty_col,
        normalize=not args.no_normalize,
    )
    if raw.empty:
        print("유효한 데이터가 없습니다.", file=sys.stderr)
        return 1

    if len(raw) < 10:
        print(f"[경고] 데이터가 적습니다({len(raw)}건). 패턴 신뢰도 낮음.", file=sys.stderr)

    result = analyze(raw, min_count=args.min_count, top=args.top)

    # 채팅용 마크다운 출력
    print(to_markdown_table(result))

    # HTML 리포트
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    build_html(result, raw, out)
    print(f"\nHTML 리포트 저장: {out.resolve()}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
