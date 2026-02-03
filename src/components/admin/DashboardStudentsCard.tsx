import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserCheck } from 'lucide-react';
import { subDays } from 'date-fns';

function StatCardSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}

export default function DashboardStudentsCard() {
  const [totalStudents, setTotalStudents] = useState(0);
  const [activeStudents, setActiveStudents] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    const sevenDaysAgo = subDays(new Date(), 7).toISOString();

    const [
      { count: total },
      { count: active },
    ] = await Promise.all([
      supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_seen_at', sevenDaysAgo),
    ]);

    setTotalStudents(total || 0);
    setActiveStudents(active || 0);
    setLoading(false);
  };

  return (
    <Card className="overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-chart-2 via-chart-3 to-chart-2" />
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-chart-2/20">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-chart-2" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Total de Alunos</span>
          </div>
          <UserCheck className="h-4 w-4 text-success" />
        </div>

        {loading ? (
          <StatCardSkeleton />
        ) : (
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-bold tracking-tight">
              {totalStudents.toLocaleString('pt-BR')}
            </p>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <span>Ativos (7 dias):</span>
              <span className="font-medium text-success">{activeStudents.toLocaleString('pt-BR')}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
