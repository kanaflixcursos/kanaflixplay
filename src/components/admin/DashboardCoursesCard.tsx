import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Clock, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DashboardCoursesCard() {
  const [totalCourses, setTotalCourses] = useState(0);
  const [lastCourse, setLastCourse] = useState<{ title: string; created_at: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    const [
      { count: total },
      { data: latest },
    ] = await Promise.all([
      supabase.from('courses').select('*', { count: 'exact', head: true }),
      supabase.from('courses').select('title, created_at').order('created_at', { ascending: false }).limit(1).single(),
    ]);

    setTotalCourses(total || 0);
    setLastCourse(latest);
    setLoading(false);
  };

  return (
    <Card className="overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-chart-4 via-chart-5 to-chart-4" />
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-chart-4/20">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-chart-4" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Total de Cursos</span>
          </div>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-2xl sm:text-3xl font-bold tracking-tight">
              {totalCourses.toLocaleString('pt-BR')}
            </p>
            {lastCourse && (
              <div className="text-xs sm:text-sm text-muted-foreground">
                <span>Último: </span>
                <span className="font-medium text-foreground truncate block max-w-[180px]">
                  {lastCourse.title}
                </span>
                <span className="text-[10px] sm:text-xs">
                  {formatDistanceToNow(new Date(lastCourse.created_at), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
