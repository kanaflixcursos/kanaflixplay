import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { BookOpen, ArrowRight, ShoppingCart, Clock, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface AvailableCourse {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  price: number | null;
  category_name: string | null;
  total_duration: number;
  points_reward: number;
}

function formatPrice(cents: number | null): string {
  if (!cents || cents === 0) return 'Grátis';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min de aula`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h de aula`;
}

export default function AvailableCoursesSection() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<AvailableCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector('[data-card]')?.clientWidth || 200;
    const gap = 12;
    const scrollAmount = (cardWidth + gap) * 2;
    el.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchAvailableCourses = async () => {
      if (!user) return;

      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .eq('user_id', user.id);

      const enrolledIds = enrollments?.map(e => e.course_id) || [];

      let query = supabase
        .from('courses')
        .select('id, title, description, thumbnail_url, price, category_id, points_reward, course_categories(name)')
        .eq('is_published', true);

      if (enrolledIds.length > 0) {
        query = query.not('id', 'in', `(${enrolledIds.join(',')})`);
      }

      const { data } = await query;

      const coursesWithDuration = await Promise.all(
        (data || []).map(async (course: any) => {
          const { data: lessons } = await supabase
            .from('lessons')
            .select('duration_minutes')
            .eq('course_id', course.id);

          const total_duration = lessons?.reduce((sum, l) => sum + (l.duration_minutes || 0), 0) || 0;

          return {
            id: course.id,
            title: course.title,
            description: course.description,
            thumbnail_url: course.thumbnail_url,
            price: course.price,
            category_name: course.course_categories?.name || null,
            total_duration,
            points_reward: course.points_reward || 0,
          };
        })
      );

      setCourses(coursesWithDuration);
      setLoading(false);
    };

    fetchAvailableCourses();
  }, [user]);

  useEffect(() => {
    updateScrollButtons();
  }, [courses, loading]);

  if (!loading && courses.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium tracking-tight">Cursos Disponíveis</h2>
          {!loading && courses.length > 0 && (
            <div className="hidden sm:flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <Button variant="ghost" size="sm" asChild className="text-primary gap-1">
          <Link to="/catalog">
            Ver todos <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="overflow-hidden shrink-0 w-40 sm:w-48">
              <Skeleton className="aspect-[4/5] w-full rounded-xl" />
              <div className="pt-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="relative">
        <div
          ref={scrollRef}
          onScroll={updateScrollButtons}
          className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 -mb-2 [scrollbar-width:none]"
        >
          {courses.map((course) => (
            <Link
              key={course.id}
              to={`/checkout/${course.id}`}
              data-card
              className="shrink-0 w-40 sm:w-48 snap-start group"
            >
              <div className="flex flex-col h-full cursor-pointer">
                {/* Thumbnail */}
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted rounded-xl mb-3 border border-border/50">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                  )}
                  {course.category_name && (
                    <div className="absolute top-2 left-2 z-10">
                      <span className="px-2 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wider bg-black/60 text-white backdrop-blur-md rounded">
                        {course.category_name}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                     <ShoppingCart className="h-8 w-8 text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 drop-shadow-md" />
                  </div>
                </div>

                {/* Content */}
                <div className="px-1 flex flex-col flex-1">
                  <h3 className="text-sm font-semibold leading-snug line-clamp-2 mb-1.5 group-hover:text-primary transition-colors">
                    {course.title}
                  </h3>

                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {course.total_duration > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(course.total_duration)}
                      </span>
                    )}
                    {course.points_reward > 0 && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                        <Star className="h-2.5 w-2.5 fill-current" />
                        +{course.points_reward} pts
                      </span>
                    )}
                  </div>

                  <div className="mt-auto pt-1 flex items-center">
                    <p className="text-sm font-bold text-primary">
                      {formatPrice(course.price)}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
          <div className="absolute right-0 top-0 bottom-2 w-16 pointer-events-none bg-gradient-to-l from-background to-transparent z-10" />
        </div>
      )}
    </div>
  );
}