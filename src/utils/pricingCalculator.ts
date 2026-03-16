export interface InstallmentOption {
  installments: number;
  installmentValue: number;
  totalValue: number;
}

// Multiplicadores exatos calculados com a fórmula: 1 / (1 - C.E.T)
// Garantem que, após o gateway descontar a taxa, o valor líquido seja cravado no preço base.
const INSTALLMENT_MULTIPLIERS: Record<number, number> = {
  1: 1.00000, // À vista (O produtor absorve a taxa de 1x para manter o preço de vitrine)
  2: 1.04493, // C.E.T 4.30%
  3: 1.05496, // C.E.T 5.21%
  4: 1.06519, // C.E.T 6.12%
  5: 1.07562, // C.E.T 7.03%
  6: 1.08625, // C.E.T 7.94%
  7: 1.10595, // C.E.T 9.58%
  8: 1.11707, // C.E.T 10.48%
  9: 1.12854, // C.E.T 11.39%
  10: 1.14012, // C.E.T 12.29%
  11: 1.15194, // C.E.T 13.19%
  12: 1.16401  // C.E.T 14.09%
};

/**
 * Calcula as opções de parcelamento repassando os juros fixos do gateway.
 * @param basePrice Valor do curso à vista
 * @param maxInstallments Número máximo de parcelas (default: 12)
 */
export function calculateInstallments(basePrice: number, maxInstallments: number = 12): InstallmentOption[] {
  const options: InstallmentOption[] = [];
  const max = Math.min(Math.max(maxInstallments, 1), 12);

  for (let n = 1; n <= max; n++) {
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
