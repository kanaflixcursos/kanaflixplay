import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CreditCard, 
  QrCode, 
  Barcode, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Receipt,
  ShoppingBag
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import StudentLayout from '@/components/layouts/StudentLayout';

interface Order {
  id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  paid_at: string | null;
  course_id: string | null;
  pix_qr_code: string | null;
  pix_expires_at: string | null;
  boleto_url: string | null;
  boleto_due_date: string | null;
  course?: {
    title: string;
    thumbnail_url: string | null;
  } | null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  paid: { label: 'Pago', variant: 'default', icon: CheckCircle2 },
  pending: { label: 'Pendente', variant: 'secondary', icon: Clock },
  failed: { label: 'Falhou', variant: 'destructive', icon: XCircle },
  refunded: { label: 'Reembolsado', variant: 'outline', icon: AlertCircle },
  canceled: { label: 'Cancelado', variant: 'destructive', icon: XCircle },
};

const paymentMethodConfig: Record<string, { label: string; icon: React.ElementType }> = {
  credit_card: { label: 'Cartão de Crédito', icon: CreditCard },
  pix: { label: 'PIX', icon: QrCode },
  boleto: { label: 'Boleto', icon: Barcode },
};

export default function Purchases() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          course:courses(title, thumbnail_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setOrders(data);
      }
      setLoading(false);
    };

    fetchOrders();
  }, [user]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  if (loading) {
    return (
      <StudentLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Minhas Compras</h1>
            <p className="text-muted-foreground">Histórico de pedidos e pagamentos</p>
          </div>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <Skeleton className="h-20 w-32 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Minhas Compras</h1>
          <p className="text-muted-foreground">Histórico de pedidos e pagamentos</p>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShoppingBag className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">Nenhuma compra encontrada</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Você ainda não realizou nenhuma compra
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => {
              const status = statusConfig[order.status] || statusConfig.pending;
              const paymentMethod = order.payment_method 
                ? paymentMethodConfig[order.payment_method] 
                : null;
              const StatusIcon = status.icon;
              const PaymentIcon = paymentMethod?.icon || Receipt;

              return (
                <Card key={order.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Course thumbnail */}
                      {order.course?.thumbnail_url && (
                        <div className="md:w-48 h-32 md:h-auto shrink-0">
                          <img 
                            src={order.course.thumbnail_url} 
                            alt={order.course.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Order details */}
                      <div className="flex-1 p-4 md:p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div>
                            <h3 className="font-medium text-lg">
                              {order.course?.title || 'Curso'}
                            </h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDate(order.created_at)}
                            </p>
                          </div>
                          <Badge variant={status.variant} className="gap-1 self-start">
                            <StatusIcon className="h-3.5 w-3.5" />
                            {status.label}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t">
                          {/* Value */}
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Valor</p>
                            <p className="font-semibold text-lg">{formatCurrency(order.amount)}</p>
                          </div>

                          {/* Payment method */}
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Forma de Pagamento</p>
                            <div className="flex items-center gap-1.5">
                              <PaymentIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {paymentMethod?.label || 'N/A'}
                              </span>
                            </div>
                          </div>

                          {/* Payment date */}
                          {order.paid_at && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Pago em</p>
                              <p className="text-sm font-medium">
                                {formatDateTime(order.paid_at)}
                              </p>
                            </div>
                          )}

                          {/* PIX expiration */}
                          {order.payment_method === 'pix' && order.status === 'pending' && order.pix_expires_at && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Expira em</p>
                              <p className="text-sm font-medium text-warning">
                                {formatDateTime(order.pix_expires_at)}
                              </p>
                            </div>
                          )}

                          {/* Boleto due date */}
                          {order.payment_method === 'boleto' && order.status === 'pending' && order.boleto_due_date && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Vencimento</p>
                              <p className="text-sm font-medium text-warning">
                                {format(new Date(order.boleto_due_date), 'dd/MM/yyyy')}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Order ID */}
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground">
                            Pedido #{order.id.slice(0, 8).toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
