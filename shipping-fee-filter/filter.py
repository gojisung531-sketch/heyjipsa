"""
shipping-fee-filter
온라인 쇼핑 낚시 상품 필터링 + 실질가격 재정렬

사용 예:
    from filter import parse_text_input, detect_bait, format_table
    products = parse_text_input("A상품, 990, 3500\\nB상품, 3200, 0")
    results = detect_bait(products)
    print(format_table(results))
"""

from dataclasses import dataclass
from typing import List, Dict, Any
import re


@dataclass
class Product:
    name: str
    price: int       # 상품가격
    shipping: int    # 배송비

    @property
    def real_price(self) -> int:
        # 실질가격 = 상품가격 + 배송비
        return self.price + self.shipping

    @property
    def shipping_ratio(self) -> float:
        # 상품가격이 0이거나 음수면 비율 의미 없음
        if self.price <= 0:
            return float("inf")
        return self.shipping / self.price


def parse_text_input(text: str) -> List[Product]:
    """
    텍스트 입력에서 상품 리스트 파싱.
    구분자: 쉼표(,), 슬래시(/), 파이프(|), 탭

    예시 입력:
        A상품, 990, 3500
        B상품 / 3200 / 0
        C상품 | 5000 | 2500

    숫자에서 '원', ',' 같은 문자는 자동 제거.
    """
    products: List[Product] = []
    for raw_line in text.strip().splitlines():
        line = raw_line.strip()
        if not line:
            continue
        parts = re.split(r"[,/|\t]", line)
        if len(parts) < 3:
            # 형식 안 맞으면 스킵 (사용자가 따로 안내받도록)
            continue
        name = parts[0].strip()
        price_raw = re.sub(r"[^\d]", "", parts[1])
        ship_raw = re.sub(r"[^\d]", "", parts[2]) if parts[2].strip() else "0"
        if not price_raw:
            continue
        try:
            price = int(price_raw)
            shipping = int(ship_raw) if ship_raw else 0
        except ValueError:
            continue
        if price <= 0:
            # 상품가격이 0 이하면 입력 에러로 간주
            continue
        products.append(Product(name=name, price=price, shipping=shipping))
    return products


def detect_bait(products: List[Product]) -> List[Dict[str, Any]]:
    """
    낚시 상품 판별 + 실질가격 오름차순 정렬.

    낚시 판별 기준:
      - 조건 A: 배송비 / 상품가격 >= 0.5
      - 조건 B: 배송비 >= 입력 리스트의 배송비 평균 × 2
      - 둘 중 하나라도 해당되면 낚시 의심

    반환: dict 리스트
      keys: name, price, shipping, real_price, is_bait, bait_reasons
    """
    if not products:
        return []

    # 평균 배송비 — 입력 리스트 내에서만 계산
    # (외부 카테고리 데이터 없으므로 사용자가 같은 카테고리 상품을 넣어야 정확)
    avg_shipping = sum(p.shipping for p in products) / len(products)

    results: List[Dict[str, Any]] = []
    for p in products:
        reasons: List[str] = []

        # 조건 A
        if p.price > 0 and p.shipping_ratio >= 0.5:
            reasons.append(f"배송비/상품가 {int(round(p.shipping_ratio * 100))}%")

        # 조건 B (입력 1개거나 평균 0이면 발동 안 함)
        if len(products) > 1 and avg_shipping > 0 and p.shipping >= avg_shipping * 2:
            reasons.append(f"평균 배송비의 {p.shipping / avg_shipping:.1f}배")

        results.append({
            "name": p.name,
            "price": p.price,
            "shipping": p.shipping,
            "real_price": p.real_price,
            "is_bait": len(reasons) > 0,
            "bait_reasons": reasons,
        })

    # 실질가격 오름차순
    results.sort(key=lambda x: x["real_price"])
    return results


def format_table(results: List[Dict[str, Any]]) -> str:
    """비교 테이블 + 최저가 한 줄 요약을 마크다운으로 반환."""
    if not results:
        return "상품 데이터가 없습니다. 입력 형식을 확인해주세요."

    lines: List[str] = []
    lines.append("| 순위 | 상품명 | 상품가 | 배송비 | 실질가격 | 낚시 의심 |")
    lines.append("|------|--------|--------|--------|----------|----------|")

    for i, r in enumerate(results, 1):
        ship_str = "무료" if r["shipping"] == 0 else f"{r['shipping']:,}원"
        if r["is_bait"]:
            bait_str = "🚨 " + ", ".join(r["bait_reasons"])
        else:
            bait_str = "-"
        lines.append(
            f"| {i} | {r['name']} | {r['price']:,}원 | {ship_str} | "
            f"{r['real_price']:,}원 | {bait_str} |"
        )

    cheapest = results[0]
    lines.append("")
    lines.append(
        f"**실질가격 기준 최저가: {cheapest['name']} "
        f"({cheapest['real_price']:,}원)**"
    )
    return "\n".join(lines)


if __name__ == "__main__":
    # 데모 실행
    sample = """A상품, 990, 3500
B상품, 3200, 0
C상품, 2500, 2500
D상품, 4000, 0
E상품, 1000, 6000"""

    products = parse_text_input(sample)
    results = detect_bait(products)
    print(format_table(results))
