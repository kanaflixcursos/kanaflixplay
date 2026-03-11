import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCoupon, useCoupons } from '@/features/marketing/hooks/useCoupons';
import { courseService, CourseOption } from '@/features/courses/services/courseService';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2, Sparkles, Percent, DollarSign, BookOpen, X, CreditCard, QrCode, Barcode } from 'lucide-react';

const PAYMENT_METHOD_OPTIONS = [
  { id: 'credit_card', label: 'Cartão de Crédito', icon: CreditCard },
  { id: 'pix', label: 'PIX', icon: QrCode },
  { id: 'boleto', label: 'Boleto', icon: Barcode },
];

const initialForm = {
  code: '',
  discount_type: 'percentage' as 'percentage' | 'fixed',
  discount_value: '',
  max_uses: null as number | null,
  course_ids: [] as string[],
  expires_at: '',
  is_active: true,
  payment_methods: [] as string[],
};

export default function CouponForm() {
  const navigate = useNavigate();
  const { couponId } = useParams();
  const isEditing = !!couponId;

  const { coupon, isLoading: isLoadingCoupon } = useCoupon(couponId);
  const { saveCoupon, isSaving } = useCoupons();
  const { data: courses = [], isLoading: isLoadingCourses } = useQuery({
    queryKey: ['courseOptions'],
    queryFn: courseService.getCourseOptions,
  });

  const [form, setForm] = useState(initialForm);
  const [allCourses, setAllCourses] = useState(true);
  const [allPaymentMethods, setAllPaymentMethods] = useState(true);

  useEffect(() => {
    if (isEditing && coupon) {
      setForm({
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_type === 'fixed' ? (coupon.discount_value / 100).toString() : String(coupon.discount_value),
        max_uses: coupon.max_uses,
        course_ids: coupon.course_ids,
        expires_at: coupon.expires_at ? coupon.expires_at.split('T')[0] : '',
        is_active: coupon.is_active,
        payment_methods: coupon.payment_methods,
      });
      setAllCourses(coupon.course_ids.length === 0);
      setAllPaymentMethods(coupon.payment_methods.length === 0);
    }
  }, [isEditing, coupon]);
  
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setForm(f => ({ ...f, code }));
  };

  const handleSave = () => {
    // Validation
    if (!form.code.trim()) { toast.error('Informe o código do cupom'); return; }
    if (!form.discount_value || Number(form.discount_value) <= 0) { toast.error('Informe um valor de desconto válido'); return; }
    if (form.discount_type === 'percentage' && Number(form.discount_value) > 100) { toast.error('Desconto percentual não pode ser maior que 100%'); return; }

    const payload = {
      ...form,
      id: couponId,
      course_ids: allCourses ? [] : form.course_ids,
      payment_methods: allPaymentMethods ? [] : form.payment_methods,
    };
    
    saveCoupon(payload, {
      onSuccess: () => navigate('/admin/marketing/coupons'),
    });
  };
  
  const getCourseName = (id: string) => courses.find(c => c.id === id)?.title || id;

  if (isLoadingCoupon || isLoadingCourses) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/marketing/coupons')}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-2xl font-semibold">{isEditing ? 'Editar Cupom' : 'Novo Cupom'}</h1>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Configurações</CardTitle>
            <CardDescription>Defina o código, tipo e valor do desconto</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
            <div className="space-y-1.5">
                <Label>Código *</Label>
                <div className="flex gap-2">
                    <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))} placeholder="EX: PROMO2026"/>
                    <Button type="button" variant="outline" size="sm" onClick={generateCode}><Sparkles className="h-3.5 w-3.5 mr-1" /> Gerar</Button>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div><Label>Tipo de desconto</Label><Select value={form.discount_type} onValueChange={(v: any) => setForm(f => ({ ...f, discount_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percentage"><Percent className="h-3.5 w-3.5 mr-1.5" />Percentual</SelectItem><SelectItem value="fixed"><DollarSign className="h-3.5 w-3.5 mr-1.5" />Valor Fixo (R$)</SelectItem></SelectContent></Select></div>
                <div><Label>Valor *</Label><Input type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))} placeholder={form.discount_type === 'percentage' ? '10' : '50.00'}/></div>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Restrições</CardTitle><CardDescription>Defina limites e condições para o uso do cupom</CardDescription></CardHeader>
        <CardContent className="space-y-5">
            <div><Label>Cursos válidos</Label><div className="flex items-center gap-2 mt-2"><Checkbox id="all-courses" checked={allCourses} onCheckedChange={(c) => setAllCourses(!!c)}/><label htmlFor="all-courses">Todos os cursos</label></div>{!allCourses && <div className="border rounded-lg max-h-48 overflow-y-auto mt-2">{courses.map(course => <label key={course.id} className="flex items-center gap-3 p-2.5 hover:bg-muted/50"><Checkbox checked={form.course_ids.includes(course.id)} onCheckedChange={() => setForm(f=>({...f, course_ids: f.course_ids.includes(course.id) ? f.course_ids.filter(id=>id!==course.id) : [...f.course_ids, course.id]}))} /><span>{course.title}</span></label>)}</div>}</div>
            <div><Label>Formas de pagamento válidas</Label><div className="flex items-center gap-2 mt-2"><Checkbox id="all-pm" checked={allPaymentMethods} onCheckedChange={(c) => setAllPaymentMethods(!!c)}/><label htmlFor="all-pm">Todas as formas de pagamento</label></div>{!allPaymentMethods && <div className="grid grid-cols-3 gap-2 mt-2">{PAYMENT_METHOD_OPTIONS.map(m => <button key={m.id} onClick={()=>setForm(f=>({...f, payment_methods: f.payment_methods.includes(m.id) ? f.payment_methods.filter(id=>id!==m.id) : [...f.payment_methods, m.id]}))} className={`p-3 rounded-xl border-2 ${form.payment_methods.includes(m.id) ? 'border-primary' : ''}`}><m.icon className="h-4 w-4 mb-1.5"/><span>{m.label}</span></button>)}</div>}</div>
            <div className="grid grid-cols-2 gap-3">
                <div><Label>Limite de usos</Label><Input type="number" value={form.max_uses || ''} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value ? parseInt(e.target.value) : null }))} placeholder="Ilimitado"/></div>
                <div><Label>Data de validade</Label><Input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}/></div>
            </div>
        </CardContent>
      </Card>
      
      <div className="flex items-center gap-3 justify-end">
        <Button variant="outline" onClick={() => navigate('/admin/marketing/coupons')}>Cancelar</Button>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">{isSaving && <Loader2 className="h-4 w-4 animate-spin" />} {isEditing ? 'Salvar Alterações' : 'Criar Cupom'}</Button>
      </div>
    </div>
  );
}
