import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, ArrowRight, ShoppingCart, Clock } from 'lucide-react';
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

export default function AvailableCoursesSection({ limit = 4 }: { limit?: number }) {
  const { user } = useAuth();
  const [courses, setCourses] = useState<AvailableCourse[]>([]);
  const [loading, setLoading] = useState(true);

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
        .eq('is_published', true)
        .limit(limit);

      if (enrolledIds.length > 0) {
        query = query.not('id', 'in', `(${enrolledIds.join(',')})`);
      }

      const { data } = await query;

      // Fetch durations for each course
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
  }, [user, limit]);

  if (!loading && courses.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium tracking-tight">Cursos Disponíveis</h2>
        <Button variant="ghost" size="sm" asChild className="text-primary gap-1">
          <Link to="/courses?tab=available">
            Ver todos <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: limit }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-[16/10] w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {courses.map((course) => (
            <Link key={course.id} to={`/checkout/${course.id}`}>
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
                <div className="p-3 sm:p-4 flex flex-col flex-1 gap-2">
                  {/* Category + Duration */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {course.category_name && (
                      <Badge variant="secondary" className="text-xs font-medium">
                        {course.category_name}
                      </Badge>
                    )}
                    {course.total_duration > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(course.total_duration)}
                      </span>
                    )}
                  </div>

                  <h3 className="card-title line-clamp-2">{course.title}</h3>
                  {course.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {course.description.length > 80 ? course.description.slice(0, 80) + '…' : course.description}
                    </p>
                  )}

                  {/* Price + Cart */}
                  <div className="flex items-center justify-between pt-2 border-t border-border mt-auto">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Preço</span>
                      <p className="text-sm sm:text-base font-semibold text-primary leading-tight">
                        {formatPrice(course.price)}
                      </p>
                    </div>
                    {course.price && course.price > 0 ? (
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <ShoppingCart className="h-4 w-4 text-primary" />
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
      )}
    </div>
  );
}
