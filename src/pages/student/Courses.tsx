import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

interface EnrolledCourse {
  id: string;
  course: {
    id: string;
    title: string;
    description: string;
    thumbnail_url: string;
    category_id: string | null;
  };
  totalLessons: number;
  completedLessons: number;
}

interface BannerData {
  course_id: string | null;
  custom_title: string | null;
  custom_description: string | null;
  custom_image_url: string | null;
  gradient_from: string;
  gradient_to: string;
  is_active: boolean;
  cta_text: string;
  badge_text: string;
}

export default function StudentCourses() {
  const { user } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<BannerData | null>(null);
  const [bannerCourse, setBannerCourse] = useState<{ title: string; description: string | null; thumbnail_url: string | null } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch banner config
      const { data: bannerData } = await supabase
        .from('featured_banner')
        .select('*')
        .limit(1)
        .single();

      if (bannerData && (bannerData as any).is_active) {
        const b = bannerData as unknown as BannerData;
        setBanner(b);
        if (b.course_id) {
          const { data: courseData } = await supabase
            .from('courses')
            .select('title, description, thumbnail_url')
            .eq('id', b.course_id)
            .single();
          setBannerCourse(courseData);
        }
      }

      const { data: enrollmentsData } = await supabase
        .from('course_enrollments')
        .select('id, course:courses(id, title, description, thumbnail_url, category_id)')
        .eq('user_id', user.id);

      const enrollments = enrollmentsData || [];

      const { data: allProgress } = await supabase
        .from('lesson_progress')
        .select('lesson_id, completed')
        .eq('user_id', user.id);

      const coursesWithProgress = await Promise.all(
        enrollments.map(async (enrollment: any) => {
          const { count: totalLessons } = await supabase
            .from('lessons')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', enrollment.course.id);

          const { data: lessonIds } = await supabase
            .from('lessons')
            .select('id')
            .eq('course_id', enrollment.course.id);

          const lessonIdSet = new Set(lessonIds?.map((l) => l.id) || []);
          const completedLessons =
            allProgress?.filter(
              (p) => p.completed && lessonIdSet.has(p.lesson_id)
            ).length || 0;

          return {
            id: enrollment.id,
            course: enrollment.course,
            totalLessons: totalLessons || 0,
            completedLessons,
          };
        })
      );

      setEnrolledCourses(coursesWithProgress);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const bannerTitle = banner?.custom_title || bannerCourse?.title;
  const bannerDesc = banner?.custom_description || bannerCourse?.description || 'Explore o conteúdo exclusivo disponível para você.';
  const bannerImage = banner?.custom_image_url || bannerCourse?.thumbnail_url;
  const bannerLink = banner?.course_id ? `/courses/${banner.course_id}` : '/courses';

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Cursos</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Seus cursos matriculados
        </p>
      </div>

      {/* Featured Banner from DB */}
      {banner && bannerTitle && (
        <div
          className="relative overflow-hidden rounded-2xl p-6 sm:p-8 text-white"
          style={{
            background: `linear-gradient(135deg, ${banner.gradient_from}, ${banner.gradient_to})`,
          }}
        >
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
            <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-white/20" />
            <div className="absolute bottom-4 right-20 w-20 h-20 rounded-full bg-white/15" />
            <div className="absolute top-1/2 right-8 w-16 h-16 rounded-full bg-white/10" />
          </div>
          <div className="relative z-10 flex items-center gap-6">
            <div className="flex-1 max-w-lg">
              <span className="inline-block px-3 py-1 rounded-md bg-white/20 text-xs font-semibold mb-3 backdrop-blur-sm">
                {banner.badge_text}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold mb-2">{bannerTitle}</h2>
              <p className="text-sm text-white/80 mb-4 line-clamp-2">{bannerDesc}</p>
              <Link
                to={bannerLink}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white font-medium text-sm hover:bg-white/90 transition-colors"
                style={{ color: banner.gradient_from }}
              >
                {banner.cta_text}
              </Link>
            </div>
            {bannerImage && (
              <div className="hidden md:block w-32 h-40 rounded-xl overflow-hidden shrink-0 shadow-lg">
                <img src={bannerImage} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-4">Meus Cursos</h2>

        {loading ? (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] rounded-lg" />
            ))}
          </div>
        ) : enrolledCourses.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Você ainda não está matriculado em nenhum curso.
              </p>
              <a
                href="https://kanaflix.com.br/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline mt-2 inline-block"
              >
                Ver cursos disponíveis
              </a>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {enrolledCourses.map((enrollment, index) => {
              const progress =
                enrollment.totalLessons > 0
                  ? Math.round(
                      (enrollment.completedLessons / enrollment.totalLessons) * 100
                    )
                  : 0;

              return (
                <motion.div
                  key={enrollment.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.35,
                    ease: 'easeOut',
                    delay: index * 0.05,
                  }}
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
                        <h3 className="card-title line-clamp-2">
                          {enrollment.course.title}
                        </h3>
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
      </section>
    </div>
  );
}
