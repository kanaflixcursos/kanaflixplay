import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  User,
  Mail,
  AlertCircle,
  Search,
  ChevronDown,
  ChevronUp,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
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

// Simplified status for admin view: pending (open, in_progress) and resolved (resolved, closed)
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

// Generate short ticket code from UUID
const getTicketCode = (id: string) => {
  return `#${id.slice(0, 6).toUpperCase()}`;
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
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [contentSearch, setContentSearch] = useState('');
  
  // Expanded tickets for chat view
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set());
  
  // Refund review modal
  const [reviewingRefund, setReviewingRefund] = useState<RefundRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);

  const ticketIdFromUrl = searchParams.get('ticket');
  const scrollAreaRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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
        setExpandedTickets(prev => new Set([...prev, ticket.id]));
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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (selectedTicket) {
      const scrollRef = scrollAreaRefs.current.get(selectedTicket.id);
      if (scrollRef) {
        const scrollContainer = scrollRef.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    }
  }, [ticketMessages, selectedTicket]);

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
      
      // Update ticket status to in_progress if it was open
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

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: 'resolved' | 'open') => {
    const { error } = await supabase
      .from('support_tickets')
      .update({ status: newStatus })
      .eq('id', ticketId);

    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      toast.success(newStatus === 'resolved' ? 'Ticket marcado como concluído' : 'Ticket reaberto');
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
      fetchTickets();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (newMessage.trim() && !submitting) {
        handleSendMessage();
      }
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

  const toggleTicketExpand = (ticket: SupportTicket) => {
    const newExpanded = new Set(expandedTickets);
    if (newExpanded.has(ticket.id)) {
      newExpanded.delete(ticket.id);
      if (selectedTicket?.id === ticket.id) {
        setSelectedTicket(null);
      }
    } else {
      newExpanded.add(ticket.id);
      setSelectedTicket(ticket);
    }
    setExpandedTickets(newExpanded);
  };

  // Filter tickets based on status and search
  const filteredTickets = useMemo(() => {
    let filtered = tickets;

    // Status filter
    if (statusFilter === 'pending') {
      filtered = filtered.filter(t => t.status === 'open' || t.status === 'in_progress');
    } else if (statusFilter === 'resolved') {
      filtered = filtered.filter(t => t.status === 'resolved' || t.status === 'closed');
    }

    // Search filter (name, email, ticket code)
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

    // Content search (searches inside ticket message and subject)
    if (contentSearch.trim()) {
      const query = contentSearch.toLowerCase().trim();
      filtered = filtered.filter(t => {
        const subject = t.subject.toLowerCase();
        const message = t.message.toLowerCase();
        return subject.includes(query) || message.includes(query);
      });
    }

    return filtered;
  }, [tickets, statusFilter, searchQuery, contentSearch]);

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
                  placeholder="Buscar por nome, email ou código do ticket..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar palavra no conteúdo..."
                  value={contentSearch}
                  onChange={(e) => setContentSearch(e.target.value)}
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
                    {searchQuery || contentSearch 
                      ? 'Nenhum ticket encontrado com os filtros aplicados'
                      : 'Não há solicitações de suporte no momento'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredTickets.map((ticket) => {
                  const isExpanded = expandedTickets.has(ticket.id);
                  const status = statusConfig[ticket.status] || statusConfig.open;
                  const StatusIcon = status.icon;
                  const isPending = ticket.status === 'open' || ticket.status === 'in_progress';

                  return (
                    <Collapsible
                      key={ticket.id}
                      open={isExpanded}
                      onOpenChange={() => toggleTicketExpand(ticket)}
                    >
                      <div className="bg-card rounded-xl border overflow-hidden">
                        {/* Clickable Header */}
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                            <Avatar className="h-10 w-10 shrink-0">
                              <AvatarImage src={ticket.user_profile?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs bg-primary/10">
                                <User className="h-5 w-5" />
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-mono text-muted-foreground">
                                  {getTicketCode(ticket.id)}
                                </span>
                                <span className="text-sm font-medium text-primary">
                                  {ticket.user_profile?.email || 'sem email'}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  ({ticket.user_profile?.full_name || 'Usuário'})
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="font-medium text-sm truncate max-w-[300px]">
                                  {ticket.subject}
                                </span>
                                <Badge variant={status.variant} className="gap-1 text-xs h-5 shrink-0">
                                  <StatusIcon className="h-3 w-3" />
                                  {status.label}
                                </Badge>
                                <Badge variant="outline" className="text-xs h-5">
                                  {categoryLabels[ticket.category] || ticket.category}
                                </Badge>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-muted-foreground hidden sm:inline">
                                {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true, locale: ptBR })}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          {/* User info and actions */}
                          <div className="px-4 pb-3 flex items-center justify-between gap-2 border-b">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/admin/students/${ticket.user_id}`);
                                }}
                              >
                                <User className="h-4 w-4 mr-1" />
                                Ver Perfil
                              </Button>
                              {ticket.user_profile?.email && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <a href={`mailto:${ticket.user_profile.email}`}>
                                    <Mail className="h-4 w-4 mr-1" />
                                    Email
                                  </a>
                                </Button>
                              )}
                            </div>
                            <Button
                              variant={isPending ? "default" : "outline"}
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateTicketStatus(ticket.id, isPending ? 'resolved' : 'open');
                              }}
                            >
                              {isPending ? (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Marcar Concluído
                                </>
                              ) : (
                                <>
                                  <Clock className="h-4 w-4 mr-1" />
                                  Reabrir
                                </>
                              )}
                            </Button>
                          </div>

                          {/* Original ticket message */}
                          <div className="p-4 bg-muted/10 border-b">
                            <p className="text-xs text-muted-foreground mb-2">
                              Aberto em {format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{ticket.message}</p>
                          </div>

                          {/* Messages Area */}
                          <ScrollArea 
                            ref={(el) => {
                              if (el) scrollAreaRefs.current.set(ticket.id, el);
                            }}
                            className="h-[300px]"
                          >
                            <div className="flex flex-col justify-end min-h-full">
                              <div className="p-4 space-y-4">
                                {selectedTicket?.id === ticket.id && loadingMessages ? (
                                  <div className="flex justify-center py-12">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                  </div>
                                ) : selectedTicket?.id === ticket.id && ticketMessages.length === 0 ? (
                                  <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                      <MessageCircle className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      Nenhuma resposta ainda
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Envie uma resposta para o usuário
                                    </p>
                                  </div>
                                ) : selectedTicket?.id === ticket.id ? (
                                  ticketMessages.map((msg) => (
                                    <div
                                      key={msg.id}
                                      className={`flex gap-3 ${msg.is_admin_reply ? 'flex-row-reverse' : ''}`}
                                    >
                                      <Avatar className="h-9 w-9 shrink-0 ring-2 ring-background">
                                        <AvatarImage src={msg.user_avatar || undefined} />
                                        <AvatarFallback className={`text-xs ${msg.is_admin_reply ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                          {msg.is_admin_reply ? (
                                            <ShieldCheck className="h-4 w-4" />
                                          ) : (
                                            getInitials(msg.user_name || 'U')
                                          )}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className={`flex-1 max-w-[75%] ${msg.is_admin_reply ? 'items-end' : 'items-start'}`}>
                                        <div className={`flex items-center gap-2 mb-1 ${msg.is_admin_reply ? 'justify-end' : ''}`}>
                                          <span className="text-sm font-medium">
                                            {msg.is_admin_reply ? 'Suporte Kanaflix' : msg.user_name}
                                          </span>
                                          {msg.is_admin_reply && (
                                            <Badge variant="default" className="text-[10px] h-4 px-1.5 bg-primary/90">
                                              Equipe
                                            </Badge>
                                          )}
                                        </div>
                                        <div
                                          className={`rounded-2xl px-4 py-2.5 text-sm ${
                                            msg.is_admin_reply
                                              ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                              : 'bg-muted rounded-tl-sm'
                                          }`}
                                        >
                                          <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                                        </div>
                                        <span className={`text-[11px] text-muted-foreground mt-1 block ${msg.is_admin_reply ? 'text-right' : ''}`}>
                                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ptBR })}
                                        </span>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="flex justify-center py-12">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </ScrollArea>

                          {/* Reply Input */}
                          {isPending && (
                            <div className="p-4 border-t bg-background">
                              <div className="flex gap-3">
                                <Textarea
                                  placeholder="Digite sua resposta... (Enter para enviar, Shift+Enter para nova linha)"
                                  value={selectedTicket?.id === ticket.id ? newMessage : ''}
                                  onChange={(e) => setNewMessage(e.target.value)}
                                  onKeyDown={handleKeyDown}
                                  onFocus={() => setSelectedTicket(ticket)}
                                  rows={2}
                                  className="resize-none flex-1 min-h-[52px]"
                                  disabled={submitting}
                                />
                                <Button
                                  onClick={handleSendMessage}
                                  disabled={!newMessage.trim() || submitting || selectedTicket?.id !== ticket.id}
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
                            </div>
                          )}

                          {/* Resolved state */}
                          {!isPending && (
                            <div className="p-4 border-t bg-muted/30">
                              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="text-sm">
                                  Este ticket foi concluído
                                </span>
                              </div>
                            </div>
                          )}
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
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
                                <p className="text-sm text-primary font-medium">
                                  {request.user_profile?.email}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {request.user_profile?.full_name || 'Usuário'}
                                </p>
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
