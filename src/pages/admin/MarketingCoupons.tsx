import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  course_ids: string[];
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  course_titles: string[];
}

export default function MarketingCoupons() {
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCoupons();
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

    // Collect all course IDs from course_ids arrays and legacy course_id
    const allCourseIds = [...new Set(
      (data || []).flatMap(c => {
        const ids: string[] = (c as any).course_ids || [];
        if (c.course_id && !ids.includes(c.course_id)) ids.push(c.course_id);
        return ids;
      })
    )];
    let courseMap: Record<string, string> = {};
    if (allCourseIds.length > 0) {
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title')
        .in('id', allCourseIds);
      courseMap = Object.fromEntries((coursesData || []).map(c => [c.id, c.title]));
    }

    setCoupons((data || []).map(c => {
      const ids: string[] = (c as any).course_ids?.length > 0 
        ? (c as any).course_ids 
        : (c.course_id ? [c.course_id] : []);
      return {
        ...c,
        discount_type: c.discount_type as 'percentage' | 'fixed',
        course_ids: ids,
        course_titles: ids.map(id => courseMap[id]).filter(Boolean),
      };
    }));
    setLoading(false);
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
    c.course_titles.some(t => t.toLowerCase().includes(search.toLowerCase()))
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
        <Button onClick={() => navigate('/admin/marketing/coupons/new')} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo Cupom</span>
        </Button>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.05 }}
        className="grid gap-3 grid-cols-3"
      >
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
      </motion.div>

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
              <Button onClick={() => navigate('/admin/marketing/coupons/new')} variant="outline" className="mt-4 gap-2">
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
                    {coupon.course_titles.length > 0 ? (
                      coupon.course_titles.map((title, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[10px]">
                          <BookOpen className="h-2.5 w-2.5 mr-1" />
                          {title}
                        </Badge>
                      ))
                    ) : (
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
                      onClick={() => navigate(`/admin/marketing/coupons/${coupon.id}/edit`)}
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
