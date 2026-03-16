import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCombos, fetchCombo, type Combo } from '@/services/comboService';

export const comboKeys = {
  all: ['combos'] as const,
  list: () => ['combos', 'list'] as const,
  detail: (id: string) => ['combos', 'detail', id] as const,
};

export function useCombos() {
  return useQuery<Combo[]>({
    queryKey: comboKeys.list(),
    queryFn: fetchCombos,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCombo(comboId: string | undefined) {
  return useQuery<Combo | null>({
    queryKey: comboKeys.detail(comboId || ''),
    queryFn: () => fetchCombo(comboId!),
    enabled: !!comboId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useInvalidateCombos() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: comboKeys.all });
}
