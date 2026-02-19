import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AvailableCourse {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  price: number | null;
}

function formatPrice(cents: number | null): string {
  if (!cents || cents === 0) return 'Grátis';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export default function AvailableCoursesSection({ limit = 4 }: { limit?: number }) {
  const { user } = useAuth();
  const [courses, setCourses] = useState<AvailableCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAvailableCourses = async () => {
      if (!user) return;

      // Get enrolled course IDs
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .eq('user_id', user.id);

      const enrolledIds = enrollments?.map(e => e.course_id) || [];

      // Get published courses NOT enrolled
      let query = supabase
        .from('courses')
        .select('id, title, description, thumbnail_url, price')
        .eq('is_published', true)
        .limit(limit);

      if (enrolledIds.length > 0) {
        query = query.not('id', 'in', `(${enrolledIds.join(',')})`);
      }

      const { data } = await query;
      setCourses(data || []);
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
            <Card key={i}>
              <Skeleton className="aspect-[4/5] w-full rounded-t-lg" />
              <CardHeader><Skeleton className="h-4 w-3/4" /></CardHeader>
              <CardContent><Skeleton className="h-3 w-1/2" /></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {courses.map((course) => (
            <Link key={course.id} to={`/checkout/${course.id}`}>
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
                  <span className="text-sm font-semibold text-primary">
                    {formatPrice(course.price)}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
