import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, MessageCircle, Reply, Trash2, ChevronDown, ChevronUp, GraduationCap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Comment {
  id: string;
  lesson_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
  user_role?: 'admin' | 'student' | 'professor';
  replies?: Comment[];
}

interface LessonCommentsProps {
  lessonId: string;
}

export default function LessonComments({ lessonId }: LessonCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  const fetchComments = async () => {
    const { data: commentsData, error } = await supabase
      .from('lesson_comments')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return;
    }

    // Fetch user profiles for all comments
    const userIds = [...new Set((commentsData || []).map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', userIds);

    // Fetch user roles
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', userIds);

    const profileMap = new Map<string, { name: string | null; avatar: string | null }>(
      (profiles || []).map(p => [p.user_id, { name: p.full_name, avatar: p.avatar_url }])
    );

    const roleMap = new Map<string, string>(
      (roles || []).map(r => [r.user_id, r.role])
    );

    // Organize comments into tree structure
    const commentsWithUsers = (commentsData || []).map(c => ({
      ...c,
      user_name: profileMap.get(c.user_id)?.name || 'Usuário',
      user_avatar: profileMap.get(c.user_id)?.avatar || undefined,
      user_role: roleMap.get(c.user_id) as 'admin' | 'student' | 'professor' | undefined,
    }));

    // Separate root comments and replies
    const rootComments: Comment[] = [];
    const repliesMap = new Map<string, Comment[]>();

    commentsWithUsers.forEach(comment => {
      if (comment.parent_id) {
        const existing = repliesMap.get(comment.parent_id) || [];
        repliesMap.set(comment.parent_id, [...existing, comment]);
      } else {
        rootComments.push(comment);
      }
    });

    // Attach replies to root comments
    const organizedComments = rootComments.map(comment => ({
      ...comment,
      replies: repliesMap.get(comment.id) || [],
    }));

    setComments(organizedComments);
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();
  }, [lessonId]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;

    setSubmitting(true);
    const { error } = await supabase
      .from('lesson_comments')
      .insert({
        lesson_id: lessonId,
        user_id: user.id,
        content: newComment.trim(),
      });

    if (error) {
      toast.error('Erro ao enviar comentário');
      console.error(error);
    } else {
      toast.success('Comentário enviado!');
      setNewComment('');
      fetchComments();
    }
    setSubmitting(false);
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim() || !user) return;

    setSubmitting(true);
    const { error } = await supabase
      .from('lesson_comments')
      .insert({
        lesson_id: lessonId,
        user_id: user.id,
        parent_id: parentId,
        content: replyContent.trim(),
      });

    if (error) {
      toast.error('Erro ao enviar resposta');
      console.error(error);
    } else {
      toast.success('Resposta enviada!');
      setReplyContent('');
      setReplyingTo(null);
      fetchComments();
      // Auto-expand replies
      setExpandedReplies(prev => new Set(prev).add(parentId));
    }
    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este comentário?')) return;

    const { error } = await supabase
      .from('lesson_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      toast.error('Erro ao excluir comentário');
    } else {
      toast.success('Comentário excluído');
      fetchComments();
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5" />
        <h3 className="text-lg font-medium">
          Comentários ({comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)})
        </h3>
      </div>

      {/* New comment form */}
      <div className="space-y-3">
        <Textarea
          placeholder="Escreva um comentário..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
        />
        <Button
          onClick={handleSubmitComment}
          disabled={!newComment.trim() || submitting}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Enviar Comentário
        </Button>
      </div>

      {/* Comments list */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            Seja o primeiro a comentar nesta aula!
          </p>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="space-y-3">
              {/* Main comment */}
              <div className="flex gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={comment.user_avatar || undefined} />
                  <AvatarFallback>{getInitials(comment.user_name || 'U')}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{comment.user_name}</span>
                    {comment.user_role === 'professor' && (
                      <Badge variant="secondary" className="gap-1 text-xs h-5">
                        <GraduationCap className="h-3 w-3" />
                        Professor
                      </Badge>
                    )}
                    {comment.user_role === 'admin' && (
                      <Badge variant="default" className="text-xs h-5">
                        Admin
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <p className="text-sm">{comment.content}</p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setReplyingTo(replyingTo === comment.id ? null : comment.id);
                        setReplyContent('');
                      }}
                    >
                      <Reply className="h-3 w-3 mr-1" />
                      Responder
                    </Button>
                    {comment.user_id === user?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => handleDeleteComment(comment.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Excluir
                      </Button>
                    )}
                    {(comment.replies?.length || 0) > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => toggleReplies(comment.id)}
                      >
                        {expandedReplies.has(comment.id) ? (
                          <ChevronUp className="h-3 w-3 mr-1" />
                        ) : (
                          <ChevronDown className="h-3 w-3 mr-1" />
                        )}
                        {comment.replies?.length} resposta{comment.replies?.length !== 1 ? 's' : ''}
                      </Button>
                    )}
                  </div>

                  {/* Reply form */}
                  {replyingTo === comment.id && (
                    <div className="mt-3 space-y-2 pl-4 border-l-2 border-muted">
                      <Textarea
                        placeholder="Escreva sua resposta..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        rows={2}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSubmitReply(comment.id)}
                          disabled={!replyContent.trim() || submitting}
                        >
                          {submitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                          Responder
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyContent('');
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Replies */}
              {expandedReplies.has(comment.id) && comment.replies && comment.replies.length > 0 && (
                <div className="ml-12 space-y-3 pl-4 border-l-2 border-muted">
                  {comment.replies.map(reply => (
                    <div key={reply.id} className="flex gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={reply.user_avatar || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(reply.user_name || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{reply.user_name}</span>
                          {reply.user_role === 'professor' && (
                            <Badge variant="secondary" className="gap-1 text-xs h-5">
                              <GraduationCap className="h-3 w-3" />
                              Professor
                            </Badge>
                          )}
                          {reply.user_role === 'admin' && (
                            <Badge variant="default" className="text-xs h-5">
                              Admin
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(reply.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        <p className="text-sm">{reply.content}</p>
                        {reply.user_id === user?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-destructive hover:text-destructive"
                            onClick={() => handleDeleteComment(reply.id)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Excluir
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
