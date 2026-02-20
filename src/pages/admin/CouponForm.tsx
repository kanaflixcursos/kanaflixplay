import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
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
} from 'lucide-react';
import { toast } from 'sonner';

interface CourseOption {
  id: string;
  title: string;
}

const initialForm = {
  code: '',
  discount_type: 'percentage' as 'percentage' | 'fixed',
  discount_value: '',
  max_uses: '',
  course_id: '',
  expires_at: '',
  is_active: true,
};

export default function CouponForm() {
  const navigate = useNavigate();
  const { couponId } = useParams();
  const isEditing = !!couponId;

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);

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

    setForm({
      code: data.code,
      discount_type: data.discount_type as 'percentage' | 'fixed',
      discount_value: data.discount_type === 'fixed' ? (data.discount_value / 100).toString() : data.discount_value.toString(),
      max_uses: data.max_uses?.toString() || '',
      course_id: data.course_id || '',
      expires_at: data.expires_at ? data.expires_at.split('T')[0] : '',
      is_active: data.is_active,
    });
    setLoading(false);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setForm(f => ({ ...f, code }));
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

    const payload = {
      code: form.code.toUpperCase().trim(),
      discount_type: form.discount_type,
      discount_value: form.discount_type === 'fixed'
        ? Math.round(Number(form.discount_value) * 100)
        : Number(form.discount_value),
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      course_id: form.course_id || null,
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
        <CardHeader>
          <CardTitle className="text-base">Configurações</CardTitle>
          <CardDescription>Defina o código, tipo e valor do desconto</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Code */}
          <div className="space-y-1.5">
            <Label className="text-xs">Código *</Label>
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
              <Label className="text-xs">Tipo de desconto</Label>
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
              <Label className="text-xs">
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

          {/* Course */}
          <div className="space-y-1.5">
            <Label className="text-xs">Curso específico (opcional)</Label>
            <Select value={form.course_id || 'all'} onValueChange={v => setForm(f => ({ ...f, course_id: v === 'all' ? '' : v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os cursos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os cursos</SelectItem>
                {courses.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Limits */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Limite de usos</Label>
              <Input
                type="number"
                value={form.max_uses}
                onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                placeholder="Ilimitado"
                min="1"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data de validade</Label>
              <Input
                type="date"
                value={form.expires_at}
                onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between pt-2">
            <Label className="text-sm">Cupom ativo</Label>
            <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
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