import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, ShoppingCart, Clock, CheckCircle } from 'lucide-react';

interface CatalogCourse {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  price: number | null;
  category_id: string | null;
  total_duration: number;
  is_enrolled: boolean;
}

interface Category {
  id: string;
  name: string;
}

function formatPrice(cents: number | null): string {
  if (!cents || cents === 0) return 'Gratuito';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

export default function CatalogPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CatalogCourse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCatalog = async () => {
      if (!user) return;

      // Fetch all in parallel
      const [categoriesRes, coursesRes, enrollmentsRes] = await Promise.all([
        supabase.from('course_categories').select('id, name').order('name'),
        supabase.from('courses').select('id, title, description, thumbnail_url, price, category_id').eq('is_published', true),
        supabase.from('course_enrollments').select('course_id').eq('user_id', user.id),
      ]);

      const enrolledIds = new Set(enrollmentsRes.data?.map(e => e.course_id) || []);
      setCategories(categoriesRes.data || []);

      // Fetch durations
      const coursesWithData = await Promise.all(
        (coursesRes.data || []).map(async (course) => {
          const { data: lessons } = await supabase
            .from('lessons')
            .select('duration_minutes')
            .eq('course_id', course.id);

          const total_duration = lessons?.reduce((sum, l) => sum + (l.duration_minutes || 0), 0) || 0;

          return {
            ...course,
            total_duration,
            is_enrolled: enrolledIds.has(course.id),
          };
        })
      );

      setCourses(coursesWithData);
      setLoading(false);
    };

    fetchCatalog();
  }, [user]);

  // Group courses by category
  const coursesByCategory = categories
    .map(cat => ({
      category: cat,
      courses: courses.filter(c => c.category_id === cat.id),
    }))
    .filter(group => group.courses.length > 0);

  // Courses without category
  const uncategorized = courses.filter(c => !c.category_id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Catálogo de Cursos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Explore todos os cursos disponíveis na plataforma
        </p>
      </div>

      {loading ? (
        <div className="space-y-8">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-6 w-40 mb-4" />
              <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Card key={j} className="overflow-hidden">
                    <Skeleton className="aspect-[4/5] w-full" />
                    <div className="p-4 space-y-3">
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          {coursesByCategory.map(({ category, courses: categoryCourses }) => (
            <section key={category.id}>
              <h2 className="text-lg font-semibold tracking-tight mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                {category.name}
                <Badge variant="outline" className="text-xs font-normal ml-1">
                  {categoryCourses.length} {categoryCourses.length === 1 ? 'curso' : 'cursos'}
                </Badge>
              </h2>
              <CourseGrid courses={categoryCourses} />
            </section>
          ))}

          {uncategorized.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold tracking-tight mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Outros Cursos
                <Badge variant="outline" className="text-xs font-normal ml-1">
                  {uncategorized.length} {uncategorized.length === 1 ? 'curso' : 'cursos'}
                </Badge>
              </h2>
              <CourseGrid courses={uncategorized} />
            </section>
          )}

          {courses.length === 0 && (
            <div className="text-center py-16">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum curso disponível no momento.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CourseGrid({ courses }: { courses: CatalogCourse[] }) {
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {courses.map((course) => (
        <Link
          key={course.id}
          to={course.is_enrolled ? `/courses/${course.id}` : `/checkout/${course.id}`}
        >
          <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer h-full flex flex-col relative">
            {/* Enrolled Badge */}
            {course.is_enrolled && (
              <div className="absolute top-2 right-2 z-10">
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-primary-foreground text-[10px] font-bold uppercase gap-1 shadow-md">
                  <CheckCircle className="h-3 w-3" />
                  Já Possui
                </Badge>
              </div>
            )}

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
              {course.total_duration > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(course.total_duration)} de aula
                </span>
              )}

              <h3 className="text-sm sm:text-base font-semibold leading-snug line-clamp-2">{course.title}</h3>
              {course.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {course.description.length > 80 ? course.description.slice(0, 80) + '…' : course.description}
                </p>
              )}

              {/* Price + Action */}
              <div className="flex items-center justify-between pt-2 border-t border-border mt-auto">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Preço</span>
                  <p className="text-sm sm:text-base font-semibold text-primary leading-tight">
                    {formatPrice(course.price)}
                  </p>
                </div>
                {course.is_enrolled ? (
                  <Badge variant="secondary" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
                    Acessar
                  </Badge>
                ) : course.price && course.price > 0 ? (
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
  );
}
