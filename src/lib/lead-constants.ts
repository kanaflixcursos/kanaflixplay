export const leadStatusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  new: { label: 'Novo', variant: 'default' },
  qualified: { label: 'Qualificado', variant: 'outline' },
  converted: { label: 'Convertido', variant: 'secondary' },
  lost: { label: 'Perdido', variant: 'destructive' },
};
