import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStudentStats } from '@/hooks/queries/useStudents';

function StatCardSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}

export default function DashboardStudentsCard() {
  const { data, isLoading: loading } = useStudentStats();
  const totalStudents = data?.totalStudents ?? 0;
  const activeStudents = data?.activeStudents ?? 0;

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
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <span className="stat-card-label">Total de Alunos</span>
            </div>
          </div>

          {loading ? (
            <StatCardSkeleton />
          ) : (
            <div className="space-y-1">
              <p className="stat-card-value">
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
