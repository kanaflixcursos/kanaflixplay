import { cn } from '@/lib/utils';
import { Shield, BookOpen, Award, Crown } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Level {
  name: string;
  minPoints: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}

const LEVELS: Level[] = [
  { name: 'Iniciante', minPoints: 0, icon: Shield, color: 'text-slate-500', bgColor: 'bg-slate-100 dark:bg-slate-800', borderColor: 'border-slate-200 dark:border-slate-700' },
  { name: 'Aprendiz', minPoints: 200, icon: BookOpen, color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-950', borderColor: 'border-blue-200 dark:border-blue-800' },
  { name: 'Avançado', minPoints: 800, icon: Award, color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-950', borderColor: 'border-amber-200 dark:border-amber-800' },
  { name: 'Especialista', minPoints: 2000, icon: Crown, color: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-950', borderColor: 'border-purple-200 dark:border-purple-800' },
];

export function getStudentLevel(points: number): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].minPoints) return LEVELS[i];
  }
  return LEVELS[0];
}

function getNextLevel(points: number): Level | null {
  for (const level of LEVELS) {
    if (points < level.minPoints) return level;
  }
  return null;
}

function getProgressToNext(points: number): number {
  const current = getStudentLevel(points);
  const next = getNextLevel(points);
  if (!next) return 100;
  const range = next.minPoints - current.minPoints;
  const progress = points - current.minPoints;
  return Math.min(Math.round((progress / range) * 100), 100);
}

interface StudentLevelBadgeProps {
  points: number;
  compact?: boolean;
}

export default function StudentLevelBadge({ points, compact = false }: StudentLevelBadgeProps) {
  const level = getStudentLevel(points);
  const nextLevel = getNextLevel(points);
  const progress = getProgressToNext(points);
  const Icon = level.icon;

  if (compact) {
    return (
      <div className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border', level.bgColor, level.borderColor, level.color)}>
        <Icon className="h-3 w-3" />
        {level.name}
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border p-4 space-y-3', level.bgColor, level.borderColor)}>
      <div className="flex items-center gap-3">
        <div className={cn('flex items-center justify-center h-10 w-10 rounded-lg', level.bgColor)}>
          <Icon className={cn('h-5 w-5', level.color)} />
        </div>
        <div>
          <p className={cn('text-sm font-semibold', level.color)}>{level.name}</p>
          <p className="text-xs text-muted-foreground">{points} pontos</p>
        </div>
      </div>
      {nextLevel && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Próximo: {nextLevel.name}</span>
            <span>{nextLevel.minPoints - points} pts restantes</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      )}
      {!nextLevel && (
        <p className="text-xs text-muted-foreground">Nível máximo alcançado! 🎉</p>
      )}
    </div>
  );
}
