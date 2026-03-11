import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadService, LeadFilters } from '../services/leadService';
import { Lead, LeadStatus } from '../types';
import { toast } from 'sonner';

const LEADS_QUERY_KEY = 'leads';

export function useLeads() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<LeadFilters>({ status: 'all', tag: 'all', source: 'all', search: '' });
  const [page, setPage] = useState(0);

  const queryKey = useMemo(() => [LEADS_QUERY_KEY, filters, page], [filters, page]);

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey,
    queryFn: () => leadService.getLeads({ filters, page }),
    placeholderData: (previousData) => previousData,
    retry: 1,
  });

  const { data: stats } = useQuery({
    queryKey: ['leadStats'],
    queryFn: leadService.getLeadStats,
  });
  
  const { data: distinctTags } = useQuery({
    queryKey: ['distinctLeadTags'],
    queryFn: leadService.getDistinctTags,
  });

  const { data: distinctSources } = useQuery({
    queryKey: ['distinctLeadSources'],
    queryFn: leadService.getDistinctSources,
  });

  const invalidateLeads = () => {
    queryClient.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] });
    queryClient.invalidateQueries({ queryKey: ['leadStats'] });
    queryClient.invalidateQueries({ queryKey: ['distinctLeadTags'] });
    queryClient.invalidateQueries({ queryKey: ['distinctLeadSources'] });
  };

  const updateLeadStatus = useMutation({
    mutationFn: ({ leadId, status }: { leadId: string; status: LeadStatus }) => leadService.updateLeadStatus(leadId, status),
    onSuccess: () => {
      toast.success('Status do lead atualizado.');
      invalidateLeads();
    },
    onError: (error) => {
      toast.error(`Falha ao atualizar status: ${error.message}`);
    },
  });

  const updateLeadTags = useMutation({
    mutationFn: ({ leadId, tags }: { leadId: string; tags: string[] }) => leadService.updateLeadTags(leadId, tags),
    onSuccess: () => {
      toast.success('Tags atualizadas.');
      invalidateLeads();
    },
    onError: (error) => {
      toast.error(`Falha ao atualizar tags: ${error.message}`);
    },
  });

  const deleteLeads = useMutation({
    mutationFn: (ids: string[]) => leadService.deleteLeads(ids),
    onSuccess: (variables) => {
      toast.success(`${variables.length} lead(s) excluído(s).`);
      invalidateLeads();
    },
    onError: (error) => {
      toast.error(`Falha ao excluir leads: ${error.message}`);
    },
  });

  const bulkUpdateStatus = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: LeadStatus }) => leadService.bulkUpdateLeadStatus(ids, status),
    onSuccess: (variables) => {
      toast.success(`${variables.ids.length} lead(s) tiveram o status atualizado.`);
      invalidateLeads();
    },
    onError: (error) => {
      toast.error(`Falha ao atualizar status em massa: ${error.message}`);
    },
  });

  return {
    // State
    leads: data?.leads ?? [],
    totalCount: data?.count ?? 0,
    isLoading: isLoading || isFetching,
    isError,
    
    // Filters & Pagination
    filters,
    setFilters,
    page,
    setPage,

    // Metadata
    stats,
    distinctTags: distinctTags ?? [],
    distinctSources: distinctSources ?? [],

    // Mutations
    updateLeadStatus: updateLeadStatus.mutate,
    updateLeadTags: updateLeadTags.mutate,
    deleteLeads: deleteLeads.mutate,
    bulkUpdateStatus: bulkUpdateStatus.mutate,
  };
}
