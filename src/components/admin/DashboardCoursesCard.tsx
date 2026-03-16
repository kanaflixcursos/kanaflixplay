import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';

function StatCardSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export default function DashboardCoursesCard() {
  const [totalCourses, setTotalCourses] = useState(0);
  const [lastCourse, setLastCourse] = useState<{ title: string; created_at: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    const [{ count: total }, { data: latest }] = await Promise.all([
      supabase.from('courses').select('*', { count: 'exact', head: true }),
      supabase.from('courses').select('title, created_at').order('created_at', { ascending: false }).limit(1).single(),
    ]);
    setTotalCourses(total || 0);
    setLastCourse(latest);
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
      className="h-full"
    >
      <Card className="overflow-hidden relative h-full">
        <CardContent className="p-4 sm:p-6 text-left">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <span className="stat-card-label">Total de Cursos</span>
            </div>
          </div>

          {loading ? (
            <StatCardSkeleton />
          ) : (
            <div className="space-y-1">
              <p className="stat-card-value">
                {totalCourses.toLocaleString('pt-BR')}
              </p>
              {lastCourse && (
                <div className="text-xs sm:text-sm text-muted-foreground">
                  <span>Último: </span>
                  <span className="font-medium text-foreground truncate block max-w-[180px]">
                    {lastCourse.title}
                  </span>
                  <span className="text-xs">
                    {formatDistanceToNow(new Date(lastCourse.created_at), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
