import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import StudentLayout from '@/components/layouts/StudentLayout';
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
  User
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

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  open: { label: 'Aguardando', variant: 'secondary' },
  in_progress: { label: 'Em Andamento', variant: 'default' },
  resolved: { label: 'Resolvido', variant: 'outline' },
  closed: { label: 'Fechado', variant: 'outline' },
};

const categoryLabels: Record<string, string> = {
  feedback: 'Feedback',
  question: 'Dúvida',
  bug: 'Problema Técnico',
  other: 'Outro',
};

export default function TicketChatPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFiles, setViewerFiles] = useState<AttachmentFile[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchTicket = useCallback(async () => {
    if (!ticketId || !user) return;

    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      toast.error('Ticket não encontrado');
      navigate('/suporte');
      return;
    }

    setTicket(data);
    setLoading(false);
  }, [ticketId, user, navigate]);

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
    
    // Mark notifications as read
    if (user) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('type', 'ticket_reply')
        .filter('metadata->ticket_id', 'eq', ticketId);
    }
  }, [ticketId, user]);

  useEffect(() => {
    fetchTicket();
    fetchMessages();
  }, [fetchTicket, fetchMessages]);

  // Auto-scroll to bottom on initial load and new messages
  useEffect(() => {
    if (scrollRef.current && !loadingMessages) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        // Use setTimeout to ensure scroll happens after render
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
      .channel(`ticket-messages-${ticketId}`)
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, fetchMessages]);

  const handleSendMessage = async () => {
    if (!user || !ticket || (!newMessage.trim() && attachments.length === 0)) return;

    setSubmitting(true);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertData: any = {
      ticket_id: ticket.id,
      user_id: user.id,
      message: newMessage.trim(),
      is_admin_reply: false,
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
    }
    setSubmitting(false);
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

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const canReply = () => {
    if (ticket?.status === 'closed' || ticket?.status === 'resolved') return false;
    const hasAdminReply = messages.some(m => m.is_admin_reply);
    const lastMessage = messages[messages.length - 1];
    const lastMessageIsFromAdmin = lastMessage?.is_admin_reply === true;
    return hasAdminReply && lastMessageIsFromAdmin;
  };

  if (loading) {
    return (
      <StudentLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </StudentLayout>
    );
  }

  if (!ticket) return null;

  const status = statusConfig[ticket.status] || statusConfig.open;

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/suporte')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold truncate">{ticket.subject}</h1>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                {categoryLabels[ticket.category] || ticket.category}
              </Badge>
              <span>•</span>
              <span>#{ticket.id.slice(0, 6).toUpperCase()}</span>
              <span>•</span>
              <span>{format(new Date(ticket.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
          </div>
        </div>

        {/* Chat Container */}
        <div className="bg-card rounded-xl border overflow-hidden flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
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
                  <p className="text-muted-foreground">Aguardando resposta do suporte</p>
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
          {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
            <div className="p-4 border-t bg-background shrink-0">
              {canReply() ? (
                <div className="space-y-3">
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
                      placeholder="Digite sua mensagem..."
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
              ) : (
                <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground bg-muted/50 rounded-lg">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Aguardando resposta do suporte...</span>
                </div>
              )}
            </div>
          )}

          {/* Closed State */}
          {(ticket.status === 'closed' || ticket.status === 'resolved') && (
            <div className="p-4 border-t bg-muted/30 shrink-0">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">
                  Este ticket foi {ticket.status === 'resolved' ? 'resolvido' : 'fechado'}
                </span>
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
    </StudentLayout>
  );
}
