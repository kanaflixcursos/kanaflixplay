import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Clock, CheckCircle, Trophy } from 'lucide-react';
import StatCard from '@/components/StatCard';
import ContinueWatchingCard from '@/components/ContinueWatchingCard';
import AvailableCoursesSection from '@/components/AvailableCoursesSection';
import StudentLevelBadge, { getStudentLevel } from '@/components/StudentLevelBadge';
import { motion } from 'framer-motion';
import welcomeIllustration from '@/assets/welcome-illustration.png';

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
  totalLessonsCompleted: number;
  totalCoursesCompleted: number;
  totalPoints: number;
}

// Helper to format points
const formatPoints = (points: number): string => {
  if (points >= 1000) {
    return `${(points / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return `${points}`;
};

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StudyStats>({
    totalLessonsCompleted: 0,
    totalCoursesCompleted: 0,
    totalPoints: 0
  });

  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      if (!user) return;

      const { data: enrollments, error } = await supabase.
      from('course_enrollments').
      select(`
          id,
          course:courses(id, title, description, thumbnail_url)
        `).
      eq('user_id', user.id);

      if (error) {
        console.error('Error fetching enrollments:', error);
        setLoading(false);
        return;
      }

      // Fetch all user progress at once for efficiency
      const [{ data: allProgress }, { data: profileData }] = await Promise.all([
        supabase.from('lesson_progress')
          .select('lesson_id, completed, completed_at, watched_seconds')
          .eq('user_id', user.id),
        supabase.from('profiles')
          .select('points')
          .eq('user_id', user.id)
          .single()
      ]);

      const totalPoints = profileData?.points || 0;
      const totalLessonsCompleted = allProgress?.filter((p) => p.completed).length || 0;

      const coursesWithProgress = await Promise.all(
        (enrollments || []).map(async (enrollment: any) => {
          const { count: totalLessons } = await supabase.
          from('lessons').
          select('*', { count: 'exact', head: true }).
          eq('course_id', enrollment.course.id);

          const { data: lessonIds } = await supabase.
          from('lessons').
          select('id').
          eq('course_id', enrollment.course.id);

          const lessonIdSet = new Set(lessonIds?.map((l) => l.id) || []);
          const courseProgress = allProgress?.filter((p) => lessonIdSet.has(p.lesson_id)) || [];
          const completedLessons = courseProgress.filter((p) => p.completed).length;

          return {
            id: enrollment.id,
            course: enrollment.course,
            totalLessons: totalLessons || 0,
            completedLessons
          };
        })
      );

      // Count completed courses (100% progress)
      const totalCoursesCompleted = coursesWithProgress.filter(
        (c) => c.totalLessons > 0 && c.completedLessons >= c.totalLessons
      ).length;

      setStats({
        totalLessonsCompleted,
        totalCoursesCompleted,
        totalPoints
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
        {/* Hero welcome — full-width banner, not a card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative overflow-hidden min-h-[340px] sm:min-h-[380px] flex items-center py-8 sm:py-12 lg:py-14 -mt-4 md:-mt-6 lg:-mt-8 pt-8 sm:pt-12 lg:pt-14"
          style={{
            background: 'linear-gradient(135deg, #0A3630 0%, #125C52 60%, #1a7a6d 100%)',
            marginLeft: 'calc(-50vw + 50%)',
            marginRight: 'calc(-50vw + 50%)',
            paddingLeft: 'calc(50vw - 50%)',
            paddingRight: 'calc(50vw - 50%)'
          }}>

          
          {/* Decorative elements */}
          <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-44 w-44 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute top-8 right-[40%] h-24 w-24 rounded-full border border-white/10" />
          <div className="absolute bottom-12 left-[30%] h-3 w-3 rounded-full bg-white/20" />
           <div className="absolute top-16 left-[45%] h-2 w-2 rounded-full bg-white/15" />


          {/* Content + Illustration side by side */}
          <div className="relative z-10 flex-col items-center justify-between w-full p-6 sm:p-10 gap-6 px-0 flex lg:flex-row">
            {/* Text content */}
            <div className="max-w-lg flex-1">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3.5 py-1.5 text-xs font-medium mb-5 text-white/90">
                
                <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-pulse" />
                Bem-vindo à plataforma
              </motion.div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight text-white">
                Olá, {firstName}! 👋
              </h1>
              <p className="text-sm sm:text-base mt-3 text-white/70 max-w-md leading-relaxed">
                Sua jornada de aprendizado começa aqui. Explore nossos cursos e descubra conteúdos incríveis preparados para você.
              </p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="flex flex-wrap items-center gap-4 mt-7">
                
                <Link to="/catalog">
                  <Button
                    size="lg"
                    className="bg-white text-[#0A3630] hover:bg-white/90 font-semibold shadow-lg shadow-black/20 gap-2 rounded-xl">
                    
                    <BookOpen className="h-4 w-4" />
                    Explorar Cursos
                  </Button>
                </Link>
              </motion.div>

              {/* Benefits row */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-8 pt-6 border-t border-white/15">
                
                {[
                { icon: BookOpen, label: 'Glaucoma e Retina' },
                { icon: Clock, label: 'On-Demand' },
                { icon: Trophy, label: 'Certificados de Conclusão' }].
                map((item, i) =>
                <div key={i} className="flex items-center gap-2 text-xs sm:text-sm text-white/60">
                    <item.icon className="h-3.5 w-3.5 text-white/50" />
                    <span>{item.label}</span>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Illustration */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
              className="hidden md:block flex-shrink-0">
              
              <img
                src={welcomeIllustration}
                alt="Pessoa estudando em um ambiente acolhedor"
                className="w-64 lg:w-80 xl:w-96 drop-shadow-2xl" />
              
            </motion.div>
          </div>
        </motion.div>

        {/* Available courses */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}>
          
          <AvailableCoursesSection />
        </motion.div>
      </div>);

  }

  return (
    <div className="space-y-4 md:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}>
        
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Olá, {user?.user_metadata?.full_name || 'Usuário'}!</h1>
        <p className="text-muted-foreground text-sm mt-1">Vamos continuar aprendendo? Boas aulas!</p>
      </motion.div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <StatCard
          title="Cursos Matriculados"
          value={totalCourses}
          icon={BookOpen}
          loading={loading} />
        
        <StatCard
          title="Aulas Concluídas"
          value={stats.totalLessonsCompleted}
          icon={CheckCircle}
          loading={loading} />
        
        <StatCard
          title="Cursos Finalizados"
          value={stats.totalCoursesCompleted}
          icon={Trophy}
          loading={loading} />
        
        <StatCard
          title="Minha Pontuação"
          value={formatPoints(stats.totalPoints)}
          icon={Star}
          loading={loading} />
        
        {!loading && <ContinueWatchingCard />}
      </div>

      {/* Level Badge Card */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1], delay: 0.05 }}>
          <StudentLevelBadge points={stats.totalPoints} />
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}>
        
        <h2 className="text-lg font-medium tracking-tight mb-4">Meus Cursos</h2>
        
        {loading ?
        <p className="text-muted-foreground">Carregando...</p> :

        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {enrolledCourses.map((enrollment, idx) => {
            const progress = enrollment.totalLessons > 0 ?
            Math.round(enrollment.completedLessons / enrollment.totalLessons * 100) :
            0;

            return (
              <motion.div
                key={enrollment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}>
                
                <Link to={`/courses/${enrollment.course.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    {enrollment.course.thumbnail_url ?
                    <div className="aspect-[4/5] w-full overflow-hidden rounded-t-lg">
                        <img
                        src={enrollment.course.thumbnail_url}
                        alt={enrollment.course.title}
                        className="w-full h-full object-cover" />
                      
                      </div> :

                    <div className="aspect-[4/5] w-full bg-muted rounded-t-lg flex items-center justify-center">
                        <BookOpen className="h-12 w-12 text-muted-foreground" />
                      </div>
                    }
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
                </motion.div>);

          })}
          </div>
        }
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1], delay: 0.15 }}>
        
        <AvailableCoursesSection />
      </motion.div>
    </div>);

}