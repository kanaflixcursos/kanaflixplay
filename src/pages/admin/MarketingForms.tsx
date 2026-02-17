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

  const generateReactCode = (form: LeadForm) => {
    const endpoint = generateApiEndpoint(form.slug);
    return `// Componente React para Framer ou uso externo
// Cole este código no seu projeto Framer como Code Component
import { useState, startTransition, type CSSProperties } from "react"
import { addPropertyControls, ControlType } from "framer"

interface AdditionalInput {
    label: string
    placeholder: string
    required: boolean
}

interface MultiSelectOption {
    label: string
    options: string[]
}

interface SimpleFormProps {
    namePlaceholder: string
    emailPlaceholder: string
    phonePlaceholder: string
    buttonText: string
    backgroundColor: string
    inputBackground: string
    inputText: string
    buttonBackground: string
    buttonTextColor: string
    multiSelectText: string
    font: CSSProperties
    buttonFont: CSSProperties
    borderRadius: number
    additionalInputs: AdditionalInput[]
    multiSelects: MultiSelectOption[]
    loadingText: string
    successText: string
    style?: CSSProperties
}

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function SimpleForm(props: SimpleFormProps) {
    const {
        namePlaceholder = "Nome completo",
        emailPlaceholder = "seu@email.com",
        phonePlaceholder = "(00) 00000-0000",
        buttonText = "Enviar",
        backgroundColor = "#0A0A0A",
        inputBackground = "#1A1A2E",
        inputText = "#FFFFFF",
        buttonBackground = "#3B82F6",
        buttonTextColor = "#FFFFFF",
        multiSelectText = "#FFFFFF",
        font,
        buttonFont,
        borderRadius = 12,
        additionalInputs = [],
        multiSelects = [],
        loadingText = "Enviando...",
        successText = "Enviado com sucesso!",
        style,
    } = props

    const FORM_SLUG = "${form.slug}"
    const API_ENDPOINT = "${endpoint}"

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        additional: {} as Record<string, string>,
        multiSelect: {} as Record<string, string[]>,
    })

    const [errors, setErrors] = useState({
        name: "",
        email: "",
        phone: "",
        additional: {} as Record<string, string>,
    })

    const [touched, setTouched] = useState({
        name: false,
        email: false,
        phone: false,
        additional: {} as Record<string, boolean>,
    })

    const [formStatus, setFormStatus] = useState<"idle" | "loading" | "success">("idle")

    const formatPhone = (value: string): string => {
        const numbers = value.replace(/\\\\D/g, "")
        if (numbers.length <= 10) {
            return numbers.replace(/(\\\\d{2})(\\\\d{4})(\\\\d{0,4})/, (_, p1, p2, p3) => {
                let formatted = \\\`(\\\${p1}) \\\${p2}\\\`
                if (p3) formatted += \\\`-\\\${p3}\\\`
                return formatted
            })
        }
        return numbers.replace(/(\\\\d{2})(\\\\d{5})(\\\\d{0,4})/, (_, p1, p2, p3) => {
            let formatted = \\\`(\\\${p1}) \\\${p2}\\\`
            if (p3) formatted += \\\`-\\\${p3}\\\`
            return formatted
        })
    }

    const validateEmail = (email: string): boolean => /^[^\\\\s@]+@[^\\\\s@]+\\\\.[^\\\\s@]+$/.test(email)
    const validatePhone = (phone: string): boolean => {
        const numbers = phone.replace(/\\\\D/g, "")
        return numbers.length === 10 || numbers.length === 11
    }

    const handleChange = (field: string, value: string, index?: number) => {
        startTransition(() => {
            if (field === "phone") value = formatPhone(value)
            if (index !== undefined) {
                setFormData(prev => ({ ...prev, additional: { ...prev.additional, [index]: value } }))
            } else {
                setFormData(prev => ({ ...prev, [field]: value }))
            }
        })
    }

    const handleBlur = (field: string, index?: number) => {
        startTransition(() => {
            if (index !== undefined) {
                setTouched(prev => ({ ...prev, additional: { ...prev.additional, [index]: true } }))
                if (additionalInputs[index]?.required && !formData.additional[index]?.trim()) {
                    setErrors(prev => ({ ...prev, additional: { ...prev.additional, [index]: "Campo obrigatório" } }))
                }
            } else {
                setTouched(prev => ({ ...prev, [field]: true }))
                if (field === "name" && !formData.name.trim()) setErrors(prev => ({ ...prev, name: "Nome é obrigatório" }))
                else if (field === "email" && !validateEmail(formData.email)) setErrors(prev => ({ ...prev, email: "Email inválido" }))
                else if (field === "phone" && !validatePhone(formData.phone)) setErrors(prev => ({ ...prev, phone: "Telefone inválido" }))
            }
        })
    }

    const handleMultiSelectChange = (index: number, option: string) => {
        startTransition(() => {
            setFormData(prev => {
                const current = prev.multiSelect[index] || []
                const newSel = current.includes(option) ? current.filter(o => o !== option) : [...current, option]
                return { ...prev, multiSelect: { ...prev.multiSelect, [index]: newSel } }
            })
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const newErrors = {
            name: formData.name.trim() === "" ? "Nome é obrigatório" : "",
            email: !validateEmail(formData.email) ? "Email inválido" : "",
            phone: !validatePhone(formData.phone) ? "Telefone inválido" : "",
            additional: {} as Record<string, string>,
        }

        additionalInputs.forEach((input, i) => {
            if (input.required && !formData.additional[i]?.trim()) newErrors.additional[i] = "Campo obrigatório"
        })

        startTransition(() => {
            setErrors(newErrors)
            setTouched({ name: true, email: true, phone: true, additional: Object.fromEntries(additionalInputs.map((_, i) => [i, true])) })
        })

        const hasErrors = newErrors.name || newErrors.email || newErrors.phone || Object.values(newErrors.additional).some(e => e !== "")
        if (hasErrors) return

        startTransition(() => setFormStatus("loading"))

        try {
            // Build payload with all custom fields
            const payload: Record<string, unknown> = {
                name: formData.name.trim(),
                email: formData.email.trim().toLowerCase(),
                phone: formData.phone,
            }

            // Add additional inputs as custom data
            additionalInputs.forEach((input, i) => {
                if (formData.additional[i]) {
                    payload[input.label.toLowerCase().replace(/[^a-z0-9]/g, '_')] = formData.additional[i]
                }
            })

            // Add multi-selects as custom data
            multiSelects.forEach((ms, i) => {
                if (formData.multiSelect[i]?.length) {
                    payload[ms.label.toLowerCase().replace(/[^a-z0-9]/g, '_')] = formData.multiSelect[i].join(', ')
                }
            })

            const res = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (res.ok) {
                const data = await res.json()
                startTransition(() => setFormStatus("success"))
                if (data.redirect_url && typeof window !== "undefined") {
                    setTimeout(() => { window.location.href = data.redirect_url }, 1500)
                }
            } else {
                const err = await res.json().catch(() => ({}))
                console.error("Form error:", err)
                startTransition(() => setFormStatus("idle"))
                alert(err.error || "Erro ao enviar formulário")
            }
        } catch (err) {
            console.error("Network error:", err)
            startTransition(() => setFormStatus("idle"))
            alert("Erro de conexão. Tente novamente.")
        }
    }

    const inputStyle: CSSProperties = {
        width: "100%",
        padding: "14px 18px",
        backgroundColor: inputBackground,
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius,
        color: inputText,
        outline: "none",
        transition: "all 0.2s ease",
        ...font,
    }

    const errorStyle: CSSProperties = {
        color: "#FF5588",
        fontSize: "12px",
        marginTop: "4px",
        ...font,
    }

    return (
        <div style={{ width: "100%", padding: "32px", backgroundColor, borderRadius: borderRadius + 4, ...style }}>
            {formStatus === "loading" && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 0", gap: "16px" }}>
                    <div style={{ width: 32, height: 32, border: "3px solid rgba(255,255,255,0.15)", borderTopColor: buttonBackground, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    <style>{\\\`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }\\\`}</style>
                    <p style={{ color: inputText, opacity: 0.7, ...font }}>{loadingText}</p>
                </div>
            )}

            {formStatus === "success" && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 0", gap: "16px" }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={buttonBackground} strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                    <p style={{ color: inputText, ...font }}>{successText}</p>
                </div>
            )}

            {formStatus === "idle" && (
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <input value={formData.name} placeholder={namePlaceholder} onChange={e => handleChange("name", e.target.value)} onBlur={() => handleBlur("name")} style={{ ...inputStyle, borderColor: errors.name && touched.name ? "#FF5588" : "rgba(255,255,255,0.08)" }} />
                    {errors.name && touched.name && <p style={errorStyle}>{errors.name}</p>}

                    <input value={formData.email} type="email" placeholder={emailPlaceholder} onChange={e => handleChange("email", e.target.value)} onBlur={() => handleBlur("email")} style={{ ...inputStyle, borderColor: errors.email && touched.email ? "#FF5588" : "rgba(255,255,255,0.08)" }} />
                    {errors.email && touched.email && <p style={errorStyle}>{errors.email}</p>}

                    <input value={formData.phone} type="tel" placeholder={phonePlaceholder} maxLength={16} onChange={e => handleChange("phone", e.target.value)} onBlur={() => handleBlur("phone")} style={{ ...inputStyle, borderColor: errors.phone && touched.phone ? "#FF5588" : "rgba(255,255,255,0.08)" }} />
                    {errors.phone && touched.phone && <p style={errorStyle}>{errors.phone}</p>}

                    {additionalInputs.map((input, i) => (
                        <div key={i}>
                            <input value={formData.additional[i] || ""} placeholder={input.placeholder || input.label} onChange={e => handleChange("additional", e.target.value, i)} onBlur={() => handleBlur("additional", i)} style={{ ...inputStyle, borderColor: errors.additional[i] && touched.additional[i] ? "#FF5588" : "rgba(255,255,255,0.08)" }} />
                            {errors.additional[i] && touched.additional[i] && <p style={errorStyle}>{errors.additional[i]}</p>}
                        </div>
                    ))}

                    {multiSelects.map((ms, i) => (
                        <div key={i} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <span style={{ color: multiSelectText, ...font }}>{ms.label}</span>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {ms.options.map(opt => (
                                    <label key={opt} style={{ display: "flex", alignItems: "center", gap: "6px", color: multiSelectText, cursor: "pointer", ...font }}>
                                        <input type="checkbox" checked={(formData.multiSelect[i] || []).includes(opt)} onChange={() => handleMultiSelectChange(i, opt)} style={{ accentColor: buttonBackground }} />
                                        {opt}
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}

                    <button type="submit" style={{ width: "100%", padding: "14px", backgroundColor: buttonBackground, color: buttonTextColor, border: "none", borderRadius, cursor: "pointer", transition: "opacity 0.2s", ...buttonFont }}>
                        {buttonText}
                    </button>
                </form>
            )}
        </div>
    )
}

addPropertyControls(SimpleForm, {
    namePlaceholder: { type: ControlType.String, title: "Nome Placeholder", defaultValue: "Nome completo" },
    emailPlaceholder: { type: ControlType.String, title: "Email Placeholder", defaultValue: "seu@email.com" },
    phonePlaceholder: { type: ControlType.String, title: "Telefone Placeholder", defaultValue: "(00) 00000-0000" },
    buttonText: { type: ControlType.String, title: "Texto do Botão", defaultValue: "Enviar" },
    loadingText: { type: ControlType.String, title: "Texto Loading", defaultValue: "Enviando..." },
    successText: { type: ControlType.String, title: "Texto Sucesso", defaultValue: "Enviado com sucesso!" },
    backgroundColor: { type: ControlType.Color, title: "Fundo", defaultValue: "#0A0A0A" },
    inputBackground: { type: ControlType.Color, title: "Fundo Input", defaultValue: "#1A1A2E" },
    inputText: { type: ControlType.Color, title: "Texto Input", defaultValue: "#FFFFFF" },
    buttonBackground: { type: ControlType.Color, title: "Fundo Botão", defaultValue: "#3B82F6" },
    buttonTextColor: { type: ControlType.Color, title: "Texto Botão", defaultValue: "#FFFFFF" },
    multiSelectText: { type: ControlType.Color, title: "Texto Seleção Múltipla", defaultValue: "#FFFFFF" },
    font: { type: ControlType.Font, title: "Fonte", controls: "extended", defaultFontType: "sans-serif", defaultValue: { fontSize: "15px", variant: "Medium", letterSpacing: "-0.01em", lineHeight: "1.3em" } },
    buttonFont: { type: ControlType.Font, title: "Fonte Botão", controls: "extended", defaultFontType: "sans-serif", defaultValue: { fontSize: "14px", variant: "Semibold", letterSpacing: "-0.01em", lineHeight: "1em" } },
    borderRadius: { type: ControlType.Number, title: "Border Radius", defaultValue: 12, min: 0, max: 32, step: 1 },
    additionalInputs: { type: ControlType.Array, title: "Inputs Adicionais", control: { type: ControlType.Object, controls: { label: { type: ControlType.String, title: "Label", defaultValue: "Campo adicional" }, placeholder: { type: ControlType.String, title: "Placeholder", defaultValue: "Digite aqui..." }, required: { type: ControlType.Boolean, title: "Obrigatório", defaultValue: false } } }, defaultValue: [] },
    multiSelects: { type: ControlType.Array, title: "Seleção Múltipla", control: { type: ControlType.Object, controls: { label: { type: ControlType.String, title: "Label", defaultValue: "Selecione opções" }, options: { type: ControlType.Array, title: "Opções", control: { type: ControlType.String }, defaultValue: ["Opção 1", "Opção 2", "Opção 3"] } } }, defaultValue: [] },
})`;
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
