import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ShoppingCart, CreditCard, Search, Loader2, RotateCcw, XCircle, Clock } from 'lucide-react';
import SalesTable, { Sale, fetchSalesData } from '@/components/admin/SalesTable';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { motion } from 'framer-motion';
import DashboardRevenueCard from '@/components/admin/DashboardRevenueCard';

interface OrderStats {
  total: number;
  paid: number;
  refunded: number;
  canceled: number;
  pending: number;
  failed: number;
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

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Vendas</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie todas as vendas da plataforma</p>
      </div>

      {/* Revenue + Chart row */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardRevenueCard />

        {/* Distribution Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: 0.05 }}
          className="h-full sm:col-span-1 lg:col-span-2"
        >
          <Card className="overflow-hidden relative h-full">
            <CardContent className="p-4 sm:p-6 text-left">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-chart-3/10">
                  <ShoppingCart className="h-5 w-5 text-chart-3" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Distribuição de Pedidos</span>
              </div>

              {statsLoading ? (
                <div className="flex items-center justify-center h-[180px]">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">
                  Nenhum dado disponível
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [`${value}`, name]}
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid hsl(var(--border))',
                        backgroundColor: 'hsl(var(--popover))',
                        color: 'hsl(var(--popover-foreground))',
                        fontSize: '13px',
                        padding: '8px 12px',
                        boxShadow: '0 4px 12px hsl(var(--foreground) / 0.08)',
                      }}
                    />
                    <Legend
                      verticalAlign="middle"
                      align="right"
                      layout="vertical"
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '13px' }}
                      formatter={(value) => (
                        <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>
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
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: 'Total de Pedidos', value: orderStats?.total ?? totalCount, icon: ShoppingCart, colorClass: 'primary' },
          { label: 'Pedidos Pagos', value: orderStats?.paid ?? 0, icon: CreditCard, colorClass: 'success' },
          { label: 'Pedidos Pendentes', value: orderStats?.pending ?? 0, icon: Clock, colorClass: 'warning' },
          { label: 'Pedidos Estornados', value: orderStats?.refunded ?? 0, icon: RotateCcw, colorClass: 'muted-foreground' },
          { label: 'Pedidos Cancelados', value: orderStats?.canceled ?? 0, icon: XCircle, colorClass: 'destructive' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.05 * (i + 2) }}
            className="h-full"
          >
            <Card className="overflow-hidden relative h-full">
              <CardContent className="p-4 sm:p-6 text-left">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2.5 rounded-xl bg-${stat.colorClass}/10`}>
                    <stat.icon className={`h-5 w-5 text-${stat.colorClass}`} />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                </div>
                {statsLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <p className={`text-2xl font-bold ${stat.colorClass !== 'primary' ? `text-${stat.colorClass}` : ''}`}>
                    {stat.value}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
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
