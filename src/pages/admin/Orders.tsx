import { useState, useEffect, useCallback } from 'react';
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ShoppingCart, DollarSign, TrendingUp, TrendingDown, Search,
  CalendarIcon, X, BarChart3, Target, Minus, ChevronLeft, ChevronRight,
  Download, FileSpreadsheet, FileText,
} from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import SalesTable, { Sale, fetchSalesData, formatCurrency } from '@/components/admin/SalesTable';
import DashboardRevenueChart from '@/components/admin/DashboardRevenueChart';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

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
    previousTotalConverted: number;
  };
}

function PercentBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return (
    <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs gap-0.5 px-1.5 py-0 h-5">
      <TrendingUp className="h-3 w-3" /> Novo
    </Badge>
  );
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return (
    <Badge variant="outline" className="bg-muted text-muted-foreground text-xs gap-0.5 px-1.5 py-0 h-5">
      <Minus className="h-3 w-3" /> 0%
    </Badge>
  );
  const isUp = pct > 0;
  return (
    <Badge variant="outline" className={cn(
      "text-xs gap-0.5 px-1.5 py-0 h-5",
      isUp ? "bg-success/10 text-success border-success/30" : "bg-destructive/10 text-destructive border-destructive/30"
    )}>
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isUp ? '+' : ''}{pct}%
    </Badge>
  );
}

function getMonthLabel(month: string) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return format(d, 'MMMM yyyy', { locale: ptBR });
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const statusLabelsExport: Record<string, string> = {
  paid: 'Pago', pending: 'Pendente', failed: 'Falhou',
  canceled: 'Cancelado', refunded: 'Reembolsado', chargedback: 'Estornado', free: 'Gratuito',
};

const pmLabelsExport: Record<string, string> = {
  credit_card: 'Cartão', pix: 'PIX', boleto: 'Boleto', coupon: 'Cupom',
};

function exportCSV(sales: Sale[]) {
  const header = 'ID,Aluno,Email,Curso,Valor,Líquido,Pagamento,Status,Data\n';
  const rows = sales.map(s => {
    const net = s.status === 'free' ? 0 : calculateNetForExport(s.amount, s.payment_method);
    return [
      s.id,
      `"${(s.user_name || '').replace(/"/g, '""')}"`,
      s.user_email || '',
      `"${(s.course_title || '').replace(/"/g, '""')}"`,
      s.status === 'free' ? '0' : (s.amount / 100).toFixed(2),
      (net / 100).toFixed(2),
      pmLabelsExport[s.payment_method || ''] || s.payment_method || '',
      statusLabelsExport[s.status] || s.status,
      format(new Date(s.created_at), 'dd/MM/yyyy HH:mm'),
    ].join(',');
  }).join('\n');

  const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `vendas-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  toast.success(`${sales.length} vendas exportadas em CSV`);
}

function exportPDF(sales: Sale[]) {
  // Build a printable HTML table
  const rows = sales.map(s => {
    const net = s.status === 'free' ? 'R$ 0,00' : formatCurrency(calculateNetForExport(s.amount, s.payment_method));
    return `<tr>
      <td>${s.id.slice(0, 10)}</td>
      <td>${s.user_name || s.user_email || '—'}</td>
      <td>${s.course_title || '—'}</td>
      <td>${s.status === 'free' ? '—' : formatCurrency(s.amount)}</td>
      <td>${net}</td>
      <td>${pmLabelsExport[s.payment_method || ''] || '—'}</td>
      <td>${statusLabelsExport[s.status] || s.status}</td>
      <td>${format(new Date(s.created_at), 'dd/MM/yyyy HH:mm')}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório de Vendas</title>
    <style>body{font-family:sans-serif;padding:20px}h1{font-size:18px;margin-bottom:4px}p{color:#666;font-size:12px;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
    th{background:#f5f5f5;font-weight:600}</style></head>
    <body><h1>Relatório de Vendas</h1><p>Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
    <table><thead><tr><th>ID</th><th>Aluno</th><th>Curso</th><th>Valor</th><th>Líquido</th><th>Pagamento</th><th>Status</th><th>Data</th></tr></thead>
    <tbody>${rows}</tbody></table></body></html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.print();
  }
  toast.success(`${sales.length} vendas prontas para impressão/PDF`);
}

function calculateNetForExport(amount: number, pm: string | null): number {
  const fixed = 35 + 35; // gateway R$0.35 + antifraude R$0.35
  switch (pm) {
    case 'pix': return amount - Math.round(amount * 0.79 / 100) - fixed;
    case 'boleto': return amount - 279 - fixed;
    case 'credit_card': return amount - Math.round(amount * 3.25 / 100) - fixed;
    default: return amount - fixed;
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  useEffect(() => { loadSales(); }, [page]);
  useEffect(() => { fetchAnalytics(); }, [selectedMonth]);

  const loadSales = async () => {
    setLoading(true);
    const data = await fetchSalesData(page, PAGE_SIZE);
    setAllSales(data.sales);
    setTotalCount(data.totalCount);
    setLoading(false);
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pagarme', {
        body: { action: 'get_orders_analytics', month: selectedMonth },
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
  const isCurrentMonth = selectedMonth === getCurrentMonth();

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header with month selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Vendas</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie todas as vendas da plataforma</p>
        </div>
        <div className="flex items-center gap-1.5 bg-muted/50 rounded-xl p-1">
          {selectedMonth !== 'all' && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedMonth(m => shiftMonth(m, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <span className="text-sm font-medium min-w-[130px] text-center capitalize">
            {selectedMonth === 'all' ? 'Todo o período' : getMonthLabel(selectedMonth)}
          </span>
          {selectedMonth !== 'all' && (
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isCurrentMonth} onClick={() => setSelectedMonth(m => shiftMonth(m, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          {selectedMonth === 'all' ? (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setSelectedMonth(getCurrentMonth())}>
              Ver por mês
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setSelectedMonth('all')}>
              Tudo
            </Button>
          )}
        </div>
      </div>

      {/* Row 1: 3 Stat Cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        {/* Receita Total */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0 }}>
          <Card className="h-full">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <span className="stat-card-label">Receita Total</span>
                </div>
                {a && <PercentBadge current={a.revenue.gross} previous={a.revenue.previousGross} />}
              </div>
              {analyticsLoading ? (
                <div className="space-y-2"><Skeleton className="h-8 w-28" /><Skeleton className="h-4 w-20" /></div>
              ) : a ? (
                <>
                  <p className="stat-card-value">{formatCurrency(a.revenue.gross)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Líquido: <span className="font-medium text-success">{formatCurrency(a.revenue.net)}</span>
                  </p>
                </>
              ) : <p className="text-muted-foreground text-sm">—</p>}
            </CardContent>
          </Card>
        </motion.div>

        {/* Total de Pedidos */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
          <Card className="h-full">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-chart-3/10">
                    <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-chart-3" />
                  </div>
                  <span className="stat-card-label">Total de Pedidos</span>
                </div>
                {a && <PercentBadge current={a.orders.current.total} previous={a.orders.previous.total} />}
              </div>
              {analyticsLoading ? (
                <div className="space-y-2"><Skeleton className="h-8 w-16" /><Skeleton className="h-4 w-full" /></div>
              ) : a ? (
                <>
                  <p className="stat-card-value">{a.orders.current.total}</p>
                  <div className="grid grid-cols-3 gap-x-2 gap-y-1 mt-2">
                    {[
                      { label: 'Pagos', value: a.orders.current.paid, color: 'text-success' },
                      { label: 'Pendentes', value: a.orders.current.pending, color: 'text-warning' },
                      { label: 'Gratuitos', value: a.orders.current.free, color: 'text-primary' },
                      { label: 'Estornos', value: a.orders.current.refunded, color: 'text-muted-foreground' },
                      { label: 'Cancelados', value: a.orders.current.canceled, color: 'text-destructive' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-1.5 text-xs">
                        <span className={cn("font-semibold tabular-nums", item.color)}>{item.value}</span>
                        <span className="text-muted-foreground">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <p className="text-muted-foreground text-sm">—</p>}
            </CardContent>
          </Card>
        </motion.div>

        {/* Ticket Médio */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
          <Card className="h-full">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-chart-4/10">
                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-chart-4" />
                  </div>
                  <span className="stat-card-label">Ticket Médio</span>
                </div>
                {a && <PercentBadge current={a.avgTicket.current} previous={a.avgTicket.previous} />}
              </div>
              {analyticsLoading ? (
                <div className="space-y-2"><Skeleton className="h-8 w-24" /><Skeleton className="h-4 w-full" /></div>
              ) : a ? (
                <>
                  <p className="stat-card-value">{formatCurrency(a.avgTicket.current)}</p>
                  {a.avgTicket.topCourses.length > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      {a.avgTicket.topCourses.map((c, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground truncate max-w-28">{c.title}</span>
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
      </div>

      {/* Row 2: Revenue Chart + Sales Origin */}
      <div className="grid gap-3 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardRevenueChart />
        </div>

        {/* Origem de Vendas */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }}>
          <Card className="h-full">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-chart-5/10">
                    <Target className="h-4 w-4 sm:h-5 sm:w-5 text-chart-5" />
                  </div>
                  <span className="stat-card-label">Origem de Vendas</span>
                </div>
                {a && <PercentBadge current={a.salesOrigin.totalConverted} previous={a.salesOrigin.previousTotalConverted} />}
              </div>
              {analyticsLoading ? (
                <div className="space-y-3"><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-full" /></div>
              ) : a && a.salesOrigin.sources.length > 0 ? (
                <div className="space-y-2.5">
                  {a.salesOrigin.sources.map((s, i) => {
                    const total = a.salesOrigin.totalConverted || 1;
                    const pct = Math.round((s.count / total) * 100);
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-foreground font-medium">{s.source}</span>
                          <span className="text-muted-foreground">{s.count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-chart-5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-xs text-muted-foreground pt-1 border-t mt-3">
                    {a.salesOrigin.totalConverted} conversões no período
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Nenhuma conversão no período</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Sales Table */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 sm:p-6 pb-3 sm:pb-4">
          <CardTitle className="flex items-center gap-3 text-left">
            <div className="p-2 rounded-xl bg-primary/10">
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            </div>
            <span className="stat-card-label">Últimas Vendas</span>
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportCSV(hasActiveFilters ? filteredSales : allSales)}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportar CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportPDF(hasActiveFilters ? filteredSales : allSales)}>
                <FileText className="h-4 w-4 mr-2" />
                Imprimir / PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
            onRefresh={() => { loadSales(); fetchAnalytics(); }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
