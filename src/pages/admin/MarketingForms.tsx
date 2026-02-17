import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Copy, Trash2, FileText, Code, Pencil } from 'lucide-react';
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
  const [editingForm, setEditingForm] = useState<LeadForm | null>(null);

  // Form state
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

  const openEditDialog = (form: LeadForm) => {
    setEditingForm(form);
    setFormName(form.name);
    setFormSlug(form.slug);
    setFormDescription(form.description || '');
    setFormRedirect(form.redirect_url || '');
    setFormFields(form.fields.length > 0 ? form.fields : [
      { name: 'name', label: 'Nome', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
    ]);
    setDialogOpen(true);
  };

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

    if (editingForm) {
      const { error } = await supabase.from('lead_forms').update(payload).eq('id', editingForm.id);
      if (error) {
        toast.error(error.message.includes('duplicate') ? 'Slug já existe' : error.message);
        return;
      }
      toast.success('Formulário atualizado!');
    } else {
      const { error } = await supabase.from('lead_forms').insert(payload);
      if (error) {
        toast.error(error.message.includes('duplicate') ? 'Slug já existe' : error.message);
        return;
      }
      toast.success('Formulário criado!');
    }

    setDialogOpen(false);
    resetForm();
    fetchForms();
  };

  const resetForm = () => {
    setEditingForm(null);
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

  const generateReactCode = () => {
    const baseUrl = SUPABASE_URL + '/functions/v1/lead-capture';
    const lines: string[] = [];
    const add = (s: string) => lines.push(s);

    add('// Componente Framer Universal — Formulário Dinâmico');
    add('// Cole este código como Code Component no Framer');
    add('// Configure o "Slug do Formulário" nas props para selecionar qual formulário exibir');
    add('import { useState, useEffect, startTransition, type CSSProperties } from "react"');
    add('import { addPropertyControls, ControlType } from "framer"');
    add('');
    add('type FormField = { name: string; label: string; type: string; required: boolean }');
    add('type FormConfig = { slug: string; name: string; fields: FormField[] }');
    add('');
    add('interface DynamicFormProps {');
    add('    formSlug: string');
    add('    buttonText: string; backgroundColor: string; inputBackground: string');
    add('    inputText: string; buttonBackground: string; buttonTextColor: string');
    add('    multiSelectText: string; font: CSSProperties; buttonFont: CSSProperties');
    add('    borderRadius: number; multiSelects: { label: string; options: string[] }[]');
    add('    loadingText: string; successText: string; successUrl: string');
    add('    style?: CSSProperties');
    add('}');
    add('');
    add('const API_BASE = "' + baseUrl + '"');
    add('');
    add('/**');
    add(' * @framerSupportedLayoutWidth any-prefer-fixed');
    add(' * @framerSupportedLayoutHeight auto');
    add(' */');
    add('export default function DynamicForm(props: DynamicFormProps) {');
    add('    const {');
    add('        formSlug = "",');
    add('        buttonText = "Enviar",');
    add('        backgroundColor = "#0A0A0A", inputBackground = "#1A1A2E",');
    add('        inputText = "#FFFFFF", buttonBackground = "#3B82F6",');
    add('        buttonTextColor = "#FFFFFF", multiSelectText = "#FFFFFF",');
    add('        font, buttonFont, borderRadius = 12, multiSelects = [],');
    add('        loadingText = "Enviando...", successText = "Enviado com sucesso!",');
    add('        successUrl = "", style,');
    add('    } = props');
    add('');
    add('    const [config, setConfig] = useState<FormConfig | null>(null)');
    add('    const [configError, setConfigError] = useState("")');
    add('    const [formData, setFormData] = useState<Record<string, string>>({})');
    add('    const [errors, setErrors] = useState<Record<string, string>>({})');
    add('    const [touched, setTouched] = useState<Record<string, boolean>>({})');
    add('    const [multiSelectData, setMultiSelectData] = useState<Record<number, string[]>>({})');
    add('    const [formStatus, setFormStatus] = useState<"idle" | "loading" | "success">("idle")');
    add('');
    add('    // Fetch form config by slug');
    add('    useEffect(() => {');
    add('        if (!formSlug) { setConfig(null); setConfigError("Configure o slug do formulário nas props"); return }');
    add('        setConfigError("")');
    add('        fetch(API_BASE + "?form=" + encodeURIComponent(formSlug))');
    add('            .then(r => { if (!r.ok) throw new Error("Formulário não encontrado"); return r.json() })');
    add('            .then((data: FormConfig) => {');
    add('                setConfig(data)');
    add('                const initial: Record<string, string> = {}');
    add('                data.fields.forEach(f => { initial[f.name] = "" })');
    add('                setFormData(initial)');
    add('                setErrors({}); setTouched({})');
    add('            })');
    add('            .catch(err => setConfigError(err.message || "Erro ao carregar formulário"))');
    add('    }, [formSlug])');
    add('');
    add('    const formatPhone = (value: string): string => {');
    add('        const numbers = value.replace(/\\D/g, "")');
    add('        if (numbers.length <= 10) {');
    add('            return numbers.replace(/(\\d{2})(\\d{4})(\\d{0,4})/, (_, p1, p2, p3) => {');
    add('                let f = "(" + p1 + ") " + p2');
    add('                if (p3) f += "-" + p3');
    add('                return f');
    add('            })');
    add('        }');
    add('        return numbers.replace(/(\\d{2})(\\d{5})(\\d{0,4})/, (_, p1, p2, p3) => {');
    add('            let f = "(" + p1 + ") " + p2');
    add('            if (p3) f += "-" + p3');
    add('            return f');
    add('        })');
    add('    }');
    add('');
    add('    const validateEmail = (v: string) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v)');
    add('    const validatePhone = (v: string) => { const n = v.replace(/\\D/g, ""); return n.length === 10 || n.length === 11 }');
    add('');
    add('    const validateField = (field: FormField, value: string): string => {');
    add('        if (!field.required) return ""');
    add('        if (field.type === "email" && !validateEmail(value)) return "Email inválido"');
    add('        if (field.type === "phone" && !validatePhone(value)) return "Telefone inválido"');
    add('        if (!value.trim()) return field.label + " é obrigatório"');
    add('        return ""');
    add('    }');
    add('');
    add('    const handleChange = (fieldName: string, fieldType: string, value: string) => {');
    add('        if (fieldType === "phone") value = formatPhone(value)');
    add('        startTransition(() => {');
    add('            setFormData(prev => ({ ...prev, [fieldName]: value }))');
    add('            if (touched[fieldName]) setErrors(prev => ({ ...prev, [fieldName]: "" }))');
    add('        })');
    add('    }');
    add('');
    add('    const handleBlur = (field: FormField) => {');
    add('        startTransition(() => {');
    add('            setTouched(prev => ({ ...prev, [field.name]: true }))');
    add('            const err = validateField(field, formData[field.name] || "")');
    add('            if (err) setErrors(prev => ({ ...prev, [field.name]: err }))');
    add('        })');
    add('    }');
    add('');
    add('    const handleMultiSelectChange = (index: number, option: string) => {');
    add('        startTransition(() => {');
    add('            setMultiSelectData(prev => {');
    add('                const current = prev[index] || []');
    add('                const newSel = current.includes(option) ? current.filter(o => o !== option) : [...current, option]');
    add('                return { ...prev, [index]: newSel }');
    add('            })');
    add('        })');
    add('    }');
    add('');
    add('    const handleSubmit = async (e: React.FormEvent) => {');
    add('        e.preventDefault()');
    add('        if (!config) return');
    add('        const newErrors: Record<string, string> = {}');
    add('        const allTouched: Record<string, boolean> = {}');
    add('        config.fields.forEach(f => {');
    add('            allTouched[f.name] = true');
    add('            const err = validateField(f, formData[f.name] || "")');
    add('            if (err) newErrors[f.name] = err');
    add('        })');
    add('        startTransition(() => { setErrors(newErrors); setTouched(allTouched) })');
    add('        if (Object.values(newErrors).some(e => e !== "")) return');
    add('');
    add('        startTransition(() => setFormStatus("loading"))');
    add('        try {');
    add('            const payload: Record<string, unknown> = {}');
    add('            config.fields.forEach(f => {');
    add('                const v = (formData[f.name] || "").trim()');
    add('                payload[f.name] = f.type === "email" ? v.toLowerCase() : v');
    add('            })');
    add('            multiSelects.forEach((ms, i) => {');
    add('                if (multiSelectData[i]?.length) {');
    add('                    payload[ms.label.toLowerCase().replace(/[^a-z0-9]/g, "_")] = multiSelectData[i].join(", ")');
    add('                }');
    add('            })');
    add('            const res = await fetch(API_BASE + "?form=" + encodeURIComponent(formSlug), {');
    add('                method: "POST",');
    add('                headers: { "Content-Type": "application/json" },');
    add('                body: JSON.stringify(payload),');
    add('            })');
    add('            if (res.ok) {');
    add('                startTransition(() => setFormStatus("success"))');
    add('                if (successUrl && typeof window !== "undefined") {');
    add('                    setTimeout(() => { window.location.href = successUrl }, 1500)');
    add('                }');
    add('            } else {');
    add('                const err = await res.json().catch(() => ({}))');
    add('                startTransition(() => setFormStatus("idle"))');
    add('                alert(err.error || "Erro ao enviar formulário")');
    add('            }');
    add('        } catch (err) {');
    add('            startTransition(() => setFormStatus("idle"))');
    add('            alert("Erro de conexão. Tente novamente.")');
    add('        }');
    add('    }');
    add('');
    add('    const inputStyle: CSSProperties = {');
    add('        width: "100%", padding: "14px 18px", backgroundColor: inputBackground,');
    add('        border: "1px solid rgba(255,255,255,0.08)", borderRadius,');
    add('        color: inputText, outline: "none", transition: "all 0.2s ease", ...font,');
    add('    }');
    add('    const errorStyle: CSSProperties = { color: "#FF5588", fontSize: "12px", marginTop: "4px", ...font }');
    add('    const borderNormal = "rgba(255,255,255,0.08)"');
    add('    const borderError = "#FF5588"');
    add('');
    add('    if (configError) {');
    add('        return (');
    add('            <div style={{ width: "100%", padding: "32px", backgroundColor, borderRadius: borderRadius + 4, ...style }}>');
    add('                <p style={{ color: "#FF5588", textAlign: "center", ...font }}>{configError}</p>');
    add('            </div>');
    add('        )');
    add('    }');
    add('');
    add('    if (!config) {');
    add('        return (');
    add('            <div style={{ width: "100%", padding: "48px 32px", backgroundColor, borderRadius: borderRadius + 4, display: "flex", justifyContent: "center", ...style }}>');
    add('                <div style={{ width: 24, height: 24, border: "3px solid rgba(255,255,255,0.15)", borderTopColor: buttonBackground, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />');
    add('                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>');
    add('            </div>');
    add('        )');
    add('    }');
    add('');
    add('    return (');
    add('        <div style={{ width: "100%", padding: "32px", backgroundColor, borderRadius: borderRadius + 4, ...style }}>');
    add('            {formStatus === "loading" && (');
    add('                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 0", gap: "16px" }}>');
    add('                    <div style={{ width: 32, height: 32, border: "3px solid rgba(255,255,255,0.15)", borderTopColor: buttonBackground, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />');
    add('                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>');
    add('                    <p style={{ color: inputText, opacity: 0.7, ...font }}>{loadingText}</p>');
    add('                </div>');
    add('            )}');
    add('            {formStatus === "success" && (');
    add('                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 0", gap: "16px" }}>');
    add('                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={buttonBackground} strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>');
    add('                    <p style={{ color: inputText, ...font }}>{successText}</p>');
    add('                </div>');
    add('            )}');
    add('            {formStatus === "idle" && (');
    add('                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>');
    add('                    {config.fields.map(f => (');
    add('                        <div key={f.name}>');
    add('                            <input');
    add('                                value={formData[f.name] || ""}');
    add('                                type={f.type === "phone" ? "tel" : f.type === "email" ? "email" : "text"}');
    add('                                placeholder={f.label}');
    add('                                maxLength={f.type === "phone" ? 16 : undefined}');
    add('                                onChange={e => handleChange(f.name, f.type, e.target.value)}');
    add('                                onBlur={() => handleBlur(f)}');
    add('                                style={{ ...inputStyle, borderColor: errors[f.name] && touched[f.name] ? borderError : borderNormal }}');
    add('                            />');
    add('                            {errors[f.name] && touched[f.name] && <p style={errorStyle}>{errors[f.name]}</p>}');
    add('                        </div>');
    add('                    ))}');
    add('                    {multiSelects.map((ms, i) => (');
    add('                        <div key={i} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>');
    add('                            <span style={{ color: multiSelectText, ...font }}>{ms.label}</span>');
    add('                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>');
    add('                                {ms.options.map(opt => (');
    add('                                    <label key={opt} style={{ display: "flex", alignItems: "center", gap: "6px", color: multiSelectText, cursor: "pointer", ...font }}>');
    add('                                        <input type="checkbox" checked={(multiSelectData[i] || []).includes(opt)} onChange={() => handleMultiSelectChange(i, opt)} style={{ accentColor: buttonBackground }} />');
    add('                                        {opt}');
    add('                                    </label>');
    add('                                ))}');
    add('                            </div>');
    add('                        </div>');
    add('                    ))}');
    add('                    <button type="submit" style={{ width: "100%", padding: "14px", backgroundColor: buttonBackground, color: buttonTextColor, border: "none", borderRadius, cursor: "pointer", transition: "opacity 0.2s", ...buttonFont }}>');
    add('                        {buttonText}');
    add('                    </button>');
    add('                </form>');
    add('            )}');
    add('        </div>');
    add('    )');
    add('}');
    add('');
    add('addPropertyControls(DynamicForm, {');
    add('    formSlug: { type: ControlType.String, title: "Slug do Formulário", defaultValue: "", placeholder: "ex: landing-page" },');
    add('    buttonText: { type: ControlType.String, title: "Texto do Botão", defaultValue: "Enviar" },');
    add('    loadingText: { type: ControlType.String, title: "Texto Loading", defaultValue: "Enviando..." },');
    add('    successText: { type: ControlType.String, title: "Texto Sucesso", defaultValue: "Enviado com sucesso!" },');
    add('    successUrl: { type: ControlType.String, title: "URL Redirecionamento", defaultValue: "", placeholder: "https://exemplo.com/obrigado" },');
    add('    backgroundColor: { type: ControlType.Color, title: "Fundo", defaultValue: "#0A0A0A" },');
    add('    inputBackground: { type: ControlType.Color, title: "Fundo Input", defaultValue: "#1A1A2E" },');
    add('    inputText: { type: ControlType.Color, title: "Texto Input", defaultValue: "#FFFFFF" },');
    add('    buttonBackground: { type: ControlType.Color, title: "Fundo Botão", defaultValue: "#3B82F6" },');
    add('    buttonTextColor: { type: ControlType.Color, title: "Texto Botão", defaultValue: "#FFFFFF" },');
    add('    multiSelectText: { type: ControlType.Color, title: "Texto Seleção Múltipla", defaultValue: "#FFFFFF" },');
    add('    font: { type: ControlType.Font, title: "Fonte", controls: "extended", defaultFontType: "sans-serif", defaultValue: { fontSize: "15px", variant: "Medium", letterSpacing: "-0.01em", lineHeight: "1.3em" } },');
    add('    buttonFont: { type: ControlType.Font, title: "Fonte Botão", controls: "extended", defaultFontType: "sans-serif", defaultValue: { fontSize: "14px", variant: "Semibold", letterSpacing: "-0.01em", lineHeight: "1em" } },');
    add('    borderRadius: { type: ControlType.Number, title: "Border Radius", defaultValue: 12, min: 0, max: 32, step: 1 },');
    add('    multiSelects: { type: ControlType.Array, title: "Seleção Múltipla", control: { type: ControlType.Object, controls: { label: { type: ControlType.String, title: "Label", defaultValue: "Selecione opções" }, options: { type: ControlType.Array, title: "Opções", control: { type: ControlType.String }, defaultValue: ["Opção 1", "Opção 2", "Opção 3"] } } }, defaultValue: [] },');
    add('})');

    return lines.join('\n');
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
        <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Novo Formulário</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingForm ? 'Editar Formulário' : 'Criar Formulário'}</DialogTitle>
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
              <Button onClick={handleSaveForm}>{editingForm ? 'Salvar' : 'Criar Formulário'}</Button>
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
                      onClick={() => openEditDialog(form)}
                    >
                      <Pencil className="h-3 w-3 mr-1" /> Editar
                    </Button>
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
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-80">{generateReactCode()}</pre>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(generateReactCode());
                  toast.success('Código copiado!');
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
