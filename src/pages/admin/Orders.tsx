import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ShoppingCart, DollarSign, TrendingUp, TrendingDown, Search, Loader2,
  RotateCcw, XCircle, Clock, CalendarIcon, X, Gift, CreditCard, QrCode,
  FileText, BarChart3, Target, Minus,
} from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import SalesTable, { Sale, fetchSalesData, formatCurrency } from '@/components/admin/SalesTable';
import { motion } from 'framer-motion';

const PAGE_SIZE = 20;

interface AnalyticsData {
  revenue: { gross: number; net: number; previousGross: number };
  orders: {
    current: { total: number; paid: number; pending: number; refunded: number; canceled: number; free: number };
    previous: { total: number; paid: number; pending: number; refunded: number; canceled: number; free: number };
  };
  avgTicket: {
    current: number;
    previous: number;
    topCourses: { title: string; count: number; revenue: number }[];
  };
  salesOrigin: {
    sources: { source: string; count: number }[];
    totalConverted: number;
    paymentMethods: Record<string, number>;
    previousPaymentMethods: Record<string, number>;
  };
}

const sourceLabels: Record<string, string> = {
  signup: 'Cadastro',
  form: 'Formulário',
  hotmart: 'Hotmart',
  import: 'Importação',
  manual: 'Manual',
};

const pmLabels: Record<string, string> = {
  credit_card: 'Cartão',
  pix: 'PIX',
  boleto: 'Boleto',
};

const pmIcons: Record<string, React.ReactNode> = {
  credit_card: <CreditCard className="h-3.5 w-3.5" />,
  pix: <QrCode className="h-3.5 w-3.5" />,
  boleto: <FileText className="h-3.5 w-3.5" />,
};

function PercentBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return (
    <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px] gap-0.5 px-1.5 py-0 h-5">
      <TrendingUp className="h-3 w-3" /> Novo
    </Badge>
  );
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return (
    <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px] gap-0.5 px-1.5 py-0 h-5">
      <Minus className="h-3 w-3" /> 0%
    </Badge>
  );
  const isUp = pct > 0;
  return (
    <Badge variant="outline" className={cn(
      "text-[10px] gap-0.5 px-1.5 py-0 h-5",
      isUp ? "bg-success/10 text-success border-success/30" : "bg-destructive/10 text-destructive border-destructive/30"
    )}>
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isUp ? '+' : ''}{pct}%
    </Badge>
  );
}

export default function AdminOrders() {
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => { loadAll(); }, [page]);

  const loadAll = async () => {
    setLoading(true);
    const data = await fetchSalesData(page, PAGE_SIZE);
    setAllSales(data.sales);
    setTotalCount(data.totalCount);
    setLoading(false);
    fetchAnalytics();
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pagarme', {
        body: { action: 'get_orders_analytics' },
      });
      if (!error && data) setAnalytics(data);
    } catch (e) {
      console.error('Error fetching analytics:', e);
    }
    setAnalyticsLoading(false);
  };

  const filteredSales = allSales.filter(sale => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (sale.course_title?.toLowerCase().includes(term) || false) ||
      (sale.user_name?.toLowerCase().includes(term) || false) ||
      (sale.user_email?.toLowerCase().includes(term) || false) ||
      (sale.id?.toLowerCase().includes(term) || false);
    const matchesStatus = statusFilter === 'all' || sale.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || sale.payment_method === paymentFilter;

    let matchesDate = true;
    if (dateFrom || dateTo) {
      const saleDate = sale.paid_at ? new Date(sale.paid_at) : new Date(sale.created_at);
      if (dateFrom && saleDate < startOfDay(dateFrom)) matchesDate = false;
      if (dateTo && saleDate > endOfDay(dateTo)) matchesDate = false;
    }

    return matchesSearch && matchesStatus && matchesPayment && matchesDate;
  });

  const hasActiveFilters = statusFilter !== 'all' || paymentFilter !== 'all' || !!dateFrom || !!dateTo || !!searchTerm;

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPaymentFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const a = analytics;

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Vendas</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie todas as vendas da plataforma</p>
      </div>

      {/* Analytics Cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Receita Total */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0 }}>
          <Card className="h-full overflow-hidden">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground">Receita Total</span>
                </div>
                {a && <PercentBadge current={a.revenue.gross} previous={a.revenue.previousGross} />}
              </div>
              {analyticsLoading ? (
                <div className="space-y-2"><Skeleton className="h-8 w-28" /><Skeleton className="h-4 w-20" /></div>
              ) : a ? (
                <>
                  <p className="text-xl sm:text-2xl font-bold tracking-tight">{formatCurrency(a.revenue.gross)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Líquido: <span className="font-medium text-success">{formatCurrency(a.revenue.net)}</span>
                  </p>
                </>
              ) : <p className="text-muted-foreground text-sm">—</p>}
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 2: Total de Pedidos */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
          <Card className="h-full overflow-hidden">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-chart-3/10">
                    <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-chart-3" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground">Total de Pedidos</span>
                </div>
                {a && <PercentBadge current={a.orders.current.total} previous={a.orders.previous.total} />}
              </div>
              {analyticsLoading ? (
                <div className="space-y-2"><Skeleton className="h-8 w-16" /><Skeleton className="h-4 w-full" /></div>
              ) : a ? (
                <>
                  <p className="text-xl sm:text-2xl font-bold tracking-tight">{a.orders.current.total}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[11px] text-muted-foreground">
                    <span className="text-success">{a.orders.current.paid} pagos</span>
                    <span className="text-warning">{a.orders.current.pending} pendentes</span>
                    <span>{a.orders.current.refunded} estornados</span>
                    <span className="text-destructive">{a.orders.current.canceled} cancelados</span>
                    <span className="text-primary">{a.orders.current.free} gratuitos</span>
                  </div>
                </>
              ) : <p className="text-muted-foreground text-sm">—</p>}
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 3: Ticket Médio */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
          <Card className="h-full overflow-hidden">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-chart-4/10">
                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-chart-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground">Ticket Médio</span>
                </div>
                {a && <PercentBadge current={a.avgTicket.current} previous={a.avgTicket.previous} />}
              </div>
              {analyticsLoading ? (
                <div className="space-y-2"><Skeleton className="h-8 w-24" /><Skeleton className="h-4 w-full" /></div>
              ) : a ? (
                <>
                  <p className="text-xl sm:text-2xl font-bold tracking-tight">{formatCurrency(a.avgTicket.current)}</p>
                  {a.avgTicket.topCourses.length > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      {a.avgTicket.topCourses.map((c, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground truncate max-w-[120px]">{c.title}</span>
                          <span className="font-medium text-foreground shrink-0">{c.count} vendas</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : <p className="text-muted-foreground text-sm">—</p>}
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 4: Origem de Vendas */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }}>
          <Card className="h-full overflow-hidden">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-chart-5/10">
                    <Target className="h-4 w-4 sm:h-5 sm:w-5 text-chart-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground">Origem de Vendas</span>
                </div>
              </div>
              {analyticsLoading ? (
                <div className="space-y-2"><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-full" /></div>
              ) : a ? (
                <>
                  {/* Payment method breakdown */}
                  <div className="space-y-1.5 mb-2">
                    {Object.entries(a.salesOrigin.paymentMethods).map(([pm, count]) => {
                      const total = Object.values(a.salesOrigin.paymentMethods).reduce((s, v) => s + v, 0);
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={pm} className="flex items-center gap-2 text-[11px]">
                          <div className="flex items-center gap-1.5 w-16 shrink-0 text-muted-foreground">
                            {pmIcons[pm]}
                            <span>{pmLabels[pm] || pm}</span>
                          </div>
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-foreground font-medium w-8 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Lead sources */}
                  {a.salesOrigin.sources.length > 0 && (
                    <div className="pt-1.5 border-t space-y-0.5">
                      {a.salesOrigin.sources.slice(0, 3).map((s, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">{sourceLabels[s.source] || s.source}</span>
                          <span className="font-medium text-foreground">{s.count} conversões</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : <p className="text-muted-foreground text-sm">—</p>}
            </CardContent>
          </Card>
        </motion.div>
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
          <div className="flex flex-col gap-3">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative w-full lg:max-w-[260px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full lg:w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="free">Gratuito</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="failed">Falhou</SelectItem>
                  <SelectItem value="canceled">Cancelado</SelectItem>
                  <SelectItem value="refunded">Reembolsado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-full lg:w-36">
                  <SelectValue placeholder="Pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meios</SelectItem>
                  <SelectItem value="credit_card">Cartão</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="coupon">Cupom 100%</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="default" className={cn("h-9 text-xs gap-2 w-full lg:w-auto", !dateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {dateFrom ? format(dateFrom, "dd/MM/yy", { locale: ptBR }) : "De"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
                <span className="text-xs text-muted-foreground">–</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="default" className={cn("h-9 text-xs gap-2 w-full lg:w-auto", !dateTo && "text-muted-foreground")}>
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {dateTo ? format(dateTo, "dd/MM/yy", { locale: ptBR }) : "Até"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="h-9 text-xs gap-1.5 text-muted-foreground shrink-0" onClick={clearFilters}>
                  <X className="h-3.5 w-3.5" />
                  Limpar
                </Button>
              )}
            </div>
          </div>

          <SalesTable
            sales={hasActiveFilters ? filteredSales : allSales}
            loading={loading}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            showPagination={!hasActiveFilters}
            onRefresh={loadAll}
          />
        </CardContent>
      </Card>
    </div>
  );
}
