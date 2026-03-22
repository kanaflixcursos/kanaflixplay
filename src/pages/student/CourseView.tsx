import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ArrowLeft,
  Play,
  CheckCircle,
  Loader2,
  Lock,
  CalendarClock,
  ShoppingCart,
} from 'lucide-react';
import { useCourseView } from '@/hooks/useCourseView';
import {
  PlayerWithProgress,
  LessonSidebar,
  LessonMaterials,
  LessonComments,
} from '@/features/student-player';

function formatDuration(minutes: number | null): string {
  if (!minutes) return '';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hrs > 0 ? `${hrs}h ${mins}min` : `${mins}min`;
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export default function CourseView() {
  const navigate = useNavigate();
  const {
    courseId,
    course,
    lessons,
    modules,
    selectedLesson,
    setSelectedLesson,
    loading,
    isEnrolled,
    isPreviewMode,
    isPreSale,
    isPaidCourse,
    justUnlockedId,
    requiredLessons,
    optionalLessons,
    unlockedCount,
    completedCount,
    progressPercent,
    isLessonLocked,
    handleMarkComplete,
    handleAutoComplete,
    checkoutUrl,
  } = useCourseView();

  const getTotalDuration = () => {
    const total = requiredLessons.reduce((acc, l) => acc + (l.duration_minutes || 0), 0);
    return formatDuration(total);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) return null;

  if (!isEnrolled && !isPreviewMode) {
    navigate(`/store/kanaflix/checkout/${courseId}`);
    return null;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Pre-sale banner */}
      {isPreSale && (
        <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/30 rounded-xl">
          <CalendarClock className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm text-foreground">
              Curso em pré-venda — Lançamento em {new Date(course.launch_date!).toLocaleDateString('pt-BR')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              As aulas estarão disponíveis a partir da data de lançamento.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg sm:text-xl font-medium line-clamp-1">
            {selectedLesson?.title || course.title}
          </h1>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Player */}
          {selectedLesson?.video_url ? (
            <div className="w-full rounded-lg overflow-hidden shadow-lg">
              <PlayerWithProgress
                key={selectedLesson.id}
                videoUrl={selectedLesson.video_url}
                lessonId={selectedLesson.id}
                title={selectedLesson.title}
                durationMinutes={selectedLesson.duration_minutes}
                isLocked={isLessonLocked(selectedLesson.id)}
                lockTitle={isPreviewMode ? 'Conteúdo Exclusivo' : isPreSale ? 'Em Breve' : undefined}
                lockMessage={
                  isPreviewMode
                    ? 'Adquira o curso para desbloquear todas as aulas'
                    : isPreSale
                    ? `Disponível a partir de ${new Date(course.launch_date!).toLocaleDateString('pt-BR')}`
                    : undefined
                }
                onComplete={isPreviewMode ? undefined : handleAutoComplete}
              />
            </div>
          ) : (
            <div className="aspect-video bg-muted flex items-center justify-center rounded-lg">
              <Play className="h-16 w-16 text-muted-foreground" />
            </div>
          )}

          {/* Preview mode banner */}
          {isPreviewMode && (
            <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
              <Play className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm text-foreground">
                  Modo Preview — Assista a primeira aula gratuitamente
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Adquira o curso para desbloquear todo o conteúdo.
                </p>
              </div>
              <Button size="sm" onClick={() => navigate(`/store/kanaflix/checkout/${courseId}`)} className="shrink-0 gap-1.5">
                <ShoppingCart className="h-3.5 w-3.5" />
                {isPaidCourse ? 'Comprar' : 'Matricular-se'}
              </Button>
            </div>
          )}

          {/* Lesson info */}
          {selectedLesson && (
            <div className="space-y-3 md:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                <div className="space-y-1 min-w-0 flex items-center">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {[
                      selectedLesson.module_id
                        ? modules.find((m) => m.id === selectedLesson.module_id)?.title
                        : null,
                      `Aula ${lessons.findIndex((l) => l.id === selectedLesson.id) + 1}`,
                      selectedLesson.duration_minutes
                        ? formatDuration(selectedLesson.duration_minutes)
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                {!isPreviewMode && selectedLesson.completed ? (
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
                ) : (
                  !isPreviewMode &&
                  !course.is_sequential && (
                    <Button
                      onClick={() => handleMarkComplete(selectedLesson.id)}
                      className="shrink-0 text-xs sm:text-sm"
                      size="sm"
                    >
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Concluído</span>
                      <span className="sm:hidden">Concluir</span>
                    </Button>
                  )
                )}
              </div>

              {/* Comments */}
              {!isPreviewMode && (
                <>
                  <Separator />
                  <LessonComments lessonId={selectedLesson.id} />
                </>
              )}

              {/* Preview CTA */}
              {isPreviewMode && (
                <div className="p-6 bg-muted/50 rounded-xl text-center space-y-3">
                  <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm font-medium">Gostou do que viu?</p>
                  <p className="text-xs text-muted-foreground">
                    Adquira o curso completo para acessar todas as aulas, materiais e comentários.
                  </p>
                  <Button onClick={() => navigate(`/checkout/${courseId}`)} className="gap-1.5">
                    <ShoppingCart className="h-4 w-4" />
                    {isPaidCourse ? 'Comprar Curso' : 'Matricular-se'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4 order-last lg:order-last">
          <LessonSidebar
            lessons={lessons}
            modules={modules}
            selectedLesson={selectedLesson}
            requiredLessons={requiredLessons}
            optionalLessons={optionalLessons}
            isPreviewMode={isPreviewMode}
            isSequential={!!course.is_sequential}
            completedCount={completedCount}
            progressPercent={progressPercent}
            unlockedCount={unlockedCount}
            justUnlockedId={justUnlockedId}
            isLessonLocked={isLessonLocked}
            onSelectLesson={setSelectedLesson}
            formatDuration={formatDuration}
            getTotalDuration={getTotalDuration}
          />

          {selectedLesson && <LessonMaterials materials={selectedLesson.materials} />}
        </div>
      </div>
    </div>
  );
}
