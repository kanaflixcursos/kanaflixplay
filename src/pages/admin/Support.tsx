import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  MessageSquare, 
  Loader2, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Send,
  RefreshCcw,
  HelpCircle,
  MessageCircle,
  ChevronRight,
  User,
  Mail,
  ExternalLink,
  AlertCircle
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
  user_profile?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
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
    id: string;
    amount: number;
    pagarme_charge_id: string | null;
    course?: {
      title: string;
    } | null;
  };
  user_profile?: {
    full_name: string | null;
    email: string | null;
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

export default function AdminSupport() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Refund review modal
  const [reviewingRefund, setReviewingRefund] = useState<RefundRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);

  const ticketIdFromUrl = searchParams.get('ticket');

  const fetchTickets = useCallback(async () => {
    const { data: ticketsData, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching tickets:', error);
      return;
    }

    // Fetch user profiles
    const userIds = [...new Set((ticketsData || []).map(t => t.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, email, avatar_url')
      .in('user_id', userIds);

    const profileMap = new Map(
      (profiles || []).map(p => [p.user_id, p])
    );

    const ticketsWithProfiles = (ticketsData || []).map(t => ({
      ...t,
      user_profile: profileMap.get(t.user_id) || null,
    }));

    setTickets(ticketsWithProfiles);

    // Select ticket from URL if present
    if (ticketIdFromUrl && !selectedTicket) {
      const ticket = ticketsWithProfiles.find(t => t.id === ticketIdFromUrl);
      if (ticket) {
        setSelectedTicket(ticket);
      }
    }
  }, [ticketIdFromUrl, selectedTicket]);

  const fetchRefundRequests = useCallback(async () => {
    const { data: refundsData, error } = await supabase
      .from('refund_requests')
      .select(`
        *,
        order:orders(
          id,
          amount,
          pagarme_charge_id,
          course:courses(title)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching refunds:', error);
      return;
    }

    // Fetch user profiles
    const userIds = [...new Set((refundsData || []).map(r => r.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .in('user_id', userIds);

    const profileMap = new Map(
      (profiles || []).map(p => [p.user_id, p])
    );

    const refundsWithProfiles = (refundsData || []).map(r => ({
      ...r,
      user_profile: profileMap.get(r.user_id) || null,
    })) as unknown as RefundRequest[];

    setRefundRequests(refundsWithProfiles);
  }, []);

  const fetchTicketMessages = async (ticketId: string) => {
    setLoadingMessages(true);
    
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

    // Fetch user profiles
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
      fetchTicketMessages(selectedTicket.id);
      setSearchParams({ ticket: selectedTicket.id });
    } else {
      setTicketMessages([]);
      setSearchParams({});
    }
  }, [selectedTicket, setSearchParams]);

  const handleSendMessage = async () => {
    if (!user || !selectedTicket || !newMessage.trim()) return;

    setSubmitting(true);
    const { error } = await supabase
      .from('support_ticket_messages')
      .insert({
        ticket_id: selectedTicket.id,
        user_id: user.id,
        message: newMessage.trim(),
        is_admin_reply: true,
      });

    if (error) {
      toast.error('Erro ao enviar mensagem');
      console.error(error);
    } else {
      setNewMessage('');
      fetchTicketMessages(selectedTicket.id);
      
      // Update ticket status
      if (selectedTicket.status === 'open') {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress' })
          .eq('id', selectedTicket.id);
        fetchTickets();
      }
    }
    setSubmitting(false);
  };

  const handleUpdateTicketStatus = async (status: string) => {
    if (!selectedTicket) return;

    const { error } = await supabase
      .from('support_tickets')
      .update({ status })
      .eq('id', selectedTicket.id);

    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      toast.success('Status atualizado');
      setSelectedTicket({ ...selectedTicket, status });
      fetchTickets();
    }
  };

  const handleReviewRefund = async (approved: boolean) => {
    if (!reviewingRefund || !user) return;

    setProcessingRefund(true);

    try {
      // Update refund request status
      const { error: updateError } = await supabase
        .from('refund_requests')
        .update({
          status: approved ? 'approved' : 'rejected',
          admin_notes: adminNotes.trim() || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reviewingRefund.id);

      if (updateError) throw updateError;

      // If approved, process the actual refund via edge function
      if (approved && reviewingRefund.order?.pagarme_charge_id) {
        const { error: refundError } = await supabase.functions.invoke('pagarme', {
          body: {
            action: 'refund',
            chargeId: reviewingRefund.order.pagarme_charge_id,
            orderId: reviewingRefund.order_id,
          },
        });

        if (refundError) {
          console.error('Refund processing error:', refundError);
          toast.error('Reembolso aprovado, mas houve erro no processamento. Verifique manualmente.');
        } else {
          toast.success('Reembolso aprovado e processado com sucesso!');
        }
      } else if (approved) {
        toast.success('Reembolso aprovado! Processe manualmente no gateway de pagamento.');
      } else {
        toast.success('Solicitação de reembolso recusada');
      }

      setReviewingRefund(null);
      setAdminNotes('');
      fetchRefundRequests();
    } catch (error) {
      console.error('Error reviewing refund:', error);
      toast.error('Erro ao processar solicitação');
    }

    setProcessingRefund(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100);
  };

  const filteredTickets = statusFilter === 'all' 
    ? tickets 
    : tickets.filter(t => t.status === statusFilter);

  const pendingRefunds = refundRequests.filter(r => r.status === 'pending');

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Suporte</h1>
            <p className="text-muted-foreground">Gerenciamento de solicitações e reembolsos</p>
          </div>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Suporte</h1>
          <p className="text-muted-foreground">Gerenciamento de solicitações e reembolsos</p>
        </div>

        {/* Pending refunds alert */}
        {pendingRefunds.length > 0 && (
          <Card className="border-warning bg-warning/10">
            <CardContent className="flex items-center gap-3 py-3">
              <AlertCircle className="h-5 w-5 text-warning" />
              <span className="font-medium">
                {pendingRefunds.length} solicitação(ões) de reembolso aguardando análise
              </span>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="tickets" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tickets" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Solicitações ({tickets.length})
            </TabsTrigger>
            <TabsTrigger value="refunds" className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              Reembolsos ({refundRequests.length})
              {pendingRefunds.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {pendingRefunds.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tickets" className="space-y-4">
            {selectedTicket ? (
              <Card>
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedTicket(null)}
                    >
                      ← Voltar
                    </Button>
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedTicket.status}
                        onValueChange={handleUpdateTicketStatus}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Aberto</SelectItem>
                          <SelectItem value="in_progress">Em Andamento</SelectItem>
                          <SelectItem value="resolved">Resolvido</SelectItem>
                          <SelectItem value="closed">Fechado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* User info */}
                  {selectedTicket.user_profile && (
                    <div className="flex items-center gap-3 mt-3 p-3 bg-muted rounded-lg">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={selectedTicket.user_profile.avatar_url || undefined} />
                        <AvatarFallback>
                          {getInitials(selectedTicket.user_profile.full_name || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{selectedTicket.user_profile.full_name || 'Usuário'}</p>
                        <p className="text-sm text-muted-foreground">{selectedTicket.user_profile.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/students/${selectedTicket.user_id}`)}
                        >
                          <User className="h-4 w-4 mr-1" />
                          Ver Perfil
                        </Button>
                        {selectedTicket.user_profile.email && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a href={`mailto:${selectedTicket.user_profile.email}`}>
                              <Mail className="h-4 w-4 mr-1" />
                              Email
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <CardTitle className="text-lg mt-3">{selectedTicket.subject}</CardTitle>
                  <CardDescription>
                    {categoryLabels[selectedTicket.category] || selectedTicket.category} • 
                    Criado em {format(new Date(selectedTicket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Original message */}
                  <div className="p-4 border-b bg-muted/30">
                    <p className="text-sm whitespace-pre-wrap">{selectedTicket.message}</p>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="h-[300px]">
                    <div className="p-4 space-y-4">
                      {loadingMessages ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : ticketMessages.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Nenhuma resposta ainda</p>
                        </div>
                      ) : (
                        ticketMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex gap-3 ${msg.is_admin_reply ? 'flex-row-reverse' : ''}`}
                          >
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarImage src={msg.user_avatar || undefined} />
                              <AvatarFallback className="text-xs">
                                {getInitials(msg.user_name || 'U')}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`flex-1 max-w-[80%] ${msg.is_admin_reply ? 'text-right' : ''}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium">
                                  {msg.is_admin_reply ? 'Suporte' : msg.user_name}
                                </span>
                                {msg.is_admin_reply && (
                                  <Badge variant="outline" className="text-xs">Admin</Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ptBR })}
                                </span>
                              </div>
                              <div
                                className={`rounded-lg px-3 py-2 text-sm ${
                                  msg.is_admin_reply
                                    ? 'bg-primary text-primary-foreground ml-auto'
                                    : 'bg-muted'
                                }`}
                              >
                                <p className="whitespace-pre-wrap">{msg.message}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>

                  {/* Reply form */}
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Digite sua resposta..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        rows={2}
                        className="resize-none"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || submitting}
                        size="icon"
                        className="shrink-0 h-auto"
                      >
                        {submitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Filters */}
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="open">Abertos</SelectItem>
                      <SelectItem value="in_progress">Em Andamento</SelectItem>
                      <SelectItem value="resolved">Resolvidos</SelectItem>
                      <SelectItem value="closed">Fechados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {filteredTickets.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <HelpCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium">Nenhuma solicitação</h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        Não há solicitações de suporte no momento
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-2">
                    {filteredTickets.map((ticket) => {
                      const status = statusConfig[ticket.status] || statusConfig.open;
                      const StatusIcon = status.icon;

                      return (
                        <Card
                          key={ticket.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <Avatar className="h-10 w-10 shrink-0">
                                  <AvatarImage src={ticket.user_profile?.avatar_url || undefined} />
                                  <AvatarFallback>
                                    {getInitials(ticket.user_profile?.full_name || 'U')}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-xs shrink-0">
                                      {categoryLabels[ticket.category] || ticket.category}
                                    </Badge>
                                    <Badge variant={status.variant} className="gap-1 shrink-0">
                                      <StatusIcon className="h-3 w-3" />
                                      {status.label}
                                    </Badge>
                                  </div>
                                  <h4 className="font-medium truncate">{ticket.subject}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {ticket.user_profile?.full_name || 'Usuário'} • {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true, locale: ptBR })}
                                  </p>
                                </div>
                              </div>
                              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="refunds" className="space-y-4">
            {refundRequests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <RefreshCcw className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium">Nenhuma solicitação de reembolso</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Não há solicitações de reembolso no momento
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
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>
                                  {getInitials(request.user_profile?.full_name || 'U')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{request.user_profile?.full_name || 'Usuário'}</p>
                                <p className="text-sm text-muted-foreground">{request.user_profile?.email}</p>
                              </div>
                              <Badge variant={status.variant} className="gap-1 ml-auto md:ml-0">
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
                              <p className="text-xs text-muted-foreground mb-1">Motivo da solicitação:</p>
                              <p className="text-sm">{request.reason}</p>
                            </div>

                            {request.admin_notes && (
                              <div className="mt-3 p-3 bg-primary/10 rounded-lg">
                                <p className="text-xs text-muted-foreground mb-1">Notas do administrador:</p>
                                <p className="text-sm">{request.admin_notes}</p>
                              </div>
                            )}

                            <p className="text-xs text-muted-foreground mt-3">
                              Solicitado em {format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>

                          {request.status === 'pending' && (
                            <div className="flex flex-col gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/admin/students/${request.user_id}`)}
                              >
                                <User className="h-4 w-4 mr-1" />
                                Ver Perfil
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setReviewingRefund(request);
                                  setAdminNotes('');
                                }}
                              >
                                Analisar
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Refund review dialog */}
        <Dialog open={!!reviewingRefund} onOpenChange={(open) => !open && setReviewingRefund(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Analisar Solicitação de Reembolso</DialogTitle>
              <DialogDescription>
                Revise os detalhes e decida sobre a solicitação
              </DialogDescription>
            </DialogHeader>

            {reviewingRefund && (
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">{reviewingRefund.order?.course?.title}</p>
                  <p className="text-lg font-semibold">{formatCurrency(reviewingRefund.order?.amount || 0)}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">Motivo do usuário:</Label>
                  <p className="text-sm mt-1">{reviewingRefund.reason}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-notes">Notas (opcional)</Label>
                  <Textarea
                    id="admin-notes"
                    placeholder="Adicione uma mensagem para o usuário..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => handleReviewRefund(false)}
                disabled={processingRefund}
              >
                {processingRefund && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Recusar
              </Button>
              <Button
                onClick={() => handleReviewRefund(true)}
                disabled={processingRefund}
              >
                {processingRefund && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Aprovar Reembolso
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
