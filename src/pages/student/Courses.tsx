import { useEffect, useState, useRef, useCallback } from 'react';
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

interface SuggestedCourse {
  id: string;
  title: string;
  thumbnail_url: string | null;
}

interface Banner {
  id: string;
  image_url: string;
  link_url: string | null;
  placement: string;
}

function SuggestedCarousel({ courses }: { courses: SuggestedCourse[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const animationRef = useRef<number>();
  const scrollSpeed = 0.5;

  const animate = useCallback(() => {
    const el = scrollRef.current;
    if (!el || isPaused) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }
    el.scrollLeft += scrollSpeed;
    // Reset to start when reaching the duplicated set
    if (el.scrollLeft >= el.scrollWidth / 2) {
      el.scrollLeft = 0;
    }
    animationRef.current = requestAnimationFrame(animate);
  }, [isPaused]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [animate]);

  // Duplicate items for infinite scroll illusion
  const items = [...courses, ...courses];

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10 bg-gradient-to-l from-background to-transparent" />

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-hidden py-4"
        style={{ scrollBehavior: 'auto' }}
      >
        {items.map((course, index) => (
          <Link
            key={`${course.id}-${index}`}
            to={`/checkout/${course.id}`}
            className="flex-shrink-0 w-[140px] md:w-[160px] lg:w-[180px]"
          >
            <div className="relative aspect-[4/5] rounded-lg overflow-hidden transition-transform duration-300 ease-out hover:scale-[1.3] hover:z-20 hover:shadow-2xl">
              {course.thumbnail_url ? (
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              {/* Title overlay on hover */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 hover:opacity-100 transition-opacity duration-300">
                <p className="text-white text-xs font-medium line-clamp-2">{course.title}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function StudentCourses() {
  const { user } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [suggestedCourses, setSuggestedCourses] = useState<SuggestedCourse[]>([]);
  const [destaqueBanners, setDestaqueBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const [enrollmentsResult, destaqueBannersResult] = await Promise.all([
        supabase
          .from('course_enrollments')
          .select('id, course:courses(id, title, description, thumbnail_url, category_id)')
          .eq('user_id', user.id),
        supabase
          .from('banners')
          .select('id, image_url, link_url, placement')
          .eq('is_active', true)
          .eq('placement', 'cursos_destaque')
          .order('order_index'),
      ]);

      const enrollments = enrollmentsResult.data || [];
      const enrolledCourseIds = new Set(enrollments.map((e: any) => e.course.id));
      const categoryIds = [
        ...new Set(
          enrollments
            .map((e: any) => e.course.category_id)
            .filter(Boolean) as string[]
        ),
      ];

      // Fetch suggested courses from same categories, excluding enrolled
      if (categoryIds.length > 0) {
        const { data: suggested } = await supabase
          .from('courses')
          .select('id, title, thumbnail_url')
          .in('category_id', categoryIds)
          .eq('is_published', true);

        const filtered = (suggested || []).filter((c) => !enrolledCourseIds.has(c.id));
        setSuggestedCourses(filtered);
      }

      // Fetch progress for enrolled courses
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
      setDestaqueBanners(destaqueBannersResult.data || []);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const topBanner = destaqueBanners[0];

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Cursos</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Seus cursos e sugestões para você
        </p>
      </div>

      {/* Top Banner - Cursos em destaque (1200x200 = 6:1) */}
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

      {/* Talvez você se interesse - Auto carousel by category */}
      {!loading && suggestedCourses.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-2">Talvez você se interesse</h2>
          <SuggestedCarousel courses={suggestedCourses} />
        </section>
      )}
    </div>
  );
}
