export interface InstallmentOption {
  installments: number;
  installmentValue: number;
  totalValue: number;
}

// Multiplicadores exatos extraídos da planilha do Pagar.me
// (Ex: Em 12x, R$ 1000 vira R$ 1168,28. Multiplicador = 1.16828)
const INSTALLMENT_MULTIPLIERS: Record<number, number> = {
  1: 1.00000,
  2: 1.04496,
  3: 1.05729,
  4: 1.06963,
  5: 1.08196,
  6: 1.09429,
  7: 1.10662,
  8: 1.11895,
  9: 1.13129,
  10: 1.14362,
  11: 1.15595,
  12: 1.16828
};

/**
 * Calcula as opções de parcelamento repassando os juros fixos do gateway.
 * @param basePrice Valor do curso à vista
 */
export function calculateInstallments(basePrice: number): InstallmentOption[] {
  const options: InstallmentOption[] = [];

  for (let n = 1; n <= 12; n++) {
    const multiplier = INSTALLMENT_MULTIPLIERS[n] || 1;
    const totalValue = basePrice * multiplier;
    const installmentValue = totalValue / n;
    
    options.push({
      installments: n,
      // Arredondamento padrão financeiro (2 casas decimais)
      installmentValue: Number(installmentValue.toFixed(2)),
      totalValue: Number(totalValue.toFixed(2))
    });
  }
  return options;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

/**
 * Returns the multiplier for a given number of installments.
 * Used for server-side validation.
 */
export function getInstallmentMultiplier(installments: number): number {
  return INSTALLMENT_MULTIPLIERS[installments] || 1;
}
