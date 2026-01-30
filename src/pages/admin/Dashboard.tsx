import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, UserCheck, BookOpen } from 'lucide-react';
import StatCard from '@/components/StatCard';
import DashboardActiveUsersChart from '@/components/admin/DashboardActiveUsersChart';
import DashboardManageCourses from '@/components/admin/DashboardManageCourses';
import DashboardManageUsers from '@/components/admin/DashboardManageUsers';
import DashboardRecentComments from '@/components/admin/DashboardRecentComments';
import DashboardRecentSignups from '@/components/admin/DashboardRecentSignups';
import { subDays } from 'date-fns';

interface Stats {
  totalStudents: number;
  activeStudents: number;
  totalCourses: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    activeStudents: 0,
    totalCourses: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();

      const [
        { count: totalStudents },
        { count: activeStudents },
        { count: totalCourses },
      ] = await Promise.all([
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_seen_at', sevenDaysAgo),
        supabase.from('courses').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        totalStudents: totalStudents || 0,
        activeStudents: activeStudents || 0,
        totalCourses: totalCourses || 0,
      });

      setLoading(false);
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Total de Alunos',
      value: stats.totalStudents,
      icon: Users,
      description: 'Usuários registrados',
    },
    {
      title: 'Alunos Ativos',
      value: stats.activeStudents,
      icon: UserCheck,
      description: 'Últimos 7 dias',
    },
    {
      title: 'Total de Cursos',
      value: stats.totalCourses,
      icon: BookOpen,
      description: 'Todos os cursos',
    },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Dashboard Administrativo</h1>
        <p className="text-muted-foreground text-xs sm:text-sm md:text-base">
          Visão geral da plataforma Kanaflix Play
        </p>
      </div>

      {/* StatCards - 1 col on tiny screens, 2 on mobile, 3 on tablet+ */}
      <div className="grid gap-3 grid-cols-1 xs:grid-cols-2 sm:grid-cols-3">
        {statCards.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            description={stat.description}
            icon={stat.icon}
            loading={loading}
          />
        ))}
      </div>

      {/* Active Users Chart */}
      <DashboardActiveUsersChart />

      {/* Grid - 1 col on mobile, 2 on tablet+ */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
        <DashboardManageCourses />
        <DashboardManageUsers />
        <DashboardRecentComments />
        <DashboardRecentSignups />
      </div>
    </div>
  );
}
