import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
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
        .select('id, title, description, thumbnail_url, price, category_id, course_categories(name)')
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
            <Card key={i} className="overflow-hidden shrink-0 w-40 sm:w-48">
              <Skeleton className="aspect-[4/5] w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </Card>
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
              className="shrink-0 w-40 sm:w-48 snap-start"
            >
              <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer h-full flex flex-col">
                {/* Thumbnail */}
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted rounded-t-lg">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-3 flex flex-col flex-1 gap-1.5">
                  {/* Category + Duration */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {course.category_name && (
                      <Badge variant="secondary" className="text-xs font-medium">
                        {course.category_name}
                      </Badge>
                    )}
                    {course.total_duration > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />
                        {formatDuration(course.total_duration)}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold leading-snug line-clamp-2">{course.title}</h3>

                  {/* Price + Cart */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-border mt-auto">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">Preço</span>
                      <p className="text-sm font-semibold text-primary leading-tight">
                        {formatPrice(course.price)}
                      </p>
                    </div>
                    {course.price && course.price > 0 ? (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                      </div>
                    ) : (
                      <Badge variant="secondary" className="text-xs font-semibold text-primary uppercase">
                        Matricular
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
          <div className="absolute right-0 top-0 bottom-2 w-16 pointer-events-none bg-gradient-to-l from-background to-transparent z-10" />
        </div>
      )}
    </div>
  );
}