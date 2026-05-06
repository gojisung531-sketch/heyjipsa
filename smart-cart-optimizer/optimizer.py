"""smart-cart-optimizer core: 무배 기준 맞춰 묶음 짜기."""

import json
import os

DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), "platforms.json")


def load_db(path=DEFAULT_DB_PATH):
    """플랫폼 DB와 품목 가격 범위 로드."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def estimate_price(item_name, db):
    """품목 이름 -> 예상 가격 (중간값). 사전에 없으면 None."""
    prices = db.get("default_item_prices", {})
    for key, (low, high) in prices.items():
        if key in item_name:
            return (low + high) // 2, (low, high)
    return None, None


def normalize_items(items, db):
    """입력 표준화. price 누락 시 DB에서 추정."""
    normalized = []
    warnings = []
    for it in items:
        name = it.get("name", "").strip()
        if not name:
            continue
        price = it.get("price")
        price_range = None
        if price is None:
            price, price_range = estimate_price(name, db)
            if price is None:
                warnings.append("'" + name + "' 가격 정보 없음 -- 0원 처리")
                price = 0
        normalized.append({
            "name": name,
            "price": int(price),
            "price_range": price_range,
            "tag": it.get("tag", "any"),
            "platform_pref": it.get("platform_pref"),
        })
    return normalized, warnings


def assign_initial_platform(items, db):
    """1차 배분: 태그/강제 플랫폼 기준."""
    groups = {p: [] for p in db["platforms"]}
    pending_any = []
    for it in items:
        pref = it.get("platform_pref")
        if pref and pref in groups:
            groups[pref].append(it)
            continue
        tag = it.get("tag", "any")
        if tag == "lowest":
            groups["쿠팡"].append(it)
        elif tag == "brand":
            groups["마켓컬리"].append(it)
        else:
            pending_any.append(it)
    return groups, pending_any


def pick_to_cover(candidates, deficit):
    """그리디로 부족분 채울 후보 선택 (가격 큰 순)."""
    sorted_c = sorted(candidates, key=lambda x: -x["price"])
    chosen, acc = [], 0
    for c in sorted_c:
        if acc >= deficit:
            break
        chosen.append(c)
        acc += c["price"]
    return chosen


def fill_to_threshold(groups, pending_any, db):
    """2차 배분: pending_any 로 무배 기준 부족 플랫폼 채움. 작은 gap 우선."""
    platforms = db["platforms"]
    deficits = []
    for p, items in groups.items():
        threshold = platforms[p].get("free_shipping_threshold")
        if threshold is None:
            continue
        total = sum(i["price"] for i in items)
        if 0 < total < threshold:
            deficits.append((p, threshold - total))
    deficits.sort(key=lambda x: x[1])  # 작은 gap부터
    for p, deficit in deficits:
        chosen = pick_to_cover(pending_any, deficit)
        for c in chosen:
            groups[p].append(c)
            pending_any.remove(c)
    if pending_any:
        groups["쿠팡"].extend(pending_any)
        pending_any.clear()
    return groups


def summarize(groups, db):
    """플랫폼별 요약 + 절약 금액."""
    platforms = db["platforms"]
    bundles = []
    total_shipping_optimized = 0
    total_shipping_naive = 0
    for p, items in groups.items():
        if not items:
            continue
        threshold = platforms[p].get("free_shipping_threshold")
        fee = platforms[p]["shipping_fee"]
        total = sum(i["price"] for i in items)
        if threshold is not None and total >= threshold:
            shipping = 0
            free_shipping = True
        else:
            shipping = fee
            free_shipping = False
        total_shipping_optimized += shipping
        total_shipping_naive += fee
        bundles.append({
            "platform": p,
            "items": items,
            "subtotal": total,
            "threshold": threshold,
            "shipping": shipping,
            "free_shipping": free_shipping,
            "deficit": (threshold - total) if (threshold and total < threshold) else 0,
        })
    saved = total_shipping_naive - total_shipping_optimized
    return {
        "bundles": bundles,
        "total_shipping": total_shipping_optimized,
        "saved_vs_naive": saved,
    }


def optimize(items, db_path=DEFAULT_DB_PATH):
    """진입점."""
    db = load_db(db_path)
    normalized, warnings = normalize_items(items, db)
    groups, pending = assign_initial_platform(normalized, db)
    groups = fill_to_threshold(groups, pending, db)
    result = summarize(groups, db)
    result["warnings"] = warnings
    return result


def format_report(result):
    """결과를 마크다운 문자열로."""
    lines = ["# 묶음 추천 결과", ""]
    if result["warnings"]:
        lines.append("> WARN: " + " / ".join(result["warnings"]))
        lines.append("")
    for b in result["bundles"]:
        title = "## " + b["platform"] + " -- " + format(b["subtotal"], ",") + "원"
        if b["free_shipping"]:
            title += " [무배]"
        else:
            title += " [배송비 " + format(b["shipping"], ",") + "원]"
            if b["deficit"] > 0:
                title += " (무배까지 " + format(b["deficit"], ",") + "원 부족)"
        lines.append(title)
        lines.append("")
        lines.append("| 품목 | 가격 | 태그 |")
        lines.append("|------|------|------|")
        for it in b["items"]:
            lines.append("| " + it["name"] + " | " + format(it["price"], ",") + "원 | " + it["tag"] + " |")
        lines.append("")
    lines.append("## 총 배송비: " + format(result["total_shipping"], ",") + "원")
    if result["saved_vs_naive"] > 0:
        lines.append("## 절약: " + format(result["saved_vs_naive"], ",") + "원 (플랫폼별 따로 시켰을 때 대비)")
    return "\n".join(lines)
