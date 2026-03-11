import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignService } from '../services/campaignService';
import { Campaign } from '../types';
import { toast } from 'sonner';

const CAMPAIGNS_QUERY_KEY = 'campaigns';

export function useCampaigns() {
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading, isError } = useQuery<Campaign[]>({
    queryKey: [CAMPAIGNS_QUERY_KEY],
    queryFn: campaignService.getCampaigns,
  });

  const invalidateCampaigns = () => {
    queryClient.invalidateQueries({ queryKey: [CAMPAIGNS_QUERY_KEY] });
  };

  const saveCampaign = useMutation({
    mutationFn: (campaign: Partial<Campaign> & { id?: string }) => campaignService.saveCampaign(campaign),
    onSuccess: (data) => {
      toast.success(data.id ? 'Campanha salva!' : 'Campanha criada como rascunho.');
      invalidateCampaigns();
    },
    onError: (error) => toast.error(`Falha ao salvar: ${error.message}`),
  });

  const deleteCampaign = useMutation({
    mutationFn: (id: string) => campaignService.deleteCampaign(id),
    onSuccess: () => {
      toast.success('Campanha excluída.');
      invalidateCampaigns();
    },
    onError: (error) => toast.error(`Falha ao excluir: ${error.message}`),
  });
  
  const sendCampaign = useMutation({
    mutationFn: (id: string) => campaignService.sendCampaign(id),
    onSuccess: (data) => {
      toast.info(data.message);
      // Invalidate to update status to 'sending'
      setTimeout(invalidateCampaigns, 500);
    },
    onError: (error) => toast.error(`Falha ao iniciar envio: ${error.message}`),
  });

  return {
    campaigns,
    isLoading,
    isError,
    saveCampaign: saveCampaign.mutateAsync,
    isSaving: saveCampaign.isPending,
    deleteCampaign: deleteCampaign.mutate,
    sendCampaign: sendCampaign.mutate,
    isSending: sendCampaign.isPending,
  };
}

export function useCampaign(id: string | undefined) {
    const { data: campaign, isLoading, isError } = useQuery({
        queryKey: [CAMPAIGNS_QUERY_KEY, 'detail', id],
        queryFn: () => id ? campaignService.getCampaign(id) : null,
        enabled: !!id,
    });

    return { campaign, isLoading, isError };
}
