import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { MessageSquare, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DashboardListCard, { DashboardListItem } from './DashboardListCard';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  lesson_id: string;
  user_id: string;
  user_name: string | null;
  lesson_title: string;
  course_id: string;
}

export default function DashboardRecentComments() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    const { data: commentsData } = await supabase
      .from('lesson_comments')
      .select('id, content, created_at, lesson_id, user_id')
      .order('created_at', { ascending: false })
      .limit(5);

    if (commentsData && commentsData.length > 0) {
      const lessonIds = [...new Set(commentsData.map(c => c.lesson_id))];
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('id, title, course_id')
        .in('id', lessonIds);

      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const lessonsMap = new Map(lessonsData?.map(l => [l.id, l]) || []);
      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p.full_name]) || []);

      setComments(
        commentsData.map(c => ({
          ...c,
          user_name: profilesMap.get(c.user_id) || null,
          lesson_title: lessonsMap.get(c.lesson_id)?.title || 'Aula não encontrada',
          course_id: lessonsMap.get(c.lesson_id)?.course_id || '',
        }))
      );
    }
    setLoading(false);
  };

  return (
    <DashboardListCard
      title="Comentários Recentes"
      icon={MessageSquare}
      loading={loading}
      emptyMessage="Nenhum comentário ainda"
      actionLabel="Ver Todos"
      actionLink="/admin/comments"
    >
      {comments.map((comment) => (
        <DashboardListItem key={comment.id}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium">
                {comment.user_name || 'Usuário'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {comment.content}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(comment.created_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 shrink-0" asChild>
              <Link to={`/courses/${comment.course_id}?lesson=${comment.lesson_id}`}>
                <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Link>
            </Button>
          </div>
          <p className="text-[10px] sm:text-xs text-primary mt-1.5 sm:mt-2 truncate">
            Em: {comment.lesson_title}
          </p>
        </DashboardListItem>
      ))}
    </DashboardListCard>
  );
}
