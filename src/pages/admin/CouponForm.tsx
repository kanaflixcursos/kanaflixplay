import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Percent,
  DollarSign,
  BookOpen,
  X,
  CreditCard,
  QrCode,
  Barcode,
} from 'lucide-react';
import { toast } from 'sonner';

interface CourseOption {
  id: string;
  title: string;
}

const PAYMENT_METHOD_OPTIONS = [
  { id: 'credit_card', label: 'Cartão de Crédito', icon: CreditCard },
  { id: 'pix', label: 'PIX', icon: QrCode },
  { id: 'boleto', label: 'Boleto', icon: Barcode },
];

const initialForm = {
  code: '',
  discount_type: 'percentage' as 'percentage' | 'fixed',
  discount_value: '',
  max_uses: '',
  course_ids: [] as string[],
  expires_at: '',
  is_active: true,
  payment_methods: [] as string[],
};

export default function CouponForm() {
  const navigate = useNavigate();
  const { couponId } = useParams();
  const isEditing = !!couponId;

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [allCourses, setAllCourses] = useState(true);
  const [allPaymentMethods, setAllPaymentMethods] = useState(true);

  useEffect(() => {
    fetchCourses();
    if (isEditing) fetchCoupon();
  }, [couponId]);

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('id, title').order('title');
    setCourses(data || []);
  };

  const fetchCoupon = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('discount_coupons')
      .select('*')
      .eq('id', couponId!)
      .single();

    if (error || !data) {
      toast.error('Cupom não encontrado');
      navigate('/admin/marketing/coupons');
      return;
    }

    const courseIds = (data as any).course_ids as string[] || [];
    const resolvedIds = courseIds.length > 0 ? courseIds : (data.course_id ? [data.course_id] : []);
    const paymentMethods = (data as any).payment_methods as string[] || [];

    setForm({
      code: data.code,
      discount_type: data.discount_type as 'percentage' | 'fixed',
      discount_value: data.discount_type === 'fixed' ? (data.discount_value / 100).toString() : data.discount_value.toString(),
      max_uses: data.max_uses?.toString() || '',
      course_ids: resolvedIds,
      expires_at: data.expires_at ? data.expires_at.split('T')[0] : '',
      is_active: data.is_active,
      payment_methods: paymentMethods,
    });
    setAllCourses(resolvedIds.length === 0);
    setAllPaymentMethods(paymentMethods.length === 0);
    setLoading(false);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setForm(f => ({ ...f, code }));
  };

  const toggleCourse = (courseId: string) => {
    setForm(f => ({
      ...f,
      course_ids: f.course_ids.includes(courseId)
        ? f.course_ids.filter(id => id !== courseId)
        : [...f.course_ids, courseId],
    }));
  };

  const removeCourse = (courseId: string) => {
    setForm(f => ({ ...f, course_ids: f.course_ids.filter(id => id !== courseId) }));
  };

  const togglePaymentMethod = (methodId: string) => {
    setForm(f => ({
      ...f,
      payment_methods: f.payment_methods.includes(methodId)
        ? f.payment_methods.filter(id => id !== methodId)
        : [...f.payment_methods, methodId],
    }));
  };

  const handleSave = async () => {
    if (!form.code.trim()) {
      toast.error('Informe o código do cupom');
      return;
    }
    if (!form.discount_value || Number(form.discount_value) <= 0) {
      toast.error('Informe um valor de desconto válido');
      return;
    }
    if (form.discount_type === 'percentage' && Number(form.discount_value) > 100) {
      toast.error('Desconto percentual não pode ser maior que 100%');
      return;
    }

    setSaving(true);

    const courseIds = allCourses ? [] : form.course_ids;
    const paymentMethods = allPaymentMethods ? [] : form.payment_methods;

    const payload = {
      code: form.code.toUpperCase().trim(),
      discount_type: form.discount_type,
      discount_value: form.discount_type === 'fixed'
        ? Math.round(Number(form.discount_value) * 100)
        : Number(form.discount_value),
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      course_id: courseIds.length === 1 ? courseIds[0] : null,
      course_ids: courseIds,
      payment_methods: paymentMethods,
      expires_at: form.expires_at ? new Date(form.expires_at + 'T23:59:59').toISOString() : null,
      is_active: form.is_active,
    };

    let error;
    if (isEditing) {
      ({ error } = await supabase.from('discount_coupons').update(payload).eq('id', couponId!));
    } else {
      ({ error } = await supabase.from('discount_coupons').insert(payload));
    }

    if (error) {
      if (error.code === '23505') {
        toast.error('Já existe um cupom com esse código');
      } else {
        toast.error('Erro ao salvar cupom: ' + error.message);
      }
      setSaving(false);
      return;
    }

    toast.success(isEditing ? 'Cupom atualizado!' : 'Cupom criado!');
    navigate('/admin/marketing/coupons');
  };

  const getCourseName = (id: string) => courses.find(c => c.id === id)?.title || id;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/marketing/coupons')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isEditing ? 'Editar Cupom' : 'Novo Cupom'}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isEditing ? 'Atualize as informações do cupom' : 'Configure o cupom de desconto'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">Configurações</CardTitle>
            <CardDescription>Defina o código, tipo e valor do desconto</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Ativo</Label>
            <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Code */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Código *</Label>
            <div className="flex gap-2">
              <Input
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
                placeholder="EX: PROMO2026"
                maxLength={20}
                className="font-mono"
              />
              <Button type="button" variant="outline" size="sm" onClick={generateCode} className="shrink-0 text-xs gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Gerar
              </Button>
            </div>
          </div>

          {/* Type & Value */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Tipo de desconto</Label>
              <Select value={form.discount_type} onValueChange={(v: 'percentage' | 'fixed') => setForm(f => ({ ...f, discount_type: v, discount_value: '' }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">
                    <span className="flex items-center gap-1.5"><Percent className="h-3.5 w-3.5" /> Percentual</span>
                  </SelectItem>
                  <SelectItem value="fixed">
                    <span className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Valor Fixo (R$)</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Valor {form.discount_type === 'percentage' ? '(%)' : '(R$)'} *
              </Label>
              <Input
                type="number"
                value={form.discount_value}
                onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                placeholder={form.discount_type === 'percentage' ? '10' : '50.00'}
                min="0"
                max={form.discount_type === 'percentage' ? '100' : undefined}
                step={form.discount_type === 'fixed' ? '0.01' : '1'}
              />
            </div>
          </div>

          {/* Course multi-select */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground">Cursos válidos</Label>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="all-courses"
                checked={allCourses}
                onCheckedChange={(checked) => {
                  setAllCourses(!!checked);
                  if (checked) setForm(f => ({ ...f, course_ids: [] }));
                }}
              />
              <label htmlFor="all-courses" className="text-sm font-medium cursor-pointer">
                Todos os cursos
              </label>
            </div>

            {!allCourses && (
              <>
                {form.course_ids.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.course_ids.map(id => (
                      <Badge key={id} variant="secondary" className="gap-1 pr-1">
                        <BookOpen className="h-3 w-3" />
                        <span className="text-xs max-w-[150px] truncate">{getCourseName(id)}</span>
                        <button
                          type="button"
                          onClick={() => removeCourse(id)}
                          className="ml-0.5 p-0.5 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="border rounded-lg max-h-48 overflow-y-auto divide-y divide-border">
                  {courses.map(course => (
                    <label
                      key={course.id}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={form.course_ids.includes(course.id)}
                        onCheckedChange={() => toggleCourse(course.id)}
                      />
                      <span className="text-sm truncate">{course.title}</span>
                    </label>
                  ))}
                  {courses.length === 0 && (
                    <p className="text-sm text-muted-foreground p-3 text-center">Nenhum curso cadastrado</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Payment methods multi-select */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground">Formas de pagamento válidas</Label>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="all-payment-methods"
                checked={allPaymentMethods}
                onCheckedChange={(checked) => {
                  setAllPaymentMethods(!!checked);
                  if (checked) setForm(f => ({ ...f, payment_methods: [] }));
                }}
              />
              <label htmlFor="all-payment-methods" className="text-sm font-medium cursor-pointer">
                Todas as formas de pagamento
              </label>
            </div>

            {!allPaymentMethods && (
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHOD_OPTIONS.map(method => {
                  const isSelected = form.payment_methods.includes(method.id);
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => togglePaymentMethod(method.id)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/30 hover:bg-muted/50'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`text-xs font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {method.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Limits */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Limite de usos</Label>
              <Input
                type="number"
                value={form.max_uses}
                onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                placeholder="Ilimitado"
                min="1"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Data de validade</Label>
              <DatePicker
                value={form.expires_at}
                onChange={(val) => setForm(f => ({ ...f, expires_at: val }))}
                placeholder="Sem validade"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3 justify-end">
        <Button variant="outline" onClick={() => navigate('/admin/marketing/coupons')}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEditing ? 'Salvar Alterações' : 'Criar Cupom'}
        </Button>
      </div>
    </div>
  );
}
