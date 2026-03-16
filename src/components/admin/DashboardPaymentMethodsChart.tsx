import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import { CreditCard, Loader2 } from 'lucide-react';
import type { DashboardDateRange } from '@/pages/admin/Dashboard';

interface PaymentMethodData {
  method: string;
  label: string;
  count: number;
  revenue: number;
  color: string;
}

const methodConfig: Record<string, { label: string; color: string }> = {
  credit_card: { label: 'Cartão', color: 'hsl(var(--primary))' },
  pix: { label: 'PIX', color: 'hsl(160, 60%, 45%)' },
  boleto: { label: 'Boleto', color: 'hsl(35, 85%, 55%)' },
  debit_card: { label: 'Débito', color: 'hsl(220, 60%, 55%)' },
};

const chartConfig = {
  count: { label: 'Vendas' },
  credit_card: { label: 'Cartão', color: 'hsl(var(--primary))' },
  pix: { label: 'PIX', color: 'hsl(160, 60%, 45%)' },
  boleto: { label: 'Boleto', color: 'hsl(35, 85%, 55%)' },
  debit_card: { label: 'Débito', color: 'hsl(220, 60%, 55%)' },
} satisfies ChartConfig;

interface Props {
  dateRange: DashboardDateRange | null;
}

export default function DashboardPaymentMethodsChart({ dateRange }: Props) {
  const [data, setData] = useState<PaymentMethodData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);

    let query = supabase
      .from('orders')
      .select('payment_method, amount')
      .eq('status', 'paid');

    if (dateRange) {
      query = query.gte('paid_at', dateRange.from).lte('paid_at', dateRange.to);
    }

    const { data: orders } = await query;

    const grouped: Record<string, { count: number; revenue: number }> = {};

    (orders || []).forEach((order) => {
      const pm = order.payment_method || 'credit_card';
      if (!grouped[pm]) grouped[pm] = { count: 0, revenue: 0 };
      grouped[pm].count += 1;
      grouped[pm].revenue += order.amount || 0;
    });

    const chartData: PaymentMethodData[] = Object.keys(methodConfig).map((key) => ({
      method: key,
      label: methodConfig[key].label,
      count: grouped[key]?.count || 0,
      revenue: grouped[key]?.revenue || 0,
      color: methodConfig[key].color,
    }));

    setData(chartData);
    setLoading(false);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value / 100);

  const totalSales = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card className="overflow-hidden h-full">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-3">
          <div className="icon-box">
            <CreditCard />
          </div>
          <span className="stat-card-label">Pagamentos por Método</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        {loading ? (
          <div className="flex justify-center py-8 sm:py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : totalSales === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
            <CreditCard className="h-8 w-8 mb-2 opacity-40" />
            <p>Nenhuma venda no período</p>
          </div>
        ) : (
          <div className="space-y-4">
            <ChartContainer config={chartConfig} className="h-[180px] sm:h-[200px] w-full">
              <BarChart
                data={data}
                margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={4}
                  fontSize={10}
                  allowDecimals={false}
                />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0].payload as PaymentMethodData;
                    const pct = totalSales > 0 ? Math.round((item.count / totalSales) * 100) : 0;
                    return (
                      <div className="rounded-xl border border-border bg-popover px-3 py-2 shadow-lg text-popover-foreground text-sm space-y-1">
                        <p className="font-medium">{item.label}</p>
                        <p className="text-muted-foreground">
                          {item.count} venda{item.count !== 1 ? 's' : ''} ({pct}%)
                        </p>
                        <p className="font-semibold">{formatCurrency(item.revenue)}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {data.map((entry) => (
                    <Cell key={entry.method} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>

            <div className="grid grid-cols-2 gap-2">
              {data.filter(d => d.count > 0).map((item) => {
                const pct = totalSales > 0 ? Math.round((item.count / totalSales) * 100) : 0;
                return (
                  <div key={item.method} className="flex items-center gap-2 text-sm">
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium ml-auto">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
