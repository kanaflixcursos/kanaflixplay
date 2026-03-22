import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCreator } from '@/contexts/CreatorContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Clock, ShoppingCart } from 'lucide-react';

interface StoreCourse {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  price: number | null;
  total_duration: number;
}

function formatPrice(cents: number | null): string {
  if (!cents || cents === 0) return 'Gratuito';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  return `${Math.floor(minutes / 60)}h`;
}

export default function StorePage() {
  const { creator, settings, creatorId } = useCreator();
  const [courses, setCourses] = useState<StoreCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!creatorId) return;

    const fetchCourses = async () => {
      const { data } = await supabase
        .from('courses')
        .select('id, title, description, thumbnail_url, price')
        .eq('creator_id', creatorId)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      const enriched = await Promise.all(
        (data || []).map(async (course) => {
          const { data: lessons } = await supabase
            .from('lessons')
            .select('duration_minutes')
            .eq('course_id', course.id);
          return {
            ...course,
            total_duration: lessons?.reduce((s, l) => s + (l.duration_minutes || 0), 0) || 0,
          };
        })
      );

      setCourses(enriched);
      setLoading(false);
    };
    fetchCourses();
  }, [creatorId]);

  if (!creator) return null;

  const storeName = settings?.platform_name || creator.name;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold">{storeName}</h1>
        {(settings?.platform_description || creator.description) && (
          <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
            {settings?.platform_description || creator.description}
          </p>
        )}
      </div>

      {/* Course Grid */}
      {loading ? (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-[4/5] w-full" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum curso disponível no momento.</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {courses.map((course) => (
            <Link key={course.id} to={`/store/${creator?.slug}/checkout/${course.id}`}>
              <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer h-full flex flex-col">
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
                  {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="p-3 sm:p-4 flex flex-col flex-1 gap-2">
                  {course.total_duration > 0 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(course.total_duration)}
                    </span>
                  )}
                  <h3 className="text-sm font-semibold line-clamp-2">{course.title}</h3>
                  <div className="flex items-center justify-between pt-2 border-t mt-auto">
                    <p className="text-sm font-semibold text-primary">{formatPrice(course.price)}</p>
                    {course.price && course.price > 0 ? (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <ShoppingCart className="h-4 w-4 text-primary" />
                      </div>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Gratuito</Badge>
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
