export const leadStatusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  new: { label: 'Lead', variant: 'default' },
  qualified: { label: 'Qualificado', variant: 'outline' },
  opportunity: { label: 'Oportunidade', variant: 'secondary' },
  converted: { label: 'Venda', variant: 'default' },
  lost: { label: 'Perdido', variant: 'destructive' },
};

/** Ordered funnel stages for display */
export const funnelStages = ['new', 'qualified', 'opportunity', 'converted'] as const;
