import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Clock, CheckCircle, Trophy } from 'lucide-react';
import StatCard from '@/components/StatCard';
import ContinueWatchingCard from '@/components/ContinueWatchingCard';
import AvailableCoursesSection from '@/components/AvailableCoursesSection';

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
}

interface StudyStats {
  totalWatchedSeconds: number;
  totalLessonsCompleted: number;
  totalCoursesCompleted: number;
}

// Helper to format seconds into readable time
const formatStudyTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StudyStats>({
    totalWatchedSeconds: 0,
    totalLessonsCompleted: 0,
    totalCoursesCompleted: 0,
  });

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

      // Fetch all user progress at once for efficiency
      const { data: allProgress } = await supabase
        .from('lesson_progress')
        .select('lesson_id, completed, completed_at, watched_seconds')
        .eq('user_id', user.id);

      // Calculate total study time
      const totalWatchedSeconds = allProgress?.reduce((sum, p) => sum + (p.watched_seconds || 0), 0) || 0;
      const totalLessonsCompleted = allProgress?.filter(p => p.completed).length || 0;

      const coursesWithProgress = await Promise.all(
        (enrollments || []).map(async (enrollment: any) => {
          const { count: totalLessons } = await supabase
            .from('lessons')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', enrollment.course.id);

          const { data: lessonIds } = await supabase
            .from('lessons')
            .select('id')
            .eq('course_id', enrollment.course.id);

          const lessonIdSet = new Set(lessonIds?.map(l => l.id) || []);
          const courseProgress = allProgress?.filter(p => lessonIdSet.has(p.lesson_id)) || [];
          const completedLessons = courseProgress.filter(p => p.completed).length;

          return {
            id: enrollment.id,
            course: enrollment.course,
            totalLessons: totalLessons || 0,
            completedLessons,
          };
        })
      );

      // Count completed courses (100% progress)
      const totalCoursesCompleted = coursesWithProgress.filter(
        c => c.totalLessons > 0 && c.completedLessons >= c.totalLessons
      ).length;

      setStats({
        totalWatchedSeconds,
        totalLessonsCompleted,
        totalCoursesCompleted,
      });

      setEnrolledCourses(coursesWithProgress);
      setLoading(false);
    };

    fetchEnrolledCourses();
  }, [user]);

  const totalCourses = enrolledCourses.length;

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Olá, {user?.user_metadata?.full_name || 'Usuário'}!</h1>
        <p className="text-muted-foreground text-sm mt-1">Vamos continuar aprendendo? Boas aulas!</p>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <StatCard
          title="Cursos Matriculados"
          value={totalCourses}
          icon={BookOpen}
          loading={loading}
        />
        <StatCard
          title="Tempo de Estudo"
          value={formatStudyTime(stats.totalWatchedSeconds)}
          icon={Clock}
          loading={loading}
        />
        <StatCard
          title="Aulas Concluídas"
          value={stats.totalLessonsCompleted}
          icon={CheckCircle}
          loading={loading}
        />
        <StatCard
          title="Cursos Finalizados"
          value={stats.totalCoursesCompleted}
          icon={Trophy}
          loading={loading}
        />
        {!loading && <ContinueWatchingCard />}
      </div>

      <div>
        <h2 className="text-lg font-medium tracking-tight mb-4">Meus Cursos</h2>
        
        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : enrolledCourses.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Você ainda não está matriculado em nenhum curso.</p>
              <a href="https://kanaflix.com.br/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline mt-2 inline-block">
                Ver cursos disponíveis
              </a>
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
                      <p className="text-xs text-muted-foreground mt-1">
                        {enrollment.completedLessons}/{enrollment.totalLessons} aulas
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <AvailableCoursesSection />
    </div>
  );
}