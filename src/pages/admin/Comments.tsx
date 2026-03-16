import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { MessageSquare, ExternalLink, Search, Loader2, Trash2 } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  lesson_id: string;
  user_id: string;
  user_name: string | null;
  user_avatar: string | null;
  lesson_title: string;
  course_id: string;
  course_title: string;
}

export default function AdminComments() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    const { data: commentsData } = await supabase
      .from('lesson_comments')
      .select('id, content, created_at, lesson_id, user_id')
      .order('created_at', { ascending: false });

    if (commentsData && commentsData.length > 0) {
      const lessonIds = [...new Set(commentsData.map(c => c.lesson_id))];
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('id, title, course_id')
        .in('id', lessonIds);

      const courseIds = [...new Set(lessonsData?.map(l => l.course_id) || [])];
      const { data: coursesData } = courseIds.length > 0
        ? await supabase.from('courses').select('id, title').in('id', courseIds)
        : { data: [] };

      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const lessonsMap = new Map<string, { title: string; course_id: string }>();
      lessonsData?.forEach(l => lessonsMap.set(l.id, { title: l.title, course_id: l.course_id }));

      const coursesMap = new Map<string, string>();
      coursesData?.forEach(c => coursesMap.set(c.id, c.title));

      const profilesMap = new Map<string, { name: string | null; avatar: string | null }>();
      profilesData?.forEach(p => profilesMap.set(p.user_id, { name: p.full_name, avatar: p.avatar_url }));

      setComments(
        commentsData.map(c => {
          const lesson = lessonsMap.get(c.lesson_id);
          const profile = profilesMap.get(c.user_id);
          return {
            ...c,
            user_name: profile?.name || null,
            user_avatar: profile?.avatar || null,
            lesson_title: lesson?.title || 'Aula não encontrada',
            course_id: lesson?.course_id || '',
            course_title: lesson?.course_id ? (coursesMap.get(lesson.course_id) || 'Curso não encontrado') : '',
          };
        })
      );
    }
    setLoading(false);
  };

  const handleDelete = async (commentId: string) => {
    setDeletingId(commentId);
    const { error } = await supabase.from('lesson_comments').delete().eq('id', commentId);
    
    if (error) {
      toast.error('Erro ao excluir comentário');
    } else {
      toast.success('Comentário excluído');
      setComments(comments.filter(c => c.id !== commentId));
    }
    setDeletingId(null);
  };

  const filteredComments = comments.filter(comment => {
    const searchLower = searchTerm.toLowerCase();
    return (
      comment.content.toLowerCase().includes(searchLower) ||
      (comment.user_name?.toLowerCase().includes(searchLower) || false) ||
      comment.lesson_title.toLowerCase().includes(searchLower) ||
      comment.course_title.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Comentários</h1>
        <p className="text-muted-foreground">Gerencie todos os comentários das aulas</p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Total de Comentários</span>
            </div>
            <p className="text-2xl font-bold">{comments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-3">
               <div className="p-2.5 rounded-xl bg-primary/10">
                 <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Últimas 24h</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {comments.filter(c => new Date(c.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Comments List */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
             <div className="p-2 rounded-xl bg-primary/10">
               <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            Lista de Comentários
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por conteúdo, usuário, aula ou curso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="space-y-3">
            {filteredComments.map((comment) => (
              <div
                key={comment.id}
                className="p-4 rounded-lg border bg-card space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={comment.user_avatar || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {(comment.user_name || 'U').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{comment.user_name || 'Usuário'}</p>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{comment.content}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <Link to={`/courses/${comment.course_id}?lesson=${comment.lesson_id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Comentário</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir este comentário? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(comment.id)}
                            disabled={deletingId === comment.id}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deletingId === comment.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Excluir'
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-3">
                  <span className="font-medium text-primary">{comment.course_title}</span>
                  <span>•</span>
                  <span>{comment.lesson_title}</span>
                </div>

                <p className="text-xs text-muted-foreground">
                  {format(new Date(comment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            ))}
          </div>

          {filteredComments.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhum comentário encontrado</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
