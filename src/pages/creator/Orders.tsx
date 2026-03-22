import { useState, useEffect } from 'react';
import { useCreator } from '@/contexts/CreatorContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, DollarSign, ShoppingCart, TrendingUp } from 'lucide-react';

interface CreatorOrder {
  id: string;
  buyer_name: string | null;
  buyer_email: string | null;
  amount: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  course_title: string | null;
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  paid: { label: 'Pago', variant: 'default' },
  pending: { label: 'Pendente', variant: 'outline' },
  canceled: { label: 'Cancelado', variant: 'destructive' },
  refunded: { label: 'Reembolsado', variant: 'secondary' },
  failed: { label: 'Falhou', variant: 'destructive' },
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export default function CreatorOrders() {
  const { creatorId, loading: creatorLoading } = useCreator();
  const [orders, setOrders] = useState<CreatorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!creatorId) return;

    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, buyer_name, buyer_email, amount, status, payment_method, created_at, course_id')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false })
        .limit(100);

      // Enrich with course titles
      const courseIds = [...new Set((data || []).map(o => o.course_id).filter(Boolean))];
      let courseTitles: Record<string, string> = {};
      if (courseIds.length > 0) {
        const { data: courses } = await supabase
          .from('courses')
          .select('id, title')
          .in('id', courseIds);
        courseTitles = Object.fromEntries((courses || []).map(c => [c.id, c.title]));
      }

      setOrders(
        (data || []).map(o => ({
          ...o,
          course_title: o.course_id ? courseTitles[o.course_id] || null : null,
        }))
      );
      setLoading(false);
    };
    fetchOrders();
  }, [creatorId]);

  const filtered = orders.filter(o =>
    (o.buyer_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.buyer_email || '').toLowerCase().includes(search.toLowerCase()) ||
    o.id.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = orders.filter(o => o.status === 'paid').reduce((s, o) => s + o.amount, 0);
  const totalPaid = orders.filter(o => o.status === 'paid').length;

  if (creatorLoading || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Minhas Vendas</h1>
        <p className="text-muted-foreground text-sm">{orders.length} pedido{orders.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vendas Pagas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPaid}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar pedido..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {orders.length === 0 ? 'Nenhum pedido ainda' : 'Nenhum resultado'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(order => {
                  const st = statusLabels[order.status] || statusLabels.pending;
                  return (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{order.buyer_name || '—'}</p>
                          <p className="text-xs text-muted-foreground">{order.buyer_email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{order.course_title || '—'}</TableCell>
                      <TableCell className="text-sm font-medium">{formatCurrency(order.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
