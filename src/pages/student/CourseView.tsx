import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Play, CheckCircle, Circle, Loader2 } from 'lucide-react';
import PandavideoPlayer from '@/components/PandavideoPlayer';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  video_url: string;
  order_index: number;
  duration_minutes: number;
  completed: boolean;
}

export default function CourseView() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    const fetchCourseData = async () => {
      if (!courseId || !user) return;

      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError) {
        console.error('Error fetching course:', courseError);
        navigate('/courses');
        return;
      }

      setCourse(courseData);

      // Check enrollment
      const { data: enrollment } = await supabase
        .from('course_enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .single();

      setIsEnrolled(!!enrollment);

      // Fetch lessons if enrolled
      if (enrollment) {
        const { data: lessonsData } = await supabase
          .from('lessons')
          .select('*')
          .eq('course_id', courseId)
          .order('order_index');

        // Fetch progress
        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('lesson_id, completed')
          .eq('user_id', user.id);

        const progressMap = new Map(progressData?.map(p => [p.lesson_id, p.completed]) || []);

        const lessonsWithProgress = (lessonsData || []).map(lesson => ({
          ...lesson,
          completed: progressMap.get(lesson.id) || false,
        }));

        setLessons(lessonsWithProgress);
        
        // Auto-select first incomplete or first lesson
        const firstIncomplete = lessonsWithProgress.find(l => !l.completed);
        setSelectedLesson(firstIncomplete || lessonsWithProgress[0] || null);
      }

      setLoading(false);
    };

    fetchCourseData();
  }, [courseId, user, navigate]);

  const handleEnroll = async () => {
    if (!user || !courseId) return;

    setEnrolling(true);

    const { error } = await supabase
      .from('course_enrollments')
      .insert({ user_id: user.id, course_id: courseId });

    if (error) {
      toast.error('Erro ao se matricular');
      console.error(error);
    } else {
      toast.success('Matrícula realizada com sucesso!');
      setIsEnrolled(true);
      
      // Fetch lessons
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index');

      const lessonsWithProgress = (lessonsData || []).map(lesson => ({
        ...lesson,
        completed: false,
      }));

      setLessons(lessonsWithProgress);
      setSelectedLesson(lessonsWithProgress[0] || null);
    }

    setEnrolling(false);
  };

  const handleMarkComplete = async (lessonId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('lesson_progress')
      .upsert({
        user_id: user.id,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date().toISOString(),
      });

    if (error) {
      toast.error('Erro ao marcar aula como concluída');
    } else {
      setLessons(lessons.map(l => 
        l.id === lessonId ? { ...l, completed: true } : l
      ));
      toast.success('Aula concluída!');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/courses')} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Voltar aos Cursos
      </Button>

      {!isEnrolled ? (
        <Card>
          {course.thumbnail_url && (
            <div className="aspect-video w-full overflow-hidden rounded-t-lg">
              <img 
                src={course.thumbnail_url} 
                alt={course.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <CardHeader>
            <CardTitle className="text-2xl">{course.title}</CardTitle>
            <CardDescription>{course.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleEnroll} disabled={enrolling} className="w-full md:w-auto">
              {enrolling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Matriculando...
                </>
              ) : (
                'Matricular-se neste curso'
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Video Player */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-0">
                {selectedLesson?.video_url ? (
                  <PandavideoPlayer 
                    videoUrl={selectedLesson.video_url}
                    title={selectedLesson.title}
                    className="rounded-t-lg overflow-hidden"
                  />
                ) : (
                  <div className="aspect-video bg-muted flex items-center justify-center rounded-t-lg">
                    <Play className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </CardContent>
              {selectedLesson && (
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{selectedLesson.title}</CardTitle>
                    {selectedLesson.completed ? (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Concluída
                      </Badge>
                    ) : (
                      <Button 
                        size="sm" 
                        onClick={() => handleMarkComplete(selectedLesson.id)}
                      >
                        Marcar como concluída
                      </Button>
                    )}
                  </div>
                  <CardDescription>{selectedLesson.description}</CardDescription>
                </CardHeader>
              )}
            </Card>
          </div>

          {/* Lessons List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Aulas do Curso</h2>
            <div className="space-y-2">
              {lessons.map((lesson, index) => (
                <Card 
                  key={lesson.id}
                  className={`cursor-pointer transition-all ${
                    selectedLesson?.id === lesson.id 
                      ? 'ring-2 ring-primary' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedLesson(lesson)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {lesson.completed ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {index + 1}. {lesson.title}
                      </p>
                      {lesson.duration_minutes && (
                        <p className="text-xs text-muted-foreground">
                          {lesson.duration_minutes} min
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
