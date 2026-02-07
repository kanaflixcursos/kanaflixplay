import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
  ChevronRight,
  MessageCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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
  message_count?: number;
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
  open: { label: 'Aguardando', variant: 'secondary', icon: Clock },
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    message: '',
    category: 'question',
  });

  const openTicketsCount = tickets.filter(t => t.status !== 'closed' && t.status !== 'resolved').length;
  const canCreateNewTicket = openTicketsCount < MAX_OPEN_TICKETS;

  const fetchTickets = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      // Get message counts for each ticket
      const ticketIds = data.map(t => t.id);
      const { data: messageCounts } = await supabase
        .from('support_ticket_messages')
        .select('ticket_id')
        .in('ticket_id', ticketIds);

      const countMap = new Map<string, number>();
      (messageCounts || []).forEach(m => {
        countMap.set(m.ticket_id, (countMap.get(m.ticket_id) || 0) + 1);
      });

      const ticketsWithCounts = data.map(t => ({
        ...t,
        message_count: countMap.get(t.id) || 0,
      }));

      setTickets(ticketsWithCounts);
    }
  }, [user]);

  const fetchRefundRequests = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('refund_requests')
      .select(`
        *,
        order:orders(
          amount,
          course:courses(title)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRefundRequests(data as unknown as RefundRequest[]);
    }
  }, [user]);

  useEffect(() => {
    Promise.all([fetchTickets(), fetchRefundRequests()]).then(() => {
      setLoading(false);
    });
  }, [fetchTickets, fetchRefundRequests]);

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
        navigate(`/suporte/${data.id}`);
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
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
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
            <span className="text-sm text-muted-foreground">
              {openTicketsCount}/{MAX_OPEN_TICKETS} tickets abertos
            </span>
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

          <TabsContent value="tickets" className="space-y-3">
            {tickets.length === 0 ? (
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
              tickets.map((ticket) => {
                const status = statusConfig[ticket.status] || statusConfig.open;
                const StatusIcon = status.icon;

                return (
                  <div
                    key={ticket.id}
                    className="flex items-center gap-3 p-4 rounded-xl border bg-card cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/suporte/${ticket.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">{ticket.subject}</h4>
                        <Badge variant={status.variant} className="gap-1 text-xs h-5 shrink-0">
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs h-5">
                          {categoryLabels[ticket.category] || ticket.category}
                        </Badge>
                        <span>•</span>
                        <span>#{ticket.id.slice(0, 6).toUpperCase()}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true, locale: ptBR })}</span>
                        {ticket.message_count && ticket.message_count > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" />
                              {ticket.message_count}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="refunds" className="space-y-3">
            {refundRequests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <RefreshCcw className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium">Nenhuma solicitação de reembolso</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Você pode solicitar reembolso em "Minhas Compras"
                  </p>
                </CardContent>
              </Card>
            ) : (
              refundRequests.map((refund) => {
                const status = refundStatusConfig[refund.status] || refundStatusConfig.pending;
                const StatusIcon = status.icon;

                return (
                  <div
                    key={refund.id}
                    className="p-4 rounded-xl border bg-card"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate">
                            {refund.order?.course?.title || 'Curso'}
                          </h4>
                          <Badge variant={status.variant} className="gap-1 text-xs h-5 shrink-0">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{refund.reason}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(refund.created_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold">
                          {refund.order?.amount ? formatCurrency(refund.order.amount) : '-'}
                        </p>
                      </div>
                    </div>
                    {refund.admin_notes && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Resposta do suporte:</p>
                        <p className="text-sm">{refund.admin_notes}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </StudentLayout>
  );
}
