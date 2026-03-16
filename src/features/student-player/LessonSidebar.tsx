import { Play, CheckCircle, Circle, Lock, Unlock } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { LessonData, ModuleData } from '@/services/lessonService';

interface LessonSidebarProps {
  lessons: LessonData[];
  modules: ModuleData[];
  selectedLesson: LessonData | null;
  requiredLessons: LessonData[];
  optionalLessons: LessonData[];
  isPreviewMode: boolean;
  isSequential: boolean;
  completedCount: number;
  progressPercent: number;
  unlockedCount: number;
  justUnlockedId: string | null;
  isLessonLocked: (id: string) => boolean;
  onSelectLesson: (lesson: LessonData) => void;
  formatDuration: (minutes: number | null) => string;
  getTotalDuration: () => string;
}

export default function LessonSidebar({
  lessons,
  modules,
  selectedLesson,
  requiredLessons,
  optionalLessons,
  isPreviewMode,
  isSequential,
  completedCount,
  progressPercent,
  unlockedCount,
  justUnlockedId,
  isLessonLocked,
  onSelectLesson,
  formatDuration,
  getTotalDuration,
}: LessonSidebarProps) {
  const LessonItem = ({ lesson }: { lesson: LessonData }) => {
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
            : ''
        }`}
        onClick={() => onSelectLesson(lesson)}
      >
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
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium line-clamp-2 leading-tight">{lesson.title}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            {lesson.duration_minutes && <span>{formatDuration(lesson.duration_minutes)}</span>}
          </div>
        </div>
      </button>
    );
  };

    <div className="lg:sticky lg:top-6 bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 sm:p-5 border-b border-border/50 bg-muted/20">
        <div className="flex items-center justify-between pb-1">
          <span className="font-semibold text-sm sm:text-base tracking-tight text-foreground">Conteúdo</span>
          <span className="text-xs sm:text-sm font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{getTotalDuration()}</span>
        </div>

        {!isPreviewMode ? (
          <div className="mt-3">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-success" />
                {completedCount}/{requiredLessons.length} concluídas
              </span>
              {isSequential && (
                <span className="flex items-center gap-1.5">
                  <Unlock className="h-3.5 w-3.5" />
                  {unlockedCount}/{requiredLessons.length} desl.
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-2 font-medium">
            {lessons.length} aulas • Prévia da 1ª aula
          </p>
        )}
      </div>
      <div className="p-0 flex-1">
        <div className="max-h-[300px] lg:max-h-[calc(100vh-350px)] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <div className="p-2 space-y-1">
            {modules.length > 0 ? (
              <>
                {lessons
                  .filter((l) => !l.module_id)
                  .map((lesson) => (
                    <LessonItem key={lesson.id} lesson={lesson} />
                  ))}

                {modules
                  .filter((m) => !m.is_optional)
                  .map((mod) => {
                    const moduleLessons = lessons.filter((l) => l.module_id === mod.id);
                    if (moduleLessons.length === 0) return null;
                    return (
                      <div key={mod.id} className="pt-3 first:pt-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-3 pb-1">
                          {mod.title}
                        </p>
                        {moduleLessons.map((lesson) => (
                          <LessonItem key={lesson.id} lesson={lesson} />
                        ))}
                      </div>
                    );
                  })}

                {optionalLessons.length > 0 && (
                  <>
                    <Separator className="my-3" />
                    {modules
                      .filter((m) => m.is_optional)
                      .map((mod) => {
                        const moduleLessons = lessons.filter((l) => l.module_id === mod.id);
                        if (moduleLessons.length === 0) return null;
                        return (
                          <div key={mod.id} className="pt-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-3 pb-1">
                              {mod.title}
                            </p>
                            {moduleLessons.map((lesson) => (
                              <LessonItem key={lesson.id} lesson={lesson} />
                            ))}
                          </div>
                        );
                      })}
                  </>
                )}
              </>
            ) : (
              lessons.map((lesson) => <LessonItem key={lesson.id} lesson={lesson} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
