import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSupportNotifications } from '@/hooks/useSupportNotifications';
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
import { ArrowLeft, Send, Loader2, Clock, CheckCircle2, ShieldCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

export default function TicketChatPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFiles, setViewerFiles] = useState<AttachmentFile[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { markTicketAsRead } = useSupportNotifications({ userId: user?.id, isAdmin: false });

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (el) setTimeout(() => { el.scrollTop = el.scrollHeight; }, 50);
    }
  }, []);

  const fetchTicket = useCallback(async () => {
    if (!ticketId || !user) return;
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .eq('user_id', user.id)
      .single();

    if (error || !data) { toast.error('Ticket não encontrado'); navigate('/suporte'); return; }
    setTicket(data);
    setLoading(false);
  }, [ticketId, user, navigate]);

  const fetchMessages = useCallback(async () => {
    if (!ticketId) return;
    const { data: msgs } = await supabase
      .from('support_ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    const userIds = [...new Set((msgs || []).map(m => m.user_id))];
    const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', userIds);
    const profileMap = new Map((profiles || []).map(p => [p.user_id, { name: p.full_name, avatar: p.avatar_url }]));

    setMessages((msgs || []).map(m => ({
      ...m,
      user_name: profileMap.get(m.user_id)?.name || 'Usuário',
      user_avatar: profileMap.get(m.user_id)?.avatar || undefined,
      attachments: (m.attachments as unknown as AttachmentFile[]) || [],
    })));
    scrollToBottom();
  }, [ticketId, scrollToBottom]);

  useEffect(() => { if (ticketId && user) markTicketAsRead(ticketId); }, [ticketId, user, markTicketAsRead]);
  useEffect(() => { fetchTicket(); fetchMessages(); }, [fetchTicket, fetchMessages]);

  useEffect(() => {
    if (!ticketId) return;
    const channel = supabase
      .channel(`ticket-${ticketId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_ticket_messages', filter: `ticket_id=eq.${ticketId}` }, () => {
        fetchMessages();
        if (user) markTicketAsRead(ticketId);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticketId, fetchMessages, user, markTicketAsRead]);

  const handleSend = async () => {
    if (!user || !ticket || (!newMessage.trim() && attachments.length === 0)) return;
    setSubmitting(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from('support_ticket_messages').insert([{
      ticket_id: ticket.id, user_id: user.id, message: newMessage.trim(), is_admin_reply: false, attachments: attachments as any,
    }]);

    if (error) { toast.error('Erro ao enviar'); } else { setNewMessage(''); setAttachments([]); fetchMessages(); }
    setSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if ((newMessage.trim() || attachments.length > 0) && !submitting) handleSend(); }
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  const isTicketClosed = ticket?.status === 'closed' || ticket?.status === 'resolved';

  if (loading) {
    return <StudentLayout><div className="max-w-3xl mx-auto space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-[500px] w-full" /></div></StudentLayout>;
  }
  if (!ticket) return null;

  return (
    <StudentLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/suporte')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">{ticket.subject}</h1>
            <p className="text-xs text-muted-foreground">#{ticket.id.slice(0, 6).toUpperCase()}</p>
          </div>
          <Badge variant={ticket.status === 'open' || ticket.status === 'in_progress' ? 'secondary' : 'outline'}>
            {ticket.status === 'open' ? 'Aberto' : ticket.status === 'in_progress' ? 'Em Andamento' : ticket.status === 'resolved' ? 'Resolvido' : 'Fechado'}
          </Badge>
        </div>

        {/* Chat */}
        <div className="border rounded-lg overflow-hidden flex flex-col h-[calc(100vh-200px)] min-h-[400px] bg-card">
          {/* Original message */}
          <div className="p-4 border-b bg-muted/30 shrink-0">
            <p className="text-xs text-muted-foreground mb-1">Mensagem original</p>
            <p className="text-sm whitespace-pre-wrap">{ticket.message}</p>
          </div>

          {/* Messages */}
          <ScrollArea ref={scrollRef} className="flex-1">
            <div className="p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Clock className="h-8 w-8 mb-2" />
                  <p className="text-sm">Aguardando resposta do suporte</p>
                </div>
              ) : messages.map(msg => {
                const isAdmin = msg.is_admin_reply;
                const msgAttachments = msg.attachments || [];
                return (
                  <div key={msg.id} className={`flex gap-2 ${isAdmin ? 'flex-row-reverse' : ''}`}>
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={msg.user_avatar} />
                      <AvatarFallback className={`text-[10px] ${isAdmin ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        {isAdmin ? <ShieldCheck className="h-3 w-3" /> : getInitials(msg.user_name || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`max-w-[75%] ${isAdmin ? 'text-right' : ''}`}>
                      <div className={`flex items-center gap-1.5 mb-0.5 ${isAdmin ? 'justify-end' : ''}`}>
                        <span className="text-[11px] font-medium">{isAdmin ? 'Suporte' : msg.user_name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                      <div className={`inline-block rounded-lg px-3 py-2 text-sm ${isAdmin ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <p className="whitespace-pre-wrap text-left">{msg.message}</p>
                        {msgAttachments.length > 0 && (
                          <FilePreview files={msgAttachments} onViewFile={i => { setViewerFiles(msgAttachments); setViewerIndex(i); setViewerOpen(true); }} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Input */}
          {!isTicketClosed ? (
            <div className="p-3 border-t bg-background shrink-0 space-y-2">
              {user && (
                <AttachmentUpload userId={user.id} ticketId={ticket.id} attachments={attachments} onAttachmentsChange={setAttachments} disabled={submitting} />
              )}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Digite sua mensagem..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  className="resize-none flex-1"
                  disabled={submitting}
                />
                <Button onClick={handleSend} disabled={(!newMessage.trim() && attachments.length === 0) || submitting} size="icon" className="shrink-0 h-[52px] w-[52px]">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-3 border-t bg-muted/30 shrink-0 text-center">
              <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                Este ticket foi {ticket.status === 'resolved' ? 'resolvido' : 'fechado'}
              </div>
            </div>
          )}
        </div>

        <FileViewer files={viewerFiles} initialIndex={viewerIndex} open={viewerOpen} onOpenChange={setViewerOpen} />
      </div>
    </StudentLayout>
  );
}
