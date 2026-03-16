import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BookOpen, ShoppingCart, Clock, CheckCircle, Search, X, Star } from 'lucide-react';
import { useCatalogCourses, useCategories } from '@/hooks/queries/useCourses';
import type { CatalogCourse } from '@/services/courseService';

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
  const { data: courses = [], isLoading: loadingCourses } = useCatalogCourses();
  const { data: categories = [], isLoading: loadingCategories } = useCategories();
  const loading = loadingCourses || loadingCategories;

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredCourses = useMemo(() => {
    let result = courses;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        c => c.title.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
      );
    }
    if (selectedCategory) {
      result = result.filter(c => c.category_id === selectedCategory);
    }
    return result;
  }, [courses, search, selectedCategory]);

  const coursesByCategory = categories
    .map(cat => ({
      category: cat,
      courses: filteredCourses.filter(c => c.category_id === cat.id),
    }))
    .filter(group => group.courses.length > 0);

  const uncategorized = filteredCourses.filter(c => !c.category_id);

  const categoryCountsMap = useMemo(() => {
    const map = new Map<string, number>();
    courses.forEach(c => {
      if (c.category_id) {
        map.set(c.category_id, (map.get(c.category_id) || 0) + 1);
      }
    });
    return map;
  }, [courses]);

  const hasResults = filteredCourses.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Catálogo de Cursos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Explore todos os cursos disponíveis na plataforma
        </p>
      </div>

      {!loading && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cursos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-10 h-11"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide [scrollbar-width:none]">
              <Button
                variant={selectedCategory === null ? 'default' : 'outline'}
                size="sm"
                className="shrink-0 text-xs h-8 rounded-full"
                onClick={() => setSelectedCategory(null)}
              >
                Todos ({courses.length})
              </Button>
              {categories
                .filter(cat => categoryCountsMap.has(cat.id))
                .map(cat => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    size="sm"
                    className="shrink-0 text-xs h-8 rounded-full"
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                  >
                    {cat.name} ({categoryCountsMap.get(cat.id)})
                  </Button>
                ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-8">
          <Skeleton className="h-11 w-full" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-6 w-40 mb-4" />
              <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
      ) : !hasResults ? (
        <div className="text-center py-16">
          <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground font-medium">Nenhum curso encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">
            Tente buscar com outros termos ou limpe os filtros
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => { setSearch(''); setSelectedCategory(null); }}>
            Limpar filtros
          </Button>
        </div>
      ) : selectedCategory ? (
        <CourseGrid courses={filteredCourses} />
      ) : (
        <div className="space-y-10">
          {coursesByCategory.map(({ category, courses: categoryCourses }) => (
            <section key={category.id}>
              <h2 className="text-base sm:text-lg font-semibold tracking-tight mb-3 sm:mb-4 flex items-center gap-2">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
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
              <h2 className="text-base sm:text-lg font-semibold tracking-tight mb-3 sm:mb-4 flex items-center gap-2">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Outros Cursos
                <Badge variant="outline" className="text-xs font-normal ml-1">
                  {uncategorized.length} {uncategorized.length === 1 ? 'curso' : 'cursos'}
                </Badge>
              </h2>
              <CourseGrid courses={uncategorized} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function CourseGrid({ courses }: { courses: CatalogCourse[] }) {
  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {courses.map((course) => (
        <Link
          key={course.id}
          to={course.is_enrolled ? `/courses/${course.id}` : `/checkout/${course.id}`}
        >
          <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer h-full flex flex-col relative">
            {course.is_enrolled && (
              <div className="absolute top-2 right-2 z-10">
                <Badge className="bg-primary hover:bg-primary text-primary-foreground text-xs font-bold uppercase gap-1 shadow-sm">
                  <CheckCircle className="h-3 w-3" />
                  Já Possui
                </Badge>
              </div>
            )}

            <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted rounded-t-lg">
              {course.thumbnail_url ? (
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="p-2.5 sm:p-4 flex flex-col flex-1 gap-1.5 sm:gap-2">
              {course.total_duration > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(course.total_duration)} de aula
                </span>
              )}

              <h3 className="text-xs sm:text-sm font-semibold leading-snug line-clamp-2">{course.title}</h3>
              {course.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 hidden sm:block">
                  {course.description.length > 80 ? course.description.slice(0, 80) + '…' : course.description}
                </p>
              )}

              {course.points_reward > 0 && (
                <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Star className="h-3 w-3 fill-current" />
                  <span className="text-xs font-semibold">+{course.points_reward} pts</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1.5 sm:pt-2 border-t border-border mt-auto">
                <div>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Preço</span>
                  <p className="text-xs sm:text-sm font-semibold text-primary leading-tight">
                    {formatPrice(course.price)}
                  </p>
                </div>
                {course.is_enrolled ? (
                  <Badge variant="secondary" className="text-xs font-semibold text-primary uppercase">
                    Acessar
                  </Badge>
                ) : course.price && course.price > 0 ? (
                  <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
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
