"""budget-guard: 장바구니 분류 + 사치품/반복구매/예산 경고.

외부 API 의존 없이 키워드 기반으로 동작.
한 함수 = 한 역할 원칙으로 작성.
"""

import re
import sys
from collections import defaultdict


# 카테고리별 키워드 사전
# 한국어 + 영어 양쪽 매칭. 신규 키워드는 여기에 추가만 하면 됨.
CATEGORIES = {
    "생필품": {
        "keywords": [
            # 위생용품
            "휴지", "화장지", "물티슈", "기저귀", "생리대", "탐폰",
            "치약", "칫솔", "샴푸", "린스", "비누", "바디워시", "폼클렌징",
            # 세제/청소
            "세제", "세탁세제", "섬유유연제", "주방세제", "락스", "청소포",
            "고무장갑", "수세미", "쓰레기봉투",
            # 식료품 (기본)
            "쌀", "라면", "계란", "우유", "빵", "두부", "김치",
            "생수", "식용유", "소금", "간장", "된장", "고추장",
            "양파", "마늘", "감자", "당근", "배추", "무", "시금치",
            "닭", "돼지고기", "소고기", "고등어", "갈치", "오징어",
            "사과", "바나나", "달걀",
        ],
        "icon": "✅",
        "label": "생필품",
    },
    "준생필품": {
        "keywords": [
            # 간식
            "과자", "초콜릿", "사탕", "젤리", "쿠키", "비스킷", "껌", "스낵",
            # 음료
            "콜라", "사이다", "주스", "커피", "차 ", "음료", "에너지드링크",
            "맥주", "와인", "소주",
            # 조미료
            "설탕", "후추", "참기름", "마요네즈", "케첩", "드레싱", "잼",
        ],
        "icon": "⚠️",
        "label": "준생필품",
    },
    "사치품": {
        "keywords": [
            # 디저트/카페
            "케이크", "마카롱", "도넛", "아이스크림", "타르트", "크로플",
            "스타벅스", "투썸", "공차", "블루보틀",
            # 브랜드 화장품
            "샤넬", "디올", "에스티로더", "랑콤", "입생로랑", "톰포드",
            "맥 립", "조말론", "바이레도",
            "chanel", "dior", "ysl", "tom ford", "jo malone", "byredo",
            # 명품
            "구찌", "루이비통", "프라다", "버버리", "에르메스", "셀린느",
            "gucci", "louis vuitton", "prada", "burberry", "hermes", "celine",
            # 기타 충동구매 패턴
            "한정판", "굿즈", "피규어", "콜라보",
        ],
        "icon": "🚨",
        "label": "사치품",
    },
}


def parse_cart(text: str) -> list:
    """장바구니 텍스트를 [{name, price}] 리스트로 파싱.

    지원 형식:
      - 휴지 24롤 18,000원
      - 1. 샤넬 립스틱 - 52,000원
      - 라면, 4500
    가격이 없으면 price=0.
    """
    items = []
    for raw in text.strip().split("\n"):
        line = raw.strip()
        if not line:
            continue

        # 가격 추출: "12,000원" 패턴 우선, 없으면 줄 끝 숫자
        price = 0
        price_match = re.search(r"([\d,]+)\s*원", line)
        if price_match:
            price = int(price_match.group(1).replace(",", ""))
            line = line.replace(price_match.group(0), "")
        else:
            tail_match = re.search(r"[\s,\-]([\d,]{3,})\s*$", line)
            if tail_match:
                price = int(tail_match.group(1).replace(",", ""))
                line = line[: tail_match.start()]

        # 앞쪽 번호/기호 제거: "1." "2)" "- " 등
        name = re.sub(r"^[\d\.\)\-\s,]+", "", line).strip()
        # 뒤쪽 구분자 제거
        name = re.sub(r"[\s,\-]+$", "", name).strip()

        if name:
            items.append({"name": name, "price": price})
    return items


def classify_item(name: str) -> str:
    """품목명을 카테고리로 분류. 매칭 실패 시 '준생필품' 기본."""
    name_lower = name.lower()
    # 사치품을 먼저 체크 (브랜드 화장품이 '립스틱' 같은 일반어와 겹치지 않도록)
    for category in ("사치품", "생필품", "준생필품"):
        for kw in CATEGORIES[category]["keywords"]:
            if kw.lower() in name_lower:
                return category
    return "준생필품"


def check_repeat_purchase(items: list, history: dict | None = None) -> list:
    """이번 달 누적 3회 이상 구매한 품목에 경고.

    history: {"마카롱 6개": 2} 형태. 이번 카트에 같은 품목이 또 있으면 합산.
    """
    history = history or {}
    warnings = []
    seen_in_cart = defaultdict(int)
    for item in items:
        seen_in_cart[item["name"]] += 1

    for name, count_now in seen_in_cart.items():
        total = count_now + history.get(name, 0)
        if total >= 3:
            warnings.append(f"'{name}' 이번 달 {total}번째 구매예요. 정말 필요한가요?")
    return warnings


def check_budget(total_price: int, monthly_budget: int | None, current_spent: int) -> list:
    """월 예산 대비 경고. 80% 도달 ⚠️ / 100% 초과 🚨."""
    warnings = []
    if not monthly_budget:
        return warnings

    projected = current_spent + total_price
    ratio = projected / monthly_budget * 100

    if projected > monthly_budget:
        warnings.append(
            f"🚨 예산 초과! 월 예산 {monthly_budget:,}원 / "
            f"예상 지출 {projected:,}원 ({ratio:.0f}%)"
        )
    elif ratio >= 80:
        remaining = monthly_budget - projected
        warnings.append(
            f"⚠️ 예산 {ratio:.0f}% 도달. 남은 한도 {remaining:,}원"
        )
    return warnings


def analyze_cart(
    text: str,
    monthly_budget: int | None = None,
    current_spent: int = 0,
    history: dict | None = None,
) -> dict:
    """장바구니 분석 메인 함수."""
    items = parse_cart(text)
    if not items:
        return {"error": "장바구니에서 품목을 찾을 수 없어요. 형식을 확인해주세요."}

    classified = []
    totals = defaultdict(lambda: {"count": 0, "price": 0})
    for item in items:
        cat = classify_item(item["name"])
        classified.append({
            **item,
            "category": cat,
            "icon": CATEGORIES[cat]["icon"],
        })
        totals[cat]["count"] += 1
        totals[cat]["price"] += item["price"]

    total_price = sum(it["price"] for it in items)
    luxury_items = [c for c in classified if c["category"] == "사치품"]

    return {
        "items": classified,
        "totals": dict(totals),
        "total_price": total_price,
        "luxury_items": luxury_items,
        "repeat_warnings": check_repeat_purchase(items, history),
        "budget_warnings": check_budget(total_price, monthly_budget, current_spent),
    }


def format_report(result: dict) -> str:
    """분석 결과를 마크다운 리포트로 변환."""
    if "error" in result:
        return result["error"]

    out = ["# 장바구니 분석 결과\n"]

    # 1. 품목 분류 테이블
    out.append("## 품목 분류")
    out.append("| 품목 | 가격 | 분류 |")
    out.append("|------|------|------|")
    for it in result["items"]:
        price_str = f"{it['price']:,}원" if it["price"] else "-"
        out.append(f"| {it['name']} | {price_str} | {it['icon']} {it['category']} |")

    # 2. 카테고리별 요약 + 막대그래프
    out.append("\n## 카테고리별 요약")
    total = result["total_price"]
    for cat in ("생필품", "준생필품", "사치품"):
        if cat not in result["totals"]:
            continue
        info = CATEGORIES[cat]
        t = result["totals"][cat]
        ratio = (t["price"] / total * 100) if total else 0
        bar = "█" * max(1, int(ratio / 5))
        out.append(
            f"{info['icon']} {cat}: {t['count']}개 / {t['price']:,}원 "
            f"({ratio:.0f}%) {bar}"
        )

    # 3. 총 합계
    out.append(f"\n**총 합계: {total:,}원**")

    # 4. 경고 섹션
    if result["luxury_items"]:
        out.append("\n## 🚨 사치품 경고")
        for it in result["luxury_items"]:
            out.append(f"- {it['name']} ({it['price']:,}원) — 정말 필요한가요?")

    if result["repeat_warnings"]:
        out.append("\n## ⚠️ 반복 구매 경고")
        for w in result["repeat_warnings"]:
            out.append(f"- {w}")

    if result["budget_warnings"]:
        out.append("\n## 💰 예산 경고")
        for w in result["budget_warnings"]:
            out.append(f"- {w}")

    return "\n".join(out)


if __name__ == "__main__":
    # 사용법:
    #   python classifier.py --demo            데모 입력으로 동작 확인
    #   python classifier.py < cart.txt        stdin으로 카트 받기
    if "--demo" in sys.argv:
        demo = """1. 휴지 24롤 - 18,000원
2. 샤넬 립스틱 - 52,000원
3. 라면 5개 - 4,500원
4. 마카롱 6개 - 15,000원
5. 우유 1L - 3,200원"""
        result = analyze_cart(
            demo,
            monthly_budget=300000,
            current_spent=180000,
            history={"마카롱 6개": 2},
        )
    else:
        text = sys.stdin.read()
        result = analyze_cart(text)

    print(format_report(result))
