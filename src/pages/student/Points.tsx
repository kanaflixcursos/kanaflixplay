import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, LogIn, Star, Sparkles, Check } from 'lucide-react';
import { getStudentLevel, getNextLevel, getProgressToNext, getAllLevels } from '@/components/StudentLevelBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import winnersIllustration from '@/assets/winners-illustration.svg';

interface PointsHistoryEntry {
  id: string;
  type: 'comment' | 'daily_login' | 'unknown';
  points: number;
  created_at: string;
  description: string;
}

const TIPS = [
  { icon: MessageCircle, label: 'Publicar um comentário', points: '+10 pts', description: 'Comente nas aulas para ajudar outros alunos e ganhar pontos.', color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-100/60 dark:bg-teal-900/30' },
  { icon: LogIn, label: 'Login diário', points: '+5 pts', description: 'Acesse a plataforma todos os dias para acumular pontos.', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100/60 dark:bg-amber-900/30' },
];

function AnimatedCounter({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value === 0) return;
    const duration = 1200;
    const steps = 40;
    const stepTime = duration / steps;
    let current = 0;
    const increment = value / steps;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [value]);

  return <span>{displayValue}</span>;
}

export default function PointsPage() {
  const { user } = useAuth();
  const [points, setPoints] = useState(0);
  const [history, setHistory] = useState<PointsHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('points')
        .eq('user_id', user.id)
        .single();

      setPoints(profile?.points || 0);

      const [{ data: logins }, { data: comments }] = await Promise.all([
        (supabase as any).from('daily_login_points')
          .select('id, created_at, points_awarded')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.from('lesson_comments')
          .select('id, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      const entries: PointsHistoryEntry[] = [];

      (logins || []).forEach((l: any) => {
        entries.push({ id: l.id, type: 'daily_login', points: l.points_awarded || 5, created_at: l.created_at, description: 'Login diário' });
      });

      (comments || []).forEach((c: any) => {
        entries.push({ id: c.id, type: 'comment', points: 10, created_at: c.created_at, description: 'Comentário publicado' });
      });

      entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setHistory(entries.slice(0, 30));
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const level = getStudentLevel(points);
  const nextLevel = getNextLevel(points);
  const progress = getProgressToNext(points);
  const allLevels = getAllLevels();
  const LevelIcon = level.icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const currentLevelIdx = allLevels.findIndex(l => l.name === level.name);

  return (
    <div className="space-y-8">
      {/* Hero score section with mesh gradient background */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.05 }}
        className="relative overflow-hidden rounded-2xl p-6 sm:p-8"
        style={{
          background: `
            radial-gradient(ellipse at 20% 50%, hsl(172 55% 28% / 0.9) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, hsl(200 50% 30% / 0.7) 0%, transparent 40%),
            radial-gradient(ellipse at 60% 80%, hsl(160 45% 25% / 0.8) 0%, transparent 45%),
            radial-gradient(ellipse at 40% 10%, hsl(190 40% 35% / 0.5) 0%, transparent 50%),
            linear-gradient(135deg, hsl(172 55% 20%) 0%, hsl(180 40% 24%) 100%)
          `,
        }}>
        {/* Decorative orbs */}
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute top-4 right-[30%] h-2 w-2 rounded-full bg-white/20 animate-pulse" />
        <div className="absolute bottom-6 right-[15%] h-1.5 w-1.5 rounded-full bg-white/15 animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Left: score info */}
          <div className="flex items-center gap-5 flex-1">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.15, type: 'spring', stiffness: 200 }}
              className={cn('level-badge-icon h-16 w-16 sm:h-20 sm:w-20', level.badgeClass)}>
              <LevelIcon className="h-8 w-8 sm:h-10 sm:w-10 relative z-10" />
            </motion.div>

            <div className="flex-1">
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="text-4xl sm:text-5xl font-bold tracking-tight text-white points-glow-text">
                <AnimatedCounter value={points} />
              </motion.p>
              <p className="text-sm text-white/60 mt-1">pontos acumulados</p>

              <div className="mt-4 max-w-sm">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium text-white/90">{level.name}</span>
                  {nextLevel && <span className="text-white/50 text-xs">{nextLevel.name} — {nextLevel.minPoints} pts</span>}
                </div>
                <div className="h-2 w-full rounded-full bg-white/15 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                    className="h-full rounded-full bg-gradient-to-r from-white/70 to-white/90"
                  />
                </div>
                {nextLevel ? (
                  <p className="text-xs text-white/50 mt-1.5">
                    Faltam <span className="font-medium text-white/70">{nextLevel.minPoints - points}</span> pontos para o próximo nível
                  </p>
                ) : (
                  <p className="text-xs text-white/50 mt-1.5">Parabéns! Nível máximo! 🎉</p>
                )}
              </div>
            </div>
          </div>

          {/* Right: illustration */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="hidden md:block flex-shrink-0">
            <img
              src={winnersIllustration}
              alt="Ilustração de conquistas"
              className="w-44 lg:w-52 xl:w-60 drop-shadow-lg opacity-90"
            />
          </motion.div>
        </div>
      </motion.div>

      {/* Levels timeline */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.12 }}>
        <h2 className="text-sm font-medium flex items-center gap-2 mb-6">
          <Sparkles className="h-4 w-4 text-amber-500" />
          Jornada de Níveis
        </h2>

        {/* Timeline horizontal */}
        <div className="relative flex items-start justify-between gap-0">
          {/* Connecting line */}
          <div className="absolute top-6 left-[calc(12.5%)] right-[calc(12.5%)] h-0.5 bg-border/60" />
          {/* Active progress line */}
          <div
            className="absolute top-6 left-[calc(12.5%)] h-0.5 bg-primary transition-all duration-700"
            style={{
              width: `${Math.min(currentLevelIdx / (allLevels.length - 1), 1) * 75}%`,
            }}
          />

          {allLevels.map((lvl, idx) => {
            const LvlIcon = lvl.icon;
            const isActive = idx === currentLevelIdx;
            const isPast = idx < currentLevelIdx;
            const isLocked = idx > currentLevelIdx;

            return (
              <motion.div
                key={lvl.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.18 + idx * 0.08 }}
                className={cn(
                  'relative flex flex-col items-center gap-2 flex-1 z-10 transition-all duration-300',
                  isLocked && 'opacity-30',
                  isPast && 'opacity-50',
                )}>
                {/* Node */}
                <div className={cn(
                  'relative',
                  isActive && 'scale-110',
                )}>
                  <div className={cn(
                    'level-badge-icon h-12 w-12',
                    lvl.badgeClass,
                    isActive && 'ring-[3px] ring-primary/30 ring-offset-2 ring-offset-background',
                  )}>
                    <LvlIcon className="h-5 w-5 relative z-10" />
                  </div>
                  {isPast && (
                    <div className="absolute -bottom-1 -right-1 h-4.5 w-4.5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </div>

                {/* Label */}
                <div className="text-center mt-1">
                  <p className={cn(
                    'text-xs font-medium',
                    isActive ? lvl.color : 'text-muted-foreground',
                  )}>
                    {lvl.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{lvl.minPoints} pts</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      <Separator />

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.18 }}>
        <h2 className="text-sm font-medium flex items-center gap-2 mb-4">
          <Star className="h-4 w-4 text-amber-500" />
          Como ganhar pontos
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {TIPS.map((tip, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i === 0 ? -10 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.22 + i * 0.06 }}
              className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted/80 transition-colors group">
              <div className={cn('flex items-center justify-center h-10 w-10 rounded-xl shrink-0 transition-transform group-hover:scale-110', tip.bg)}>
                <tip.icon className={cn('h-5 w-5', tip.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{tip.label}</span>
                  <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', tip.bg, tip.color)}>{tip.points}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{tip.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <Separator />

      {/* History */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.22 }}>
        <h2 className="text-sm font-medium mb-4">Histórico de Pontos</h2>
        {history.length === 0 ? (
          <div className="text-center py-10">
            <Sparkles className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhum ponto registrado ainda. Comece comentando nas aulas!
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <AnimatePresence>
              {history.map((entry, idx) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.24 + idx * 0.02 }}
                  className="flex items-center justify-between py-3 border-b border-border/40 last:border-0 group">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110',
                      entry.type === 'comment'
                        ? 'bg-teal-100 dark:bg-teal-900/40'
                        : 'bg-amber-100 dark:bg-amber-900/40'
                    )}>
                      {entry.type === 'comment'
                        ? <MessageCircle className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                        : <LogIn className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      }
                    </div>
                    <div>
                      <p className="text-sm">{entry.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    'text-sm font-bold',
                    entry.type === 'comment' ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'
                  )}>
                    +{entry.points}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}
