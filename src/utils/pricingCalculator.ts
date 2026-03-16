/**
 * Pricing Calculator — Hotmart-style installment interest pass-through.
 *
 * MDR rates from Pagar.me contract:
 *   1x (à vista)  → 3.25%
 *   2-6x           → 3.79%
 *   7-12x          → 4.07%
 *
 * Formula: totalWithInterest = basePrice / (1 - MDR)
 * This ensures the merchant receives the base price after the gateway deducts its fee.
 * For 1x the buyer pays the base price (merchant absorbs the 3.25%).
 */

const MDR_RATES: Record<string, number> = {
  '1': 0, // 1x: no interest passed to buyer
  '2-6': 0.0379,
  '7-12': 0.0407,
};

function getMdrRate(installments: number): number {
  if (installments <= 1) return MDR_RATES['1'];
  if (installments <= 6) return MDR_RATES['2-6'];
  return MDR_RATES['7-12'];
}

export interface InstallmentDetail {
  /** Number of installments */
  number: number;
  /** Per-installment amount in cents */
  installmentAmount: number;
  /** Total amount with interest in cents */
  totalAmount: number;
  /** Whether interest is applied */
  hasInterest: boolean;
  /** Display label, e.g. "3x de R$ 35,00 (Total R$ 105,00)" */
  label: string;
}

function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

/**
 * Calculate all 12 installment options for a given base price (in cents).
 * @param basePrice price in cents after any coupon/discount but BEFORE installment interest
 * @param maxInstallments cap (default 12)
 * @param minPerInstallment minimum per-installment amount in cents (default 500 = R$5)
 */
export function calculateInstallments(
  basePrice: number,
  maxInstallments = 12,
  minPerInstallment = 500,
): InstallmentDetail[] {
  const results: InstallmentDetail[] = [];

  for (let n = 1; n <= maxInstallments; n++) {
    const rate = getMdrRate(n);
    const hasInterest = rate > 0;
    const totalAmount = hasInterest ? Math.round(basePrice / (1 - rate)) : basePrice;
    const installmentAmount = Math.ceil(totalAmount / n);

    if (installmentAmount < minPerInstallment && n > 1) continue;

    const label =
      n === 1
        ? `1x de ${formatBRL(totalAmount)} sem juros`
        : hasInterest
          ? `${n}x de ${formatBRL(installmentAmount)} (Total ${formatBRL(totalAmount)})`
          : `${n}x de ${formatBRL(installmentAmount)} sem juros`;

    results.push({ number: n, installmentAmount, totalAmount, hasInterest, label });
  }

  return results;
}

/**
 * Server-side validation: given a number of installments and base price,
 * return the expected total amount the buyer should be charged.
 */
export function calculateTotalWithInterest(basePrice: number, installments: number): number {
  const rate = getMdrRate(installments);
  return rate > 0 ? Math.round(basePrice / (1 - rate)) : basePrice;
}
