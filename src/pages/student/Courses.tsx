import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { BookOpen, ShoppingCart } from 'lucide-react';
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
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch enrolled courses, suggested courses, and banners in parallel
      const [enrollmentsResult, bannersResult] = await Promise.all([
        supabase
          .from('course_enrollments')
          .select('id, course:courses(id, title, description, thumbnail_url)')
          .eq('user_id', user.id),
        supabase
          .from('banners')
          .select('id, image_url, link_url, placement')
          .eq('is_active', true)
          .eq('placement', 'courses_page')
          .order('order_index'),
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
        .eq('is_featured', true);

      if (enrolledCourseIds.length > 0) {
        suggestedQuery.not('id', 'in', `(${enrolledCourseIds.join(',')})`);
      }

      const suggestedResult = await suggestedQuery;

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
      setSuggestedCourses(suggestedResult.data || []);
      setBanners(bannersResult.data || []);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const formatPrice = (price: number | null) => {
    if (!price || price <= 0) return 'Gratuito';
    return `R$ ${(price / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  // Split banners for different slots
  const topBanner = banners[0];
  const midBanner = banners[1];

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Cursos</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Seus cursos e sugestões para você
        </p>
      </div>

      {/* Top Banner Slot */}
      {topBanner && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          {topBanner.link_url ? (
            <a href={topBanner.link_url} target="_blank" rel="noopener noreferrer">
              <img
                src={topBanner.image_url}
                alt="Banner"
                className="w-full rounded-lg object-cover max-h-48 md:max-h-64"
              />
            </a>
          ) : (
            <img
              src={topBanner.image_url}
              alt="Banner"
              className="w-full rounded-lg object-cover max-h-48 md:max-h-64"
            />
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

      {/* Mid Banner Slot */}
      {midBanner && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
        >
          {midBanner.link_url ? (
            <a href={midBanner.link_url} target="_blank" rel="noopener noreferrer">
              <img
                src={midBanner.image_url}
                alt="Banner"
                className="w-full rounded-lg object-cover max-h-48 md:max-h-64"
              />
            </a>
          ) : (
            <img
              src={midBanner.image_url}
              alt="Banner"
              className="w-full rounded-lg object-cover max-h-48 md:max-h-64"
            />
          )}
        </motion.div>
      )}

      {/* Suggested Courses (Order Bump) */}
      {!loading && suggestedCourses.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Cursos Recomendados</h2>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {suggestedCourses.map((course, index) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.35,
                  ease: 'easeOut',
                  delay: index * 0.05,
                }}
              >
                <Link to={`/checkout/${course.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    {course.thumbnail_url ? (
                      <div className="aspect-[4/5] w-full overflow-hidden rounded-t-lg">
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[4/5] w-full bg-muted rounded-t-lg flex items-center justify-center">
                        <BookOpen className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <CardHeader>
                      <h3 className="card-title line-clamp-2">{course.title}</h3>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-3 w-3 text-muted-foreground" />
                        <Badge variant="outline" className="text-xs">
                          {formatPrice(course.price)}
                        </Badge>
                      </div>
                    </CardContent>
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
