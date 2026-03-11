import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useForms } from '@/features/marketing/hooks/useForms';
import { LeadForm } from '@/features/marketing/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Trash2, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { CreateFormDialog } from '@/features/marketing/components/CreateFormDialog';

export default function MarketingForms() {
  const navigate = useNavigate();
  const { forms, isLoading, updateForm, deleteForm } = useForms();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<LeadForm | null>(null);

  const handleToggleActive = (id: string, active: boolean) => {
    updateForm({ id, payload: { is_active: active } });
  };

  const handleDeleteRequest = (form: LeadForm) => {
    setFormToDelete(form);
    setDeleteDialogOpen(true);
  };

  const performDelete = () => {
    if (formToDelete) {
      deleteForm(formToDelete.id, {
        onSuccess: () => setDeleteDialogOpen(false),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/marketing')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Formulários</h1>
            <p className="text-muted-foreground text-sm mt-1">Crie formulários de captura de leads</p>
          </div>
        </div>
        <CreateFormDialog />
      </div>

      {isLoading ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : forms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum formulário criado</p>
            <p className="text-xs mt-1">Crie seu primeiro formulário de captura de leads</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {forms.map((form, i) => (
            <motion.div
              key={form.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card className="flex flex-col h-full">
                <CardContent 
                  className="p-5 flex-grow cursor-pointer"
                  onClick={() => navigate(`/admin/marketing/forms/${form.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-foreground">{form.name}</h3>
                      {form.description && <p className="text-xs text-muted-foreground mt-0.5">{form.description}</p>}
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Switch checked={form.is_active} onCheckedChange={(v) => handleToggleActive(form.id, v)} />
                      <Badge variant={form.is_active ? 'default' : 'secondary'} className="text-[10px]">{form.is_active ? 'Ativo' : 'Inativo'}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <code className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded truncate flex-1">/{form.slug}</code>
                    <span className="text-[10px] text-muted-foreground">{Array.isArray(form.fields) ? form.fields.length : 0} campos</span>
                  </div>
                </CardContent>
                <div className="p-3 border-t flex items-center justify-between">
                   <p className="text-[10px] text-muted-foreground">Criado em {format(new Date(form.created_at), 'dd/MM/yyyy')}</p>
                   <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive" onClick={() => handleDeleteRequest(form)}>
                      <Trash2 className="h-3 w-3 mr-1" /> Excluir
                    </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir formulário?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o formulário "{formToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={performDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
