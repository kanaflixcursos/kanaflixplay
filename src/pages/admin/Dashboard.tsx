import DashboardRevenueCard from '@/components/admin/DashboardRevenueCard';
import DashboardStudentsCard from '@/components/admin/DashboardStudentsCard';
import DashboardCoursesCard from '@/components/admin/DashboardCoursesCard';
import DashboardRevenueChart from '@/components/admin/DashboardRevenueChart';
import DashboardSalesTable from '@/components/admin/DashboardSalesTable';

export default function AdminDashboard() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Dashboard Administrativo</h1>
        <p className="text-muted-foreground text-xs sm:text-sm md:text-base">
          Visão geral da plataforma Kanaflix Play
        </p>
      </div>

      <div className="grid gap-3 grid-cols-1 xs:grid-cols-2 sm:grid-cols-3">
        <DashboardRevenueCard />
        <DashboardStudentsCard />
        <DashboardCoursesCard />
      </div>

      <DashboardRevenueChart />

      <DashboardSalesTable />
    </div>
  );
}
