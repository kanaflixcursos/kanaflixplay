import { useState } from 'react';
import DashboardRevenueCard from '@/components/admin/DashboardRevenueCard';
import DashboardStudentsCard from '@/components/admin/DashboardStudentsCard';
import DashboardCoursesCard from '@/components/admin/DashboardCoursesCard';
import DashboardRevenueChart from '@/components/admin/DashboardRevenueChart';
import DashboardPaymentMethodsChart from '@/components/admin/DashboardPaymentMethodsChart';
import DashboardSalesTable from '@/components/admin/DashboardSalesTable';
import DashboardLatestSignupsCard from '@/components/admin/DashboardLatestSignupsCard';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { subDays, subMonths, startOfDay, endOfDay, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

export interface DashboardDateRange {
  from: string; // ISO
  to: string;   // ISO
}

type QuickPeriod = '1d' | '1w' | '1m' | 'all';

const quickOptions: { value: QuickPeriod; label: string }[] = [
  { value: '1d', label: '1D' },
  { value: '1w', label: '1S' },
  { value: '1m', label: '1M' },
  { value: 'all', label: 'Tudo' },
];

function getDateRangeFromPeriod(period: QuickPeriod): DashboardDateRange | null {
  const now = new Date();
  switch (period) {
    case '1d': return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
    case '1w': return { from: startOfDay(subDays(now, 7)).toISOString(), to: endOfDay(now).toISOString() };
    case '1m': return { from: startOfDay(subMonths(now, 1)).toISOString(), to: endOfDay(now).toISOString() };
    case 'all': return null;
  }
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut' as const },
};

export default function AdminDashboard() {
  const [activePeriod, setActivePeriod] = useState<QuickPeriod | 'custom'>('1m');
  const [dateRange, setDateRange] = useState<DashboardDateRange | null>(
    getDateRangeFromPeriod('1m')
  );
  const [calendarRange, setCalendarRange] = useState<DateRange | undefined>();
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleQuickPeriod = (period: QuickPeriod) => {
    setActivePeriod(period);
    setDateRange(getDateRangeFromPeriod(period));
    setCalendarRange(undefined);
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    setCalendarRange(range);
    if (range?.from && range?.to) {
      setActivePeriod('custom');
      setDateRange({
        from: startOfDay(range.from).toISOString(),
        to: endOfDay(range.to).toISOString(),
      });
      setPopoverOpen(false);
    }
  };

  const customLabel = calendarRange?.from && calendarRange?.to
    ? `${format(calendarRange.from, 'dd/MM', { locale: ptBR })} - ${format(calendarRange.to, 'dd/MM', { locale: ptBR })}`
    : 'Período';

  return (
    <div className="space-y-4 md:space-y-6">
      <motion.div {...fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Dashboard Administrativo</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visão geral da plataforma Kanaflix Play
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {quickOptions.map((option) => (
            <Button
              key={option.value}
              variant={activePeriod === option.value ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => handleQuickPeriod(option.value)}
            >
              {option.label}
            </Button>
          ))}
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={activePeriod === 'custom' ? 'default' : 'outline'}
                size="sm"
                className="h-7 px-2.5 text-xs gap-1"
              >
                <CalendarIcon className="h-3 w-3" />
                {customLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={calendarRange}
                onSelect={handleCalendarSelect}
                numberOfMonths={2}
                disabled={(date) => date > new Date()}
                className={cn("p-3 pointer-events-auto")}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
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
