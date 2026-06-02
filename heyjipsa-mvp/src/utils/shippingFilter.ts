// 배송비 낚시 상품 필터 + 실질가격 재정렬
// → shipping-fee-filter/filter.py 포팅

export interface Product {
  name: string;
  price: number; // 상품가격
  shipping: number; // 배송비
}

export interface BaitResult {
  name: string;
  price: number;
  shipping: number;
  real_price: number; // 상품가 + 배송비
  is_bait: boolean;
  bait_reasons: string[];
}

const realPrice = (p: Product) => p.price + p.shipping;
const shippingRatio = (p: Product) =>
  p.price <= 0 ? Infinity : p.shipping / p.price;

/**
 * 텍스트 입력 파싱. 구분자: 쉼표/슬래시/파이프/탭.
 * 형식: 상품명, 가격, 배송비  (숫자 외 문자는 제거). (parse_text_input 포팅)
 */
export function parseTextInput(text: string): Product[] {
  const products: Product[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const parts = line.split(/[,/|\t]/);
    if (parts.length < 3) continue; // 형식 안 맞으면 스킵

    const name = parts[0].trim();
    const priceRaw = parts[1].replace(/[^\d]/g, '');
    const shipRaw = parts[2].trim() ? parts[2].replace(/[^\d]/g, '') : '0';
    if (!priceRaw) continue;

    const price = parseInt(priceRaw, 10);
    const shipping = shipRaw ? parseInt(shipRaw, 10) : 0;
    if (Number.isNaN(price) || price <= 0) continue;

    products.push({ name, price, shipping: Number.isNaN(shipping) ? 0 : shipping });
  }
  return products;
}

/**
 * 낚시 상품 판별 + 실질가격 오름차순 정렬. (detect_bait 포팅)
 * 조건 A: 배송비/상품가 >= 0.5
 * 조건 B: 배송비 >= 입력 평균 배송비 × 2 (입력 2개 이상, 평균>0일 때)
 */
export function detectBait(products: Product[]): BaitResult[] {
  if (products.length === 0) return [];

  const avgShipping =
    products.reduce((s, p) => s + p.shipping, 0) / products.length;

  const results: BaitResult[] = products.map((p) => {
    const reasons: string[] = [];

    // 조건 A
    if (p.price > 0 && shippingRatio(p) >= 0.5) {
      reasons.push(`배송비/상품가 ${Math.round(shippingRatio(p) * 100)}%`);
    }
    // 조건 B
    if (products.length > 1 && avgShipping > 0 && p.shipping >= avgShipping * 2) {
      reasons.push(`평균 배송비의 ${(p.shipping / avgShipping).toFixed(1)}배`);
    }

    return {
      name: p.name,
      price: p.price,
      shipping: p.shipping,
      real_price: realPrice(p),
      is_bait: reasons.length > 0,
      bait_reasons: reasons,
    };
  });

  // 실질가격 오름차순
  results.sort((a, b) => a.real_price - b.real_price);
  return results;
}
