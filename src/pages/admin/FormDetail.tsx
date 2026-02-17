import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Copy, Trash2, Code, Save, Users, BarChart3, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import StatCard from '@/components/StatCard';

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

type Lead = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  status: string;
  created_at: string;
  custom_data: Record<string, unknown> | null;
};

const SUPABASE_URL = 'https://fwytxapogblcesvyxrzt.supabase.co';

export default function FormDetail() {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<LeadForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);

  // Metrics
  const [totalLeads, setTotalLeads] = useState(0);
  const [newLeads, setNewLeads] = useState(0);
  const [convertedLeads, setConvertedLeads] = useState(0);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Edit state
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formRedirect, setFormRedirect] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formFields, setFormFields] = useState<FormField[]>([]);

  const fetchForm = useCallback(async () => {
    if (!formId) return;
    setLoading(true);
    const { data } = await supabase.from('lead_forms').select('*').eq('id', formId).single();
    if (data) {
      const f = data as unknown as LeadForm;
      setForm(f);
      setFormName(f.name);
      setFormSlug(f.slug);
      setFormDescription(f.description || '');
      setFormRedirect(f.redirect_url || '');
      setFormActive(f.is_active);
      setFormFields(f.fields.length > 0 ? f.fields : [
        { name: 'name', label: 'Nome', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
      ]);
    }
    setLoading(false);
  }, [formId]);

  const fetchMetrics = useCallback(async () => {
    if (!formId) return;
    setMetricsLoading(true);
    const [{ count: total }, { count: newCount }, { count: converted }, { data: leadsData }] = await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('form_id', formId),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('form_id', formId).eq('status', 'new'),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('form_id', formId).eq('status', 'converted'),
      supabase.from('leads').select('*').eq('form_id', formId).order('created_at', { ascending: false }).limit(20),
    ]);
    setTotalLeads(total || 0);
    setNewLeads(newCount || 0);
    setConvertedLeads(converted || 0);
    setLeads((leadsData as unknown as Lead[]) || []);
    setMetricsLoading(false);
  }, [formId]);

  useEffect(() => { fetchForm(); fetchMetrics(); }, [fetchForm, fetchMetrics]);

  const handleSave = async () => {
    if (!formId || !formName || !formSlug) {
      toast.error('Preencha nome e slug');
      return;
    }
    if (formRedirect && !formRedirect.startsWith('https://')) {
      toast.error('A URL de redirecionamento deve começar com https://');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('lead_forms').update({
      name: formName,
      slug: formSlug,
      description: formDescription || null,
      redirect_url: formRedirect || null,
      is_active: formActive,
      fields: formFields as unknown as any,
    }).eq('id', formId);
    setSaving(false);
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Slug já existe' : error.message);
      return;
    }
    toast.success('Formulário salvo!');
    fetchForm();
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
    const options = [...(field.options || []), ''];
    updateField(fieldIndex, { options });
  };

  const updateOption = (fieldIndex: number, optIndex: number, value: string) => {
    const field = formFields[fieldIndex];
    const options = [...(field.options || [])];
    options[optIndex] = value;
    updateField(fieldIndex, { options });
  };

  const removeOption = (fieldIndex: number, optIndex: number) => {
    const field = formFields[fieldIndex];
    const options = (field.options || []).filter((_, i) => i !== optIndex);
    updateField(fieldIndex, { options });
  };

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
    add('type FormField = { name: string; label: string; type: string; required: boolean; options?: string[] }');
    add('type FormConfig = { slug: string; name: string; fields: FormField[]; redirect_url?: string }');
    add('');
    add('interface DynamicFormProps {');
    add('    formSlug: string');
    add('    buttonText: string; backgroundColor: string; inputBackground: string');
    add('    inputText: string; buttonBackground: string; buttonTextColor: string');
    add('    font: CSSProperties; buttonFont: CSSProperties');
    add('    borderRadius: number');
    add('    loadingText: string; successText: string');
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
    add('        buttonTextColor = "#FFFFFF",');
    add('        font, buttonFont, borderRadius = 12,');
    add('        loadingText = "Enviando...", successText = "Enviado com sucesso!",');
    add('        style,');
    add('    } = props');
    add('');
    add('    const [config, setConfig] = useState<FormConfig | null>(null)');
    add('    const [configError, setConfigError] = useState("")');
    add('    const [formData, setFormData] = useState<Record<string, string>>({})');
    add('    const [selectData, setSelectData] = useState<Record<string, string[]>>({})');
    add('    const [errors, setErrors] = useState<Record<string, string>>({})');
    add('    const [touched, setTouched] = useState<Record<string, boolean>>({})');
    add('    const [formStatus, setFormStatus] = useState<"idle" | "loading" | "success">("idle")');
    add('');
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
    add('        if (field.type === "select") {');
    add('            const sel = selectData[field.name] || []');
    add('            if (sel.length === 0) return field.label + " é obrigatório"');
    add('            return ""');
    add('        }');
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
    add('    const handleSelectToggle = (fieldName: string, option: string) => {');
    add('        startTransition(() => {');
    add('            setSelectData(prev => {');
    add('                const current = prev[fieldName] || []');
    add('                const newSel = current.includes(option) ? current.filter(o => o !== option) : [...current, option]');
    add('                return { ...prev, [fieldName]: newSel }');
    add('            })');
    add('            if (touched[fieldName]) setErrors(prev => ({ ...prev, [fieldName]: "" }))');
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
    add('                if (f.type === "select") {');
    add('                    payload[f.name] = (selectData[f.name] || []).join(", ")');
    add('                } else {');
    add('                    const v = (formData[f.name] || "").trim()');
    add('                    payload[f.name] = f.type === "email" ? v.toLowerCase() : v');
    add('                }');
    add('            })');
    add('            const res = await fetch(API_BASE + "?form=" + encodeURIComponent(formSlug), {');
    add('                method: "POST",');
    add('                headers: { "Content-Type": "application/json" },');
    add('                body: JSON.stringify(payload),');
    add('            })');
    add('            if (res.ok) {');
    add('                const result = await res.json()');
    add('                startTransition(() => setFormStatus("success"))');
    add('                const redirectTo = result.redirect_url || config.redirect_url || ""');
    add('                if (redirectTo && typeof window !== "undefined") {');
    add('                    const finalUrl = redirectTo.startsWith("http") ? redirectTo : "https://" + redirectTo');
    add('                    setTimeout(() => { window.location.href = finalUrl }, 1500)');
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
    add('                            {f.type === "select" ? (');
    add('                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>');
    add('                                    <span style={{ color: inputText, ...font }}>{f.label}</span>');
    add('                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>');
    add('                                        {(f.options || []).map(opt => (');
    add('                                            <label key={opt} style={{ display: "flex", alignItems: "center", gap: "6px", color: inputText, cursor: "pointer", ...font }}>');
    add('                                                <input type="checkbox" checked={(selectData[f.name] || []).includes(opt)} onChange={() => handleSelectToggle(f.name, opt)} style={{ accentColor: buttonBackground }} />');
    add('                                                {opt}');
    add('                                            </label>');
    add('                                        ))}');
    add('                                    </div>');
    add('                                    {errors[f.name] && touched[f.name] && <p style={errorStyle}>{errors[f.name]}</p>}');
    add('                                </div>');
    add('                            ) : (');
    add('                                <>');
    add('                                    <input');
    add('                                        value={formData[f.name] || ""}');
    add('                                        type={f.type === "phone" ? "tel" : f.type === "email" ? "email" : "text"}');
    add('                                        placeholder={f.label}');
    add('                                        maxLength={f.type === "phone" ? 16 : undefined}');
    add('                                        onChange={e => handleChange(f.name, f.type, e.target.value)}');
    add('                                        onBlur={() => handleBlur(f)}');
    add('                                        style={{ ...inputStyle, borderColor: errors[f.name] && touched[f.name] ? borderError : borderNormal }}');
    add('                                    />');
    add('                                    {errors[f.name] && touched[f.name] && <p style={errorStyle}>{errors[f.name]}</p>}');
    add('                                </>');
    add('                            )}');
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
    add('    backgroundColor: { type: ControlType.Color, title: "Fundo", defaultValue: "#0A0A0A" },');
    add('    inputBackground: { type: ControlType.Color, title: "Fundo Input", defaultValue: "#1A1A2E" },');
    add('    inputText: { type: ControlType.Color, title: "Texto Input", defaultValue: "#FFFFFF" },');
    add('    buttonBackground: { type: ControlType.Color, title: "Fundo Botão", defaultValue: "#3B82F6" },');
    add('    buttonTextColor: { type: ControlType.Color, title: "Texto Botão", defaultValue: "#FFFFFF" },');
    add('    font: { type: ControlType.Font, title: "Fonte", controls: "extended", defaultFontType: "sans-serif", defaultValue: { fontSize: "15px", variant: "Medium", letterSpacing: "-0.01em", lineHeight: "1.3em" } },');
    add('    buttonFont: { type: ControlType.Font, title: "Fonte Botão", controls: "extended", defaultFontType: "sans-serif", defaultValue: { fontSize: "14px", variant: "Semibold", letterSpacing: "-0.01em", lineHeight: "1em" } },');
    add('    borderRadius: { type: ControlType.Number, title: "Border Radius", defaultValue: 12, min: 0, max: 32, step: 1 },');
    add('})');

    return lines.join('\n');
  };

  const generateApiEndpoint = (slug: string) => `${SUPABASE_URL}/functions/v1/lead-capture?form=${slug}`;

  if (loading) {
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

  if (!form) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/admin/marketing/forms')}>
          <ArrowLeft className="h-5 w-5 mr-2" /> Voltar
        </Button>
        <p className="text-muted-foreground">Formulário não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            navigator.clipboard.writeText(generateApiEndpoint(form.slug));
            toast.success('Endpoint copiado!');
          }}>
            <Copy className="h-3.5 w-3.5 mr-1" /> API
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCodeDialogOpen(true)}>
            <Code className="h-3.5 w-3.5 mr-1" /> React
          </Button>
        </div>
      </div>

      <Tabs defaultValue="metrics">
        <TabsList>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        {/* === METRICS TAB === */}
        <TabsContent value="metrics" className="space-y-6">
          <div className="grid gap-3 grid-cols-3">
            <StatCard icon={Users} title="Total de Leads" value={metricsLoading ? '—' : totalLeads} loading={metricsLoading} />
            <StatCard icon={Calendar} title="Novos" value={metricsLoading ? '—' : newLeads} loading={metricsLoading} />
            <StatCard icon={BarChart3} title="Convertidos" value={metricsLoading ? '—' : convertedLeads} loading={metricsLoading} />
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-muted-foreground">Nome</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Telefone</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Dados Extras</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-muted-foreground">
                          Nenhum lead capturado neste formulário ainda
                        </td>
                      </tr>
                    ) : leads.map(lead => (
                      <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3">{lead.name || '—'}</td>
                        <td className="p-3 text-muted-foreground">{lead.email}</td>
                        <td className="p-3 text-muted-foreground">{lead.phone || '—'}</td>
                        <td className="p-3">
                          <Badge variant={lead.status === 'converted' ? 'default' : 'secondary'} className="text-[10px]">
                            {lead.status === 'new' ? 'Novo' : lead.status === 'qualified' ? 'Qualificado' : lead.status === 'converted' ? 'Convertido' : lead.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-xs max-w-[280px]">
                          {lead.custom_data && Object.keys(lead.custom_data).length > 0 ? (
                            <div className="space-y-1.5">
                              {Object.entries(lead.custom_data).map(([key, value]) => {
                                // Try to find the field label from form config
                                const fieldConfig = form?.fields?.find(f => f.name === key);
                                const displayLabel = fieldConfig?.label || key;
                                const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
                                return (
                                  <div key={key} className="flex flex-col gap-0.5">
                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{displayLabel}</span>
                                    <span className="text-foreground">{displayValue}</span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : '—'}
                        </td>
                        <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">{format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === SETTINGS TAB === */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Configurações Gerais</Label>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Ativo</Label>
                  <Switch checked={formActive} onCheckedChange={setFormActive} />
                </div>
              </div>

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
                <Input 
                  value={formRedirect} 
                  onChange={(e) => {
                    let val = e.target.value;
                    if (val && !val.startsWith('https://') && !val.startsWith('https:/')) {
                      val = val.replace(/^(https?:\/\/|http:\/\/|\/\/)?/, 'https://');
                    }
                    setFormRedirect(val);
                  }} 
                  placeholder="https://exemplo.com" 
                />
                {formRedirect && !formRedirect.startsWith('https://') && (
                  <p className="text-xs text-destructive mt-1">A URL deve começar com https://</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Campos</Label>
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
                      <div className="flex items-center gap-1">
                        <Label className="text-[10px] text-muted-foreground">Obrig.</Label>
                        <Switch checked={field.required} onCheckedChange={(v) => updateField(i, { required: v })} />
                      </div>
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
                        <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => addOption(i)}>
                          <Plus className="h-2.5 w-2.5 mr-0.5" /> Opção
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                <Save className="h-4 w-4 mr-1" /> {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Code dialog */}
      <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Código React — {form.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">API Endpoint (POST)</Label>
              <code className="text-xs bg-muted p-2 rounded block break-all">{generateApiEndpoint(form.slug)}</code>
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
              }}
            >
              <Copy className="h-4 w-4 mr-1" /> Copiar Código
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
