import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Play, 
  CheckCircle, 
  Circle, 
  Loader2, 
  FileText, 
  Download,
  Clock,
  BookOpen
} from 'lucide-react';
import LessonComments from '@/components/LessonComments';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
}

interface LessonMaterial {
  id: string;
  lesson_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  video_url: string;
  order_index: number;
  duration_minutes: number;
  is_hidden: boolean;
  completed: boolean;
  materials: LessonMaterial[];
  thumbnail_url: string | null;
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

      // Fetch lessons if enrolled (excluding hidden ones for students)
      if (enrollment) {
        const { data: lessonsData } = await supabase
          .from('lessons')
          .select('*')
          .eq('course_id', courseId)
          .eq('is_hidden', false)
          .order('order_index');

        // Fetch progress
        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('lesson_id, completed')
          .eq('user_id', user.id);

        const progressMap = new Map(progressData?.map(p => [p.lesson_id, p.completed]) || []);

        // Fetch materials for all lessons
        const lessonIds = (lessonsData || []).map(l => l.id);
        const { data: materialsData } = await supabase
          .from('lesson_materials')
          .select('*')
          .in('lesson_id', lessonIds)
          .order('order_index');

        const materialsByLesson: Record<string, LessonMaterial[]> = {};
        (materialsData || []).forEach((material: LessonMaterial) => {
          if (!materialsByLesson[material.lesson_id]) {
            materialsByLesson[material.lesson_id] = [];
          }
          materialsByLesson[material.lesson_id].push(material);
        });

        const lessonsWithProgress = (lessonsData || []).map(lesson => ({
          ...lesson,
          completed: progressMap.get(lesson.id) || false,
          materials: materialsByLesson[lesson.id] || [],
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
      
      // Fetch lessons (excluding hidden)
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_hidden', false)
        .order('order_index');

      // Fetch materials
      const lessonIds = (lessonsData || []).map(l => l.id);
      const { data: materialsData } = await supabase
        .from('lesson_materials')
        .select('*')
        .in('lesson_id', lessonIds)
        .order('order_index');

      const materialsByLesson: Record<string, LessonMaterial[]> = {};
      (materialsData || []).forEach((material: LessonMaterial) => {
        if (!materialsByLesson[material.lesson_id]) {
          materialsByLesson[material.lesson_id] = [];
        }
        materialsByLesson[material.lesson_id].push(material);
      });

      const lessonsWithProgress = (lessonsData || []).map(lesson => ({
        ...lesson,
        completed: false,
        materials: materialsByLesson[lesson.id] || [],
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
      const updatedLessons = lessons.map(l => 
        l.id === lessonId ? { ...l, completed: true } : l
      );
      setLessons(updatedLessons);
      
      if (selectedLesson?.id === lessonId) {
        setSelectedLesson({ ...selectedLesson, completed: true });
      }
      
      toast.success('Aula concluída!');
      
      // Auto advance to next lesson
      const currentIndex = lessons.findIndex(l => l.id === lessonId);
      if (currentIndex < lessons.length - 1) {
        const nextLesson = updatedLessons[currentIndex + 1];
        setSelectedLesson(nextLesson);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type === 'application/pdf') {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    return <FileText className="h-4 w-4 text-blue-500" />;
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}min`;
    }
    return `${mins}min`;
  };

  const getTotalDuration = () => {
    const total = lessons.reduce((acc, l) => acc + (l.duration_minutes || 0), 0);
    return formatDuration(total);
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

  const completedCount = lessons.filter(l => l.completed).length;
  const progressPercent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  // Not enrolled - show course details and enrollment button
  if (!isEnrolled) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/courses')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar aos Cursos
        </Button>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Course Info */}
          <div className="lg:col-span-2 space-y-6">
            {course.thumbnail_url && (
              <div className="aspect-video w-full overflow-hidden rounded-lg">
                <img 
                  src={course.thumbnail_url} 
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="space-y-4">
              <h1 className="text-3xl font-medium">{course.title}</h1>
              <p className="text-muted-foreground text-lg">{course.description}</p>
            </div>
          </div>

          {/* Enrollment Card */}
          <div>
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Matricule-se agora</CardTitle>
                <CardDescription>
                  Tenha acesso completo a todo o conteúdo do curso
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  <span>{lessons.length || '—'} aulas</span>
                </div>
                
                <Button 
                  onClick={handleEnroll} 
                  disabled={enrolling} 
                  className="w-full"
                  size="lg"
                >
                  {enrolling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Matriculando...
                    </>
                  ) : (
                    'Matricular-se Gratuitamente'
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Enrolled - show lesson player
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/courses')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-medium">{course.title}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{completedCount}/{lessons.length} aulas concluídas</span>
            <span>•</span>
            <span>{progressPercent}% completo</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player */}
          {selectedLesson?.video_url ? (
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
              <iframe
                src={selectedLesson.video_url}
                title={selectedLesson.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="aspect-video bg-muted flex items-center justify-center rounded-lg">
              <Play className="h-16 w-16 text-muted-foreground" />
            </div>
          )}

          {/* Lesson Info - Outside the player card */}
          {selectedLesson && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-2xl font-medium">{selectedLesson.title}</h2>
                  {selectedLesson.duration_minutes && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {formatDuration(selectedLesson.duration_minutes)}
                    </div>
                  )}
                </div>
                {selectedLesson.completed ? (
                  <Badge variant="secondary" className="gap-1 shrink-0">
                    <CheckCircle className="h-3 w-3" />
                    Concluída
                  </Badge>
                ) : (
                  <Button 
                    onClick={() => handleMarkComplete(selectedLesson.id)}
                    className="shrink-0"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Marcar como concluída
                  </Button>
                )}
              </div>
              
              {selectedLesson.description && (
                <p className="text-muted-foreground">{selectedLesson.description}</p>
              )}

              {/* Materials Download Section */}
              {selectedLesson.materials.length > 0 && (
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Materiais Complementares
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {selectedLesson.materials.map((material) => (
                        <a
                          key={material.id}
                          href={material.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                        >
                          {getFileIcon(material.file_type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {material.file_name}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(material.file_size)}
                            </span>
                          </div>
                          <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Separator />

              {/* Comments Section */}
              <LessonComments lessonId={selectedLesson.id} />
            </div>
          )}
        </div>

        {/* Lessons Sidebar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Conteúdo do Curso</h3>
            <span className="text-sm text-muted-foreground">{getTotalDuration()}</span>
          </div>
          
          {/* Progress bar */}
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="space-y-1 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
            {lessons.map((lesson, index) => (
              <button
                key={lesson.id}
                className={`w-full text-left p-3 rounded-lg transition-all flex items-center gap-3 ${
                  selectedLesson?.id === lesson.id 
                    ? 'bg-primary/10 ring-1 ring-primary' 
                    : 'hover:bg-muted'
                }`}
                onClick={() => setSelectedLesson(lesson)}
              >
                {/* Thumbnail */}
                <div className="relative w-16 h-10 rounded overflow-hidden bg-muted shrink-0">
                  {lesson.thumbnail_url ? (
                    <img 
                      src={lesson.thumbnail_url} 
                      alt={lesson.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  {selectedLesson?.id === lesson.id && (
                    <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                      <Play className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
                
                {/* Status icon */}
                <div className="shrink-0">
                  {lesson.completed ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {index + 1}. {lesson.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {lesson.duration_minutes && (
                      <span>{formatDuration(lesson.duration_minutes)}</span>
                    )}
                    {lesson.materials.length > 0 && (
                      <Badge variant="outline" className="text-xs h-4 px-1">
                        <FileText className="h-2.5 w-2.5 mr-0.5" />
                        {lesson.materials.length}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
