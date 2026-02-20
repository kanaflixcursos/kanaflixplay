import DashboardRevenueCard from '@/components/admin/DashboardRevenueCard';
import DashboardStudentsCard from '@/components/admin/DashboardStudentsCard';
import DashboardCoursesCard from '@/components/admin/DashboardCoursesCard';
import DashboardRevenueChart from '@/components/admin/DashboardRevenueChart';
import DashboardSalesTable from '@/components/admin/DashboardSalesTable';
import DashboardLatestSignupsCard from '@/components/admin/DashboardLatestSignupsCard';
import FunnelRoadmap from '@/components/admin/FunnelRoadmap';
import { motion } from 'framer-motion';

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut' as const },
};

export default function AdminDashboard() {
  return (
    <div className="space-y-4 md:space-y-6">
      <motion.div {...fadeUp}>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Dashboard Administrativo</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visão geral da plataforma Kanaflix Play
        </p>
      </motion.div>

      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.05 }}>
        <FunnelRoadmap />
      </motion.div>

      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.1 }} className="grid gap-3 grid-cols-1 xs:grid-cols-2 sm:grid-cols-3">
        <DashboardRevenueCard />
        <DashboardStudentsCard />
        <DashboardCoursesCard />
      </motion.div>

      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }} className="grid gap-3 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardRevenueChart />
        </div>
        <DashboardLatestSignupsCard />
      </motion.div>

      <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.2 }}>
        <DashboardSalesTable />
      </motion.div>
    </div>
  );
}
