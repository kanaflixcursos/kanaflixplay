import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  is_published: boolean;
  isEnrolled: boolean;
  lessonCount: number;
}

export default function StudentCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) return;

      const { data: allCourses, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_published', true);

      if (error) {
        console.error('Error fetching courses:', error);
        setLoading(false);
        return;
      }

      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .eq('user_id', user.id);

      const enrolledCourseIds = new Set(enrollments?.map(e => e.course_id) || []);

      const coursesWithData = await Promise.all(
        (allCourses || []).map(async (course) => {
          const { count } = await supabase
            .from('lessons')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id);

          return {
            ...course,
            isEnrolled: enrolledCourseIds.has(course.id),
            lessonCount: count || 0,
          };
        })
      );

      setCourses(coursesWithData);
      setLoading(false);
    };

    fetchCourses();
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cursos</h1>
        <p className="text-muted-foreground">Explore todos os cursos disponíveis na plataforma.</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando cursos...</p>
      ) : courses.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum curso disponível no momento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link key={course.id} to={`/courses/${course.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                {course.thumbnail_url ? (
                  <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                    <img 
                      src={course.thumbnail_url} 
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full bg-muted rounded-t-lg flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="line-clamp-1">{course.title}</CardTitle>
                    {course.isEnrolled && (
                      <Badge variant="secondary">Matriculado</Badge>
                    )}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {course.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {course.lessonCount} {course.lessonCount === 1 ? 'aula' : 'aulas'}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
