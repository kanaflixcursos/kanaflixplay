import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  price: number;
}

interface LessonMaterial {
  id: string;
  lesson_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

interface Module {
  id: string;
  title: string;
  order_index: number;
  is_optional: boolean;
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
  module_id: string | null;
}

export default function CourseView() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
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
        const [{ data: lessonsData }, { data: modulesData }] = await Promise.all([
          supabase
            .from('lessons')
            .select('*')
            .eq('course_id', courseId)
            .eq('is_hidden', false)
            .order('order_index'),
          supabase
            .from('course_modules')
            .select('*')
            .eq('course_id', courseId)
            .order('order_index'),
        ]);

        setModules((modulesData || []) as Module[]);

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

        // Sort lessons to match module display order:
        // 1. Lessons without module (by order_index)
        // 2. Lessons grouped by module order_index, then by lesson order_index
        const mods = (modulesData || []) as Module[];
        const moduleOrderMap = new Map(mods.map(m => [m.id, m.order_index]));
        
        const sortedLessons = [...lessonsWithProgress].sort((a, b) => {
          const aModOrder = a.module_id ? (moduleOrderMap.get(a.module_id) ?? 999) : -1;
          const bModOrder = b.module_id ? (moduleOrderMap.get(b.module_id) ?? 999) : -1;
          if (aModOrder !== bModOrder) return aModOrder - bModOrder;
          return a.order_index - b.order_index;
        });

        setLessons(sortedLessons);
        
        // Auto-select first incomplete or first lesson only on initial load
        if (!selectedLesson) {
          const firstIncomplete = sortedLessons.find(l => !l.completed);
          setSelectedLesson(firstIncomplete || sortedLessons[0] || null);
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

  const handleMarkComplete = async (lessonId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('lesson_progress')
      .upsert({
        user_id: user.id,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,lesson_id'
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

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const getTotalDuration = () => {
    const total = requiredLessons.reduce((acc, l) => acc + (l.duration_minutes || 0), 0);
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

  // Separate required and optional lessons
  const optionalModuleIds = new Set(modules.filter(m => m.is_optional).map(m => m.id));
  const requiredLessons = lessons.filter(l => !l.module_id || !optionalModuleIds.has(l.module_id));
  const optionalLessons = lessons.filter(l => l.module_id && optionalModuleIds.has(l.module_id));
  
  const unlockedCount = unlockedLessonIds.size;
  const completedCount = requiredLessons.filter(l => l.completed).length;
  const progressPercent = requiredLessons.length > 0 ? Math.round((completedCount / requiredLessons.length) * 100) : 0;
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

  const LessonSidebarItem = ({ lesson, index }: { lesson: Lesson; index: number }) => {
    const locked = isLessonLocked(lesson.id);
    const isJustUnlocked = justUnlockedId === lesson.id;
    return (
      <button
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
        <div className="relative w-14 h-9 rounded overflow-hidden bg-muted shrink-0">
          {lesson.thumbnail_url ? (
            <img src={lesson.thumbnail_url} alt={lesson.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
          {locked && (
            <div className="absolute inset-0 bg-foreground/70 flex items-center justify-center">
              <Lock className="h-3 w-3 text-background" />
            </div>
          )}
          {selectedLesson?.id === lesson.id && !locked && (
            <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
              <Play className="h-3 w-3 text-primary-foreground fill-primary-foreground" />
            </div>
          )}
        </div>
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
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium line-clamp-2 leading-tight">
            {lesson.title}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            {lesson.duration_minutes && <span>{formatDuration(lesson.duration_minutes)}</span>}
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

  const isPaidCourse = course?.price && course.price > 0;
  const handleEnrollmentSuccess = () => {
    setIsEnrolled(true);
    // Reload to get lessons
    window.location.reload();
  };

  // Not enrolled - redirect to checkout page
  if (!isEnrolled) {
    navigate(`/checkout/${courseId}`);
    return null;
  }

  // Enrolled - show lesson player
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header - Mobile optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="w-fit">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg sm:text-xl font-medium line-clamp-1">{course.title}</h1>
          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
            <span>{completedCount}/{requiredLessons.length} aulas</span>
            <span>•</span>
            <span>{progressPercent}%</span>
          </div>
        </div>
      </div>

      {/* Mobile: Stack vertically, Desktop: Grid */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
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
            <div className="space-y-3 md:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                <div className="space-y-1 min-w-0">
                  {selectedLesson.module_id && modules.find(m => m.id === selectedLesson.module_id) && (
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium uppercase tracking-wide">
                      {modules.find(m => m.id === selectedLesson.module_id)?.title}
                    </p>
                  )}
                  <h2 className="text-lg sm:text-2xl font-medium line-clamp-2">{selectedLesson.title}</h2>
                  {selectedLesson.duration_minutes && (
                    <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                      {formatDuration(selectedLesson.duration_minutes)}
                    </div>
                  )}
                </div>
                {selectedLesson.completed ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="gap-1 shrink-0 cursor-help">
                          <CheckCircle className="h-3 w-3" />
                          Concluída
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Aula completada automaticamente após assistir 90% do vídeo</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : !course.is_sequential && (
                  <Button 
                    onClick={() => handleMarkComplete(selectedLesson.id)}
                    className="shrink-0 text-xs sm:text-sm"
                    size="sm"
                  >
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Marcar como concluída</span>
                    <span className="sm:hidden">Concluir</span>
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

        {/* Lessons Sidebar - Collapsible on mobile */}
        <div className="space-y-4 order-last lg:order-last">
          <Card className="lg:sticky lg:top-6">
            <CardHeader className="pb-2 sm:pb-3">
              <div className="flex items-center justify-between">
                <span className="card-title-compact text-sm sm:text-base">Conteúdo</span>
                <span className="text-xs sm:text-sm text-muted-foreground">{getTotalDuration()}</span>
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
                  {completedCount}/{requiredLessons.length} concluídas
                </span>
                {course?.is_sequential && (
                  <span className="flex items-center gap-1">
                    <Unlock className="h-3 w-3" />
                    {unlockedCount}/{requiredLessons.length} desbloqueadas
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[300px] lg:max-h-[calc(100vh-350px)] overflow-y-auto">
                <div className="p-2 space-y-1">
                  {modules.length > 0 ? (
                    <>
                      {/* Lessons without module */}
                      {lessons.filter(l => !l.module_id).map((lesson, i) => (
                        <LessonSidebarItem key={lesson.id} lesson={lesson} index={lessons.indexOf(lesson)} />
                      ))}
                      {/* Required modules */}
                      {modules.filter(m => !m.is_optional).map((mod) => {
                        const moduleLessons = lessons.filter(l => l.module_id === mod.id);
                        if (moduleLessons.length === 0) return null;
                        return (
                          <div key={mod.id} className="pt-3 first:pt-0">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-3 pb-1">
                              {mod.title}
                            </p>
                            {moduleLessons.map((lesson) => (
                              <LessonSidebarItem key={lesson.id} lesson={lesson} index={lessons.indexOf(lesson)} />
                            ))}
                          </div>
                        );
                      })}
                      {/* Optional modules separator */}
                      {optionalLessons.length > 0 && (
                        <>
                          <Separator className="my-3" />
                          {modules.filter(m => m.is_optional).map((mod) => {
                            const moduleLessons = lessons.filter(l => l.module_id === mod.id);
                            if (moduleLessons.length === 0) return null;
                            return (
                              <div key={mod.id} className="pt-2">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-3 pb-1">
                                  {mod.title}
                                </p>
                                {moduleLessons.map((lesson) => (
                                  <LessonSidebarItem key={lesson.id} lesson={lesson} index={lessons.indexOf(lesson)} />
                                ))}
                              </div>
                            );
                          })}
                        </>
                      )}
                    </>
                  ) : (
                    lessons.map((lesson, index) => (
                      <LessonSidebarItem key={lesson.id} lesson={lesson} index={index} />
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
