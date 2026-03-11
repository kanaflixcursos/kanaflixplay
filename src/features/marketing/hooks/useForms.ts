import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formService } from '../services/formService';
import { LeadForm } from '../types';
import { toast } from 'sonner';

const FORMS_QUERY_KEY = 'forms';

export function useForms() {
  const queryClient = useQueryClient();

  const { data: forms = [], isLoading, isError } = useQuery({
    queryKey: [FORMS_QUERY_KEY],
    queryFn: formService.getForms,
  });

  const invalidateForms = () => {
    queryClient.invalidateQueries({ queryKey: [FORMS_QUERY_KEY] });
  };
  
  const createForm = useMutation({
    mutationFn: (payload: Omit<LeadForm, 'id' | 'created_at'>) => formService.createForm(payload),
    onSuccess: () => {
      toast.success('Formulário criado!');
      invalidateForms();
    },
    onError: (error) => {
      const isDuplicate = error.message.includes('duplicate');
      toast.error(isDuplicate ? 'Já existe um formulário com esse slug.' : `Falha ao criar formulário: ${error.message}`);
    },
  });

  const updateForm = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<LeadForm> }) => formService.updateForm(id, payload),
    onSuccess: () => {
      toast.success('Formulário salvo!');
      invalidateForms();
      // Also invalidate the specific form query if it exists
      queryClient.invalidateQueries({ queryKey: [FORMS_QUERY_KEY, 'detail'] });
    },
    onError: (error) => {
      const isDuplicate = error.message.includes('duplicate');
      toast.error(isDuplicate ? 'Já existe um formulário com esse slug.' : `Falha ao salvar formulário: ${error.message}`);
    },
  });

  const deleteForm = useMutation({
    mutationFn: (id: string) => formService.deleteForm(id),
    onSuccess: () => {
      toast.success('Formulário excluído.');
      invalidateForms();
    },
    onError: (error) => {
      toast.error(`Falha ao excluir formulário: ${error.message}`);
    },
  });

  return {
    forms,
    isLoading,
    isError,
    createForm: createForm.mutateAsync, // use async for dialog closing
    isCreating: createForm.isPending,
    updateForm: updateForm.mutate,
    isUpdating: updateForm.isPending,
    deleteForm: deleteForm.mutate,
    isDeleting: deleteForm.isPending,
  };
}

export function useForm(id: string | undefined) {
    const { data: form, isLoading, isError } = useQuery({
        queryKey: [FORMS_QUERY_KEY, 'detail', id],
        queryFn: () => id ? formService.getForm(id) : null,
        enabled: !!id,
    });

    return {
        form,
        isLoading,
        isError,
    }
}
