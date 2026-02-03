import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Pencil, Loader2, PlayCircle } from 'lucide-react';

interface CourseWithLessons {
  id: string;
  title: string;
  is_published: boolean;
  lesson_count: number;
}

export default function DashboardCourseConfig() {
  const [courses, setCourses] = useState<CourseWithLessons[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    // Get courses
    const { data: coursesData } = await supabase
      .from('courses')
      .select('id, title, is_published')
      .order('updated_at', { ascending: false })
      .limit(5);

    if (coursesData && coursesData.length > 0) {
      // Get lesson counts for each course
      const courseIds = coursesData.map(c => c.id);
      const { data: lessons } = await supabase
        .from('lessons')
        .select('course_id')
        .in('course_id', courseIds)
        .eq('is_hidden', false);

      // Count lessons per course
      const lessonCounts = new Map<string, number>();
      lessons?.forEach(l => {
        lessonCounts.set(l.course_id, (lessonCounts.get(l.course_id) || 0) + 1);
      });

      setCourses(
        coursesData.map(c => ({
          ...c,
          lesson_count: lessonCounts.get(c.id) || 0,
        }))
      );
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="truncate">Config. de Cursos</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6 sm:py-8 p-4 sm:p-6 pt-0">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 sm:p-6 pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Settings className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
          <span className="truncate">Config. de Cursos</span>
        </CardTitle>
        <Button variant="outline" size="sm" className="shrink-0 text-xs sm:text-sm h-8" asChild>
          <Link to="/admin/courses">Ver Todos</Link>
        </Button>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        {courses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum curso cadastrado
          </p>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className="flex items-center justify-between gap-2 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{course.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] px-1.5 py-0 h-5 gap-1 ${
                        course.is_published 
                          ? 'bg-success/20 text-success border-success/30' 
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {course.is_published ? 'Publicado' : 'Rascunho'}
                    </Badge>
                    <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                      <PlayCircle className="h-3 w-3" />
                      {course.lesson_count} {course.lesson_count === 1 ? 'aula' : 'aulas'}
                    </span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="shrink-0 gap-1.5 h-8"
                  asChild
                >
                  <Link to={`/admin/courses/${course.id}/edit`}>
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Editar</span>
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
