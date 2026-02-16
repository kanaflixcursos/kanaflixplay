import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserCheck } from 'lucide-react';
import { subDays } from 'date-fns';
import { motion } from 'framer-motion';

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
    const [{ count: total }, { count: active }] = await Promise.all([
      supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_seen_at', sevenDaysAgo),
    ]);
    setTotalStudents(total || 0);
    setActiveStudents(active || 0);
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: 0.05 }}
      className="h-full"
    >
      <Card className="overflow-hidden relative h-full">
        <CardContent className="p-4 sm:p-6 text-left">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-chart-3/10">
                <Users className="h-5 w-5 text-chart-3" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Total de Alunos</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-success font-medium bg-success/10 px-2 py-1 rounded-full">
              <UserCheck className="h-3 w-3" />
            </div>
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
    </motion.div>
  );
}
