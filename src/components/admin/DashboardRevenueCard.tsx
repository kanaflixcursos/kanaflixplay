import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingUp } from 'lucide-react';
import { subDays, subMonths, subYears, startOfDay } from 'date-fns';
import { motion } from 'framer-motion';

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

function StatCardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-8" />
        ))}
      </div>
    </div>
  );
}

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
      case '1d': return startOfDay(now);
      case '3d': return subDays(now, 3);
      case '1w': return subDays(now, 7);
      case '1m': return subMonths(now, 1);
      case '6m': return subMonths(now, 6);
      case '1y': return subYears(now, 1);
      case 'all': return null;
    }
  };

  const fetchRevenue = async () => {
    setLoading(true);
    const startDate = getStartDate();
    let query = supabase.from('orders').select('amount').eq('status', 'paid');
    if (startDate) query = query.gte('paid_at', startDate.toISOString());
    const { data } = await query;

    let gross = 0;
    data?.forEach(order => {
      gross += order.amount || 0;
    });

    setGrossRevenue(gross);
    setNetRevenue(gross); // No platform fees — net equals gross
    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="h-full"
    >
      <Card className="overflow-hidden relative h-full">
        <CardContent className="p-4 sm:p-6 text-left">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <span className="stat-card-label">Receita Total</span>
            </div>
          </div>

          {loading ? (
            <StatCardSkeleton />
          ) : (
            <>
              <div className="space-y-1 mb-4">
                <p className="stat-card-value">
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
    </motion.div>
  );
}
