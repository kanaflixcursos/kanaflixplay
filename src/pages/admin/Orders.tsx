import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ShoppingCart, CreditCard, Search, Loader2, RotateCcw, XCircle, DollarSign } from 'lucide-react';
import SalesTable, { Sale, fetchSalesData } from '@/components/admin/SalesTable';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { subDays, subMonths, subYears } from 'date-fns';
import { motion } from 'framer-motion';

interface OrderStats {
  total: number;
  paid: number;
  refunded: number;
  canceled: number;
  pending: number;
  failed: number;
}

type TimePeriod = '1d' | '3d' | '1w' | '1m' | '6m' | '1y' | 'all';

const periodLabels: Record<TimePeriod, string> = {
  '1d': '1 dia',
  '3d': '3 dias',
  '1w': '1 semana',
  '1m': '1 mês',
  '6m': '6 meses',
  '1y': '1 ano',
  'all': 'Tudo',
};

function getDateFromPeriod(period: TimePeriod): Date | null {
  const now = new Date();
  switch (period) {
    case '1d': return subDays(now, 1);
    case '3d': return subDays(now, 3);
    case '1w': return subDays(now, 7);
    case '1m': return subMonths(now, 1);
    case '6m': return subMonths(now, 6);
    case '1y': return subYears(now, 1);
    case 'all': return null;
  }
}

const CHART_COLORS = {
  paid: 'hsl(var(--success))',
  refunded: 'hsl(var(--warning))',
  canceled: 'hsl(var(--destructive))',
};

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

  // Revenue
  const [revenuePeriod, setRevenuePeriod] = useState<TimePeriod>('1m');
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [revenueLoading, setRevenueLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, [page]);

  useEffect(() => {
    fetchRevenue();
  }, [revenuePeriod]);

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

  const fetchRevenue = async () => {
    setRevenueLoading(true);
    try {
      const startDate = getDateFromPeriod(revenuePeriod);
      let query = supabase
        .from('orders')
        .select('amount')
        .eq('status', 'paid');

      if (startDate) {
        query = query.gte('paid_at', startDate.toISOString());
      }

      const { data } = await query;
      const total = data?.reduce((sum, order) => sum + (order.amount || 0), 0) || 0;
      setTotalRevenue(total);
    } catch (error) {
      console.error('Error fetching revenue:', error);
    }
    setRevenueLoading(false);
  };

  const filteredSales = allSales.filter(sale => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (sale.course_title?.toLowerCase().includes(term) || false) ||
      (sale.user_name?.toLowerCase().includes(term) || false) ||
      (sale.user_email?.toLowerCase().includes(term) || false) ||
      (sale.id?.toLowerCase().includes(term) || false);
    const matchesStatus = statusFilter === 'all' || sale.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const chartData = useMemo(() => {
    if (!orderStats) return [];
    return [
      { name: 'Pagos', value: orderStats.paid, color: CHART_COLORS.paid },
      { name: 'Estornados', value: orderStats.refunded, color: CHART_COLORS.refunded },
      { name: 'Cancelados', value: orderStats.canceled, color: CHART_COLORS.canceled },
    ].filter(d => d.value > 0);
  }, [orderStats]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Vendas</h1>
        <p className="text-muted-foreground">Gerencie todas as vendas da plataforma</p>
      </div>

      {/* Revenue Card + Chart */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Revenue StatCard */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="lg:col-span-2"
        >
          <Card className="h-full">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-success/10">
                    <DollarSign className="h-5 w-5 text-success" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Receita Total</span>
                </div>
              </div>

              {revenueLoading ? (
                <div className="space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-success mb-4">
                  {formatCurrency(totalRevenue)}
                </p>
              )}

              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(periodLabels) as TimePeriod[]).map((period) => (
                  <Button
                    key={period}
                    variant={revenuePeriod === period ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setRevenuePeriod(period)}
                  >
                    {periodLabels[period]}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: 0.05 }}
          className="lg:col-span-3"
        >
          <Card className="h-full">
            <CardHeader className="p-4 sm:p-6 pb-2">
              <CardTitle className="text-base sm:text-lg font-semibold tracking-tight">
                Distribuição de Pedidos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {statsLoading ? (
                <div className="flex items-center justify-center h-[200px]">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                  Nenhum dado disponível
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value} pedidos`, '']}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        backgroundColor: 'hsl(var(--popover))',
                        color: 'hsl(var(--popover-foreground))',
                        fontSize: '13px',
                      }}
                    />
                    <Legend
                      verticalAlign="middle"
                      align="right"
                      layout="vertical"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => (
                        <span style={{ color: 'hsl(var(--foreground))', fontSize: '13px' }}>{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Total de Pedidos</span>
            </div>
            {statsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <p className="text-2xl font-bold">{orderStats?.total ?? totalCount}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-success/10">
                <CreditCard className="h-5 w-5 text-success" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Pedidos Pagos</span>
            </div>
            {statsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <p className="text-2xl font-bold text-success">{orderStats?.paid ?? 0}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-warning/10">
                <RotateCcw className="h-5 w-5 text-warning" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Pedidos Estornados</span>
            </div>
            {statsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <p className="text-2xl font-bold text-warning">{orderStats?.refunded ?? 0}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-destructive/10">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Pedidos Cancelados</span>
            </div>
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
          <CardTitle className="flex items-center gap-3 text-base sm:text-lg text-left">
            <div className="p-2 rounded-xl bg-primary/10">
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            </div>
            <span className="truncate">Últimas Vendas</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="dashboard-card-content space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID, curso, nome ou email..."
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
