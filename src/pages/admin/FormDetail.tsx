import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from '@/features/marketing/hooks/useForms';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import { FormSettings } from '@/features/marketing/components/FormSettings';
import { FormMetrics } from '@/features/marketing/components/FormMetrics';
import { CodeGenerationDialog } from '@/features/marketing/components/CodeGenerationDialog';

function FormDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-3 grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}

export default function FormDetail() {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const { form, isLoading, isError } = useForm(formId);

  if (isLoading) return <FormDetailSkeleton />;

  if (isError || !form) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/admin/marketing/forms')}>
          <ArrowLeft className="h-5 w-5 mr-2" /> Voltar
        </Button>
        <p className="text-muted-foreground">Formulário não encontrado ou erro ao carregar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/marketing/forms')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{form.name}</h1>
              <Badge variant={form.is_active ? 'default' : 'secondary'} className="text-[10px]">
                {form.is_active ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">/{form.slug}</p>
          </div>
        </div>
        <CodeGenerationDialog formName={form.name} formSlug={form.slug} />
      </div>

      <Tabs defaultValue="metrics">
        <TabsList>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>
        <TabsContent value="metrics">
            <FormMetrics form={form} />
        </TabsContent>
        <TabsContent value="settings">
            <FormSettings form={form} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
