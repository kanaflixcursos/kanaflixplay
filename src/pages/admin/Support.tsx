import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { toast } from 'sonner';
import { 
  MessageSquare, 
  Loader2, 
  Clock, 
  CheckCircle2, 
  XCircle,
  RefreshCcw,
  HelpCircle,
  User,
  AlertCircle,
  Search,
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
  user_profile?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
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
  open: { label: 'Pendente', variant: 'secondary', icon: Clock },
  in_progress: { label: 'Pendente', variant: 'secondary', icon: Clock },
  resolved: { label: 'Concluído', variant: 'default', icon: CheckCircle2 },
  closed: { label: 'Concluído', variant: 'default', icon: CheckCircle2 },
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

const getTicketCode = (id: string) => `#${id.slice(0, 6).toUpperCase()}`;

export default function AdminSupport() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Refund review modal
  const [reviewingRefund, setReviewingRefund] = useState<RefundRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);

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

    // Get message counts
    const ticketIds = (ticketsData || []).map(t => t.id);
    const { data: messageCounts } = await supabase
      .from('support_ticket_messages')
      .select('ticket_id')
      .in('ticket_id', ticketIds);

    const countMap = new Map<string, number>();
    (messageCounts || []).forEach(m => {
      countMap.set(m.ticket_id, (countMap.get(m.ticket_id) || 0) + 1);
    });

    const ticketsWithProfiles = (ticketsData || []).map(t => ({
      ...t,
      user_profile: profileMap.get(t.user_id) || null,
      message_count: countMap.get(t.id) || 0,
    }));

    setTickets(ticketsWithProfiles);
  }, []);

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

  useEffect(() => {
    Promise.all([fetchTickets(), fetchRefundRequests()]).then(() => {
      setLoading(false);
    });

    // Real-time subscription for new tickets
    const channel = supabase
      .channel('admin-tickets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTickets, fetchRefundRequests]);

  const handleReviewRefund = async (approved: boolean) => {
    if (!reviewingRefund) return;

    setProcessingRefund(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: updateError } = await supabase
        .from('refund_requests')
        .update({
          status: approved ? 'approved' : 'rejected',
          admin_notes: adminNotes.trim() || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reviewingRefund.id);

      if (updateError) throw updateError;

      if (approved && reviewingRefund.order?.pagarme_charge_id) {
        const { error: refundError } = await supabase.functions.invoke('pagarme', {
          body: {
            action: 'refund',
            chargeId: reviewingRefund.order.pagarme_charge_id,
            orderId: reviewingRefund.order_id,
          },
        });

        if (refundError) {
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100);
  };

  // Filter tickets
  const filteredTickets = useMemo(() => {
    let filtered = tickets;

    if (statusFilter === 'pending') {
      filtered = filtered.filter(t => t.status === 'open' || t.status === 'in_progress');
    } else if (statusFilter === 'resolved') {
      filtered = filtered.filter(t => t.status === 'resolved' || t.status === 'closed');
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(t => {
        const ticketCode = getTicketCode(t.id).toLowerCase();
        const name = t.user_profile?.full_name?.toLowerCase() || '';
        const email = t.user_profile?.email?.toLowerCase() || '';
        const subject = t.subject.toLowerCase();
        
        return (
          ticketCode.includes(query) ||
          name.includes(query) ||
          email.includes(query) ||
          subject.includes(query)
        );
      });
    }

    return filtered;
  }, [tickets, statusFilter, searchQuery]);

  const pendingRefunds = refundRequests.filter(r => r.status === 'pending');

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Suporte</h1>
            <p className="text-muted-foreground">Gerenciamento de solicitações e reembolsos</p>
          </div>
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
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
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'pending' | 'resolved')}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="resolved">Concluídos</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email ou código..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {filteredTickets.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <HelpCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium">Nenhuma solicitação</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    {searchQuery ? 'Nenhum ticket encontrado com os filtros aplicados' : 'Não há solicitações no momento'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredTickets.map((ticket) => {
                  const status = statusConfig[ticket.status] || statusConfig.open;
                  const StatusIcon = status.icon;

                  return (
                    <div
                      key={ticket.id}
                      className="flex items-center gap-3 p-4 rounded-xl border bg-card cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/admin/suporte/${ticket.id}`)}
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={ticket.user_profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10">
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-mono text-muted-foreground">
                            {getTicketCode(ticket.id)}
                          </span>
                          <span className="text-sm font-medium text-primary truncate">
                            {ticket.user_profile?.email || 'sem email'}
                          </span>
                          <span className="text-sm text-muted-foreground hidden sm:inline">
                            ({ticket.user_profile?.full_name || 'Usuário'})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate max-w-[200px] sm:max-w-[300px]">
                            {ticket.subject}
                          </span>
                          <Badge variant={status.variant} className="gap-1 text-xs h-5 shrink-0">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs h-5 hidden sm:flex">
                            {categoryLabels[ticket.category] || ticket.category}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {ticket.message_count > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MessageCircle className="h-3.5 w-3.5" />
                            {ticket.message_count}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true, locale: ptBR })}
                        </span>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="refunds" className="space-y-3">
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
              refundRequests.map((refund) => {
                const status = refundStatusConfig[refund.status] || refundStatusConfig.pending;
                const StatusIcon = status.icon;

                return (
                  <Card key={refund.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="font-medium truncate">
                              {refund.order?.course?.title || 'Curso'}
                            </span>
                            <Badge variant={status.variant} className="gap-1 text-xs h-5">
                              <StatusIcon className="h-3 w-3" />
                              {status.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {refund.user_profile?.full_name || 'Usuário'} • {refund.user_profile?.email}
                          </p>
                          <p className="text-sm line-clamp-2">{refund.reason}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(refund.created_at), { addSuffix: true, locale: ptBR })}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-lg">
                            {refund.order?.amount ? formatCurrency(refund.order.amount) : '-'}
                          </p>
                          {refund.status === 'pending' && (
                            <Button
                              size="sm"
                              className="mt-2"
                              onClick={() => {
                                setReviewingRefund(refund);
                                setAdminNotes('');
                              }}
                            >
                              Analisar
                            </Button>
                          )}
                        </div>
                      </div>
                      {refund.admin_notes && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Observações:</p>
                          <p className="text-sm">{refund.admin_notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>

        {/* Refund Review Dialog */}
        <Dialog open={!!reviewingRefund} onOpenChange={(open) => !open && setReviewingRefund(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Analisar Solicitação de Reembolso</DialogTitle>
              <DialogDescription>
                {reviewingRefund?.order?.course?.title} • {reviewingRefund?.order?.amount ? formatCurrency(reviewingRefund.order.amount) : '-'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Motivo do cliente:</p>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  {reviewingRefund?.reason}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Observações (opcional)</Label>
                <Textarea
                  placeholder="Adicione observações sobre a decisão..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="destructive"
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
