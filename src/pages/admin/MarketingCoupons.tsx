import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Plus,
  Ticket,
  Percent,
  DollarSign,
  Copy,
  Check,
  Trash2,
  Pencil,
  Loader2,
  Calendar,
  Hash,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  course_id: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  course_title?: string;
}

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

export default function MarketingCoupons() {
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCoupons();
    fetchCourses();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('discount_coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar cupons');
      setLoading(false);
      return;
    }

    // Fetch course titles for coupons with course_id
    const courseIds = [...new Set((data || []).filter(c => c.course_id).map(c => c.course_id!))];
    let courseMap: Record<string, string> = {};
    if (courseIds.length > 0) {
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title')
        .in('id', courseIds);
      courseMap = Object.fromEntries((coursesData || []).map(c => [c.id, c.title]));
    }

    setCoupons((data || []).map(c => ({ ...c, discount_type: c.discount_type as 'percentage' | 'fixed', course_title: c.course_id ? courseMap[c.course_id] : undefined })));
    setLoading(false);
  };

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('id, title').order('title');
    setCourses(data || []);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setForm(f => ({ ...f, code }));
  };

  const openCreate = () => {
    setEditingCoupon(null);
    setForm(initialForm);
    setDialogOpen(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_type === 'fixed' ? (coupon.discount_value / 100).toString() : coupon.discount_value.toString(),
      max_uses: coupon.max_uses?.toString() || '',
      course_id: coupon.course_id || '',
      expires_at: coupon.expires_at ? coupon.expires_at.split('T')[0] : '',
      is_active: coupon.is_active,
    });
    setDialogOpen(true);
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
        ? Math.round(Number(form.discount_value) * 100) // convert BRL to cents
        : Number(form.discount_value),
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      course_id: form.course_id || null,
      expires_at: form.expires_at ? new Date(form.expires_at + 'T23:59:59').toISOString() : null,
      is_active: form.is_active,
    };

    let error;
    if (editingCoupon) {
      ({ error } = await supabase.from('discount_coupons').update(payload).eq('id', editingCoupon.id));
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

    toast.success(editingCoupon ? 'Cupom atualizado!' : 'Cupom criado!');
    setDialogOpen(false);
    setSaving(false);
    fetchCoupons();
  };

  const handleDelete = async () => {
    if (!deletingCoupon) return;
    const { error } = await supabase.from('discount_coupons').delete().eq('id', deletingCoupon.id);
    if (error) {
      toast.error('Erro ao excluir cupom');
      return;
    }
    toast.success('Cupom excluído');
    setDeleteDialogOpen(false);
    setDeletingCoupon(null);
    fetchCoupons();
  };

  const handleToggle = async (coupon: Coupon) => {
    const { error } = await supabase
      .from('discount_coupons')
      .update({ is_active: !coupon.is_active })
      .eq('id', coupon.id);
    if (error) {
      toast.error('Erro ao atualizar cupom');
      return;
    }
    setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c));
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    toast.success('Código copiado!');
    setTimeout(() => setCopied(null), 2000);
  };

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  const filteredCoupons = coupons.filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.course_title?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCoupons = coupons.filter(c => c.is_active).length;
  const totalUses = coupons.reduce((sum, c) => sum + c.used_count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/marketing')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Cupons de Desconto</h1>
          <p className="text-muted-foreground text-sm mt-1">Crie e gerencie cupons promocionais</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo Cupom</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Ticket className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{coupons.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <Check className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCoupons}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-chart-2/10">
              <Hash className="h-4 w-4 text-chart-2" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalUses}</p>
              <p className="text-xs text-muted-foreground">Usos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Input
        placeholder="Buscar cupom..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {/* Coupons List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredCoupons.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Ticket className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {search ? 'Nenhum cupom encontrado' : 'Nenhum cupom criado ainda'}
            </p>
            {!search && (
              <Button onClick={openCreate} variant="outline" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Criar Primeiro Cupom
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCoupons.map((coupon, i) => (
            <motion.div
              key={coupon.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
            >
              <Card className={`transition-opacity ${!coupon.is_active ? 'opacity-60' : ''}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-1.5 rounded-lg ${coupon.discount_type === 'percentage' ? 'bg-primary/10' : 'bg-chart-4/10'}`}>
                        {coupon.discount_type === 'percentage'
                          ? <Percent className="h-4 w-4 text-primary" />
                          : <DollarSign className="h-4 w-4 text-chart-4" />
                        }
                      </div>
                      <div className="min-w-0">
                        <button
                          onClick={() => copyCode(coupon.code)}
                          className="flex items-center gap-1.5 font-mono font-bold text-sm hover:text-primary transition-colors"
                        >
                          {coupon.code}
                          {copied === coupon.code
                            ? <Check className="h-3 w-3 text-success" />
                            : <Copy className="h-3 w-3 text-muted-foreground" />
                          }
                        </button>
                        <p className="text-xs text-muted-foreground">
                          {coupon.discount_type === 'percentage'
                            ? `${coupon.discount_value}% de desconto`
                            : `${formatPrice(coupon.discount_value)} de desconto`
                          }
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={coupon.is_active}
                      onCheckedChange={() => handleToggle(coupon)}
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {coupon.course_title && (
                      <Badge variant="secondary" className="text-[10px]">
                        <BookOpen className="h-2.5 w-2.5 mr-1" />
                        {coupon.course_title}
                      </Badge>
                    )}
                    {!coupon.course_id && (
                      <Badge variant="outline" className="text-[10px]">Todos os cursos</Badge>
                    )}
                    {coupon.max_uses != null && (
                      <Badge variant="outline" className="text-[10px]">
                        {coupon.used_count}/{coupon.max_uses} usos
                      </Badge>
                    )}
                    {coupon.max_uses == null && (
                      <Badge variant="outline" className="text-[10px]">
                        {coupon.used_count} usos
                      </Badge>
                    )}
                    {coupon.expires_at && (
                      <Badge
                        variant={new Date(coupon.expires_at) < new Date() ? 'destructive' : 'outline'}
                        className="text-[10px]"
                      >
                        <Calendar className="h-2.5 w-2.5 mr-1" />
                        {new Date(coupon.expires_at).toLocaleDateString('pt-BR')}
                      </Badge>
                    )}
                  </div>

                  <Separator />

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-xs h-8"
                      onClick={() => openEdit(coupon)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-8 text-destructive hover:text-destructive"
                      onClick={() => { setDeletingCoupon(coupon); setDeleteDialogOpen(true); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}</DialogTitle>
            <DialogDescription>
              {editingCoupon ? 'Atualize as informações do cupom' : 'Configure o cupom de desconto'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
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
                <Button type="button" variant="outline" size="sm" onClick={generateCode} className="shrink-0 text-xs">
                  Gerar
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de desconto</Label>
                <Select value={form.discount_type} onValueChange={(v: 'percentage' | 'fixed') => setForm(f => ({ ...f, discount_type: v, discount_value: '' }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentual (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
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

            <div className="flex items-center justify-between">
              <Label className="text-xs">Ativo</Label>
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingCoupon ? 'Salvar' : 'Criar Cupom'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Cupom</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o cupom <strong>{deletingCoupon?.code}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
