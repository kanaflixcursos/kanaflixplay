import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, ExternalLink, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
    // Get recent comments
    const { data: commentsData } = await supabase
      .from('lesson_comments')
      .select('id, content, created_at, lesson_id, user_id')
      .order('created_at', { ascending: false })
      .limit(5);

    if (commentsData && commentsData.length > 0) {
      // Get lesson info
      const lessonIds = [...new Set(commentsData.map(c => c.lesson_id))];
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('id, title, course_id')
        .in('id', lessonIds);

      // Get user names
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comentários Recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comentários Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum comentário ainda
          </p>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="p-3 rounded-lg border bg-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
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
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                    <Link to={`/courses/${comment.course_id}?lesson=${comment.lesson_id}`}>
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <p className="text-xs text-primary mt-2 truncate">
                  Em: {comment.lesson_title}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
