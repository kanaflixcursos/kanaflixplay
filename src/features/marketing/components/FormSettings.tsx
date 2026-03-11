import { useState, useEffect } from 'react';
import { useForms } from '../hooks/useForms';
import { LeadForm, FormField } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save } from 'lucide-react';

import { generateFieldName } from '../utils';

interface FormSettingsProps {
  form: LeadForm;
}

export function FormSettings({ form }: FormSettingsProps) {
  const { updateForm, isUpdating } = useForms();
  const [name, setName] = useState(form.name);
  const [slug, setSlug] = useState(form.slug);
  const [description, setDescription] = useState(form.description || '');
  const [redirectUrl, setRedirectUrl] = useState(form.redirect_url || '');
  const [isActive, setIsActive] = useState(form.is_active);
  const [fields, setFields] = useState<FormField[]>(form.fields || []);

  const handleSave = () => {
    const payload: Partial<LeadForm> = {
      name,
      slug,
      description,
      redirect_url: redirectUrl,
      is_active: isActive,
      fields,
    };
    updateForm({ id: form.id, payload });
  };

  const addField = () => setFields([...fields, { name: '', label: '', type: 'text', required: false }]);
  const removeField = (index: number) => setFields(fields.filter((_, i) => i !== index));
  const updateField = (index: number, updates: Partial<FormField>) => {
    setFields(fields.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Configurações Gerais</Label>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Ativo</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Slug (URL)</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} /></div>
          </div>
          <div><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div><Label>URL de Redirecionamento</Label><Input value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} /></div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Campos</Label>
            <Button variant="outline" size="sm" onClick={addField}><Plus className="h-3 w-3 mr-1" /> Campo</Button>
          </div>
          <div className="space-y-3">
            {fields.map((field, i) => (
              <div key={i} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                 <div className="flex items-center gap-2">
                    <Input
                      value={field.label}
                      onChange={(e) => updateField(i, { label: e.target.value, name: generateFieldName(e.target.value) })}
                      placeholder="Label do campo"
                    />
                    <Select value={field.type} onValueChange={(v) => updateField(i, { type: v as FormField['type'] })}>
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Texto</SelectItem><SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Telefone</SelectItem><SelectItem value="select">Seleção</SelectItem>
                      </SelectContent>
                    </Select>
                    <Switch title="Obrigatório?" checked={field.required} onCheckedChange={(v) => updateField(i, { required: v })} />
                    <Button variant="ghost" size="icon" onClick={() => removeField(i)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Button onClick={handleSave} disabled={isUpdating} className="w-full">
        <Save className="h-4 w-4 mr-1" /> {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
      </Button>
    </div>
  );
}
