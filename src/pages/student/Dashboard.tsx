import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Clock, CheckCircle, Trophy } from 'lucide-react';
import StatCard from '@/components/StatCard';
import ContinueWatchingCard from '@/components/ContinueWatchingCard';
import AvailableCoursesSection from '@/components/AvailableCoursesSection';
import { motion } from 'framer-motion';

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

  // Show available courses for users with no enrollments
  if (!loading && enrolledCourses.length === 0) {
    const firstName = (user?.user_metadata?.full_name || 'Usuário').split(' ')[0];
    return (
      <div className="space-y-8">
        {/* Hero welcome */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 sm:p-10 text-primary-foreground"
        >
          {/* Decorative circles */}
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute top-4 right-8 h-20 w-20 rounded-full border border-white/20" />
          <div className="absolute bottom-6 right-24 h-8 w-8 rounded-full bg-white/15" />

          <div className="relative z-10 max-w-lg">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium mb-4"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              Bem-vindo à plataforma
            </motion.div>

            <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight leading-tight">
              Olá, {firstName}! 👋
            </h1>
            <p className="text-sm sm:text-base mt-2 text-white/80 max-w-md leading-relaxed">
              Sua jornada de aprendizado começa aqui. Explore nossos cursos e descubra conteúdos incríveis preparados para você.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="flex flex-wrap gap-4 mt-6"
            >
              <Link to="/catalog">
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 font-semibold shadow-lg shadow-black/10 gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Explorar Cursos
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="relative z-10 flex items-center gap-6 mt-8 pt-6 border-t border-white/20"
          >
            {[
              { icon: BookOpen, label: 'Cursos exclusivos' },
              { icon: Clock, label: 'Aprenda no seu ritmo' },
              { icon: Trophy, label: 'Certificados disponíveis' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs sm:text-sm text-white/70">
                <item.icon className="h-4 w-4 text-white/50" />
                <span>{item.label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Available courses */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <AvailableCoursesSection />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Olá, {user?.user_metadata?.full_name || 'Usuário'}!</h1>
        <p className="text-muted-foreground text-sm mt-1">Vamos continuar aprendendo? Boas aulas!</p>
      </motion.div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
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

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
      >
        <h2 className="text-lg font-medium tracking-tight mb-4">Meus Cursos</h2>
        
        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {enrolledCourses.map((enrollment, idx) => {
              const progress = enrollment.totalLessons > 0 
                ? Math.round((enrollment.completedLessons / enrollment.totalLessons) * 100) 
                : 0;
              
              return (
                <motion.div
                  key={enrollment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                >
                <Link to={`/courses/${enrollment.course.id}`}>
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
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1], delay: 0.15 }}
      >
        <AvailableCoursesSection />
      </motion.div>
    </div>
  );
}