import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  Copy,
  Check,
  Trash2,
  Pencil,
  Hash,
} from 'lucide-react';
import { toast } from 'sonner';
import StatCard from '@/components/StatCard';

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  course_id: string | null;
  course_ids: string[];
  payment_methods: string[];
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
      const paymentMethods: string[] = (c as any).payment_methods || [];
      return {
        ...c,
        discount_type: c.discount_type as 'percentage' | 'fixed',
        course_ids: ids,
        payment_methods: paymentMethods,
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

  const activeCoupons = coupons.filter(c => c.is_active).length;
  const totalUses = coupons.reduce((sum, c) => sum + c.used_count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/marketing')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Cupons de Desconto</h1>
          <p className="text-muted-foreground text-sm mt-1">Crie e gerencie cupons promocionais</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-3">
        <StatCard icon={Ticket} title="Total" value={coupons.length} loading={loading} />
        <StatCard icon={Check} title="Ativos" value={activeCoupons} loading={loading} />
        <StatCard icon={Hash} title="Usos" value={totalUses} loading={loading} />
      </div>

      {/* Coupons Table */}
      <Card>
        <CardHeader className="dashboard-card-header">
          <div className="flex items-center justify-between w-full">
            <CardTitle className="card-title-compact">Cupons</CardTitle>
            <Button size="sm" onClick={() => navigate('/admin/marketing/coupons/new')}>
              <Plus className="h-4 w-4 mr-1" /> Novo Cupom
            </Button>
          </div>
        </CardHeader>
        <CardContent className="dashboard-card-content">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Ticket className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum cupom criado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead className="hidden md:table-cell">Cursos</TableHead>
                    <TableHead>Usos</TableHead>
                    <TableHead className="hidden md:table-cell">Validade</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead className="w-20">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow
                      key={coupon.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/admin/marketing/coupons/${coupon.id}/edit`)}
                    >
                      <TableCell>
                        <button
                          className="flex items-center gap-1.5 font-mono font-bold text-sm hover:text-primary transition-colors"
                          onClick={(e) => { e.stopPropagation(); copyCode(coupon.code); }}
                        >
                          {coupon.code}
                          {copied === coupon.code
                            ? <Check className="h-3 w-3 text-success" />
                            : <Copy className="h-3 w-3 text-muted-foreground" />
                          }
                        </button>
                      </TableCell>
                      <TableCell className="text-sm">
                        {coupon.discount_type === 'percentage'
                          ? `${coupon.discount_value}%`
                          : formatPrice(coupon.discount_value)
                        }
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {coupon.course_titles.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {coupon.course_titles.slice(0, 2).map((title, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {title}
                              </Badge>
                            ))}
                            {coupon.course_titles.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{coupon.course_titles.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Todos</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {coupon.max_uses != null
                          ? `${coupon.used_count}/${coupon.max_uses}`
                          : coupon.used_count
                        }
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {coupon.expires_at ? (
                          <span className={new Date(coupon.expires_at) < new Date() ? 'text-destructive' : ''}>
                            {new Date(coupon.expires_at).toLocaleDateString('pt-BR')}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={coupon.is_active}
                          onCheckedChange={() => handleToggle(coupon)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/admin/marketing/coupons/${coupon.id}/edit`)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setDeletingCoupon(coupon); setDeleteDialogOpen(true); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
