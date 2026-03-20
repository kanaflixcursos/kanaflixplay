import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Trash2, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DataList, DataListColumn } from '@/components/admin/DataList';

type FormField = { name: string; label: string; type: 'text' | 'email' | 'phone' | 'select'; required: boolean; options?: string[] };
type LeadForm = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  fields: FormField[];
  redirect_url: string | null;
  is_active: boolean;
  created_at: string;
  leadCount?: number;
};

export default function MarketingForms() {
  const navigate = useNavigate();
  const [forms, setForms] = useState<LeadForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formRedirect, setFormRedirect] = useState('');
  const [formFields, setFormFields] = useState<FormField[]>([
    { name: 'name', label: 'Nome', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
  ]);

  const fetchForms = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('lead_forms').select('*').order('created_at', { ascending: false });
    const formsList = (data as unknown as LeadForm[]) || [];

    // Fetch lead counts for each form
    if (formsList.length > 0) {
      const counts = await Promise.all(
        formsList.map(f =>
          supabase.from('leads').select('*', { count: 'exact', head: true }).eq('form_id', f.id)
        )
      );
      formsList.forEach((f, i) => {
        f.leadCount = counts[i].count || 0;
      });
    }

    setForms(formsList);
    setLoading(false);
  }, []);

  useEffect(() => { fetchForms(); }, [fetchForms]);

  const handleSaveForm = async () => {
    if (!formName || !formSlug) {
      toast.error('Preencha nome e slug');
      return;
    }
    const payload = {
      name: formName,
      slug: formSlug,
      description: formDescription || null,
      redirect_url: formRedirect || null,
      fields: formFields as unknown as any,
    };
    const { error } = await supabase.from('lead_forms').insert(payload);
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Slug já existe' : error.message);
      return;
    }
    toast.success('Formulário criado!');
    setDialogOpen(false);
    resetForm();
    fetchForms();
  };

  const resetForm = () => {
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setFormRedirect('');
    setFormFields([
      { name: 'name', label: 'Nome', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
    ]);
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) resetForm();
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await supabase.from('lead_forms').update({ is_active: active }).eq('id', id);
    setForms(prev => prev.map(f => f.id === id ? { ...f, is_active: active } : f));
  };

  const handleDelete = async (id: string) => {
    await supabase.from('lead_forms').delete().eq('id', id);
    toast.success('Formulário excluído');
    fetchForms();
  };

  const handleExportCSV = async (form: LeadForm) => {
    const { data: leads } = await supabase
      .from('leads')
      .select('name, email, phone, status, created_at, custom_data')
      .eq('form_id', form.id)
      .order('created_at', { ascending: false });

    if (!leads || leads.length === 0) {
      toast.error('Nenhum lead para exportar');
      return;
    }

    const headers = ['Nome', 'Email', 'Telefone', 'Status', 'Data'];
    const rows = leads.map(l => [
      l.name || '',
      l.email,
      l.phone || '',
      l.status,
      format(new Date(l.created_at), 'dd/MM/yyyy HH:mm'),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${form.slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado!');
  };

  const addField = () => {
    setFormFields([...formFields, { name: '', label: '', type: 'text', required: false }]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    setFormFields(formFields.map((f, i) => i === index ? { ...f, ...updates } : f));
  };

  const removeField = (index: number) => {
    setFormFields(formFields.filter((_, i) => i !== index));
  };

  const addOption = (fieldIndex: number) => {
    const field = formFields[fieldIndex];
    updateField(fieldIndex, { options: [...(field.options || []), ''] });
  };

  const updateOption = (fieldIndex: number, optIndex: number, value: string) => {
    const field = formFields[fieldIndex];
    const options = [...(field.options || [])];
    options[optIndex] = value;
    updateField(fieldIndex, { options });
  };

  const removeOption = (fieldIndex: number, optIndex: number) => {
    const field = formFields[fieldIndex];
    updateField(fieldIndex, { options: (field.options || []).filter((_, i) => i !== optIndex) });
  };

  const columns: DataListColumn<LeadForm>[] = [
    {
      key: 'name',
      header: 'Nome',
      render: (form) => (
        <div>
          <p className="font-medium text-foreground">{form.name}</p>
          {form.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{form.description}</p>}
        </div>
      ),
    },
    {
      key: 'slug',
      header: 'Slug',
      render: (form) => (
        <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">/{form.slug}</code>
      ),
      hideMobile: true,
    },
    {
      key: 'leads',
      header: 'Leads',
      render: (form) => (
        <span className="text-sm font-medium tabular-nums">{form.leadCount ?? 0}</span>
      ),
      width: '80px',
      align: 'center',
    },
    {
      key: 'redirect',
      header: 'Redirecionamento',
      render: (form) => (
        <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
          {form.redirect_url || '—'}
        </span>
      ),
      hideMobile: true,
    },
    {
      key: 'actions',
      header: '',
      width: '180px',
      render: (form) => (
        <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={form.is_active}
            onCheckedChange={(v) => handleToggleActive(form.id, v)}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleExportCSV(form)}
            title="Exportar CSV"
          >
            <Download className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir formulário</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir <strong>"{form.name}"</strong>? Essa ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => handleDelete(form.id)}
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/marketing')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Formulários</h1>
          <p className="text-muted-foreground text-sm mt-1">Crie formulários de captura de leads</p>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DataList
          title="Formulários"
          columns={columns}
          data={forms}
          loading={loading}
          searchPlaceholder="Buscar formulário..."
          searchFilter={(form, query) =>
            form.name.toLowerCase().includes(query.toLowerCase()) ||
            form.slug.toLowerCase().includes(query.toLowerCase())
          }
          onRowClick={(form) => navigate(`/admin/marketing/forms/${form.id}`)}
          emptyIcon={<FileText className="h-12 w-12" />}
          emptyMessage="Nenhum formulário criado"
          headerActions={
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Novo</Button>
            </DialogTrigger>
          }
        />
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Formulário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Landing Page" />
              </div>
              <div>
                <Label>Slug (URL)</Label>
                <Input value={formSlug} onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="ex: landing-page" />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Opcional" rows={2} />
            </div>
            <div>
              <Label>URL de Redirecionamento (opcional)</Label>
              <Input value={formRedirect} onChange={(e) => setFormRedirect(e.target.value)} placeholder="https://..." />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Campos</Label>
                <Button variant="outline" size="sm" onClick={addField}><Plus className="h-3 w-3 mr-1" /> Campo</Button>
              </div>
              <div className="space-y-3">
                {formFields.map((field, i) => (
                  <div key={i} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={field.label}
                        onChange={(e) => {
                          updateField(i, { label: e.target.value, name: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_') });
                        }}
                        placeholder="Label"
                        className="flex-1 h-8 text-sm"
                      />
                      <Select value={field.type} onValueChange={(v) => {
                        const updates: Partial<FormField> = { type: v as FormField['type'] };
                        if (v === 'select' && !field.options?.length) {
                          updates.options = ['Opção 1', 'Opção 2', 'Opção 3'];
                        }
                        updateField(i, updates);
                      }}>
                        <SelectTrigger className="w-28 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Texto</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Telefone</SelectItem>
                          <SelectItem value="select">Seleção Múltipla</SelectItem>
                        </SelectContent>
                      </Select>
                      <Switch checked={field.required} onCheckedChange={(v) => updateField(i, { required: v })} />
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeField(i)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    {field.type === 'select' && (
                      <div className="pl-2 space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Opções</Label>
                        {(field.options || []).map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-1.5">
                            <Input
                              value={opt}
                              onChange={(e) => updateOption(i, oi, e.target.value)}
                              placeholder={`Opção ${oi + 1}`}
                              className="h-7 text-xs flex-1"
                            />
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeOption(i, oi)}>
                              <Trash2 className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => addOption(i)}>
                          <Plus className="h-2.5 w-2.5 mr-0.5" /> Opção
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveForm}>Criar Formulário</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
