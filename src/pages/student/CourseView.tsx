import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
  BookOpen,
  Lock,
  Unlock
} from 'lucide-react';
import LessonComments from '@/components/LessonComments';
import PandavideoPlayerWithProgress from '@/components/PandavideoPlayerWithProgress';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  is_sequential: boolean;
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
  const [justUnlockedId, setJustUnlockedId] = useState<string | null>(null);
  const prevUnlockedCountRef = useRef<number>(0);

  useEffect(() => {
    let isMounted = true;
    
    const fetchCourseData = async () => {
      if (!courseId || !user) return;

      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (!isMounted) return;

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

      if (!isMounted) return;
      
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

        if (!isMounted) return;

        const progressMap = new Map(progressData?.map(p => [p.lesson_id, p.completed]) || []);

        // Fetch materials for all lessons
        const lessonIds = (lessonsData || []).map(l => l.id);
        const { data: materialsData } = await supabase
          .from('lesson_materials')
          .select('*')
          .in('lesson_id', lessonIds)
          .order('order_index');

        if (!isMounted) return;

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
        
        // Auto-select first incomplete or first lesson only on initial load
        if (!selectedLesson) {
          const firstIncomplete = lessonsWithProgress.find(l => !l.completed);
          setSelectedLesson(firstIncomplete || lessonsWithProgress[0] || null);
        }
      }

      setLoading(false);
    };

    fetchCourseData();
    
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, user?.id]);

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
      return <FileText className="h-4 w-4 text-destructive" />;
    }
    return <FileText className="h-4 w-4 text-primary" />;
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

  // Calculate which lessons are unlocked based on sequential progress
  // Must be called before any early returns to maintain hook order
  const unlockedLessonIds = useMemo(() => {
    if (!course?.is_sequential) {
      // All lessons unlocked if course is not sequential
      return new Set(lessons.map(l => l.id));
    }

    const unlocked = new Set<string>();
    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i];
      if (i === 0) {
        // First lesson is always unlocked
        unlocked.add(lesson.id);
      } else {
        // Check if previous lesson is completed
        const prevLesson = lessons[i - 1];
        if (prevLesson.completed) {
          unlocked.add(lesson.id);
        } else {
          // Stop unlocking further lessons
          break;
        }
      }
    }
    return unlocked;
  }, [lessons, course?.is_sequential]);

  const unlockedCount = unlockedLessonIds.size;
  const completedCount = lessons.filter(l => l.completed).length;
  const progressPercent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;
  const isLessonLocked = (lessonId: string) => !unlockedLessonIds.has(lessonId);

  // Detect when a new lesson gets unlocked and trigger animation
  useEffect(() => {
    if (prevUnlockedCountRef.current > 0 && unlockedCount > prevUnlockedCountRef.current && course?.is_sequential) {
      // Find the newly unlocked lesson (last one in the unlocked set)
      const unlockedArray = Array.from(unlockedLessonIds);
      const newlyUnlockedId = unlockedArray[unlockedArray.length - 1];
      setJustUnlockedId(newlyUnlockedId);
      
      // Clear the animation after 2 seconds
      const timer = setTimeout(() => {
        setJustUnlockedId(null);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
    prevUnlockedCountRef.current = unlockedCount;
  }, [unlockedCount, unlockedLessonIds, course?.is_sequential]);

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
              <div className="aspect-[4/5] max-w-md overflow-hidden rounded-lg">
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
                <h3 className="card-title">Matricule-se agora</h3>
                <p className="card-description">
                  Tenha acesso completo a todo o conteúdo do curso
                </p>
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
            <div className="w-full rounded-lg overflow-hidden bg-foreground shadow-lg">
              <PandavideoPlayerWithProgress
                key={selectedLesson.id}
                videoUrl={selectedLesson.video_url}
                lessonId={selectedLesson.id}
                title={selectedLesson.title}
                durationMinutes={selectedLesson.duration_minutes}
                isLocked={isLessonLocked(selectedLesson.id)}
                onComplete={() => {
                  // Update local state when auto-completed
                  const updatedLessons = lessons.map(l => 
                    l.id === selectedLesson.id ? { ...l, completed: true } : l
                  );
                  setLessons(updatedLessons);
                  setSelectedLesson({ ...selectedLesson, completed: true });
                  toast.success('Aula concluída!');
                  
                  // Auto advance to next lesson
                  const currentIndex = lessons.findIndex(l => l.id === selectedLesson.id);
                  if (currentIndex < lessons.length - 1) {
                    const nextLesson = updatedLessons[currentIndex + 1];
                    setSelectedLesson(nextLesson);
                  }
                }}
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
                ) : !course.is_sequential && (
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
                    <h3 className="card-title-compact flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Materiais Complementares
                    </h3>
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
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <span className="card-title-compact">Conteúdo do Curso</span>
                <span className="text-sm text-muted-foreground">{getTotalDuration()}</span>
              </div>
              
              {/* Progress bar */}
              <div className="h-2 bg-muted rounded-full overflow-hidden mt-2">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              
              {/* Stats row */}
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {completedCount}/{lessons.length} concluídas
                </span>
                {course?.is_sequential && (
                  <span className="flex items-center gap-1">
                    <Unlock className="h-3 w-3" />
                    {unlockedCount}/{lessons.length} desbloqueadas
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[calc(100vh-350px)] overflow-y-auto">
                <div className="p-2 space-y-1">
                  {lessons.map((lesson, index) => {
                    const locked = isLessonLocked(lesson.id);
                    const isJustUnlocked = justUnlockedId === lesson.id;
                    return (
                      <button
                        key={lesson.id}
                        className={`w-full text-left p-3 rounded-lg transition-all flex items-center gap-3 ${
                          isJustUnlocked
                            ? 'bg-success/20 ring-2 ring-success animate-pulse'
                            : selectedLesson?.id === lesson.id 
                              ? 'bg-primary/10 ring-1 ring-primary' 
                              : locked 
                                ? 'opacity-60 cursor-not-allowed' 
                                : 'hover:bg-muted'
                        }`}
                        onClick={() => setSelectedLesson(lesson)}
                      >
                        {/* Thumbnail */}
                        <div className="relative w-14 h-9 rounded overflow-hidden bg-muted shrink-0">
                          {lesson.thumbnail_url ? (
                            <img 
                              src={lesson.thumbnail_url} 
                              alt={lesson.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )}
                          {/* Lock overlay for locked lessons */}
                          {locked && (
                            <div className="absolute inset-0 bg-foreground/70 flex items-center justify-center">
                              <Lock className="h-3 w-3 text-background" />
                            </div>
                          )}
                          {/* Playing indicator for current lesson */}
                          {selectedLesson?.id === lesson.id && !locked && (
                            <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                              <Play className="h-3 w-3 text-primary-foreground fill-primary-foreground" />
                            </div>
                          )}
                        </div>
                        
                        {/* Status icon */}
                        <div className="shrink-0">
                          {isJustUnlocked ? (
                            <Unlock className="h-4 w-4 text-success animate-bounce" />
                          ) : locked ? (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          ) : lesson.completed ? (
                            <CheckCircle className="h-4 w-4 text-success" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2 leading-tight">
                            {index + 1}. {lesson.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            {lesson.duration_minutes && (
                              <span>{formatDuration(lesson.duration_minutes)}</span>
                            )}
                            {lesson.materials.length > 0 && (
                              <span className="flex items-center gap-0.5">
                                <FileText className="h-3 w-3" />
                                {lesson.materials.length}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
