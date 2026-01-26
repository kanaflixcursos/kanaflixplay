import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Play } from 'lucide-react';
import StatCard from '@/components/StatCard';

interface EnrolledCourse {
  id: string;
  course: {
    id: string;
    title: string;
    description: string;
    thumbnail_url: string;
  };
  totalLessons: number;
  completedLessons: number;
  lastWatchedAt?: string;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastCourse, setLastCourse] = useState<EnrolledCourse | null>(null);

  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      if (!user) return;

      const { data: enrollments, error } = await supabase
        .from('course_enrollments')
        .select(`
          id,
          course:courses(id, title, description, thumbnail_url)
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching enrollments:', error);
        setLoading(false);
        return;
      }

      const coursesWithProgress = await Promise.all(
        (enrollments || []).map(async (enrollment: any) => {
          const { count: totalLessons } = await supabase
            .from('lessons')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', enrollment.course.id);

          const lessonIds = (await supabase
            .from('lessons')
            .select('id')
            .eq('course_id', enrollment.course.id)
          ).data?.map(l => l.id) || [];

          const { data: progressData } = await supabase
            .from('lesson_progress')
            .select('lesson_id, completed, completed_at')
            .eq('user_id', user.id)
            .in('lesson_id', lessonIds);

          const completedLessons = progressData?.filter(p => p.completed).length || 0;
          
          // Get most recent activity
          const lastActivity = progressData?.reduce((latest, p) => {
            if (p.completed_at && (!latest || p.completed_at > latest)) {
              return p.completed_at;
            }
            return latest;
          }, null as string | null);

          return {
            id: enrollment.id,
            course: enrollment.course,
            totalLessons: totalLessons || 0,
            completedLessons,
            lastWatchedAt: lastActivity || undefined,
          };
        })
      );

      setEnrolledCourses(coursesWithProgress);

      // Find last watched course
      const sortedByActivity = [...coursesWithProgress]
        .filter(c => c.lastWatchedAt)
        .sort((a, b) => {
          if (!a.lastWatchedAt) return 1;
          if (!b.lastWatchedAt) return -1;
          return new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime();
        });

      setLastCourse(sortedByActivity[0] || coursesWithProgress[0] || null);
      setLoading(false);
    };

    fetchEnrolledCourses();
  }, [user]);

  const totalCourses = enrolledCourses.length;

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm md:text-base">Bem-vindo de volta! Continue seus estudos.</p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <StatCard
          title="Cursos Matriculados"
          value={totalCourses}
          icon={BookOpen}
          loading={loading}
        />
        
        {lastCourse && (
          <Link to={`/courses/${lastCourse.course.id}`}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <span className="stat-card-label">Último Curso Assistido</span>
                <Play className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="card-title line-clamp-1">{lastCourse.course.title}</p>
                <div className="flex items-center justify-between text-sm text-muted-foreground mt-2 mb-1">
                  <span>{lastCourse.completedLessons} de {lastCourse.totalLessons} aulas</span>
                  <span>
                    {lastCourse.totalLessons > 0 
                      ? Math.round((lastCourse.completedLessons / lastCourse.totalLessons) * 100) 
                      : 0}%
                  </span>
                </div>
                <Progress 
                  value={lastCourse.totalLessons > 0 
                    ? (lastCourse.completedLessons / lastCourse.totalLessons) * 100 
                    : 0
                  } 
                />
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Continuar Estudando</h2>
        
        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : enrolledCourses.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Você ainda não está matriculado em nenhum curso.</p>
              <Link to="/courses" className="text-primary hover:underline mt-2 inline-block">
                Ver cursos disponíveis
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {enrolledCourses.map((enrollment) => {
              const progress = enrollment.totalLessons > 0 
                ? Math.round((enrollment.completedLessons / enrollment.totalLessons) * 100) 
                : 0;
              
              return (
                <Link key={enrollment.id} to={`/courses/${enrollment.course.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    {enrollment.course.thumbnail_url ? (
                      <div className="aspect-[4/5] w-full overflow-hidden rounded-t-lg">
                        <img 
                          src={enrollment.course.thumbnail_url} 
                          alt={enrollment.course.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[4/5] w-full bg-muted rounded-t-lg flex items-center justify-center">
                        <BookOpen className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <CardHeader>
                      <h3 className="card-title line-clamp-2">{enrollment.course.title}</h3>
                    </CardHeader>
                    <CardContent>
                      <Progress value={progress} className="h-1.5" />
                      <p className="text-xs text-muted-foreground mt-1">{progress}% concluído</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}