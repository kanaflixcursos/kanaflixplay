import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp, Loader2 } from 'lucide-react';
import { format, subDays, subMonths, subYears, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Period = '1d' | '3d' | '1w' | '1m' | '6m' | '1y' | 'all';

interface DailyData {
  date: string;
  revenue: number;
  sales: number;
}

const periodOptions: { value: Period; label: string }[] = [
  { value: '1d', label: '1D' },
  { value: '3d', label: '3D' },
  { value: '1w', label: '1S' },
  { value: '1m', label: '1M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1A' },
  { value: 'all', label: 'Tudo' },
];

const chartConfig = {
  revenue: {
    label: 'Faturamento',
    color: 'hsl(var(--primary))',
  },
  sales: {
    label: 'Vendas',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export default function DashboardRevenueChart() {
  const [data, setData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('1w');

  useEffect(() => {
    fetchRevenueData();
  }, [period]);

  const getDaysForPeriod = () => {
    switch (period) {
      case '1d':
        return 1;
      case '3d':
        return 3;
      case '1w':
        return 7;
      case '1m':
        return 30;
      case '6m':
        return 180;
      case '1y':
        return 365;
      case 'all':
        return 365; // Show last year for "all"
    }
  };

  const fetchRevenueData = async () => {
    setLoading(true);
    const days = getDaysForPeriod();
    const chartData: DailyData[] = [];

    // Get all paid orders from the selected period
    const startDate = startOfDay(subDays(new Date(), days - 1)).toISOString();
    const endDate = endOfDay(new Date()).toISOString();

    let query = supabase
      .from('orders')
      .select('amount, paid_at')
      .eq('status', 'paid');

    if (period !== 'all') {
      query = query.gte('paid_at', startDate).lte('paid_at', endDate);
    }

    const { data: orders } = await query;

    // Group by day
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const dayOrders = orders?.filter(order => {
        if (!order.paid_at) return false;
        const paidAt = new Date(order.paid_at);
        return paidAt >= dayStart && paidAt <= dayEnd;
      }) || [];

      const dayRevenue = dayOrders.reduce((sum, order) => sum + (order.amount || 0), 0);

      chartData.push({
        date: format(date, 'dd/MM', { locale: ptBR }),
        revenue: dayRevenue / 100,
        sales: dayOrders.length,
      });
    }

    setData(chartData);
    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <Card className="overflow-hidden h-full">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <span className="stat-card-label">Gráfico de Faturamento</span>
            </CardTitle>
            <div className="flex flex-wrap gap-1">
              {periodOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={period === option.value ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setPeriod(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center py-8 sm:py-12 p-4 sm:p-6 pt-0">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden h-full">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <span className="stat-card-label">Gráfico de Faturamento</span>
          </CardTitle>
          <div className="flex flex-wrap gap-1">
            {periodOptions.map((option) => (
              <Button
                key={option.value}
                variant={period === option.value ? 'default' : 'outline'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setPeriod(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        <ChartContainer config={chartConfig} className="h-[180px] sm:h-[250px] w-full">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 5, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={10}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              fontSize={10}
              tickFormatter={(value) => formatCurrency(value)}
              width={55}
            />
            <ChartTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const revenue = payload.find(p => p.dataKey === 'revenue')?.value as number ?? 0;
                const sales = payload.find(p => p.dataKey === 'sales')?.value as number ?? 0;
                return (
                  <div className="rounded-xl border border-border bg-popover px-3 py-2 shadow-lg text-popover-foreground text-sm space-y-1">
                    <p className="font-medium">{label}</p>
                    <p className="text-muted-foreground">{sales} venda{sales !== 1 ? 's' : ''}</p>
                    <p className="font-semibold">{formatCurrency(revenue)}</p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="sales"
              stroke="transparent"
              fill="transparent"
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#fillRevenue)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}