import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ShoppingCart, Eye, CreditCard, QrCode, FileText } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DashboardListCard, { DashboardListItem } from './DashboardListCard';

interface Purchase {
  id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
  course_title: string | null;
  user_name: string | null;
  user_email: string | null;
  pix_qr_code: string | null;
  boleto_url: string | null;
}

const paymentMethodIcons: Record<string, React.ReactNode> = {
  credit_card: <CreditCard className="h-3.5 w-3.5" />,
  pix: <QrCode className="h-3.5 w-3.5" />,
  boleto: <FileText className="h-3.5 w-3.5" />,
};

const paymentMethodLabels: Record<string, string> = {
  credit_card: 'Cartão',
  pix: 'PIX',
  boleto: 'Boleto',
};

const statusColors: Record<string, string> = {
  paid: 'bg-success/20 text-success border-success/30',
  pending: 'bg-warning/20 text-warning border-warning/30',
  failed: 'bg-destructive/20 text-destructive border-destructive/30',
  canceled: 'bg-muted text-muted-foreground border-muted-foreground/30',
};

const statusLabels: Record<string, string> = {
  paid: 'Pago',
  pending: 'Pendente',
  failed: 'Falhou',
  canceled: 'Cancelado',
};

export default function DashboardLatestPurchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    const { data: orders } = await supabase
      .from('orders')
      .select('id, amount, status, payment_method, paid_at, created_at, course_id, user_id, pix_qr_code, boleto_url')
      .order('created_at', { ascending: false })
      .limit(5);

    if (orders && orders.length > 0) {
      const courseIds = [...new Set(orders.map(o => o.course_id).filter(Boolean))];
      const { data: courses } = courseIds.length > 0
        ? await supabase.from('courses').select('id, title').in('id', courseIds)
        : { data: [] };

      const userIds = [...new Set(orders.map(o => o.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      const coursesMap = new Map<string, string>();
      courses?.forEach(c => coursesMap.set(c.id, c.title));
      
      const profilesMap = new Map<string, { name: string | null; email: string | null }>();
      profiles?.forEach(p => profilesMap.set(p.user_id, { name: p.full_name, email: p.email }));

      setPurchases(
        orders.map(o => ({
          ...o,
          course_title: o.course_id ? (coursesMap.get(o.course_id) || null) : null,
          user_name: profilesMap.get(o.user_id)?.name || null,
          user_email: profilesMap.get(o.user_id)?.email || null,
        }))
      );
    }
    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100);
  };

  return (
    <>
      <DashboardListCard
        title="Últimas Compras"
        icon={ShoppingCart}
        loading={loading}
        emptyMessage="Nenhuma compra realizada"
        actionLabel="Ver Compras"
        actionLink="/admin/orders"
      >
        {purchases.map((purchase) => (
          <DashboardListItem key={purchase.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {purchase.course_title || 'Curso não encontrado'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {purchase.user_name || purchase.user_email || 'Usuário'}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 shrink-0"
                onClick={() => setSelectedPurchase(purchase)}
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex items-center justify-between gap-2 mt-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-success">
                  {formatCurrency(purchase.amount)}
                </span>
                {purchase.payment_method && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1">
                    {paymentMethodIcons[purchase.payment_method]}
                    {paymentMethodLabels[purchase.payment_method] || purchase.payment_method}
                  </Badge>
                )}
              </div>
              <Badge 
                variant="outline" 
                className={`text-[10px] px-1.5 py-0 h-5 ${statusColors[purchase.status] || ''}`}
              >
                {statusLabels[purchase.status] || purchase.status}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {formatDistanceToNow(new Date(purchase.created_at), { addSuffix: true, locale: ptBR })}
            </p>
          </DashboardListItem>
        ))}
      </DashboardListCard>

      <Dialog open={!!selectedPurchase} onOpenChange={() => setSelectedPurchase(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes da Compra</DialogTitle>
          </DialogHeader>
          {selectedPurchase && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Curso</p>
                  <p className="font-medium">{selectedPurchase.course_title || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valor</p>
                  <p className="font-medium text-success">{formatCurrency(selectedPurchase.amount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Comprador</p>
                  <p className="font-medium">{selectedPurchase.user_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium truncate">{selectedPurchase.user_email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pagamento</p>
                  <div className="flex items-center gap-1.5 font-medium">
                    {selectedPurchase.payment_method && paymentMethodIcons[selectedPurchase.payment_method]}
                    {selectedPurchase.payment_method 
                      ? paymentMethodLabels[selectedPurchase.payment_method] || selectedPurchase.payment_method
                      : 'N/A'
                    }
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge 
                    variant="outline" 
                    className={`${statusColors[selectedPurchase.status] || ''}`}
                  >
                    {statusLabels[selectedPurchase.status] || selectedPurchase.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Criado em</p>
                  <p className="font-medium">{format(new Date(selectedPurchase.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                </div>
                {selectedPurchase.paid_at && (
                  <div>
                    <p className="text-muted-foreground">Pago em</p>
                    <p className="font-medium">{format(new Date(selectedPurchase.paid_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">ID: {selectedPurchase.id}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
