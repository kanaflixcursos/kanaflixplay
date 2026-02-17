import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Copy, Trash2, FileText, Code, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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
};

const SUPABASE_URL = 'https://fwytxapogblcesvyxrzt.supabase.co';

export default function MarketingForms() {
  const navigate = useNavigate();
  const [forms, setForms] = useState<LeadForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<LeadForm | null>(null);

  // New form state
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
    setForms((data as unknown as LeadForm[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchForms(); }, [fetchForms]);

  const handleCreateForm = async () => {
    if (!formName || !formSlug) {
      toast.error('Preencha nome e slug');
      return;
    }
    const { error } = await supabase.from('lead_forms').insert({
      name: formName,
      slug: formSlug,
      description: formDescription || null,
      redirect_url: formRedirect || null,
      fields: formFields as unknown as any,
    });
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

  const handleToggleActive = async (id: string, active: boolean) => {
    await supabase.from('lead_forms').update({ is_active: active }).eq('id', id);
    fetchForms();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('lead_forms').delete().eq('id', id);
    toast.success('Formulário excluído');
    fetchForms();
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

  const generateApiEndpoint = (slug: string) => `${SUPABASE_URL}/functions/v1/lead-capture?form=${slug}`;

  const generateReactCode = (form: LeadForm) => {
    return `// React Component para Framer ou uso externo
import { useState } from 'react';

export default function LeadForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('${generateApiEndpoint(form.slug)}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  if (success) return <p>Obrigado! Entraremos em contato.</p>;

  return (
    <form onSubmit={handleSubmit}>
${form.fields.map(f => `      <input
        name="${f.name}"
        placeholder="${f.label}"
        type="${f.type === 'phone' ? 'tel' : f.type}"
        ${f.required ? 'required' : ''}
        onChange={(e) => setFormData(d => ({ ...d, [e.target.name]: e.target.value }))}
      />`).join('\n')}
      <button type="submit" disabled={loading}>
        {loading ? 'Enviando...' : 'Enviar'}
      </button>
    </form>
  );
}`;
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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Novo Formulário</Button>
          </DialogTrigger>
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
                <div className="space-y-2">
                  {formFields.map((field, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
                      <Input
                        value={field.label}
                        onChange={(e) => {
                          updateField(i, { label: e.target.value, name: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '_') });
                        }}
                        placeholder="Label"
                        className="flex-1 h-8 text-sm"
                      />
                      <Select value={field.type} onValueChange={(v) => updateField(i, { type: v as FormField['type'] })}>
                        <SelectTrigger className="w-24 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Texto</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Telefone</SelectItem>
                        </SelectContent>
                      </Select>
                      <Switch checked={field.required} onCheckedChange={(v) => updateField(i, { required: v })} />
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeField(i)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateForm}>Criar Formulário</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
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
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {forms.map((form, i) => (
            <motion.div
              key={form.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-foreground">{form.name}</h3>
                      {form.description && <p className="text-xs text-muted-foreground mt-0.5">{form.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={form.is_active} onCheckedChange={(v) => handleToggleActive(form.id, v)} />
                      <Badge variant={form.is_active ? 'default' : 'secondary'} className="text-[10px]">
                        {form.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mb-3">
                    <code className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded truncate flex-1">
                      /{form.slug}
                    </code>
                    <span className="text-[10px] text-muted-foreground">{form.fields.length} campos</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        navigator.clipboard.writeText(generateApiEndpoint(form.slug));
                        toast.success('Endpoint copiado!');
                      }}
                    >
                      <Copy className="h-3 w-3 mr-1" /> API
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => { setSelectedForm(form); setCodeDialogOpen(true); }}
                    >
                      <Code className="h-3 w-3 mr-1" /> React
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 text-destructive"
                      onClick={() => handleDelete(form.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  <p className="text-[10px] text-muted-foreground mt-3">
                    Criado em {format(new Date(form.created_at), 'dd/MM/yyyy')}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Code dialog */}
      <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Código React — {selectedForm?.name}</DialogTitle>
          </DialogHeader>
          {selectedForm && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">API Endpoint (POST)</Label>
                <code className="text-xs bg-muted p-2 rounded block break-all">{generateApiEndpoint(selectedForm.slug)}</code>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Componente React</Label>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-80">{generateReactCode(selectedForm)}</pre>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(generateReactCode(selectedForm));
                  toast.success('Código copiado!');
                }}
              >
                <Copy className="h-4 w-4 mr-1" /> Copiar Código
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
