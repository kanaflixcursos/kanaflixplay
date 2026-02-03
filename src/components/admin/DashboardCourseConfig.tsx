import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Pencil, PlayCircle } from 'lucide-react';
import DashboardListCard, { DashboardListItem } from './DashboardListCard';

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
    const { data: coursesData } = await supabase
      .from('courses')
      .select('id, title, is_published')
      .order('updated_at', { ascending: false })
      .limit(5);

    if (coursesData && coursesData.length > 0) {
      const courseIds = coursesData.map(c => c.id);
      const { data: lessons } = await supabase
        .from('lessons')
        .select('course_id')
        .in('course_id', courseIds)
        .eq('is_hidden', false);

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

  return (
    <DashboardListCard
      title="Config. de Cursos"
      icon={Settings}
      loading={loading}
      emptyMessage="Nenhum curso cadastrado"
      actionLabel="Ver Cursos"
      actionLink="/admin/courses"
    >
      {courses.map((course) => (
        <DashboardListItem key={course.id}>
          <div className="flex items-center justify-between gap-2">
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
        </DashboardListItem>
      ))}
    </DashboardListCard>
  );
}
