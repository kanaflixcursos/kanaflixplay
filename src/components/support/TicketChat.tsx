import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Send, 
  Loader2, 
  MessageCircle, 
  ChevronDown, 
  ChevronUp,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  User,
  ShieldCheck
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AttachmentUpload } from './AttachmentUpload';
import { FileViewer, FilePreview, type AttachmentFile } from './FileViewer';

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

interface TicketChatProps {
  ticket: SupportTicket;
  messages: TicketMessage[];
  loadingMessages: boolean;
  isAdmin: boolean;
  canReply: boolean;
  submitting: boolean;
  newMessage: string;
  onMessageChange: (value: string) => void;
  onSendMessage: (attachments?: AttachmentFile[]) => void;
  onBack: () => void;
  ticketOwnerName?: string;
  ticketOwnerAvatar?: string;
  userId?: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType; color: string }> = {
  open: { label: 'Aberto', variant: 'secondary', icon: Clock, color: 'text-yellow-600' },
  in_progress: { label: 'Em Andamento', variant: 'default', icon: RefreshCcw, color: 'text-blue-600' },
  resolved: { label: 'Resolvido', variant: 'outline', icon: CheckCircle2, color: 'text-green-600' },
  closed: { label: 'Fechado', variant: 'outline', icon: XCircle, color: 'text-muted-foreground' },
};

const categoryLabels: Record<string, string> = {
  feedback: 'Feedback',
  question: 'Dúvida',
  bug: 'Problema Técnico',
  other: 'Outro',
};

export function TicketChat({
  ticket,
  messages,
  loadingMessages,
  isAdmin,
  canReply,
  submitting,
  newMessage,
  onMessageChange,
  onSendMessage,
  ticketOwnerName,
  ticketOwnerAvatar,
  userId,
}: TicketChatProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFiles, setViewerFiles] = useState<AttachmentFile[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const status = statusConfig[ticket.status] || statusConfig.open;
  const StatusIcon = status.icon;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isExpanded]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((newMessage.trim() || attachments.length > 0) && !submitting) {
        handleSend();
      }
    }
  };

  const handleSend = () => {
    onSendMessage(attachments.length > 0 ? attachments : undefined);
    setAttachments([]);
  };

  const openViewer = (files: AttachmentFile[], index: number) => {
    setViewerFiles(files);
    setViewerIndex(index);
    setViewerOpen(true);
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="bg-card rounded-xl border overflow-hidden">
        {/* Clickable Header - toggles collapse/expand */}
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-3 p-4 border-b bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={ticketOwnerAvatar || undefined} />
              <AvatarFallback className="text-xs bg-primary/10">
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-medium truncate">{ticket.subject}</h2>
                <Badge variant={status.variant} className="gap-1 text-xs shrink-0">
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-muted-foreground">
                  {ticketOwnerName || 'Usuário'}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <Badge variant="outline" className="text-xs h-5">
                  {categoryLabels[ticket.category] || ticket.category}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  #{ticket.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
            </div>

            <div className="shrink-0">
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          {/* Original ticket message */}
          <div className="p-4 bg-muted/10 border-b">
            <p className="text-xs text-muted-foreground mb-2">
              Aberto em {format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{ticket.message}</p>
          </div>

          {/* Messages Area - flex column-reverse for bottom alignment */}
          <ScrollArea ref={scrollAreaRef} className="h-[350px]">
            <div className="flex flex-col justify-end min-h-full">
              <div className="p-4 space-y-3">
                {loadingMessages ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <MessageCircle className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Nenhuma resposta ainda
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isAdmin ? 'Envie uma resposta para o usuário' : 'Aguardando resposta do suporte'}
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const msgAttachments = msg.attachments || [];
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${msg.is_admin_reply ? 'flex-row-reverse' : ''}`}
                      >
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={msg.user_avatar || undefined} />
                          <AvatarFallback className={`text-[10px] ${msg.is_admin_reply ? 'bg-foreground text-background' : 'bg-muted'}`}>
                            {msg.is_admin_reply ? (
                              <ShieldCheck className="h-3.5 w-3.5" />
                            ) : (
                              getInitials(msg.user_name || 'U')
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`flex-1 max-w-[80%]`}>
                          <div className={`flex items-center gap-1.5 mb-0.5 ${msg.is_admin_reply ? 'justify-end' : ''}`}>
                            <span className="text-xs font-medium text-muted-foreground">
                              {msg.is_admin_reply ? 'Suporte' : msg.user_name}
                            </span>
                            <span className="text-[10px] text-muted-foreground/70">
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ptBR })}
                            </span>
                          </div>
                          <div
                            className={`rounded-lg px-3 py-1.5 text-sm ${
                              msg.is_admin_reply
                                ? 'bg-foreground text-background rounded-tr-sm'
                                : 'bg-muted/50 rounded-tl-sm'
                            }`}
                          >
                            <p className="whitespace-pre-wrap leading-normal">{msg.message}</p>
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
            </div>
          </ScrollArea>

          {/* Reply Input */}
          {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
            <div className="p-4 border-t bg-background space-y-3">
              {canReply ? (
                <>
                  {/* Attachments */}
                  {userId && (
                    <AttachmentUpload
                      userId={userId}
                      ticketId={ticket.id}
                      attachments={attachments}
                      onAttachmentsChange={setAttachments}
                      disabled={submitting}
                    />
                  )}
                  <div className="flex gap-3">
                    <Textarea
                      placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)"
                      value={newMessage}
                      onChange={(e) => onMessageChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={2}
                      className="resize-none flex-1 min-h-[52px]"
                      disabled={submitting}
                    />
                    <Button
                      onClick={handleSend}
                      disabled={(!newMessage.trim() && attachments.length === 0) || submitting}
                      size="icon"
                      className="shrink-0 h-[52px] w-[52px]"
                    >
                      {submitting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground bg-muted/50 rounded-lg">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Aguardando resposta do suporte...</span>
                </div>
              )}
            </div>
          )}

          {/* File Viewer Modal */}
          <FileViewer
            files={viewerFiles}
            initialIndex={viewerIndex}
            open={viewerOpen}
            onOpenChange={setViewerOpen}
          />

          {/* Closed/Resolved state */}
          {(ticket.status === 'closed' || ticket.status === 'resolved') && (
            <div className="p-4 border-t bg-muted/30">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">
                  Este ticket foi {ticket.status === 'resolved' ? 'resolvido' : 'fechado'}
                </span>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
