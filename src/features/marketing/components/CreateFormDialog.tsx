import { useState } from 'react';
import { useForms } from '../hooks/useForms';
import { FormField } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// A helper to generate a safe field name from a label
const generateFieldName = (label: string) => {
  return label
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric chars except space and hyphen
    .trim()
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .slice(0, 50); // Truncate
}

const initialFields: FormField[] = [
  { name: 'name', label: 'Nome', type: 'text', required: true, options: [] },
  { name: 'email', label: 'Email', type: 'email', required: true, options: [] },
];

export function CreateFormDialog() {
  const { createForm } = useForms();
  const [open, setOpen] = useState(false);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [fields, setFields] = useState<FormField[]>(initialFields);

  const reset = () => {
    setName('');
    setSlug('');
    setDescription('');
    setRedirectUrl('');
    setFields(initialFields);
  };

  const handleSave = async () => {
    if (!name || !slug) {
      toast.error('Nome e Slug são obrigatórios.');
      return;
    }

    try {
      await createForm({
        name,
        slug,
        description,
        redirect_url: redirectUrl || null,
        fields: fields as any,
        is_active: true,
      });
      reset();
      setOpen(false);
    } catch (e) {
      // Errors are handled by useMutation's onError
    }
  };

  const addField = () => {
    setFields([...fields, { name: '', label: '', type: 'text', required: false, options: [] }]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    setFields(fields.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };
  
  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) reset(); }}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-1" /> Novo Formulário</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Criar Formulário</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Contato Site" /></div>
            <div><Label>Slug (URL)</Label><Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="ex: contato-site" /></div>
          </div>
          <div><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" rows={2} /></div>
          <div><Label>URL de Redirecionamento (opcional)</Label><Input value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} placeholder="https://..." /></div>

          <div>
            <div className="flex items-center justify-between mb-2"><Label>Campos</Label><Button variant="outline" size="sm" onClick={addField}><Plus className="h-3 w-3 mr-1" /> Campo</Button></div>
            <div className="space-y-3">
              {fields.map((field, i) => (
                <div key={i} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={field.label}
                      onChange={(e) => updateField(i, { label: e.target.value, name: generateFieldName(e.target.value) })}
                      placeholder="Label do campo" className="flex-1 h-8 text-sm"
                    />
                    <Select value={field.type} onValueChange={(v) => updateField(i, { type: v as FormField['type'] })}>
                      <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="text">Texto</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="phone">Telefone</SelectItem><SelectItem value="select">Seleção</SelectItem></SelectContent>
                    </Select>
                    <Switch title="Obrigatório?" checked={field.required} onCheckedChange={(v) => updateField(i, { required: v })} />
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeField(i)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter><Button onClick={handleSave}>Criar Formulário</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
