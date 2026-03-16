import { useState } from 'react';
import DashboardRevenueCard from '@/components/admin/DashboardRevenueCard';
import DashboardStudentsCard from '@/components/admin/DashboardStudentsCard';
import DashboardCoursesCard from '@/components/admin/DashboardCoursesCard';
import DashboardRevenueChart from '@/components/admin/DashboardRevenueChart';
import DashboardPaymentMethodsChart from '@/components/admin/DashboardPaymentMethodsChart';
import DashboardSalesTable from '@/components/admin/DashboardSalesTable';
import DashboardLatestSignupsCard from '@/components/admin/DashboardLatestSignupsCard';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface DashboardDateRange {
  from: string; // ISO
  to: string;   // ISO
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

function getMonthLabel(month: string) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return format(d, 'MMMM yyyy', { locale: ptBR });
}

function getDateRangeFromMonth(month: string): DashboardDateRange {
  const [y, m] = month.split('-').map(Number);
  const start = startOfMonth(new Date(y, m - 1, 1));
  const end = endOfMonth(new Date(y, m - 1, 1));
  return { from: start.toISOString(), to: endOfDay(end).toISOString() };
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut' as const },
};

export default function AdminDashboard() {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const isCurrentMonth = selectedMonth === getCurrentMonth();
  const dateRange: DashboardDateRange | null = selectedMonth === 'all'
    ? null
    : getDateRangeFromMonth(selectedMonth);

  return (
    <div className="space-y-4 md:space-y-6">
      <motion.div {...fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Dashboard Administrativo</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visão geral da plataforma Kanaflix Play
          </p>
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
      </motion.div>

      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }} className="grid gap-3 grid-cols-1 xs:grid-cols-2 sm:grid-cols-3">
        <DashboardRevenueCard dateRange={dateRange} />
        <DashboardStudentsCard />
        <DashboardCoursesCard />
      </motion.div>

      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} className="grid gap-3 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardRevenueChart dateRange={dateRange} />
        </div>
        <DashboardPaymentMethodsChart dateRange={dateRange} />
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
