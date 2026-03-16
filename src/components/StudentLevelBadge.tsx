import { cn } from '@/lib/utils';
import { Shield, BookOpen, Award, Crown } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Level {
  name: string;
  minPoints: number;
  icon: React.ElementType;
  /** Tailwind text color for labels */
  color: string;
  /** CSS class for the icon badge container */
  badgeClass: string;
  /** Background for level rows */
  bgColor: string;
  borderColor: string;
}

const LEVELS: Level[] = [
  {
    name: 'Iniciante',
    minPoints: 0,
    icon: Shield,
    color: 'text-slate-500 dark:text-slate-400',
    badgeClass: 'level-silver',
    bgColor: 'bg-slate-50 dark:bg-slate-900/50',
    borderColor: 'border-slate-200 dark:border-slate-700',
  },
  {
    name: 'Aprendiz',
    minPoints: 200,
    icon: BookOpen,
    color: 'text-teal-600 dark:text-teal-400',
    badgeClass: 'level-teal',
    bgColor: 'bg-teal-50 dark:bg-teal-950/50',
    borderColor: 'border-teal-200 dark:border-teal-800',
  },
  {
    name: 'Avançado',
    minPoints: 800,
    icon: Award,
    color: 'text-amber-600 dark:text-amber-400',
    badgeClass: 'level-gold',
    bgColor: 'bg-amber-50 dark:bg-amber-950/50',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  {
    name: 'Especialista',
    minPoints: 2000,
    icon: Crown,
    color: 'text-purple-600 dark:text-purple-400',
    badgeClass: 'level-platinum',
    bgColor: 'bg-purple-50 dark:bg-purple-950/50',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
];

export function getStudentLevel(points: number): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].minPoints) return LEVELS[i];
  }
  return LEVELS[0];
}

export function getNextLevel(points: number): Level | null {
  for (const level of LEVELS) {
    if (points < level.minPoints) return level;
  }
  return null;
}

export function getProgressToNext(points: number): number {
  const current = getStudentLevel(points);
  const next = getNextLevel(points);
  if (!next) return 100;
  const range = next.minPoints - current.minPoints;
  const progress = points - current.minPoints;
  return Math.min(Math.round((progress / range) * 100), 100);
}

export function getAllLevels() {
  return LEVELS;
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
      <div className="flex items-center gap-2.5">
        <div className={cn('level-badge-icon h-7 w-7', level.badgeClass)}>
          <Icon className="h-3.5 w-3.5 relative z-10" />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('text-xs font-semibold', level.color)}>{level.name}</span>
            <span className="text-xs text-muted-foreground">{points} pts</span>
          </div>
          {nextLevel && (
            <Progress value={progress} className="h-1 w-24 mt-1" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className={cn('level-badge-icon h-10 w-10', level.badgeClass)}>
        <Icon className="h-5 w-5 relative z-10" />
      </div>
      <div>
        <p className={cn('text-sm font-semibold', level.color)}>{level.name}</p>
        <p className="text-xs text-muted-foreground">{points} pontos</p>
      </div>
    </div>
  );
}
