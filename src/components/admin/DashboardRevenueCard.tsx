import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, Loader2 } from 'lucide-react';
import { subDays, subMonths, subYears, startOfDay } from 'date-fns';

type Period = '1d' | '3d' | '1w' | '1m' | '6m' | '1y' | 'all';

const periodOptions: { value: Period; label: string }[] = [
  { value: '1d', label: '1D' },
  { value: '3d', label: '3D' },
  { value: '1w', label: '1S' },
  { value: '1m', label: '1M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1A' },
  { value: 'all', label: 'Tudo' },
];

export default function DashboardRevenueCard() {
  const [period, setPeriod] = useState<Period>('1m');
  const [grossRevenue, setGrossRevenue] = useState(0);
  const [netRevenue, setNetRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenue();
  }, [period]);

  const getStartDate = () => {
    const now = new Date();
    switch (period) {
      case '1d':
        return startOfDay(now);
      case '3d':
        return subDays(now, 3);
      case '1w':
        return subDays(now, 7);
      case '1m':
        return subMonths(now, 1);
      case '6m':
        return subMonths(now, 6);
      case '1y':
        return subYears(now, 1);
      case 'all':
        return null;
    }
  };

  const fetchRevenue = async () => {
    setLoading(true);
    const startDate = getStartDate();

    let query = supabase
      .from('orders')
      .select('amount')
      .eq('status', 'paid');

    if (startDate) {
      query = query.gte('paid_at', startDate.toISOString());
    }

    const { data } = await query;

    const gross = data?.reduce((sum, order) => sum + (order.amount || 0), 0) || 0;
    // Net revenue calculation: gross - platform fees (assuming ~3.5% for Pagar.me)
    const net = gross * 0.965;

    setGrossRevenue(gross);
    setNetRevenue(net);
    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100);
  };

  return (
    <Card className="overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Receita Total</span>
          </div>
          <TrendingUp className="h-4 w-4 text-success" />
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-1 mb-4">
              <p className="text-2xl sm:text-3xl font-bold tracking-tight">
                {formatCurrency(grossRevenue)}
              </p>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <span>Líquido:</span>
                <span className="font-medium text-success">{formatCurrency(netRevenue)}</span>
              </div>
            </div>

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
          </>
        )}
      </CardContent>
    </Card>
  );
}
