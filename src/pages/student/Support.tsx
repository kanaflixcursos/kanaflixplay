import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'react-router-dom';
import StudentLayout from '@/components/layouts/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { TicketChat } from '@/components/support/TicketChat';
import { toast } from 'sonner';
import { 
  MessageSquare, 
  Plus, 
  Loader2, 
  Clock, 
  CheckCircle2, 
  XCircle,
  RefreshCcw,
  HelpCircle,
  ChevronRight
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
}

interface RefundRequest {
  id: string;
  order_id: string;
  user_id: string;
  reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  order?: {
    amount: number;
    course?: {
      title: string;
    } | null;
  };
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  open: { label: 'Aberto', variant: 'secondary', icon: Clock },
  in_progress: { label: 'Em Andamento', variant: 'default', icon: RefreshCcw },
  resolved: { label: 'Resolvido', variant: 'outline', icon: CheckCircle2 },
  closed: { label: 'Fechado', variant: 'outline', icon: XCircle },
};

const refundStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  pending: { label: 'Pendente', variant: 'secondary', icon: Clock },
  approved: { label: 'Aprovado', variant: 'default', icon: CheckCircle2 },
  rejected: { label: 'Recusado', variant: 'destructive', icon: XCircle },
};

const categoryLabels: Record<string, string> = {
  feedback: 'Feedback',
  question: 'Dúvida',
  bug: 'Problema Técnico',
  other: 'Outro',
};

const MAX_OPEN_TICKETS = 2;

export default function Support() {
  const { user, role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [ticketOwner, setTicketOwner] = useState<{ name: string; avatar?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    message: '',
    category: 'question',
  });

  const isAdmin = role === 'admin';
  const ticketIdFromUrl = searchParams.get('ticket');
  
  // Count open tickets (not closed/resolved)
  const openTicketsCount = tickets.filter(t => t.status !== 'closed' && t.status !== 'resolved').length;
  const canCreateNewTicket = isAdmin || openTicketsCount < MAX_OPEN_TICKETS;

  const fetchTickets = useCallback(async () => {
    if (!user) return;

    let query = supabase
      .from('support_tickets')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!isAdmin) {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query;

    if (!error && data) {
      setTickets(data);
      
      // If there's a ticket ID in URL, select it
      if (ticketIdFromUrl && !selectedTicket) {
        const ticket = data.find(t => t.id === ticketIdFromUrl);
        if (ticket) {
          setSelectedTicket(ticket);
        }
      }
    }
  }, [user, isAdmin, ticketIdFromUrl, selectedTicket]);

  const fetchRefundRequests = useCallback(async () => {
    if (!user) return;

    let query = supabase
      .from('refund_requests')
      .select(`
        *,
        order:orders(
          amount,
          course:courses(title)
        )
      `)
      .order('created_at', { ascending: false });

    if (!isAdmin) {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query;

    if (!error && data) {
      setRefundRequests(data as unknown as RefundRequest[]);
    }
  }, [user, isAdmin]);

  const fetchTicketMessages = async (ticketId: string, ticketUserId: string) => {
    setLoadingMessages(true);
    
    // Fetch ticket owner profile
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('user_id', ticketUserId)
      .single();
    
    if (ownerProfile) {
      setTicketOwner({ name: ownerProfile.full_name || 'Usuário', avatar: ownerProfile.avatar_url || undefined });
    }
    
    const { data: messages, error } = await supabase
      .from('support_ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      setLoadingMessages(false);
      return;
    }

    // Fetch user profiles for messages
    const userIds = [...new Set((messages || []).map(m => m.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', userIds);

    const profileMap = new Map(
      (profiles || []).map(p => [p.user_id, { name: p.full_name, avatar: p.avatar_url }])
    );

    const messagesWithUsers = (messages || []).map(m => ({
      ...m,
      user_name: profileMap.get(m.user_id)?.name || 'Usuário',
      user_avatar: profileMap.get(m.user_id)?.avatar || undefined,
    }));

    setTicketMessages(messagesWithUsers);
    setLoadingMessages(false);
  };

  useEffect(() => {
    Promise.all([fetchTickets(), fetchRefundRequests()]).then(() => {
      setLoading(false);
    });
  }, [fetchTickets, fetchRefundRequests]);

  useEffect(() => {
    if (selectedTicket) {
      fetchTicketMessages(selectedTicket.id, selectedTicket.user_id);
      setSearchParams({ ticket: selectedTicket.id });
    } else {
      setTicketMessages([]);
      setTicketOwner(null);
      setSearchParams({});
    }
  }, [selectedTicket, setSearchParams]);

  const handleCreateTicket = async () => {
    if (!user || !newTicket.subject.trim() || !newTicket.message.trim()) return;

    setSubmitting(true);
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        subject: newTicket.subject.trim(),
        message: newTicket.message.trim(),
        category: newTicket.category,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar ticket');
      console.error(error);
    } else {
      toast.success('Ticket criado com sucesso!');
      setNewTicket({ subject: '', message: '', category: 'question' });
      setIsNewTicketOpen(false);
      fetchTickets();
      if (data) {
        setSelectedTicket(data);
      }
    }
    setSubmitting(false);
  };

  const handleSendMessage = async () => {
    if (!user || !selectedTicket || !newMessage.trim()) return;

    setSubmitting(true);
    const { error } = await supabase
      .from('support_ticket_messages')
      .insert({
        ticket_id: selectedTicket.id,
        user_id: user.id,
        message: newMessage.trim(),
        is_admin_reply: isAdmin,
      });

    if (error) {
      toast.error('Erro ao enviar mensagem');
      console.error(error);
    } else {
      setNewMessage('');
      fetchTicketMessages(selectedTicket.id, selectedTicket.user_id);
      
      // Update ticket status if admin is replying
      if (isAdmin && selectedTicket.status === 'open') {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress' })
          .eq('id', selectedTicket.id);
        fetchTickets();
      }
    }
    setSubmitting(false);
  };


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100);
  };

  if (loading) {
    return (
      <StudentLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Suporte</h1>
            <p className="text-muted-foreground">Central de ajuda e atendimento</p>
          </div>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Suporte</h1>
            <p className="text-muted-foreground">Central de ajuda e atendimento</p>
          </div>
          <div className="flex items-center gap-3">
            {!isAdmin && (
              <span className="text-sm text-muted-foreground">
                {openTicketsCount}/{MAX_OPEN_TICKETS} tickets abertos
              </span>
            )}
            <Dialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
              <DialogTrigger asChild>
                <Button disabled={!canCreateNewTicket}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Solicitação
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Solicitação</DialogTitle>
                <DialogDescription>
                  Envie sua dúvida, feedback ou reporte um problema
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={newTicket.category}
                    onValueChange={(value) => setNewTicket({ ...newTicket, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="question">Dúvida</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                      <SelectItem value="bug">Problema Técnico</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Assunto</Label>
                  <Input
                    id="subject"
                    placeholder="Resumo da sua solicitação"
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem</Label>
                  <Textarea
                    id="message"
                    placeholder="Descreva sua solicitação em detalhes..."
                    rows={5}
                    value={newTicket.message}
                    onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewTicketOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateTicket}
                  disabled={!newTicket.subject.trim() || !newTicket.message.trim() || submitting}
                >
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Enviar
                </Button>
              </DialogFooter>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="tickets" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tickets" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Solicitações
            </TabsTrigger>
            <TabsTrigger value="refunds" className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              Reembolsos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tickets" className="space-y-4">
            {selectedTicket ? (
              <TicketChat
                ticket={selectedTicket}
                messages={ticketMessages}
                loadingMessages={loadingMessages}
                isAdmin={isAdmin}
                canReply={(() => {
                  const hasAdminReply = ticketMessages.some(m => m.is_admin_reply);
                  const lastMessage = ticketMessages[ticketMessages.length - 1];
                  const lastMessageIsFromAdmin = lastMessage?.is_admin_reply === true;
                  return isAdmin || (hasAdminReply && lastMessageIsFromAdmin);
                })()}
                submitting={submitting}
                newMessage={newMessage}
                onMessageChange={setNewMessage}
                onSendMessage={handleSendMessage}
                onBack={() => setSelectedTicket(null)}
                ticketOwnerName={ticketOwner?.name}
                ticketOwnerAvatar={ticketOwner?.avatar}
              />
            ) : tickets.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <HelpCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium">Nenhuma solicitação</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Clique em "Nova Solicitação" para enviar uma mensagem
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {tickets.map((ticket) => {
                  const status = statusConfig[ticket.status] || statusConfig.open;
                  const StatusIcon = status.icon;

                  return (
                    <div
                      key={ticket.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm truncate">{ticket.subject}</h4>
                          <Badge variant={status.variant} className="gap-1 text-xs h-5 shrink-0">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs h-5">
                            {categoryLabels[ticket.category] || ticket.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="refunds" className="space-y-4">
            {refundRequests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <RefreshCcw className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium">Nenhuma solicitação de reembolso</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Você pode solicitar reembolso na página de compras
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {refundRequests.map((request) => {
                  const status = refundStatusConfig[request.status] || refundStatusConfig.pending;
                  const StatusIcon = status.icon;

                  return (
                    <Card key={request.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={status.variant} className="gap-1">
                                <StatusIcon className="h-3 w-3" />
                                {status.label}
                              </Badge>
                            </div>
                            <h4 className="font-medium">
                              {request.order?.course?.title || 'Curso'}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              Valor: {formatCurrency(request.order?.amount || 0)}
                            </p>
                            <div className="mt-3 p-3 bg-muted rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">Motivo:</p>
                              <p className="text-sm">{request.reason}</p>
                            </div>
                            {request.admin_notes && (
                              <div className="mt-3 p-3 bg-primary/10 rounded-lg">
                                <p className="text-xs text-muted-foreground mb-1">Resposta do suporte:</p>
                                <p className="text-sm">{request.admin_notes}</p>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-3">
                              Solicitado em {format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </StudentLayout>
  );
}
