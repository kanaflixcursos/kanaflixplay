import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AvailableCoursesSection from '@/components/AvailableCoursesSection';

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
  order_index: number;
}

interface BannerDisplay extends BannerData {
  title: string;
  description: string;
  image: string | null;
  link: string;
}

export default function StudentCourses() {
  const { user } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState<BannerDisplay[]>([]);
  const [currentBanner, setCurrentBanner] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch all active banners
      const { data: bannerData } = await supabase.
      from('featured_banner').
      select('*').
      eq('is_active', true).
      order('order_index');

      if (bannerData && bannerData.length > 0) {
        const bannerDisplays: BannerDisplay[] = await Promise.all(
          bannerData.map(async (b: any) => {
            let courseTitle = null;
            let courseDesc = null;
            let courseThumb = null;
            if (b.course_id) {
              const { data: courseData } = await supabase.
              from('courses').
              select('title, description, thumbnail_url').
              eq('id', b.course_id).
              single();
              if (courseData) {
                courseTitle = courseData.title;
                courseDesc = courseData.description;
                courseThumb = courseData.thumbnail_url;
              }
            }
            return {
              ...b,
              title: b.custom_title || courseTitle || 'Curso em Destaque',
              description: b.custom_description || courseDesc || 'Explore o conteúdo exclusivo.',
              image: b.custom_image_url || courseThumb,
              link: b.course_id ? `/courses/${b.course_id}` : '/courses'
            };
          })
        );
        setBanners(bannerDisplays);
      }

      const { data: enrollmentsData } = await supabase.
      from('course_enrollments').
      select('id, course:courses(id, title, description, thumbnail_url, category_id)').
      eq('user_id', user.id);

      const enrollments = enrollmentsData || [];

      const { data: allProgress } = await supabase.
      from('lesson_progress').
      select('lesson_id, completed').
      eq('user_id', user.id);

      const coursesWithProgress = await Promise.all(
        enrollments.map(async (enrollment: any) => {
          const { count: totalLessons } = await supabase.
          from('lessons').
          select('*', { count: 'exact', head: true }).
          eq('course_id', enrollment.course.id);

          const { data: lessonIds } = await supabase.
          from('lessons').
          select('id').
          eq('course_id', enrollment.course.id);

          const lessonIdSet = new Set(lessonIds?.map((l) => l.id) || []);
          const completedLessons =
          allProgress?.filter(
            (p) => p.completed && lessonIdSet.has(p.lesson_id)
          ).length || 0;

          return {
            id: enrollment.id,
            course: enrollment.course,
            totalLessons: totalLessons || 0,
            completedLessons
          };
        })
      );

      setEnrolledCourses(coursesWithProgress);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const prevBanner = () => setCurrentBanner((p) => (p - 1 + banners.length) % banners.length);
  const nextBanner = () => setCurrentBanner((p) => (p + 1) % banners.length);

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Cursos</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Seus cursos matriculados
        </p>
      </div>

      {/* Featured Banner Slideshow */}
      {banners.length > 0 &&
      <div className="relative">
          <AnimatePresence mode="wait">
            {(() => {
            const b = banners[currentBanner];
            return (
              <motion.div
                key={currentBanner}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}>

                <div
                  className="relative overflow-hidden rounded-2xl text-white min-h-36 sm:min-h-52 px-5 py-6 sm:pl-20 sm:pr-16 sm:py-14"
                  style={{ background: `linear-gradient(135deg, ${b.gradient_from}, ${b.gradient_to})` }}>

                    {/* Image covering right side with gradient fade - hidden on mobile */}
                    {b.image &&
                  <div className="absolute top-0 right-0 w-1/2 h-full hidden sm:block">
                        <img
                      src={b.image}
                      alt=""
                      className="w-full h-full object-cover"
                      style={{
                        maskImage: 'linear-gradient(to left, black 30%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to left, black 30%, transparent 100%)'
                      }} />

                      </div>
                  }

                    <div className="relative z-10 flex-1 max-w-full sm:max-w-[55%]">
                      <span className="inline-block px-3 py-1 rounded-md bg-white/20 text-xs font-semibold mb-2 sm:mb-3 backdrop-blur-sm">
                        {b.badge_text}
                      </span>
                      <h2 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">{b.title}</h2>
                      <p className="text-xs sm:text-sm text-white/80 mb-3 sm:mb-4 line-clamp-2">{b.description}</p>
                      <Link
                      to={b.link}
                      className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-white font-medium text-xs sm:text-sm hover:bg-white/90 transition-colors"
                      style={{ color: b.gradient_from }}>

                        {b.cta_text}
                      </Link>
                    </div>
                  </div>
                </motion.div>);

          })()}
          </AnimatePresence>

          {banners.length > 1 &&
        <>
              <button
            onClick={prevBanner}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors">

                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
            onClick={nextBanner}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors">

                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="flex justify-center gap-1.5 mt-3">
                {banners.map((_, i) =>
            <button
              key={i}
              onClick={() => setCurrentBanner(i)}
              className={`h-2 rounded-full transition-all ${i === currentBanner ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'}`} />

            )}
              </div>
            </>
        }
        </div>
      }

      {/* Courses Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Meus Cursos</h2>

        {loading ?
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 4 }).map((_, i) =>
          <Skeleton key={i} className="aspect-[4/5] rounded-lg" />
          )}
          </div> :
        enrolledCourses.length === 0 ?
        <div className="bg-muted/30 border border-dashed border-border rounded-xl py-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Você ainda não está matriculado em nenhum curso.
              </p>
              <a
              href="https://kanaflix.com.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline mt-2 inline-block font-medium">

                Ver cursos disponíveis
              </a>
          </div> :

        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {enrolledCourses.map((enrollment, index) => {
            const progress =
            enrollment.totalLessons > 0 ?
            Math.round(
              enrollment.completedLessons / enrollment.totalLessons * 100
            ) :
            0;

            return (
              <motion.div
                key={enrollment.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.35,
                  ease: 'easeOut',
                  delay: index * 0.05
                }}>

                  <Link to={`/courses/${enrollment.course.id}`} className="group block h-full">
                    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl mb-3 bg-muted border border-border/50">
                      {enrollment.course.thumbnail_url ? (
                        <img
                          src={enrollment.course.thumbnail_url}
                          alt={enrollment.course.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                         <div className="bg-white/90 text-black px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-sm transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 shadow-sm">
                           Ver Curso
                         </div>
                      </div>
                    </div>
                    <div className="px-1">
                      <h3 className="font-semibold text-base leading-tight line-clamp-2 mb-2.5 group-hover:text-primary transition-colors">
                        {enrollment.course.title}
                      </h3>
                      <Progress value={progress} className="h-1.5 bg-muted mb-1.5" />
                      <p className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                        <span>{enrollment.completedLessons}/{enrollment.totalLessons} aulas</span>
                        <span>{progress}%</span>
                      </p>
                    </div>
                  </Link>
                </motion.div>);

          })}
          </div>
        }
      </section>

      <AvailableCoursesSection />
    </div>);

}