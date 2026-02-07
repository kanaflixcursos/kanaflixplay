import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSupportNotifications } from '@/hooks/useSupportNotifications';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
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
  has_unread_message?: boolean;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  open: { label: 'Pendente', variant: 'secondary', icon: Clock },
  in_progress: { label: 'Pendente', variant: 'secondary', icon: Clock },
  resolved: { label: 'Concluído', variant: 'default', icon: CheckCircle2 },
  closed: { label: 'Concluído', variant: 'default', icon: CheckCircle2 },
};


const categoryLabels: Record<string, string> = {
  feedback: 'Feedback',
  question: 'Dúvida',
  bug: 'Problema Técnico',
  other: 'Outro',
  refund: 'Reembolso',
};

const getTicketCode = (id: string) => `#${id.slice(0, 6).toUpperCase()}`;

export default function AdminSupport() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Use the unified support notifications hook
  const { unreadTicketIds } = useSupportNotifications({
    userId: user?.id,
    isAdmin: true,
  });

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

    // Get all messages for tickets
    const ticketIds = (ticketsData || []).map(t => t.id);
    const { data: allMessages } = await supabase
      .from('support_ticket_messages')
      .select('ticket_id, is_admin_reply, created_at')
      .in('ticket_id', ticketIds)
      .order('created_at', { ascending: false });

    // Count messages and check for unread (last message is from user)
    const countMap = new Map<string, number>();
    const lastMessageByTicket = new Map<string, boolean>();
    
    (allMessages || []).forEach(m => {
      countMap.set(m.ticket_id, (countMap.get(m.ticket_id) || 0) + 1);
      if (!lastMessageByTicket.has(m.ticket_id)) {
        lastMessageByTicket.set(m.ticket_id, m.is_admin_reply);
      }
    });

    const ticketsWithProfiles = (ticketsData || []).map(t => {
      const lastIsAdmin = lastMessageByTicket.get(t.id);
      // Has unread if open/in_progress and last message is from user (not admin)
      const isPending = t.status === 'open' || t.status === 'in_progress';
      const hasUnread = isPending && (lastIsAdmin === false || (lastIsAdmin === undefined && isPending));
      
      return {
        ...t,
        user_profile: profileMap.get(t.user_id) || null,
        message_count: countMap.get(t.id) || 0,
        has_unread_message: hasUnread,
      };
    });

    setTickets(ticketsWithProfiles);
  }, []);

  useEffect(() => {
    fetchTickets().then(() => {
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
  }, [fetchTickets]);

  // Filter tickets (exclude refund tickets from main list)
  const filteredTickets = useMemo(() => {
    let filtered = tickets.filter(t => t.category !== 'refund');

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

  // Filter refund tickets
  const refundTickets = useMemo(() => {
    return tickets.filter(t => t.category === 'refund');
  }, [tickets]);

  const pendingRefundTickets = refundTickets.filter(t => t.status === 'open' || t.status === 'in_progress');

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
        {pendingRefundTickets.length > 0 && (
          <Card className="border-warning bg-warning/10">
            <CardContent className="flex items-center gap-3 py-3">
              <AlertCircle className="h-5 w-5 text-warning" />
              <span className="font-medium">
                {pendingRefundTickets.length} solicitação(ões) de reembolso aguardando análise
              </span>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="tickets" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tickets" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Solicitações ({filteredTickets.length})
            </TabsTrigger>
            <TabsTrigger value="refunds" className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              Reembolsos ({refundTickets.length})
              {pendingRefundTickets.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {pendingRefundTickets.length}
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
                  const hasUnread = unreadTicketIds.includes(ticket.id);

                  return (
                    <div
                      key={ticket.id}
                      className={`flex items-center gap-3 p-4 rounded-xl border bg-card cursor-pointer hover:bg-muted/50 transition-colors ${
                        hasUnread ? 'border-primary/50 bg-primary/5' : ''
                      }`}
                      onClick={() => navigate(`/admin/suporte/${ticket.id}`)}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={ticket.user_profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10">
                            <User className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        {hasUnread && (
                          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-destructive border-2 border-background" />
                        )}
                      </div>
                      
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
                          <span className={`font-medium text-sm truncate max-w-[200px] sm:max-w-[300px] ${
                            hasUnread ? 'text-foreground' : ''
                          }`}>
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
                        {ticket.message_count && ticket.message_count > 0 && (
                          <span className={`flex items-center gap-1 text-xs ${
                            hasUnread ? 'text-primary font-medium' : 'text-muted-foreground'
                          }`}>
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

          <TabsContent value="refunds" className="space-y-2">
            {refundTickets.length === 0 ? (
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
              <div className="space-y-2">
                {refundTickets.map((ticket) => {
                  const status = statusConfig[ticket.status] || statusConfig.open;
                  const StatusIcon = status.icon;
                  const hasUnread = unreadTicketIds.includes(ticket.id);

                  return (
                    <div
                      key={ticket.id}
                      className={`flex items-center gap-3 p-4 rounded-xl border bg-card cursor-pointer hover:bg-muted/50 transition-colors ${
                        hasUnread ? 'border-primary/50 bg-primary/5' : ''
                      }`}
                      onClick={() => navigate(`/admin/suporte/${ticket.id}`)}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={ticket.user_profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10">
                            <User className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        {hasUnread && (
                          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-destructive border-2 border-background" />
                        )}
                      </div>
                      
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
                          <span className={`font-medium text-sm truncate max-w-[200px] sm:max-w-[300px] ${
                            hasUnread ? 'text-foreground' : ''
                          }`}>
                            {ticket.subject}
                          </span>
                          <Badge variant={status.variant} className="gap-1 text-xs h-5 shrink-0">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {ticket.message_count && ticket.message_count > 0 && (
                          <span className={`flex items-center gap-1 text-xs ${
                            hasUnread ? 'text-primary font-medium' : 'text-muted-foreground'
                          }`}>
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
        </Tabs>
      </div>
    </AdminLayout>
  );
}
