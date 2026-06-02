// 장바구니 분류 + 사치품/반복구매/예산 경고
// → budget-guard/classifier.py 포팅 (키워드 DB는 data/budgetCategories.ts)

import {
  BUDGET_CATEGORIES,
  CLASSIFY_ORDER,
} from '../data/budgetCategories';

export interface CartItem {
  name: string;
  price: number;
}

export interface ClassifiedItem extends CartItem {
  category: string;
  icon: string;
}

export interface CartAnalysis {
  items: ClassifiedItem[];
  totals: Record<string, { count: number; price: number }>;
  total_price: number;
  luxury_items: ClassifiedItem[];
  repeat_warnings: string[];
  budget_warnings: string[];
  error?: string;
}

/** 장바구니 텍스트를 [{name, price}]로 파싱. (parse_cart 포팅) */
export function parseCart(text: string): CartItem[] {
  const items: CartItem[] = [];
  for (const raw of text.split('\n')) {
    let line = raw.trim();
    if (!line) continue;

    // 가격 추출: "12,000원" 우선, 없으면 줄 끝 숫자
    let price = 0;
    const wonMatch = line.match(/([\d,]+)\s*원/);
    if (wonMatch) {
      price = parseInt(wonMatch[1].replace(/,/g, ''), 10);
      line = line.replace(wonMatch[0], '');
    } else {
      const tailMatch = line.match(/[\s,-]([\d,]{3,})\s*$/);
      if (tailMatch && tailMatch.index !== undefined) {
        price = parseInt(tailMatch[1].replace(/,/g, ''), 10);
        line = line.slice(0, tailMatch.index);
      }
    }

    // 앞쪽 번호/기호 제거, 뒤쪽 구분자 제거
    let name = line.replace(/^[\d.)\s,-]+/, '').trim();
    name = name.replace(/[\s,-]+$/, '').trim();

    if (name) items.push({ name, price: Number.isNaN(price) ? 0 : price });
  }
  return items;
}

/** 품목명 분류. 매칭 실패 시 '준생필품'. (classify_item 포팅) */
export function classifyItem(name: string): string {
  const nameLower = name.toLowerCase();
  // 사치품을 먼저 체크 (브랜드가 일반어와 겹치지 않도록)
  for (const category of CLASSIFY_ORDER) {
    const def = BUDGET_CATEGORIES[category];
    if (!def) continue;
    for (const kw of def.keywords) {
      if (nameLower.includes(kw.toLowerCase())) return category;
    }
  }
  return '준생필품';
}

/** 이번 달 누적 3회 이상 구매 경고. (check_repeat_purchase 포팅) */
export function checkRepeatPurchase(
  items: CartItem[],
  history: Record<string, number> = {},
): string[] {
  const warnings: string[] = [];
  const seen: Record<string, number> = {};
  for (const it of items) seen[it.name] = (seen[it.name] ?? 0) + 1;
  for (const name of Object.keys(seen)) {
    const total = seen[name] + (history[name] ?? 0);
    if (total >= 3) {
      warnings.push(`'${name}' 이번 달 ${total}번째 구매예요. 정말 필요한가요?`);
    }
  }
  return warnings;
}

const won = (n: number) => n.toLocaleString('en-US');

/** 월 예산 대비 경고. 80% ⚠️ / 100% 초과 🚨. (check_budget 포팅) */
export function checkBudget(
  totalPrice: number,
  monthlyBudget: number | null,
  currentSpent: number,
): string[] {
  const warnings: string[] = [];
  if (!monthlyBudget) return warnings;
  const projected = currentSpent + totalPrice;
  const ratio = (projected / monthlyBudget) * 100;
  if (projected > monthlyBudget) {
    warnings.push(
      `🚨 예산 초과! 월 예산 ${won(monthlyBudget)}원 / 예상 지출 ${won(projected)}원 (${Math.round(ratio)}%)`,
    );
  } else if (ratio >= 80) {
    const remaining = monthlyBudget - projected;
    warnings.push(`⚠️ 예산 ${Math.round(ratio)}% 도달. 남은 한도 ${won(remaining)}원`);
  }
  return warnings;
}

/** 장바구니 분석 메인. (analyze_cart 포팅) */
export function analyzeCart(
  text: string,
  monthlyBudget: number | null = null,
  currentSpent = 0,
  history: Record<string, number> = {},
): CartAnalysis {
  const empty: CartAnalysis = {
    items: [],
    totals: {},
    total_price: 0,
    luxury_items: [],
    repeat_warnings: [],
    budget_warnings: [],
  };

  const items = parseCart(text);
  if (items.length === 0) {
    return { ...empty, error: '장바구니에서 품목을 찾을 수 없어요. 형식을 확인해주세요.' };
  }

  const classified: ClassifiedItem[] = [];
  const totals: Record<string, { count: number; price: number }> = {};
  for (const item of items) {
    const cat = classifyItem(item.name);
    classified.push({
      ...item,
      category: cat,
      icon: BUDGET_CATEGORIES[cat]?.icon ?? '❓',
    });
    if (!totals[cat]) totals[cat] = { count: 0, price: 0 };
    totals[cat].count += 1;
    totals[cat].price += item.price;
  }

  const totalPrice = items.reduce((s, it) => s + it.price, 0);
  const luxuryItems = classified.filter((c) => c.category === '사치품');

  return {
    items: classified,
    totals,
    total_price: totalPrice,
    luxury_items: luxuryItems,
    repeat_warnings: checkRepeatPurchase(items, history),
    budget_warnings: checkBudget(totalPrice, monthlyBudget, currentSpent),
  };
}
