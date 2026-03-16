import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign } from 'lucide-react';
import { subDays, subMonths, subYears, startOfDay } from 'date-fns';
import { motion } from 'framer-motion';

type Period = '1d' | '3d' | '1w' | '1m' | '6m' | '1y' | 'all';

function StatCardSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

interface Props {
  period: Period;
}

export default function DashboardRevenueCard({ period }: Props) {
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

  const calcNet = (amount: number, pm: string | null) => {
    const gateway = 35;
    const antifraude = 35;
    const fixed = gateway + antifraude;
    switch (pm) {
      case 'pix': return amount - Math.round(amount * 0.79 / 100) - fixed;
      case 'boleto': return amount - 279 - fixed;
      case 'credit_card': return amount - Math.round(amount * 3.25 / 100) - fixed;
      default: return amount - fixed;
    }
  };

  const fetchRevenue = async () => {
    setLoading(true);
    const startDate = getStartDate();
    let query = supabase.from('orders').select('amount, payment_method').eq('status', 'paid');
    if (startDate) query = query.gte('paid_at', startDate.toISOString());
    const { data } = await query;

    let gross = 0;
    let net = 0;
    data?.forEach(order => {
      const amt = order.amount || 0;
      gross += amt;
      net += calcNet(amt, order.payment_method);
    });

    setGrossRevenue(gross);
    setNetRevenue(Math.max(0, net));
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
              <div className="icon-box-lg">
                <DollarSign />
              </div>
              <span className="stat-card-label">Receita Total</span>
            </div>
          </div>

          {loading ? (
            <StatCardSkeleton />
          ) : (
            <div className="space-y-1">
              <p className="stat-card-value">
                {formatCurrency(grossRevenue)}
              </p>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <span>Líquido:</span>
                <span className="font-medium text-success">{formatCurrency(netRevenue)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
