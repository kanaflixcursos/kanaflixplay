import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCoupons } from '@/features/marketing/hooks/useCoupons';
import { Coupon } from '@/features/marketing/types';
import { useDebounce } from 'use-debounce';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Ticket, Percent, DollarSign, Copy, Check, Trash2, Pencil, Loader2, Calendar, Hash, BookOpen, CreditCard, QrCode, Barcode } from 'lucide-react';
import { motion } from 'framer-motion';

const PAYMENT_METHOD_LABELS: Record<string, { label: string; icon: typeof CreditCard }> = {
  credit_card: { label: 'Cartão', icon: CreditCard },
  pix: { label: 'PIX', icon: QrCode },
  boleto: { label: 'Boleto', icon: Barcode },
};

const formatPrice = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

function CouponCard({ coupon, onToggle, onDelete, onCopy, isCopied }: { coupon: Coupon, onToggle: () => void, onDelete: () => void, onCopy: () => void, isCopied: boolean }) {
    const navigate = useNavigate();
    return (
        <Card className={`transition-opacity ${!coupon.is_active ? 'opacity-60' : ''}`}>
            <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className={`p-1.5 rounded-lg ${coupon.discount_type === 'percentage' ? 'bg-primary/10' : 'bg-chart-4/10'}`}>
                            {coupon.discount_type === 'percentage' ? <Percent className="h-4 w-4 text-primary" /> : <DollarSign className="h-4 w-4 text-chart-4" />}
                        </div>
                        <div className="min-w-0">
                            <button onClick={onCopy} className="flex items-center gap-1.5 font-mono font-bold text-sm hover:text-primary transition-colors">{coupon.code}{isCopied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3 text-muted-foreground" />}</button>
                            <p className="text-xs text-muted-foreground">{coupon.discount_type === 'percentage' ? `${coupon.discount_value}% de desconto` : `${formatPrice(coupon.discount_value)} de desconto`}</p>
                        </div>
                    </div>
                    <Switch checked={coupon.is_active} onCheckedChange={onToggle} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {coupon.course_titles?.length > 0 ? coupon.course_titles.map((title, idx) => <Badge key={idx} variant="secondary" className="text-[10px]"><BookOpen className="h-2.5 w-2.5 mr-1" />{title}</Badge>) : <Badge variant="outline" className="text-[10px]">Todos os cursos</Badge>}
                    {coupon.payment_methods?.length > 0 ? coupon.payment_methods.map(pm => { const info = PAYMENT_METHOD_LABELS[pm]; if (!info) return null; const Icon = info.icon; return <Badge key={pm} variant="outline" className="text-[10px]"><Icon className="h-2.5 w-2.5 mr-1" />{info.label}</Badge>}) : <Badge variant="outline" className="text-[10px]">Todas formas pgto</Badge>}
                    {coupon.max_uses != null ? <Badge variant="outline" className="text-[10px]">{coupon.used_count}/{coupon.max_uses} usos</Badge> : <Badge variant="outline" className="text-[10px]">{coupon.used_count} usos</Badge>}
                    {coupon.expires_at && <Badge variant={new Date(coupon.expires_at) < new Date() ? 'destructive' : 'outline'} className="text-[10px]"><Calendar className="h-2.5 w-2.5 mr-1" />{new Date(coupon.expires_at).toLocaleDateString('pt-BR')}</Badge>}
                </div>
                <Separator />
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="flex-1 text-xs h-8" onClick={() => navigate(`/admin/marketing/coupons/${coupon.id}/edit`)}><Pencil className="h-3 w-3 mr-1" />Editar</Button>
                    <Button variant="ghost" size="sm" className="text-xs h-8 text-destructive hover:text-destructive" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function MarketingCoupons() {
  const navigate = useNavigate();
  const { coupons, isLoading, saveCoupon, deleteCoupon } = useCoupons();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 300);

  const handleToggle = (coupon: Coupon) => saveCoupon({ id: coupon.id, is_active: !coupon.is_active });
  const handleDeleteRequest = (coupon: Coupon) => { setCouponToDelete(coupon); setDeleteDialogOpen(true); };
  const performDelete = () => { if (couponToDelete) { deleteCoupon(couponToDelete.id, { onSuccess: () => setDeleteDialogOpen(false) }); } };
  const copyCode = (code: string) => { navigator.clipboard.writeText(code); setCopiedCode(code); setTimeout(() => setCopiedCode(null), 2000); };
  
  const filteredCoupons = useMemo(() => coupons.filter(c =>
    c.code.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    c.course_titles?.some(t => t.toLowerCase().includes(debouncedSearch.toLowerCase()))
  ), [coupons, debouncedSearch]);

  const activeCoupons = useMemo(() => coupons.filter(c => c.is_active).length, [coupons]);
  const totalUses = useMemo(() => coupons.reduce((sum, c) => sum + c.used_count, 0), [coupons]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/marketing')}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-semibold">Cupons de Desconto</h1>
          <p className="text-muted-foreground text-sm mt-1">Crie e gerencie cupons promocionais</p>
        </div>
        <Button onClick={() => navigate('/admin/marketing/coupons/new')}><Plus className="h-4 w-4 mr-1" />Novo Cupom</Button>
      </div>

      <div className="grid gap-3 grid-cols-3">
        <Card><CardContent className="p-4 flex items-center gap-3"><Ticket className="h-4 w-4 text-primary" /><p>{coupons.length} Total</p></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Check className="h-4 w-4 text-success" /><p>{activeCoupons} Ativos</p></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Hash className="h-4 w-4 text-chart-2" /><p>{totalUses} Usos</p></CardContent></Card>
      </div>

      <Input placeholder="Buscar cupom..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />

      {isLoading ? <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div> :
        filteredCoupons.length === 0 ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">
            <Ticket className="h-10 w-10 mx-auto mb-3" />
            <p>{search ? 'Nenhum cupom encontrado' : 'Nenhum cupom criado'}</p>
          </CardContent></Card>
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCoupons.map((coupon, i) => (
              <motion.div key={coupon.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.03 }}>
                <CouponCard coupon={coupon} onToggle={() => handleToggle(coupon)} onDelete={() => handleDeleteRequest(coupon)} onCopy={() => copyCode(coupon.code)} isCopied={copiedCode === coupon.code} />
              </motion.div>
            ))}
          </div>
        )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Excluir Cupom</DialogTitle><DialogDescription>Deseja excluir o cupom <strong>{couponToDelete?.code}</strong>?</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button><Button variant="destructive" onClick={performDelete}>Excluir</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
