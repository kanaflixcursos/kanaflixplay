import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ShoppingCart, Clock, PlayCircle } from 'lucide-react';
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

interface SuggestedCourse {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  price: number | null;
  lessonCount: number;
  totalDurationMinutes: number;
}

interface Banner {
  id: string;
  image_url: string;
  link_url: string | null;
  placement: string;
}

export default function StudentCourses() {
  const { user } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [suggestedCourses, setSuggestedCourses] = useState<SuggestedCourse[]>([]);
  const [destaqueBanners, setDestaqueBanners] = useState<Banner[]>([]);
  const [interesseBanners, setInteresseBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const [enrollmentsResult, destaqueBannersResult, interesseBannersResult] = await Promise.all([
        supabase
          .from('course_enrollments')
          .select('id, course:courses(id, title, description, thumbnail_url)')
          .eq('user_id', user.id),
        supabase
          .from('banners')
          .select('id, image_url, link_url, placement')
          .eq('is_active', true)
          .eq('placement', 'cursos_destaque')
          .order('order_index'),
        supabase
          .from('banners')
          .select('id, image_url, link_url, placement')
          .eq('is_active', true)
          .eq('placement', 'talvez_interesse')
          .order('order_index')
          .limit(3),
      ]);

      // Get enrolled course IDs
      const enrolledCourseIds = (enrollmentsResult.data || []).map(
        (e: any) => e.course?.id
      ).filter(Boolean);

      // Fetch featured courses not enrolled
      const suggestedQuery = supabase
        .from('courses')
        .select('id, title, description, thumbnail_url, price')
        .eq('is_published', true)
        .eq('is_featured', true)
        .limit(3);

      if (enrolledCourseIds.length > 0) {
        suggestedQuery.not('id', 'in', `(${enrolledCourseIds.join(',')})`);
      }

      const suggestedResult = await suggestedQuery;

      // Fetch lesson count and duration for suggested courses
      const suggestedWithMeta = await Promise.all(
        (suggestedResult.data || []).map(async (course) => {
          const { data: lessons } = await supabase
            .from('lessons')
            .select('id, duration_minutes')
            .eq('course_id', course.id)
            .eq('is_hidden', false);

          const lessonCount = lessons?.length || 0;
          const totalDurationMinutes = lessons?.reduce(
            (sum, l) => sum + (l.duration_minutes || 0),
            0
          ) || 0;

          return { ...course, lessonCount, totalDurationMinutes };
        })
      );

      // Fetch progress for enrolled courses
      const { data: allProgress } = await supabase
        .from('lesson_progress')
        .select('lesson_id, completed')
        .eq('user_id', user.id);

      const coursesWithProgress = await Promise.all(
        (enrollmentsResult.data || []).map(async (enrollment: any) => {
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
      setSuggestedCourses(suggestedWithMeta);
      setDestaqueBanners(destaqueBannersResult.data || []);
      setInteresseBanners(interesseBannersResult.data || []);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const formatPrice = (price: number | null) => {
    if (!price || price <= 0) return 'Gratuito';
    return `R$ ${(price / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const topBanner = destaqueBanners[0];

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Cursos</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Seus cursos e sugestões para você
        </p>
      </div>

      {/* Top Banner - Cursos em destaque (1200x400 = 3:1) */}
      {topBanner && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          {topBanner.link_url ? (
            <a href={topBanner.link_url} target="_blank" rel="noopener noreferrer">
              <div className="w-full rounded-lg overflow-hidden" style={{ aspectRatio: '6/1' }}>
                <img
                  src={topBanner.image_url}
                  alt="Cursos em destaque"
                  className="w-full h-full object-cover"
                />
              </div>
            </a>
          ) : (
            <div className="w-full rounded-lg overflow-hidden" style={{ aspectRatio: '6/1' }}>
              <img
                src={topBanner.image_url}
                alt="Cursos em destaque"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </motion.div>
      )}

      {/* Enrolled Courses */}
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
                      (enrollment.completedLessons / enrollment.totalLessons) *
                        100
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
                          {enrollment.completedLessons}/{enrollment.totalLessons}{' '}
                          aulas
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

      {/* Talvez você se interesse - Course-based horizontal cards */}
      {!loading && suggestedCourses.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Talvez você se interesse</h2>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {suggestedCourses.map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut', delay: index * 0.05 }}
              >
                <Link to={`/checkout/${course.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <div className="flex h-full">
                      <div className="w-28 md:w-32 flex-shrink-0">
                        {course.thumbnail_url ? (
                          <div className="aspect-[4/5] w-full overflow-hidden rounded-l-lg">
                            <img
                              src={course.thumbnail_url}
                              alt={course.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="aspect-[4/5] w-full bg-muted rounded-l-lg flex items-center justify-center">
                            <BookOpen className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 p-3 md:p-4 flex flex-col justify-between min-w-0">
                        <div>
                          <h3 className="font-semibold text-sm md:text-base line-clamp-2 mb-1">
                            {course.title}
                          </h3>
                          {course.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                              {course.description}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <PlayCircle className="h-3 w-3" />
                            {course.lessonCount} {course.lessonCount === 1 ? 'aula' : 'aulas'}
                          </span>
                          {course.totalDurationMinutes > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(course.totalDurationMinutes)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
