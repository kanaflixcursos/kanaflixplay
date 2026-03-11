import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { couponService, CouponPayload } from '../services/couponService';
import { toast } from 'sonner';

const COUPONS_QUERY_KEY = 'coupons';

export function useCoupons() {
  const queryClient = useQueryClient();

  const { data: coupons = [], isLoading, isError } = useQuery<any[]>({
    queryKey: [COUPONS_QUERY_KEY],
    queryFn: couponService.getCoupons,
  });

  const invalidateCoupons = () => {
    queryClient.invalidateQueries({ queryKey: [COUPONS_QUERY_KEY] });
  };

  const saveCoupon = useMutation({
    mutationFn: (coupon: Partial<CouponPayload> & { id?: string }) => couponService.saveCoupon(coupon),
    onSuccess: (_, variables) => {
      toast.success(variables.id ? 'Cupom atualizado!' : 'Cupom criado!');
      invalidateCoupons();
    },
    onError: (error) => {
      toast.error(`Falha ao salvar cupom: ${error.message}`);
    },
  });

  const deleteCoupon = useMutation({
    mutationFn: (id: string) => couponService.deleteCoupon(id),
    onSuccess: () => {
      toast.success('Cupom excluído.');
      invalidateCoupons();
    },
    onError: (error) => {
      toast.error(`Falha ao excluir cupom: ${error.message}`);
    },
  });

  return {
    coupons,
    isLoading,
    isError,
    saveCoupon: saveCoupon.mutate,
    isSaving: saveCoupon.isPending,
    deleteCoupon: deleteCoupon.mutate,
    isDeleting: deleteCoupon.isPending,
  };
}

export function useCoupon(id: string | undefined) {
    const { data: coupon, isLoading, isError } = useQuery({
        queryKey: [COUPONS_QUERY_KEY, 'detail', id],
        queryFn: () => id ? couponService.getCoupon(id) : null,
        enabled: !!id,
    });

    return {
        coupon,
        isLoading,
        isError,
    }
}
