import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp, Loader2 } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DailyData {
  date: string;
  revenue: number;
}

const chartConfig = {
  revenue: {
    label: 'Faturamento',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export default function DashboardRevenueChart() {
  const [data, setData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const fetchRevenueData = async () => {
    const days = 7;
    const chartData: DailyData[] = [];

    // Get all paid orders from the last 7 days in one query
    const startDate = startOfDay(subDays(new Date(), days - 1)).toISOString();
    const endDate = endOfDay(new Date()).toISOString();

    const { data: orders } = await supabase
      .from('orders')
      .select('amount, paid_at')
      .eq('status', 'paid')
      .gte('paid_at', startDate)
      .lte('paid_at', endDate);

    // Group by day
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const dayRevenue = orders?.filter(order => {
        if (!order.paid_at) return false;
        const paidAt = new Date(order.paid_at);
        return paidAt >= dayStart && paidAt <= dayEnd;
      }).reduce((sum, order) => sum + (order.amount || 0), 0) || 0;

      chartData.push({
        date: format(date, 'dd/MM', { locale: ptBR }),
        revenue: dayRevenue / 100, // Convert to BRL
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
      <Card className="overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="truncate">Gráfico de Faturamento</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8 sm:py-12 p-4 sm:p-6 pt-0">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="truncate">Gráfico de Faturamento</span>
          <span className="text-xs text-muted-foreground font-normal ml-auto">Últimos 7 dias</span>
        </CardTitle>
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
              content={<ChartTooltipContent />}
              formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
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
