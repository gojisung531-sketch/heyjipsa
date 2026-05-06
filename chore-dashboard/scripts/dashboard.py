#!/usr/bin/env python3
"""
chore-dashboard — 가사노동 기록을 분석해서 인터랙티브 HTML 대시보드를 생성.

사용법:
    python dashboard.py <input.csv|input.json> [output.html]

표준 라이브러리만 사용 (csv, json, datetime, collections, pathlib, sys).
외부 의존성 없음 — 출력 HTML이 Chart.js를 CDN에서 로드할 뿐.
"""

import sys
import json
import csv
from pathlib import Path
from collections import defaultdict
from datetime import datetime


# ---------- 데이터 로딩 ----------

def load_chore_data(filepath):
    """CSV 또는 JSON 파일에서 가사노동 기록 로드.

    JSON은 두 형식 모두 허용:
      - [{...}, {...}]
      - {"records": [{...}, {...}]}  ← chore-logger 출력 형식
    """
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"파일을 찾을 수 없습니다: {filepath}")

    raw_records = []
    if path.suffix.lower() == ".json":
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict) and "records" in data:
            raw_records = data["records"]
        elif isinstance(data, list):
            raw_records = data
        else:
            raise ValueError("JSON 형식이 예상과 다릅니다 (list 또는 {records: [...]} 필요).")
    else:
        # CSV로 처리 (.csv, .tsv 등 텍스트 기반)
        with open(path, "r", encoding="utf-8-sig") as f:  # BOM 제거
            reader = csv.DictReader(f)
            raw_records = list(reader)

    # 정규화: 컬럼명을 한국어/영어 둘 다 인식
    normalized = []
    for r in raw_records:
        date = _pick(r, "date", "날짜", "Date")
        member = _pick(r, "member", "구성원", "이름", "name", "Name")
        category = _pick(r, "category", "카테고리", "Category") or "기타"
        task = _pick(r, "task", "작업", "Task") or ""
        duration = _pick(r, "duration_minutes", "duration", "소요시간", "minutes", "Minutes")

        try:
            duration = float(duration) if duration not in (None, "") else 0.0
        except (TypeError, ValueError):
            duration = 0.0

        if not member or not date:
            continue  # 필수 필드 없으면 스킵

        normalized.append({
            "date": str(date).strip(),
            "member": str(member).strip(),
            "category": str(category).strip(),
            "task": str(task).strip(),
            "duration_minutes": duration,
        })
    return normalized


def _pick(d, *keys):
    """dict에서 여러 키 후보 중 첫 번째로 발견된 값 반환."""
    for k in keys:
        if k in d and d[k] not in (None, ""):
            return d[k]
    return None


# ---------- 분석 ----------

def calculate_member_stats(records):
    """구성원별 총 시간 / 작업 수 집계."""
    agg = defaultdict(lambda: {"total_minutes": 0.0, "task_count": 0})
    for r in records:
        m = r["member"]
        agg[m]["total_minutes"] += r["duration_minutes"]
        agg[m]["task_count"] += 1

    out = {}
    for m, s in agg.items():
        out[m] = {
            "total_minutes": round(s["total_minutes"], 1),
            "total_hours": round(s["total_minutes"] / 60, 2),
            "task_count": s["task_count"],
            "avg_minutes_per_task": (
                round(s["total_minutes"] / s["task_count"], 1)
                if s["task_count"] else 0.0
            ),
        }
    return out


def calculate_category_distribution(records):
    """카테고리별로 구성원이 차지하는 분."""
    dist = defaultdict(lambda: defaultdict(float))
    for r in records:
        dist[r["category"]][r["member"]] += r["duration_minutes"]
    # 일반 dict로 변환 + 반올림
    return {
        cat: {m: round(v, 1) for m, v in members.items()}
        for cat, members in dist.items()
    }


def parse_date(date_str):
    """다양한 날짜 형식 파싱 시도. 실패 시 None."""
    if not date_str:
        return None
    s = str(date_str).strip()
    # ISO 우선 시도
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        pass
    formats = ["%Y-%m-%d", "%Y/%m/%d", "%Y.%m.%d",
               "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S",
               "%m/%d/%Y", "%d/%m/%Y"]
    for fmt in formats:
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def calculate_time_series(records, freq="week"):
    """주간(ISO) 또는 월간 추이 계산."""
    series = defaultdict(lambda: defaultdict(float))
    for r in records:
        dt = parse_date(r["date"])
        if dt is None:
            continue
        if freq == "week":
            year, week, _ = dt.isocalendar()
            key = f"{year}-W{week:02d}"
        elif freq == "month":
            key = dt.strftime("%Y-%m")
        else:
            key = dt.strftime("%Y-%m-%d")
        series[key][r["member"]] += r["duration_minutes"]

    sorted_keys = sorted(series.keys())
    return {
        "periods": sorted_keys,
        "data": {k: {m: round(v, 1) for m, v in series[k].items()}
                 for k in sorted_keys},
    }


def calculate_fairness_score(member_stats, metric="total_minutes"):
    """공정성 점수 (0-100). 균등분배에 가까울수록 100.

    score = 100 * (1 - L1편차 / 최대L1편차)
    최대L1편차 = 2(1 - 1/n)  (한 명이 다 한 경우)
    """
    members = list(member_stats.keys())
    n = len(members)
    if n < 2:
        return 100.0
    values = [member_stats[m][metric] for m in members]
    total = sum(values)
    if total == 0:
        return 100.0
    shares = [v / total for v in values]
    uniform = 1 / n
    l1 = sum(abs(s - uniform) for s in shares)
    max_l1 = 2 * (1 - 1 / n)
    score = 100 * (1 - l1 / max_l1)
    return round(max(0.0, min(100.0, score)), 1)


def detect_imbalance(member_stats, threshold=0.65, metric="total_minutes"):
    """한 명이 threshold 이상 차지하면 불균형 알림."""
    values = {m: s[metric] for m, s in member_stats.items()}
    total = sum(values.values())
    if total == 0 or len(values) < 2:
        return {
            "imbalanced": False,
            "shares": {m: 0.0 for m in values},
            "message": "분석할 데이터가 충분하지 않습니다.",
        }
    shares = {m: v / total for m, v in values.items()}
    top = max(shares, key=shares.get)
    top_share = shares[top]
    shares_pct = {m: round(s * 100, 1) for m, s in shares.items()}
    if top_share >= threshold:
        return {
            "imbalanced": True,
            "top_member": top,
            "top_share": round(top_share * 100, 1),
            "shares": shares_pct,
            "message": (
                f"{top}님이 전체의 {round(top_share * 100)}%를 담당. "
                "균형 조절 필요."
            ),
        }
    return {
        "imbalanced": False,
        "top_member": top,
        "top_share": round(top_share * 100, 1),
        "shares": shares_pct,
        "message": "비교적 균형있게 분배되어 있습니다.",
    }


def analyze(records):
    """전체 분석 파이프라인. dict 반환 (HTML에 그대로 주입)."""
    member_stats = calculate_member_stats(records)
    return {
        "total_records": len(records),
        "members": list(member_stats.keys()),
        "member_stats": member_stats,
        "category_distribution": calculate_category_distribution(records),
        "weekly_trend": calculate_time_series(records, "week"),
        "monthly_trend": calculate_time_series(records, "month"),
        "fairness_score": calculate_fairness_score(member_stats, "total_minutes"),
        "fairness_score_by_count": calculate_fairness_score(member_stats, "task_count"),
        "imbalance": detect_imbalance(member_stats),
    }


# ---------- HTML 생성 ----------

HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>가사노동 분배 대시보드</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>
  :root {
    --bg: #f6f7fb;
    --card: #ffffff;
    --text: #1a1c23;
    --muted: #6b7280;
    --border: #e5e7eb;
    --accent: #4f46e5;
    --good: #16a34a;
    --warn: #dc2626;
    --shadow: 0 2px 8px rgba(0,0,0,0.04);
  }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Segoe UI",
                 "Noto Sans KR", sans-serif;
    background: var(--bg); color: var(--text);
    margin: 0; padding: 32px 16px;
  }
  .container { max-width: 1200px; margin: 0 auto; }
  h1 { font-size: 28px; margin: 0 0 4px; }
  .subtitle { color: var(--muted); margin: 0 0 24px; font-size: 14px; }
  .grid-2 {
    display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
    margin-bottom: 16px;
  }
  @media (max-width: 720px) { .grid-2 { grid-template-columns: 1fr; } }
  .card {
    background: var(--card); border-radius: 12px; padding: 20px;
    box-shadow: var(--shadow); border: 1px solid var(--border);
    margin-bottom: 16px;
  }
  .card h2 { font-size: 16px; margin: 0 0 12px; color: var(--text); }
  .summary { display: grid; grid-template-columns: 1fr 2fr; gap: 16px; }
  @media (max-width: 720px) { .summary { grid-template-columns: 1fr; } }
  .stat-card {
    background: var(--card); border-radius: 12px; padding: 20px;
    box-shadow: var(--shadow); border: 1px solid var(--border);
  }
  .stat-label { color: var(--muted); font-size: 13px; margin-bottom: 6px; }
  .stat-value { font-size: 32px; font-weight: 700; }
  .score-card .stat-value { color: var(--accent); }
  .stat-bar {
    height: 8px; background: var(--border); border-radius: 4px;
    overflow: hidden; margin-top: 12px;
  }
  .stat-bar-fill {
    height: 100%; background: linear-gradient(90deg, #ef4444, #f59e0b, #16a34a);
    transition: width 0.5s;
  }
  .alert {
    padding: 14px 18px; border-radius: 10px; margin: 16px 0;
    font-size: 14px; border-left: 4px solid;
  }
  .alert.warn {
    background: #fef2f2; border-color: var(--warn); color: #7f1d1d;
  }
  .alert.ok {
    background: #f0fdf4; border-color: var(--good); color: #14532d;
  }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td {
    text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--border);
  }
  th { color: var(--muted); font-weight: 600; font-size: 12px;
       text-transform: uppercase; letter-spacing: 0.05em; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .chart-wrap { position: relative; height: 280px; }
  .chart-wrap.tall { height: 320px; }
  footer {
    margin-top: 32px; text-align: center; color: var(--muted); font-size: 12px;
  }
</style>
</head>
<body>
<div class="container">
  <h1>가사노동 분배 대시보드</h1>
  <p class="subtitle">chore-dashboard · 자동 생성됨</p>

  <section class="summary">
    <div class="stat-card">
      <div class="stat-label">총 기록</div>
      <div class="stat-value" id="total-records">-</div>
    </div>
    <div class="stat-card score-card">
      <div class="stat-label">공정성 점수 (시간 기준)</div>
      <div class="stat-value"><span id="fairness-score">-</span> <span style="font-size:18px;color:var(--muted)">/ 100</span></div>
      <div class="stat-bar"><div class="stat-bar-fill" id="fairness-bar" style="width:0%"></div></div>
    </div>
  </section>

  <div id="imbalance-alert" class="alert"></div>

  <section class="grid-2">
    <div class="card">
      <h2>시간 기준 분배</h2>
      <div class="chart-wrap"><canvas id="pie-time"></canvas></div>
    </div>
    <div class="card">
      <h2>작업 수 기준 분배</h2>
      <div class="chart-wrap"><canvas id="pie-tasks"></canvas></div>
    </div>
  </section>

  <section class="card">
    <h2>구성원별 통계</h2>
    <table id="member-table">
      <thead>
        <tr>
          <th>구성원</th>
          <th class="num">총 시간 (분)</th>
          <th class="num">총 시간 (시간)</th>
          <th class="num">작업 수</th>
          <th class="num">평균 (분/작업)</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  </section>

  <section class="card">
    <h2>카테고리별 분배 (분)</h2>
    <div class="chart-wrap tall"><canvas id="category-bar"></canvas></div>
  </section>

  <section class="grid-2">
    <div class="card">
      <h2>주간 추이 (분)</h2>
      <div class="chart-wrap tall"><canvas id="weekly-line"></canvas></div>
    </div>
    <div class="card">
      <h2>월간 추이 (분)</h2>
      <div class="chart-wrap tall"><canvas id="monthly-line"></canvas></div>
    </div>
  </section>

  <footer>chore-dashboard · K-Skills</footer>
</div>

<script>
const DATA = __DATA_PLACEHOLDER__;

// 색상 팔레트 — 구성원별로 일관된 색 부여
const PALETTE = [
  "#4f46e5", "#f97316", "#16a34a", "#ec4899",
  "#0891b2", "#a855f7", "#eab308", "#64748b",
  "#dc2626", "#0ea5e9"
];
const memberColor = (m) => {
  const idx = DATA.members.indexOf(m);
  return PALETTE[idx % PALETTE.length];
};

// 1. 상단 요약
document.getElementById("total-records").textContent = DATA.total_records;
document.getElementById("fairness-score").textContent = DATA.fairness_score;
document.getElementById("fairness-bar").style.width = DATA.fairness_score + "%";

// 2. 불균형 알림
const alertEl = document.getElementById("imbalance-alert");
if (DATA.imbalance && DATA.imbalance.imbalanced) {
  alertEl.className = "alert warn";
  alertEl.innerHTML = "<strong>불균형 감지</strong> — " + DATA.imbalance.message;
} else if (DATA.imbalance) {
  alertEl.className = "alert ok";
  alertEl.innerHTML = "<strong>균형 양호</strong> — " + DATA.imbalance.message;
} else {
  alertEl.style.display = "none";
}

// 3. 구성원별 통계 테이블
const tbody = document.querySelector("#member-table tbody");
DATA.members.forEach(m => {
  const s = DATA.member_stats[m];
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${memberColor(m)};margin-right:8px"></span>${m}</td>
    <td class="num">${s.total_minutes.toLocaleString()}</td>
    <td class="num">${s.total_hours.toLocaleString()}</td>
    <td class="num">${s.task_count.toLocaleString()}</td>
    <td class="num">${s.avg_minutes_per_task.toLocaleString()}</td>
  `;
  tbody.appendChild(tr);
});

// 4. 파이차트 — 시간 기준
new Chart(document.getElementById("pie-time"), {
  type: "doughnut",
  data: {
    labels: DATA.members,
    datasets: [{
      data: DATA.members.map(m => DATA.member_stats[m].total_minutes),
      backgroundColor: DATA.members.map(memberColor),
      borderWidth: 2,
      borderColor: "#fff"
    }]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = ctx.parsed;
            const total = ctx.dataset.data.reduce((a,b)=>a+b, 0);
            const pct = total ? (v/total*100).toFixed(1) : 0;
            return `${ctx.label}: ${v.toLocaleString()}분 (${pct}%)`;
          }
        }
      }
    }
  }
});

// 5. 파이차트 — 작업 수 기준
new Chart(document.getElementById("pie-tasks"), {
  type: "doughnut",
  data: {
    labels: DATA.members,
    datasets: [{
      data: DATA.members.map(m => DATA.member_stats[m].task_count),
      backgroundColor: DATA.members.map(memberColor),
      borderWidth: 2,
      borderColor: "#fff"
    }]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = ctx.parsed;
            const total = ctx.dataset.data.reduce((a,b)=>a+b, 0);
            const pct = total ? (v/total*100).toFixed(1) : 0;
            return `${ctx.label}: ${v}개 (${pct}%)`;
          }
        }
      }
    }
  }
});

// 6. 카테고리별 누적 막대그래프
const categories = Object.keys(DATA.category_distribution);
new Chart(document.getElementById("category-bar"), {
  type: "bar",
  data: {
    labels: categories,
    datasets: DATA.members.map(m => ({
      label: m,
      data: categories.map(c => DATA.category_distribution[c][m] || 0),
      backgroundColor: memberColor(m),
      borderWidth: 0
    }))
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true,
           title: { display: true, text: "분" } }
    },
    plugins: {
      legend: { position: "bottom" },
      tooltip: { mode: "index", intersect: false }
    }
  }
});

// 7. 주간 추이
function buildLineChart(canvasId, trendObj) {
  const periods = trendObj.periods;
  const datasets = DATA.members.map(m => ({
    label: m,
    data: periods.map(p => trendObj.data[p][m] || 0),
    borderColor: memberColor(m),
    backgroundColor: memberColor(m) + "33",
    tension: 0.3,
    fill: false
  }));
  new Chart(document.getElementById(canvasId), {
    type: "line",
    data: { labels: periods, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, title: { display: true, text: "분" } } },
      plugins: {
        legend: { position: "bottom" },
        tooltip: { mode: "index", intersect: false }
      },
      interaction: { mode: "nearest", axis: "x", intersect: false }
    }
  });
}
buildLineChart("weekly-line", DATA.weekly_trend);
buildLineChart("monthly-line", DATA.monthly_trend);
</script>
</body>
</html>
"""


def generate_html(analysis, output_path):
    """Chart.js 기반 인터랙티브 HTML 대시보드 생성."""
    data_json = json.dumps(analysis, ensure_ascii=False, indent=2)
    html = HTML_TEMPLATE.replace("__DATA_PLACEHOLDER__", data_json)
    Path(output_path).write_text(html, encoding="utf-8")


# ---------- 엔트리 포인트 ----------

def main():
    if len(sys.argv) < 2:
        print("사용법: python dashboard.py <input.csv|input.json> [output.html]")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else "chore_dashboard.html"

    print(f"데이터 로딩 중: {input_file}")
    try:
        records = load_chore_data(input_file)
    except FileNotFoundError as e:
        print(f"에러: {e}")
        sys.exit(1)
    except (json.JSONDecodeError, ValueError) as e:
        print(f"파싱 에러: {e}")
        sys.exit(1)
    print(f"  -> {len(records)}개 기록 로드됨")

    if not records:
        print("기록이 없습니다. 입력 파일을 확인해주세요.")
        sys.exit(1)

    print("분석 중...")
    analysis = analyze(records)
    print(f"  -> 구성원: {', '.join(analysis['members'])}")
    print(f"  -> 공정성 점수: {analysis['fairness_score']}/100")
    if analysis["imbalance"] and analysis["imbalance"].get("message"):
        print(f"  -> {analysis['imbalance']['message']}")

    print(f"대시보드 생성 중: {output_file}")
    generate_html(analysis, output_file)
    print(f"완료! 브라우저에서 {output_file} 파일을 열어보세요.")


if __name__ == "__main__":
    main()
