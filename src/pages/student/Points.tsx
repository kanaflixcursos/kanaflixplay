import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, LogIn, Star, Sparkles, Check, Trophy, Medal, GraduationCap, ShoppingCart, Crown } from 'lucide-react';
import { getStudentLevel, getNextLevel, getProgressToNext, getAllLevels } from '@/components/StudentLevelBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import winnersIllustration from '@/assets/winners-illustration.svg';

interface PointsHistoryEntry {
  id: string;
  type: 'comment' | 'daily_login' | 'enrollment_free' | 'enrollment_paid';
  points: number;
  created_at: string;
  description: string;
}

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  avatar_url: string;
  points: number;
}

const TIPS = [
  { icon: ShoppingCart, label: 'Adquirir um curso', points: '50–180 pts', description: 'Cada curso concede uma quantidade de pontos definida — quanto maior o investimento, maior a recompensa.', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100/60 dark:bg-purple-900/30' },
  { icon: MessageCircle, label: 'Publicar um comentário', points: '+10 pts', description: 'Comente nas aulas para ajudar outros alunos e ganhar pontos.', color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-100/60 dark:bg-teal-900/30' },
  { icon: LogIn, label: 'Login diário', points: '+5 pts', description: 'Acesse a plataforma todos os dias para acumular pontos.', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100/60 dark:bg-amber-900/30' },
  { icon: Sparkles, label: 'Em breve: recompensas!', points: '🎁', description: 'Sua pontuação poderá ser usada para ganhar descontos exclusivos, conteúdos extras e recompensas especiais.', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100/60 dark:bg-rose-900/30' },
];

const PODIUM_STYLES = [
  { ring: 'ring-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-600 dark:text-amber-400', icon: Crown, label: '1º' },
  { ring: 'ring-slate-400', bg: 'bg-slate-100 dark:bg-slate-800/40', text: 'text-slate-500 dark:text-slate-400', icon: Medal, label: '2º' },
  { ring: 'ring-amber-700', bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-600 dark:text-orange-400', icon: Medal, label: '3º' },
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

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

const HISTORY_CONFIG: Record<string, { icon: typeof MessageCircle; bg: string; color: string }> = {
  comment: { icon: MessageCircle, bg: 'bg-teal-100 dark:bg-teal-900/40', color: 'text-teal-600 dark:text-teal-400' },
  daily_login: { icon: LogIn, bg: 'bg-amber-100 dark:bg-amber-900/40', color: 'text-amber-600 dark:text-amber-400' },
  enrollment_free: { icon: GraduationCap, bg: 'bg-blue-100 dark:bg-blue-900/40', color: 'text-blue-600 dark:text-blue-400' },
  enrollment_paid: { icon: ShoppingCart, bg: 'bg-purple-100 dark:bg-purple-900/40', color: 'text-purple-600 dark:text-purple-400' },
};

export default function PointsPage() {
  const { user } = useAuth();
  const [points, setPoints] = useState(0);
  const [history, setHistory] = useState<PointsHistoryEntry[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch profile, history sources, and leaderboard in parallel
      const [
        { data: profile },
        { data: logins },
        { data: comments },
        { data: enrollments },
        { data: leaderboardData },
      ] = await Promise.all([
        supabase.from('profiles').select('points').eq('user_id', user.id).single(),
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
        supabase.from('course_enrollments')
          .select('id, enrolled_at, course:courses(id, price)')
          .eq('user_id', user.id)
          .order('enrolled_at', { ascending: false })
          .limit(50),
        (supabase.rpc as any)('get_leaderboard', { limit_count: 20 }),
      ]);

      setPoints(profile?.points || 0);

      // Process leaderboard
      const lb: LeaderboardEntry[] = leaderboardData || [];
      setLeaderboard(lb);
      const rank = lb.findIndex((e: LeaderboardEntry) => e.user_id === user.id);
      setUserRank(rank >= 0 ? rank + 1 : null);

      // Build history
      const entries: PointsHistoryEntry[] = [];

      (logins || []).forEach((l: any) => {
        entries.push({ id: l.id, type: 'daily_login', points: l.points_awarded || 5, created_at: l.created_at, description: 'Login diário' });
      });

      (comments || []).forEach((c: any) => {
        entries.push({ id: c.id, type: 'comment', points: 10, created_at: c.created_at, description: 'Comentário publicado' });
      });

      (enrollments || []).forEach((e: any) => {
        const isPaid = e.course?.price && e.course.price > 0;
        entries.push({
          id: e.id,
          type: isPaid ? 'enrollment_paid' : 'enrollment_free',
          points: isPaid ? 180 : 50,
          created_at: e.enrolled_at,
          description: isPaid ? 'Curso pago adquirido' : 'Matrícula em curso gratuito',
        });
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
  const top3 = leaderboard.slice(0, 3);
  const restLeaderboard = leaderboard.slice(3);

  return (
    <div className="relative space-y-8">
      {/* Mesh gradient background — light & dark aware */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-70 dark:opacity-20"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 15% 20%, hsl(172 50% 85%) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 80% 10%, hsl(200 45% 88%) 0%, transparent 60%),
            radial-gradient(ellipse 45% 50% at 50% 80%, hsl(38 50% 90%) 0%, transparent 65%),
            radial-gradient(ellipse 40% 35% at 90% 70%, hsl(260 30% 90%) 0%, transparent 60%)
          `,
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-0 dark:opacity-30"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 15% 20%, hsl(172 40% 12%) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 80% 10%, hsl(200 35% 14%) 0%, transparent 60%),
            radial-gradient(ellipse 45% 50% at 50% 80%, hsl(38 30% 10%) 0%, transparent 65%),
            radial-gradient(ellipse 40% 35% at 90% 70%, hsl(260 20% 14%) 0%, transparent 60%)
          `,
        }}
      />
      {/* Hero score section */}
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
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute top-4 right-[30%] h-2 w-2 rounded-full bg-white/20 animate-pulse" />
        <div className="absolute bottom-6 right-[15%] h-1.5 w-1.5 rounded-full bg-white/15 animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
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
              <p className="text-sm text-white/60 mt-1">
                pontos acumulados
                {userRank && <span className="ml-2 text-white/40">· #{userRank} no ranking</span>}
              </p>

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

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="hidden md:block flex-shrink-0">
            <img src={winnersIllustration} alt="Ilustração de conquistas" className="w-44 lg:w-52 xl:w-60 drop-shadow-lg opacity-90" />
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
        <div className="relative flex items-start justify-between gap-0">
          <div className="absolute top-6 left-[calc(12.5%)] right-[calc(12.5%)] h-0.5 bg-border/60" />
          <div
            className="absolute top-6 left-[calc(12.5%)] h-0.5 bg-primary transition-all duration-700"
            style={{ width: `${Math.min(currentLevelIdx / (allLevels.length - 1), 1) * 75}%` }}
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
                <div className={cn('relative', isActive && 'scale-110')}>
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
                <div className="text-center mt-1">
                  <p className={cn('text-xs font-medium', isActive ? lvl.color : 'text-muted-foreground')}>{lvl.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{lvl.minPoints} pts</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      <Separator />

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}>
          <h2 className="text-sm font-medium flex items-center gap-2 mb-6">
            <Trophy className="h-4 w-4 text-amber-500" />
            Ranking dos Alunos
          </h2>

          {/* Podium — top 3 */}
          {top3.length >= 3 && (
            <div className="flex items-end justify-center gap-3 sm:gap-5 mb-6">
              {/* 2nd place */}
              <PodiumCard entry={top3[1]} rank={1} isCurrentUser={top3[1].user_id === user?.id} />
              {/* 1st place */}
              <PodiumCard entry={top3[0]} rank={0} isCurrentUser={top3[0].user_id === user?.id} />
              {/* 3rd place */}
              <PodiumCard entry={top3[2]} rank={2} isCurrentUser={top3[2].user_id === user?.id} />
            </div>
          )}

          {/* Rest of leaderboard */}
          {restLeaderboard.length > 0 && (
            <div className="space-y-1 mt-4">
              {restLeaderboard.map((entry, idx) => {
                const rank = idx + 4;
                const isMe = entry.user_id === user?.id;
                const entryLevel = getStudentLevel(entry.points);
                return (
                  <motion.div
                    key={entry.user_id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: 0.2 + idx * 0.03 }}
                    className={cn(
                      'flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors',
                      isMe && 'bg-primary/5 ring-1 ring-primary/20',
                    )}>
                    <span className="text-xs font-bold text-muted-foreground w-6 text-center">{rank}º</span>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={entry.avatar_url} />
                      <AvatarFallback className="text-xs">{getInitials(entry.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium truncate', isMe && 'text-primary')}>
                        {entry.full_name || 'Aluno'}
                        {isMe && <span className="text-xs text-muted-foreground ml-1.5">(você)</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={cn('level-badge-icon h-5 w-5 !rounded-md', entryLevel.badgeClass)}>
                        <entryLevel.icon className="h-3 w-3 relative z-10" />
                      </div>
                      <span className="text-sm font-bold text-foreground">{entry.points}</span>
                      <span className="text-xs text-muted-foreground">pts</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          <Separator className="mt-6" />
        </motion.div>
      )}

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
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.22 + i * 0.05 }}
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

      {/* History + Coming Soon side by side */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* History */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.22 }}
          className="lg:col-span-2">
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
                {history.map((entry, idx) => {
                  const config = HISTORY_CONFIG[entry.type] || HISTORY_CONFIG.daily_login;
                  const EntryIcon = config.icon;
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: 0.24 + idx * 0.02 }}
                      className="flex items-center justify-between py-3 border-b border-border/40 last:border-0 group">
                      <div className="flex items-center gap-3">
                        <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110', config.bg)}>
                          <EntryIcon className={cn('h-4 w-4', config.color)} />
                        </div>
                        <div>
                          <p className="text-sm">{entry.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <span className={cn('text-sm font-bold', config.color)}>+{entry.points}</span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Coming soon */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
          className="rounded-xl bg-gradient-to-br from-amber-50/80 to-yellow-50/80 dark:from-amber-950/30 dark:to-yellow-950/30 p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/40">
              <Sparkles className="h-4 w-4 text-amber-500" />
            </div>
            <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">Em breve!</h2>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed mb-4">
            Sua pontuação poderá ser usada para ganhar descontos exclusivos e desbloquear conteúdos extras. Continue acumulando pontos!
          </p>
          <div className="mt-auto space-y-2.5 pt-3 border-t border-amber-200/60 dark:border-amber-800/40">
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
              <Check className="h-3.5 w-3.5 shrink-0" />
              <span>Descontos em novos cursos</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
              <Check className="h-3.5 w-3.5 shrink-0" />
              <span>Conteúdos extras exclusivos</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
              <Check className="h-3.5 w-3.5 shrink-0" />
              <span>Recompensas especiais</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Podium card sub-component
function PodiumCard({ entry, rank, isCurrentUser }: { entry: LeaderboardEntry; rank: number; isCurrentUser: boolean }) {
  const style = PODIUM_STYLES[rank];
  const isFirst = rank === 0;
  const entryLevel = getStudentLevel(entry.points);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 + rank * 0.08, type: 'spring', stiffness: 200 }}
      className={cn(
        'flex flex-col items-center gap-2 w-24 sm:w-28',
        isFirst && 'order-2 -mt-4',
        rank === 1 && 'order-1',
        rank === 2 && 'order-3',
      )}>
      <div className="relative">
        <Avatar className={cn('h-14 w-14 sm:h-16 sm:w-16 ring-[3px] ring-offset-2 ring-offset-background', style.ring, isCurrentUser && 'ring-primary')}>
          <AvatarImage src={entry.avatar_url} />
          <AvatarFallback className="text-sm font-medium">{getInitials(entry.full_name)}</AvatarFallback>
        </Avatar>
        <div className={cn(
          'absolute -top-2 -right-2 h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold',
          style.bg, style.text,
        )}>
          {isFirst ? <style.icon className="h-3.5 w-3.5" /> : style.label}
        </div>
      </div>
      <div className="text-center">
        <p className={cn('text-xs font-medium truncate max-w-full', isCurrentUser && 'text-primary')}>
          {entry.full_name?.split(' ')[0] || 'Aluno'}
        </p>
        <div className="flex items-center justify-center gap-1 mt-0.5">
          <div className={cn('level-badge-icon h-4 w-4 !rounded', entryLevel.badgeClass)}>
            <entryLevel.icon className="h-2.5 w-2.5 relative z-10" />
          </div>
          <span className="text-xs font-bold">{entry.points}</span>
          <span className="text-[10px] text-muted-foreground">pts</span>
        </div>
      </div>
    </motion.div>
  );
}
