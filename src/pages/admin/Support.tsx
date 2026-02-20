import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSupportNotifications } from '@/hooks/useSupportNotifications';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import PhoneInput from '@/components/PhoneInput';
import { toast } from 'sonner';
import {
  Clock,
  CheckCircle2,
  HelpCircle,
  User,
  Search,
  ChevronRight,
  MessageCircle,
  Circle,
  Settings2,
  Save,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  category: string;
  status: string;
  updated_at: string;
  user_profile?: { full_name: string | null; email: string | null; avatar_url: string | null };
  message_count?: number;
}

const statusLabels: Record<string, string> = {
  open: 'Pendente',
  in_progress: 'Pendente',
  resolved: 'Concluído',
  closed: 'Concluído',
};

const categoryLabels: Record<string, string> = {
  question: 'Dúvida',
  feedback: 'Feedback',
  bug: 'Problema Técnico',
  other: 'Outro',
  refund: 'Reembolso',
};

export default function AdminSupport() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const { unreadTicketIds } = useSupportNotifications({ userId: user?.id, isAdmin: true });

  const fetchTickets = useCallback(async () => {
    const { data: ticketsData } = await supabase
      .from('support_tickets')
      .select('id, user_id, subject, category, status, updated_at')
      .order('updated_at', { ascending: false });

    if (!ticketsData) return;

    const userIds = [...new Set(ticketsData.map(t => t.user_id))];
    const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, email, avatar_url').in('user_id', userIds);
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    const ticketIds = ticketsData.map(t => t.id);
    const { data: msgs } = await supabase.from('support_ticket_messages').select('ticket_id').in('ticket_id', ticketIds);
    const countMap = new Map<string, number>();
    (msgs || []).forEach(m => countMap.set(m.ticket_id, (countMap.get(m.ticket_id) || 0) + 1));

    setTickets(ticketsData.map(t => ({
      ...t,
      user_profile: profileMap.get(t.user_id) || undefined,
      message_count: countMap.get(t.id) || 0,
    })));
    setLoading(false);
  }, []);

  const fetchWhatsappConfig = useCallback(async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'whatsapp_support')
      .single();
    if (data?.value) {
      const val = data.value as { enabled: boolean; number: string };
      setWhatsappEnabled(val.enabled ?? false);
      setWhatsappNumber(val.number ?? '');
    }
  }, []);

  const saveWhatsappConfig = async () => {
    setSavingWhatsapp(true);
    const { error } = await supabase
      .from('site_settings')
      .update({ value: { enabled: whatsappEnabled, number: whatsappNumber }, updated_at: new Date().toISOString() })
      .eq('key', 'whatsapp_support');
    if (error) toast.error('Erro ao salvar configuração');
    else toast.success('Configuração do WhatsApp salva!');
    setSavingWhatsapp(false);
  };

  useEffect(() => {
    fetchTickets();
    fetchWhatsappConfig();
    const channel = supabase
      .channel('admin-tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => fetchTickets())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTickets, fetchWhatsappConfig]);

  const filteredTickets = useMemo(() => {
    let filtered = tickets;
    if (statusFilter === 'pending') filtered = filtered.filter(t => t.status === 'open' || t.status === 'in_progress');
    else if (statusFilter === 'resolved') filtered = filtered.filter(t => t.status === 'resolved' || t.status === 'closed');

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(t => {
        const code = `#${t.id.slice(0, 6)}`.toLowerCase();
        return code.includes(q) || t.subject.toLowerCase().includes(q) ||
          t.user_profile?.full_name?.toLowerCase().includes(q) || t.user_profile?.email?.toLowerCase().includes(q);
      });
    }
    return filtered;
  }, [tickets, statusFilter, searchQuery]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Suporte</h1>
            <p className="text-sm text-muted-foreground">Gerenciamento de solicitações</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
            <Settings2 className="h-4 w-4 mr-1" />
            Configurações
          </Button>
        </div>

        {/* WhatsApp Settings */}
        {showSettings && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">WhatsApp de Suporte</CardTitle>
              <CardDescription>Configure o contato via WhatsApp exibido para os alunos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="whatsapp-enabled">Exibir botão de WhatsApp</Label>
                <Switch id="whatsapp-enabled" checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
              </div>
              <div className="space-y-2">
                <Label>Número do WhatsApp</Label>
                <PhoneInput value={whatsappNumber} onChange={setWhatsappNumber} placeholder="(00) 00000-0000" />
              </div>
              <Button size="sm" onClick={saveWhatsappConfig} disabled={savingWhatsapp}>
                {savingWhatsapp ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Salvar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="resolved">Concluídos</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, email ou código..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </div>

        {/* Ticket List */}
        {filteredTickets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <HelpCircle className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">Nenhuma solicitação</p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery ? 'Nenhum resultado encontrado' : 'Não há solicitações no momento'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1">
            {filteredTickets.map(ticket => {
              const hasUnread = unreadTicketIds.includes(ticket.id);
              const isPending = ticket.status === 'open' || ticket.status === 'in_progress';

              return (
                <div
                  key={ticket.id}
                  onClick={() => navigate(`/admin/suporte/${ticket.id}`)}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <div className="relative">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={ticket.user_profile?.avatar_url || undefined} />
                      <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                    {hasUnread && (
                      <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{ticket.subject}</span>
                      <Badge variant={isPending ? 'secondary' : 'outline'} className="text-[10px] h-5 shrink-0">
                        {statusLabels[ticket.status] || ticket.status}
                      </Badge>
                      {ticket.category === 'refund' && (
                        <Badge variant="destructive" className="text-[10px] h-5 shrink-0">Reembolso</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <span className="font-mono text-[10px]">#{ticket.id.slice(0, 6).toUpperCase()}</span>
                      <span>·</span>
                      <span className="truncate">{ticket.user_profile?.email || ticket.user_profile?.full_name || 'Usuário'}</span>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true, locale: ptBR })}</span>
                      {(ticket.message_count ?? 0) > 0 && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-0.5"><MessageCircle className="h-3 w-3" />{ticket.message_count}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
