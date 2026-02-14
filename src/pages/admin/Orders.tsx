import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ShoppingCart, CreditCard, Search, Loader2, RotateCcw, XCircle } from 'lucide-react';
import SalesTable, { Sale, fetchSalesData } from '@/components/admin/SalesTable';

interface OrderStats {
  total: number;
  paid: number;
  refunded: number;
  canceled: number;
  pending: number;
  failed: number;
}

const PAGE_SIZE = 20;

export default function AdminOrders() {
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    loadAll();
  }, [page]);

  const loadAll = async () => {
    setLoading(true);
    const data = await fetchSalesData(page, PAGE_SIZE);
    setAllSales(data.sales);
    setTotalCount(data.totalCount);
    setLoading(false);
    fetchOrderStats();
  };

  const fetchOrderStats = async () => {
    setStatsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pagarme', {
        body: { action: 'get_order_stats' }
      });
      if (!error && data?.stats) setOrderStats(data.stats);
    } catch (error) {
      console.error('Error fetching order stats:', error);
    }
    setStatsLoading(false);
  };

  const filteredSales = allSales.filter(sale => {
    const matchesSearch =
      (sale.course_title?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (sale.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (sale.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesStatus = statusFilter === 'all' || sale.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Compras</h1>
        <p className="text-muted-foreground">Gerencie todas as compras da plataforma</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Total de Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <p className="text-2xl font-bold">{orderStats?.total ?? totalCount}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-success" />
              Pedidos Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <p className="text-2xl font-bold text-success">{orderStats?.paid ?? 0}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-warning" />
              Pedidos Estornados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <p className="text-2xl font-bold text-warning">{orderStats?.refunded ?? 0}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              Pedidos Cancelados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <p className="text-2xl font-bold text-destructive">{orderStats?.canceled ?? 0}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 sm:p-6 pb-3 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-left">
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <span className="truncate">Lista de Compras</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="dashboard-card-content space-y-4">
          {/* Filters */}
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
                <SelectItem value="refunded">Reembolsado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <SalesTable
            sales={searchTerm || statusFilter !== 'all' ? filteredSales : allSales}
            loading={loading}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            showPagination={!searchTerm && statusFilter === 'all'}
            onRefresh={loadAll}
          />
        </CardContent>
      </Card>
    </div>
  );
}
