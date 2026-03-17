export const leadStatusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  new: { label: 'Lead', variant: 'default' },
  subscribed: { label: 'Cadastrado', variant: 'outline' },
  opportunity: { label: 'Oportunidade', variant: 'secondary' },
  converted: { label: 'Venda', variant: 'default' },
};
