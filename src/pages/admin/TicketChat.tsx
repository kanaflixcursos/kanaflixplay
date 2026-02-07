import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSupportNotifications } from '@/hooks/useSupportNotifications';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { AttachmentUpload } from '@/components/support/AttachmentUpload';
import { FileViewer, FilePreview, type AttachmentFile } from '@/components/support/FileViewer';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Send, 
  Loader2, 
  Clock, 
  CheckCircle2,
  ShieldCheck,
  User,
  Mail,
  ExternalLink
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_admin_reply: boolean;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
  attachments?: AttachmentFile[];
}

interface UserProfile {
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  open: { label: 'Pendente', variant: 'secondary' },
  in_progress: { label: 'Pendente', variant: 'secondary' },
  resolved: { label: 'Concluído', variant: 'default' },
  closed: { label: 'Concluído', variant: 'default' },
};

const categoryLabels: Record<string, string> = {
  feedback: 'Feedback',
  question: 'Dúvida',
  bug: 'Problema Técnico',
  other: 'Outro',
};

export default function AdminTicketChat() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [ticketOwner, setTicketOwner] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFiles, setViewerFiles] = useState<AttachmentFile[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [emailCopied, setEmailCopied] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get the markTicketAsRead and refreshUnreadState from the hook
  const { markTicketAsRead, refreshUnreadState } = useSupportNotifications({
    userId: user?.id,
    isAdmin: true,
  });

  const fetchTicket = useCallback(async () => {
    if (!ticketId) return;

    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (error || !data) {
      toast.error('Ticket não encontrado');
      navigate('/admin/suporte');
      return;
    }

    setTicket(data);

    // Fetch ticket owner profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, avatar_url')
      .eq('user_id', data.user_id)
      .single();

    if (profile) {
      setTicketOwner(profile);
    }

    setLoading(false);
  }, [ticketId, navigate]);

  const fetchMessages = useCallback(async () => {
    if (!ticketId) return;
    
    setLoadingMessages(true);
    
    const { data: messagesData, error } = await supabase
      .from('support_ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      setLoadingMessages(false);
      return;
    }

    // Fetch user profiles
    const userIds = [...new Set((messagesData || []).map(m => m.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', userIds);

    const profileMap = new Map(
      (profiles || []).map(p => [p.user_id, { name: p.full_name, avatar: p.avatar_url }])
    );

    const messagesWithUsers = (messagesData || []).map(m => ({
      ...m,
      user_name: profileMap.get(m.user_id)?.name || 'Usuário',
      user_avatar: profileMap.get(m.user_id)?.avatar || undefined,
      attachments: (m.attachments as unknown as AttachmentFile[]) || [],
    }));

    setMessages(messagesWithUsers);
    setLoadingMessages(false);
  }, [ticketId]);

  // Mark ticket as read when entering the chat
  useEffect(() => {
    if (ticketId && user) {
      markTicketAsRead(ticketId);
    }
  }, [ticketId, user, markTicketAsRead]);

  useEffect(() => {
    fetchTicket();
    fetchMessages();
  }, [fetchTicket, fetchMessages]);

  // Auto-scroll to bottom on initial load and new messages
  useEffect(() => {
    if (scrollRef.current && !loadingMessages) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        setTimeout(() => {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 100);
      }
    }
  }, [messages, loadingMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`ticket-messages-admin-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_ticket_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          fetchMessages();
          // Mark as read and refresh state when new message arrives while viewing
          if (user) {
            markTicketAsRead(ticketId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, fetchMessages, user, markTicketAsRead]);

  const handleSendMessage = async () => {
    if (!user || !ticket || (!newMessage.trim() && attachments.length === 0)) return;

    setSubmitting(true);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertData: any = {
      ticket_id: ticket.id,
      user_id: user.id,
      message: newMessage.trim(),
      is_admin_reply: true,
      attachments: attachments,
    };
    
    const { error } = await supabase
      .from('support_ticket_messages')
      .insert([insertData]);

    if (error) {
      toast.error('Erro ao enviar mensagem');
      console.error(error);
    } else {
      setNewMessage('');
      setAttachments([]);
      fetchMessages();

      // Update ticket status if it was open
      if (ticket.status === 'open') {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress' })
          .eq('id', ticket.id);
        fetchTicket();
      }

      // Refresh unread state after sending (this ticket will now be "read" from admin perspective)
      refreshUnreadState();
    }
    setSubmitting(false);
  };

  const handleUpdateStatus = async (newStatus: 'resolved' | 'open') => {
    if (!ticket) return;

    const { error } = await supabase
      .from('support_tickets')
      .update({ status: newStatus })
      .eq('id', ticket.id);

    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      toast.success(newStatus === 'resolved' ? 'Ticket marcado como concluído' : 'Ticket reaberto');
      fetchTicket();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((newMessage.trim() || attachments.length > 0) && !submitting) {
        handleSendMessage();
      }
    }
  };

  const openViewer = (files: AttachmentFile[], index: number) => {
    setViewerFiles(files);
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const copyEmail = () => {
    if (ticketOwner?.email) {
      navigator.clipboard.writeText(ticketOwner.email);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!ticket) return null;

  const status = statusConfig[ticket.status] || statusConfig.open;
  const isPending = ticket.status === 'open' || ticket.status === 'in_progress';

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/suporte')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold truncate">{ticket.subject}</h1>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
              <span className="text-xs font-mono">#{ticket.id.slice(0, 6).toUpperCase()}</span>
              <span>•</span>
              <Badge variant="outline" className="text-xs">
                {categoryLabels[ticket.category] || ticket.category}
              </Badge>
              <span>•</span>
              <span>{format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
            </div>
          </div>
          <Button
            variant={isPending ? "default" : "outline"}
            size="sm"
            onClick={() => handleUpdateStatus(isPending ? 'resolved' : 'open')}
          >
            {isPending ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Concluir
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 mr-1" />
                Reabrir
              </>
            )}
          </Button>
        </div>

        {/* User Info Card */}
        <div className="bg-card rounded-xl border p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={ticketOwner?.avatar_url || undefined} />
              <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{ticketOwner?.full_name || 'Usuário'}</p>
              <p className="text-sm text-muted-foreground">{ticketOwner?.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyEmail}
              className="min-w-[100px]"
            >
              <Mail className="h-4 w-4 mr-1" />
              {emailCopied ? 'Copiado!' : 'Email'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/admin/students/${ticket.user_id}`)}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Ver Perfil
            </Button>
          </div>
        </div>

        {/* Chat Container */}
        <div className="bg-card rounded-xl border overflow-hidden flex flex-col h-[calc(100vh-340px)] min-h-[400px]">
          {/* Original Message */}
          <div className="p-4 bg-muted/30 border-b shrink-0">
            <p className="text-xs text-muted-foreground mb-2">Mensagem original</p>
            <p className="text-sm whitespace-pre-wrap">{ticket.message}</p>
          </div>

          {/* Messages */}
          <ScrollArea ref={scrollRef} className="flex-1">
            <div className="p-4 space-y-4">
              {loadingMessages ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Nenhuma resposta ainda</p>
                  <p className="text-sm text-muted-foreground mt-1">Envie uma resposta para o usuário</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const msgAttachments = msg.attachments || [];
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.is_admin_reply ? 'flex-row-reverse' : ''}`}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={msg.user_avatar || undefined} />
                        <AvatarFallback className={msg.is_admin_reply ? 'bg-foreground text-background' : 'bg-muted'}>
                          {msg.is_admin_reply ? (
                            <ShieldCheck className="h-4 w-4" />
                          ) : (
                            getInitials(msg.user_name || 'U')
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`flex-1 max-w-[75%] ${msg.is_admin_reply ? 'text-right' : ''}`}>
                        <div className={`flex items-center gap-2 mb-1 ${msg.is_admin_reply ? 'justify-end' : ''}`}>
                          <span className="text-xs font-medium">
                            {msg.is_admin_reply ? 'Suporte' : msg.user_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                        <div
                          className={`inline-block rounded-2xl px-4 py-2 text-sm ${
                            msg.is_admin_reply
                              ? 'bg-foreground text-background rounded-tr-md'
                              : 'bg-muted rounded-tl-md'
                          }`}
                        >
                          <p className="whitespace-pre-wrap text-left">{msg.message}</p>
                          {msgAttachments.length > 0 && (
                            <FilePreview 
                              files={msgAttachments} 
                              onViewFile={(index) => openViewer(msgAttachments, index)} 
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          {isPending && (
            <div className="p-4 border-t bg-background shrink-0 space-y-3">
              {user && (
                <AttachmentUpload
                  userId={user.id}
                  ticketId={ticket.id}
                  attachments={attachments}
                  onAttachmentsChange={setAttachments}
                  disabled={submitting}
                />
              )}
              <div className="flex gap-3">
                <Textarea
                  placeholder="Digite sua resposta..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  className="resize-none flex-1"
                  disabled={submitting}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={(!newMessage.trim() && attachments.length === 0) || submitting}
                  size="icon"
                  className="shrink-0 h-[60px] w-[60px]"
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Closed State */}
          {!isPending && (
            <div className="p-4 border-t bg-muted/30 shrink-0">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">Este ticket foi concluído</span>
              </div>
            </div>
          )}
        </div>

        {/* File Viewer */}
        <FileViewer
          files={viewerFiles}
          initialIndex={viewerIndex}
          open={viewerOpen}
          onOpenChange={setViewerOpen}
        />
      </div>
    </AdminLayout>
  );
}
