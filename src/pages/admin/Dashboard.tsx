import DashboardRevenueCard from '@/components/admin/DashboardRevenueCard';
import DashboardStudentsCard from '@/components/admin/DashboardStudentsCard';
import DashboardCoursesCard from '@/components/admin/DashboardCoursesCard';
import DashboardRevenueChart from '@/components/admin/DashboardRevenueChart';
import DashboardSalesTable from '@/components/admin/DashboardSalesTable';
import DashboardLatestSignupsCard from '@/components/admin/DashboardLatestSignupsCard';
import FunnelRoadmap from '@/components/admin/FunnelRoadmap';

export default function AdminDashboard() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Dashboard Administrativo</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visão geral da plataforma Kanaflix Play
        </p>
      </div>

      <FunnelRoadmap />

      <div className="grid gap-4 grid-cols-1 xs:grid-cols-2 sm:grid-cols-3">
        <DashboardRevenueCard />
        <DashboardStudentsCard />
        <DashboardCoursesCard />
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardRevenueChart />
        </div>
        <DashboardLatestSignupsCard />
      </div>

      <DashboardSalesTable />
    </div>
  );
}
