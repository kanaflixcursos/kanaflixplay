import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { MessageCircle, LogIn, Star, TrendingUp } from 'lucide-react';
import { getStudentLevel, getNextLevel, getProgressToNext, getAllLevels } from '@/components/StudentLevelBadge';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';

interface PointsHistoryEntry {
  id: string;
  type: 'comment' | 'daily_login' | 'unknown';
  points: number;
  created_at: string;
  description: string;
}

const TIPS = [
  { icon: MessageCircle, label: 'Publicar um comentário', points: '+10 pts', description: 'Comente nas aulas para ajudar outros alunos e ganhar pontos.' },
  { icon: LogIn, label: 'Login diário', points: '+5 pts', description: 'Acesse a plataforma todos os dias para acumular pontos.' },
];

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
        entries.push({
          id: l.id,
          type: 'daily_login',
          points: l.points_awarded || 5,
          created_at: l.created_at,
          description: 'Login diário',
        });
      });

      (comments || []).forEach((c: any) => {
        entries.push({
          id: c.id,
          type: 'comment',
          points: 10,
          created_at: c.created_at,
          description: 'Comentário publicado',
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Meus Pontos</h1>
        <p className="text-muted-foreground text-sm mt-1">Acompanhe sua evolução e ganhe mais pontos!</p>
      </motion.div>

      {/* Score + progress */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}>
        <div className="flex items-center gap-4">
          <div className={cn('flex items-center justify-center h-14 w-14 rounded-2xl', level.bgColor)}>
            <LevelIcon className={cn('h-7 w-7', level.color)} />
          </div>
          <div>
            <p className="text-3xl font-bold tracking-tight">{points}</p>
            <p className="text-sm text-muted-foreground">pontos acumulados</p>
          </div>
        </div>
        <div className="mt-5 max-w-md">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className={cn('font-medium', level.color)}>{level.name}</span>
            {nextLevel && <span className="text-muted-foreground text-xs">{nextLevel.name} — {nextLevel.minPoints} pts</span>}
          </div>
          <Progress value={progress} className="h-2" />
          {nextLevel && (
            <p className="text-xs text-muted-foreground mt-1.5">
              Faltam <span className="font-medium">{nextLevel.minPoints - points}</span> pontos para o próximo nível
            </p>
          )}
          {!nextLevel && (
            <p className="text-xs text-muted-foreground mt-1.5">Parabéns! Você alcançou o nível máximo! 🎉</p>
          )}
        </div>
      </motion.div>

      <Separator />

      {/* Levels overview */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}>
        <h2 className="text-sm font-medium flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4" />
          Níveis
        </h2>
        <div className="space-y-2">
          {allLevels.map((lvl) => {
            const LvlIcon = lvl.icon;
            const isActive = lvl.name === level.name;
            const isLocked = points < lvl.minPoints;
            return (
              <div key={lvl.name} className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                isActive && cn(lvl.bgColor, lvl.borderColor, 'border'),
                !isActive && isLocked && 'opacity-40'
              )}>
                <LvlIcon className={cn('h-4 w-4', isActive ? lvl.color : 'text-muted-foreground')} />
                <span className={cn('text-sm font-medium flex-1', isActive && lvl.color)}>
                  {lvl.name}
                </span>
                <span className="text-xs text-muted-foreground">{lvl.minPoints} pts</span>
                {isActive && <span className="text-xs">✓</span>}
              </div>
            );
          })}
        </div>
      </motion.div>

      <Separator />

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}>
        <h2 className="text-sm font-medium flex items-center gap-2 mb-4">
          <Star className="h-4 w-4" />
          Como ganhar pontos
        </h2>
        <div className="space-y-3">
          {TIPS.map((tip, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0">
                <tip.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{tip.label}</span>
                  <span className="text-xs font-semibold text-primary">{tip.points}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{tip.description}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <Separator />

      {/* History */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}>
        <h2 className="text-sm font-medium mb-4">Histórico de Pontos</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum ponto registrado ainda. Comece comentando nas aulas!
          </p>
        ) : (
          <div className="space-y-1">
            {history.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-7 w-7 rounded-full flex items-center justify-center text-xs shrink-0',
                    entry.type === 'comment' ? 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400' : 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400'
                  )}>
                    {entry.type === 'comment' ? <MessageCircle className="h-3.5 w-3.5" /> : <LogIn className="h-3.5 w-3.5" />}
                  </div>
                  <div>
                    <p className="text-sm">{entry.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-primary">+{entry.points}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
