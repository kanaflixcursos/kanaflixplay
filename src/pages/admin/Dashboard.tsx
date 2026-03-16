import { useState } from 'react';
import DashboardRevenueCard from '@/components/admin/DashboardRevenueCard';
import DashboardStudentsCard from '@/components/admin/DashboardStudentsCard';
import DashboardCoursesCard from '@/components/admin/DashboardCoursesCard';
import DashboardRevenueChart from '@/components/admin/DashboardRevenueChart';
import DashboardPaymentMethodsChart from '@/components/admin/DashboardPaymentMethodsChart';
import DashboardSalesTable from '@/components/admin/DashboardSalesTable';
import DashboardLatestSignupsCard from '@/components/admin/DashboardLatestSignupsCard';
import { Button } from '@/components/ui/button';
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

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut' as const },
};

export default function AdminDashboard() {
  const [period, setPeriod] = useState<Period>('1m');

  return (
    <div className="space-y-4 md:space-y-6">
      <motion.div {...fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Dashboard Administrativo</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visão geral da plataforma Kanaflix Play
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {periodOptions.map((option) => (
            <Button
              key={option.value}
              variant={period === option.value ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setPeriod(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </motion.div>

      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }} className="grid gap-3 grid-cols-1 xs:grid-cols-2 sm:grid-cols-3">
        <DashboardRevenueCard period={period} />
        <DashboardStudentsCard />
        <DashboardCoursesCard />
      </motion.div>

      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} className="grid gap-3 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardRevenueChart period={period} />
        </div>
        <DashboardPaymentMethodsChart period={period} />
      </motion.div>

      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }} className="grid gap-3 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardSalesTable />
        </div>
        <DashboardLatestSignupsCard />
      </motion.div>
    </div>
  );
}
