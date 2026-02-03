import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ShoppingCart, Eye, CreditCard, QrCode, FileText, Search, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Order {
  id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
  course_id: string | null;
  user_id: string;
  pix_qr_code: string | null;
  boleto_url: string | null;
  course_title: string | null;
  user_name: string | null;
  user_email: string | null;
}

const paymentMethodIcons: Record<string, React.ReactNode> = {
  credit_card: <CreditCard className="h-4 w-4" />,
  pix: <QrCode className="h-4 w-4" />,
  boleto: <FileText className="h-4 w-4" />,
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

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const { data: ordersData } = await supabase
      .from('orders')
      .select('id, amount, status, payment_method, paid_at, created_at, course_id, user_id, pix_qr_code, boleto_url')
      .order('created_at', { ascending: false });

    if (ordersData && ordersData.length > 0) {
      const courseIds = [...new Set(ordersData.map(o => o.course_id).filter(Boolean))];
      const { data: courses } = courseIds.length > 0
        ? await supabase.from('courses').select('id, title').in('id', courseIds)
        : { data: [] };

      const userIds = [...new Set(ordersData.map(o => o.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      const coursesMap = new Map<string, string>();
      courses?.forEach(c => coursesMap.set(c.id, c.title));
      
      const profilesMap = new Map<string, { name: string | null; email: string | null }>();
      profiles?.forEach(p => profilesMap.set(p.user_id, { name: p.full_name, email: p.email }));

      setOrders(
        ordersData.map(o => ({
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

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      (order.course_title?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (order.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (order.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = orders.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Compras</h1>
        <p className="text-muted-foreground">Gerencie todas as compras da plataforma</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{orders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos Pagos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{orders.filter(o => o.status === 'paid').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Lista de Compras
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por curso, nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
                <SelectItem value="canceled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Curso</TableHead>
                  <TableHead>Comprador</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {order.course_title || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium truncate max-w-[150px]">{order.user_name || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">{order.user_email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-success">
                      {formatCurrency(order.amount)}
                    </TableCell>
                    <TableCell>
                      {order.payment_method && (
                        <div className="flex items-center gap-1.5">
                          {paymentMethodIcons[order.payment_method]}
                          <span className="text-sm">{paymentMethodLabels[order.payment_method]}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[order.status] || ''}>
                        {statusLabels[order.status] || order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(order.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-lg border bg-card space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{order.course_title || 'N/A'}</p>
                    <p className="text-sm text-muted-foreground truncate">{order.user_name || order.user_email}</p>
                  </div>
                  <Badge variant="outline" className={statusColors[order.status] || ''}>
                    {statusLabels[order.status] || order.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-success">{formatCurrency(order.amount)}</span>
                    {order.payment_method && (
                      <Badge variant="outline" className="gap-1">
                        {paymentMethodIcons[order.payment_method]}
                        {paymentMethodLabels[order.payment_method]}
                      </Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>
                    <Eye className="h-4 w-4 mr-1" />
                    Detalhes
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            ))}
          </div>

          {filteredOrders.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhum pedido encontrado</p>
          )}
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes da Compra</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Curso</p>
                  <p className="font-medium">{selectedOrder.course_title || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valor</p>
                  <p className="font-medium text-success">{formatCurrency(selectedOrder.amount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Comprador</p>
                  <p className="font-medium">{selectedOrder.user_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium truncate">{selectedOrder.user_email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pagamento</p>
                  <div className="flex items-center gap-1.5 font-medium">
                    {selectedOrder.payment_method && paymentMethodIcons[selectedOrder.payment_method]}
                    {selectedOrder.payment_method 
                      ? paymentMethodLabels[selectedOrder.payment_method] || selectedOrder.payment_method
                      : 'N/A'
                    }
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant="outline" className={statusColors[selectedOrder.status] || ''}>
                    {statusLabels[selectedOrder.status] || selectedOrder.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Criado em</p>
                  <p className="font-medium">{format(new Date(selectedOrder.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                </div>
                {selectedOrder.paid_at && (
                  <div>
                    <p className="text-muted-foreground">Pago em</p>
                    <p className="font-medium">{format(new Date(selectedOrder.paid_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">ID: {selectedOrder.id}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
